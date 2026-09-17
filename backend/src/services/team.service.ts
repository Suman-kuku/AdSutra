import type { CreateTeamInput, PersonDTO, TeamDTO, UpdateTeamInput } from '@scriptcraft/shared';
import type { Db } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { toPersonDTO } from './people.service.js';

/**
 * A team plus its members in one request. PostgREST returns the join rows with
 * the person embedded, which is why members arrive one level down.
 */
const TEAM_SELECT = '*, team_members(person:people(*))';

type TeamRowWithMembers = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  team_members: { person: Parameters<typeof toPersonDTO>[0] | null }[];
};

export function toTeamDTO(row: TeamRowWithMembers): TeamDTO {
  const members: PersonDTO[] = row.team_members
    .map((link) => link.person)
    .filter((person): person is NonNullable<typeof person> => person !== null)
    .map(toPersonDTO)
    .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));

  return {
    id: row.id,
    name: row.name,
    members,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/** Every team. Readable by anyone signed in — the `teams_select` policy. */
export async function listTeams(db: Db): Promise<TeamRowWithMembers[]> {
  const { data, error } = await db
    .from('teams')
    .select(TEAM_SELECT)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(500, 'TEAMS_READ_FAILED', 'Could not load teams.', { cause: error });
  }
  return data as unknown as TeamRowWithMembers[];
}

async function getTeamOr404(db: Db, id: string): Promise<TeamRowWithMembers> {
  const { data, error } = await db.from('teams').select(TEAM_SELECT).eq('id', id).maybeSingle();

  if (error) {
    throw new AppError(500, 'TEAM_READ_FAILED', 'Could not load this team.', { cause: error });
  }
  if (!data) {
    throw AppError.notFound('Team not found.', 'TEAM_NOT_FOUND');
  }
  return data as unknown as TeamRowWithMembers;
}

/**
 * Replaces the whole membership rather than applying a delta: the picker hands
 * back a complete selection, and "set it to exactly this" cannot half-apply the
 * way a sequence of adds and removes can.
 *
 * Only approved people are accepted — someone still on the waitlist is not in
 * the workspace yet, so putting them on a team would be a promise the app does
 * not keep.
 */
async function setMembers(db: Db, teamId: string, memberIds: string[]): Promise<void> {
  const unique = [...new Set(memberIds)];

  if (unique.length > 0) {
    const { data: approved, error: peopleError } = await db
      .from('people')
      .select('id')
      .eq('access_status', 'approved')
      .in('id', unique);

    if (peopleError) {
      throw new AppError(500, 'TEAM_MEMBERS_CHECK_FAILED', 'Could not check those people.', {
        cause: peopleError,
      });
    }
    if (approved.length !== unique.length) {
      throw AppError.badRequest(
        'Only people with access can be added to a team.',
        'MEMBER_NOT_APPROVED',
      );
    }
  }

  const { error: clearError } = await db.from('team_members').delete().eq('team_id', teamId);
  if (clearError) {
    throw new AppError(500, 'TEAM_MEMBERS_WRITE_FAILED', 'Could not update the members.', {
      cause: clearError,
    });
  }

  if (unique.length === 0) return;

  const { error: insertError } = await db
    .from('team_members')
    .insert(unique.map((personId) => ({ team_id: teamId, person_id: personId })));

  if (insertError) {
    throw new AppError(500, 'TEAM_MEMBERS_WRITE_FAILED', 'Could not add those members.', {
      cause: insertError,
    });
  }
}

/** Turns the unique-name violation into something an admin can act on. */
function nameTaken(error: { code?: string } | null): boolean {
  return error?.code === '23505';
}

export async function createTeam(
  db: Db,
  createdBy: string,
  input: CreateTeamInput,
): Promise<TeamRowWithMembers> {
  const { data, error } = await db
    .from('teams')
    .insert({ name: input.name, created_by: createdBy })
    .select('id')
    .single();

  if (error || !data) {
    if (nameTaken(error)) {
      throw AppError.badRequest('A team with that name already exists.', 'TEAM_NAME_TAKEN');
    }
    throw new AppError(500, 'TEAM_CREATE_FAILED', 'Could not create this team.', { cause: error });
  }

  await setMembers(db, data.id, input.memberIds);
  return getTeamOr404(db, data.id);
}

export async function updateTeam(
  db: Db,
  id: string,
  input: UpdateTeamInput,
): Promise<TeamRowWithMembers> {
  await getTeamOr404(db, id);

  if (input.name !== undefined) {
    const { error } = await db.from('teams').update({ name: input.name }).eq('id', id);
    if (error) {
      if (nameTaken(error)) {
        throw AppError.badRequest('A team with that name already exists.', 'TEAM_NAME_TAKEN');
      }
      throw new AppError(500, 'TEAM_UPDATE_FAILED', 'Could not rename this team.', {
        cause: error,
      });
    }
  }

  if (input.memberIds !== undefined) {
    await setMembers(db, id, input.memberIds);
  }

  return getTeamOr404(db, id);
}

/** Deletes the team. `team_members` cascades; no `people` row is touched. */
export async function deleteTeam(db: Db, id: string): Promise<void> {
  await getTeamOr404(db, id);

  const { error } = await db.from('teams').delete().eq('id', id);
  if (error) {
    throw new AppError(500, 'TEAM_DELETE_FAILED', 'Could not delete this team.', { cause: error });
  }
}
