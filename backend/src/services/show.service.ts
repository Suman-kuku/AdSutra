import type { CreateShowInput, ShowDTO, Tables } from '@scriptcraft/shared';
import type { Db } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';

type ShowRow = Tables<'shows'>;

/**
 * A show plus its episode count. PostgREST returns an aggregate embed as a
 * one-element array (`episodes: [{ count: 3 }]`), which is why this is not
 * simply a number.
 */
export type ShowRowWithCount = ShowRow & {
  episodes: { count: number }[];
  owner: { name: string | null; email: string } | null;
};

/**
 * Asks PostgREST for the row, the count of its episodes and the owner's name in
 * one request. The owner is named explicitly because team sharing puts other
 * people's shows in the same list as yours.
 */
const SHOW_SELECT = '*, episodes(count), owner:people!shows_owner_id_fkey(name, email)';

export function toShowDTO(row: ShowRowWithCount): ShowDTO {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner?.name ?? row.owner?.email ?? null,
    title: row.title,
    description: row.description,
    genre: row.genre,
    language: row.language,
    defaultSkillFileId: row.default_skill_file_id,
    episodeCount: row.episodes[0]?.count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Every function here takes an RLS-scoped client. Role visibility — creators
 * see their own shows, admins see all — is enforced by the `shows_select`
 * policy rather than re-implemented in JS.
 */
export async function listShows(db: Db): Promise<ShowRowWithCount[]> {
  const { data, error } = await db.from('shows').select(SHOW_SELECT).order('created_at', {
    ascending: false,
  });

  if (error) {
    throw new AppError(500, 'SHOWS_READ_FAILED', 'Could not load shows.', { cause: error });
  }
  return data;
}

export async function getShowById(db: Db, id: string): Promise<ShowRowWithCount> {
  const { data, error } = await db.from('shows').select(SHOW_SELECT).eq('id', id).maybeSingle();

  if (error) {
    throw new AppError(500, 'SHOW_READ_FAILED', 'Could not load this show.', { cause: error });
  }
  // RLS turns "not yours" into "no rows", so both cases are a 404 by design —
  // it avoids leaking whether an id exists.
  if (!data) {
    throw AppError.notFound('Show not found.', 'SHOW_NOT_FOUND');
  }
  return data;
}

export async function createShow(
  db: Db,
  ownerId: string,
  input: CreateShowInput,
): Promise<ShowRowWithCount> {
  const { data, error } = await db
    .from('shows')
    .insert({
      owner_id: ownerId,
      title: input.title,
      description: input.description ?? null,
      genre: input.genre ?? null,
      language: input.language ?? null,
    })
    .select(SHOW_SELECT)
    .single();

  if (error || !data) {
    throw new AppError(500, 'SHOW_CREATE_FAILED', 'Could not create the show.', { cause: error });
  }
  return data;
}
