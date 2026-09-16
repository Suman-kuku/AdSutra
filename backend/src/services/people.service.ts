import type { PersonDTO, Tables } from '@scriptcraft/shared';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';

type PersonRow = Tables<'people'>;

/** The one place a `people` row becomes the shape the API exposes. */
export function toPersonDTO(row: PersonRow): PersonDTO {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role,
    isActive: row.is_active,
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
