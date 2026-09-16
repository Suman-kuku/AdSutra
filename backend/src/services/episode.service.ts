import { randomUUID } from 'node:crypto';
import type {
  CreateEpisodeInput,
  EpisodeDTO,
  EpisodeScriptDTO,
  ScriptFileUrlDTO,
  Tables,
  UploadTicketDTO,
  UploadUrlInput,
} from '@scriptcraft/shared';
import { supabaseAdmin, type Db } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { getShowById } from './show.service.js';

type EpisodeRow = Tables<'episodes'>;

const SCRIPTS_BUCKET = 'scripts';

export function toEpisodeDTO(row: EpisodeRow): EpisodeDTO {
  return {
    id: row.id,
    showId: row.show_id,
    episodeNumber: row.episode_number,
    title: row.title,
    scriptPath: row.script_path,
    scriptFilename: row.script_filename,
    scriptMime: row.script_mime,
    fileSize: row.file_size,
    pageCount: row.page_count,
    status: row.status,
    parseError: row.parse_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Strips anything that would break the Storage key or escape the folder. */
function safeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? 'script';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

/**
 * Issues a signed upload URL. The episode id is allocated here so the Storage
 * key can follow `{showId}/{episodeId}/{filename}` — the shape the bucket's RLS
 * policies expect — before the row exists.
 *
 * Ownership is checked with the caller's RLS-scoped client first; only then does
 * the service-role client mint the URL.
 */
export async function createUploadTicket(
  db: Db,
  input: UploadUrlInput,
): Promise<UploadTicketDTO> {
  console.log(`[episode] upload-url requested show=${input.showId} filename=${input.filename}`);
  await getShowById(db, input.showId); // 404s if the show isn't the caller's

  const episodeId = randomUUID();
  const path = `${input.showId}/${episodeId}/${safeFilename(input.filename)}`;

  const { data, error } = await supabaseAdmin.storage
    .from(SCRIPTS_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new AppError(500, 'UPLOAD_URL_FAILED', 'Could not create an upload URL.', {
      cause: error,
    });
  }

  console.log(`[episode] upload-url issued episodeId=${episodeId} path=${path}`);
  return { episodeId, path, signedUrl: data.signedUrl, token: data.token };
}

/** Seconds a script download link stays valid. Long enough to open, short enough to matter. */
const SCRIPT_URL_TTL_SECONDS = 300;

/**
 * The parsed script text. Kept out of `EpisodeDTO` and fetched separately —
 * a 58-page script is over 100 KB, and lists never need it.
 */
export async function getEpisodeScript(db: Db, id: string): Promise<EpisodeScriptDTO> {
  const episode = await getEpisodeById(db, id); // RLS-scoped; 404s if not the caller's

  if (episode.status !== 'ready') {
    throw AppError.conflict(
      'This script has not been parsed yet.',
      'SCRIPT_NOT_READY',
    );
  }

  return {
    episodeId: episode.id,
    text: episode.extracted_text ?? '',
    pageCount: episode.page_count,
  };
}

/** A short-lived signed URL to the original upload, for viewing the real PDF. */
export async function createScriptFileUrl(db: Db, id: string): Promise<ScriptFileUrlDTO> {
  const episode = await getEpisodeById(db, id);

  if (!episode.script_path) {
    throw AppError.notFound('No script file is attached to this episode.', 'NO_SCRIPT_FILE');
  }

  const { data, error } = await supabaseAdmin.storage
    .from(SCRIPTS_BUCKET)
    .createSignedUrl(episode.script_path, SCRIPT_URL_TTL_SECONDS);

  if (error || !data) {
    throw new AppError(500, 'SCRIPT_URL_FAILED', 'Could not create a link to the script.', {
      cause: error,
    });
  }

  return { url: data.signedUrl, expiresInSeconds: SCRIPT_URL_TTL_SECONDS };
}

export async function listEpisodesForShow(db: Db, showId: string): Promise<EpisodeRow[]> {
  await getShowById(db, showId);

  const { data, error } = await db
    .from('episodes')
    .select('*')
    .eq('show_id', showId)
    .order('episode_number', { ascending: true });

  if (error) {
    throw new AppError(500, 'EPISODES_READ_FAILED', 'Could not load episodes.', { cause: error });
  }
  return data;
}

export async function getEpisodeById(db: Db, id: string): Promise<EpisodeRow> {
  const { data, error } = await db.from('episodes').select('*').eq('id', id).maybeSingle();

  if (error) {
    throw new AppError(500, 'EPISODE_READ_FAILED', 'Could not load this episode.', {
      cause: error,
    });
  }
  if (!data) {
    throw AppError.notFound('Episode not found.', 'EPISODE_NOT_FOUND');
  }
  return data;
}

/**
 * Deletes an episode and everything that hangs off it. This is a single
 * `DELETE` on `episodes` — RLS (`episodes_delete`: show owner or admin) gates
 * it, and the migration's foreign keys do the rest via cascade, with no app
 * code needed to order the child deletes:
 *   conversations (episode_id → cascade) → messages (conversation_id → cascade)
 *   promos (episode_id → cascade) → promo_performance (promo_id → cascade)
 * Postgres FK cascades are not subject to a child table's own RLS delete
 * policy, which is why this works even though `messages` otherwise has none.
 * The script file in Storage is a separate system and isn't touched by the
 * cascade, so it's removed as a best-effort step after the DB row is gone.
 */
export async function deleteEpisode(db: Db, id: string): Promise<void> {
  const episode = await getEpisodeById(db, id); // 404s if not found or not the caller's
  console.log(`[episode] delete requested id=${id}`);

  const { error } = await db.from('episodes').delete().eq('id', id);

  if (error) {
    throw new AppError(500, 'EPISODE_DELETE_FAILED', 'Could not delete this episode.', {
      cause: error,
    });
  }
  console.log(`[episode] deleted id=${id} — conversations/messages/promos/performance cascaded`);

  if (episode.script_path) {
    const { error: storageError } = await supabaseAdmin.storage
      .from(SCRIPTS_BUCKET)
      .remove([episode.script_path]);
    if (storageError) {
      // Non-fatal: the DB is already consistent, this just leaves an orphaned file.
      console.error('[episode] could not remove script file from storage', episode.script_path, storageError);
    }
  }
}

/**
 * Registers an episode after its script has landed in Storage. Status stays
 * `uploaded`; the parsing job (build step 5) moves it to `ready`.
 */
export async function createEpisode(db: Db, input: CreateEpisodeInput): Promise<EpisodeRow> {
  console.log(
    `[episode] register requested show=${input.showId} episodeNumber=${input.episodeNumber} scriptPath=${input.scriptPath}`,
  );
  await getShowById(db, input.showId);

  // The upload key is derived server-side, so a mismatched path means the
  // client is registering a file it did not just upload.
  if (!input.scriptPath.startsWith(`${input.showId}/${input.id}/`)) {
    throw AppError.badRequest('Script path does not match this episode.', 'PATH_MISMATCH');
  }

  const { data, error } = await db
    .from('episodes')
    .insert({
      id: input.id,
      show_id: input.showId,
      episode_number: input.episodeNumber,
      title: input.title ?? null,
      script_path: input.scriptPath,
      script_filename: input.scriptFilename,
      script_mime: input.scriptMime,
      file_size: input.fileSize,
      status: 'uploaded',
    })
    .select('*')
    .single();

  if (error) {
    // 23505 = unique_violation on (show_id, episode_number).
    if (error.code === '23505') {
      throw AppError.conflict(
        `Episode ${input.episodeNumber} already exists for this show.`,
        'EPISODE_NUMBER_TAKEN',
      );
    }
    throw new AppError(500, 'EPISODE_CREATE_FAILED', 'Could not register the episode.', {
      cause: error,
    });
  }
  if (!data) {
    throw new AppError(500, 'EPISODE_CREATE_FAILED', 'Could not register the episode.');
  }
  console.log(`[episode] registered id=${data.id} status=${data.status} — parsing job will start next`);
  return data;
}
