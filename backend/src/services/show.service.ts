import type { CreateShowInput, ShowDTO, Tables } from '@scriptcraft/shared';
import type { Db } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';

type ShowRow = Tables<'shows'>;

export function toShowDTO(row: ShowRow): ShowDTO {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    genre: row.genre,
    language: row.language,
    defaultSkillFileId: row.default_skill_file_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Every function here takes an RLS-scoped client. Role visibility — creators
 * see their own shows, admins see all — is enforced by the `shows_select`
 * policy rather than re-implemented in JS.
 */
export async function listShows(db: Db): Promise<ShowRow[]> {
  const { data, error } = await db.from('shows').select('*').order('created_at', {
    ascending: false,
  });

  if (error) {
    throw new AppError(500, 'SHOWS_READ_FAILED', 'Could not load shows.', { cause: error });
  }
  return data;
}

export async function getShowById(db: Db, id: string): Promise<ShowRow> {
  const { data, error } = await db.from('shows').select('*').eq('id', id).maybeSingle();

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
): Promise<ShowRow> {
  const { data, error } = await db
    .from('shows')
    .insert({
      owner_id: ownerId,
      title: input.title,
      description: input.description ?? null,
      genre: input.genre ?? null,
      language: input.language ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(500, 'SHOW_CREATE_FAILED', 'Could not create the show.', { cause: error });
  }
  return data;
}
