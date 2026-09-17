import type { Enums, PersonAdminDTO, PersonDTO, Tables } from '@scriptcraft/shared';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';

type PersonRow = Tables<'people'>;
type AccessStatus = Enums<'access_status'>;

/** The one place a `people` row becomes the shape the API exposes. */
export function toPersonDTO(row: PersonRow): PersonDTO {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role,
    // `is_active` is a generated column, so PostgREST types it nullable. It is
    // exactly this expression in the database — stating it here keeps the DTO
    // non-null without a fallback that could quietly mean the wrong thing.
    isActive: row.access_status === 'approved',
  };
}

/**
 * Reads the `people` row for an authenticated user. The row itself is created
 * by the `on_auth_user_created` trigger at signup, so a missing row means
 * something is genuinely wrong rather than "first login".
 */
export async function getPersonById(id: string): Promise<PersonRow | null> {
  const { data, error } = await supabaseAdmin
    .from('people')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'PEOPLE_READ_FAILED', 'Could not load your profile.', {
      cause: error,
    });
  }

  return data;
}

/**
 * Refreshes the profile fields Google owns. The `people` row itself is created
 * by the signup trigger, so this only ever updates — it never inserts.
 * Returns the row unchanged when there is nothing new to write.
 */
export async function syncPersonFromAuth(
  person: PersonRow,
  incoming: { name: string | null; avatarUrl: string | null },
): Promise<PersonRow> {
  const nameChanged = incoming.name !== null && incoming.name !== person.name;
  const avatarChanged = incoming.avatarUrl !== null && incoming.avatarUrl !== person.avatar_url;

  if (!nameChanged && !avatarChanged) return person;

  const { data, error } = await supabaseAdmin
    .from('people')
    .update({
      ...(nameChanged ? { name: incoming.name } : {}),
      ...(avatarChanged ? { avatar_url: incoming.avatarUrl } : {}),
    })
    .eq('id', person.id)
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'PEOPLE_UPDATE_FAILED', 'Could not update your profile.', {
      cause: error,
    });
  }

  return data;
}

/** Adds the fields only the admin People page needs. */
export function toPersonAdminDTO(row: PersonRow): PersonAdminDTO {
  return { ...toPersonDTO(row), createdAt: row.created_at, accessStatus: row.access_status };
}

/**
 * People in one access state, for the admin People page: `approved` fills the
 * Active tab, `pending` the waitlist, `denied` the reversal list.
 *
 * Filtered here rather than in the UI — a removed person must not arrive on the
 * client at all.
 */
export async function listPeopleByStatus(status: AccessStatus): Promise<PersonRow[]> {
  const query = supabaseAdmin.from('people').select('*').eq('access_status', status);

  // Approved reads as a team roster (admins first); the waitlist reads as a
  // queue, oldest request at the top.
  const ordered =
    status === 'approved'
      ? query.order('role', { ascending: true }).order('created_at', { ascending: true })
      : query.order('created_at', { ascending: true });

  const { data, error } = await ordered;

  if (error) {
    throw new AppError(500, 'PEOPLE_READ_FAILED', 'Could not load people.', { cause: error });
  }
  return data;
}

/** Loads a row an admin is about to act on, 404-ing rather than silently no-op'ing. */
async function requirePerson(id: string): Promise<PersonRow> {
  const person = await getPersonById(id);
  if (!person) {
    throw AppError.notFound('Person not found.', 'PERSON_NOT_FOUND');
  }
  return person;
}

/** The one write that moves someone between access states. */
async function writeAccessStatus(
  id: string,
  status: AccessStatus,
  failureMessage: string,
): Promise<PersonRow> {
  const { data, error } = await supabaseAdmin
    .from('people')
    .update({ access_status: status })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'PEOPLE_UPDATE_FAILED', failureMessage, { cause: error });
  }
  return data;
}

/**
 * Revokes access — "Remove" on the Active tab, "Reject" on the waitlist. Both
 * land on `denied`, so Approve reverses either one.
 *
 * Nothing is deleted: `requireAuth` turns the status into a 403 at the door,
 * and their shows, promos and chat history stay intact and attributed.
 */
export async function denyPerson(id: string, actorId: string): Promise<PersonRow> {
  if (id === actorId) {
    throw AppError.badRequest('You cannot remove your own access.', 'CANNOT_REMOVE_SELF');
  }
  await requirePerson(id);
  return writeAccessStatus(id, 'denied', 'Could not remove this person.');
}

/**
 * Grants access — to a new request, or back to someone previously removed.
 * Role is untouched: everyone starts a `creator` (the column default) and is
 * promoted afterwards on the Active tab, so approving can never hand out admin
 * by accident.
 */
export async function approvePerson(id: string): Promise<PersonRow> {
  const person = await requirePerson(id);
  if (person.access_status === 'approved') return person;
  return writeAccessStatus(id, 'approved', 'Could not approve this person.');
}

/**
 * Changes someone's role. Self-demotion is blocked: an admin who demotes
 * themselves loses the only page that can promote them back.
 */
export async function setPersonRole(
  id: string,
  role: PersonRow['role'],
  actorId: string,
): Promise<PersonRow> {
  if (id === actorId) {
    throw AppError.badRequest('You cannot change your own role.', 'CANNOT_CHANGE_OWN_ROLE');
  }
  const person = await requirePerson(id);
  if (person.role === role) return person;

  const { data, error } = await supabaseAdmin
    .from('people')
    .update({ role })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'PEOPLE_UPDATE_FAILED', 'Could not change this role.', {
      cause: error,
    });
  }
  return data;
}
