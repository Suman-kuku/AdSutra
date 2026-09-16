import type {
  EpisodeDTO,
  EpisodeScriptDTO,
  ScriptFileUrlDTO,
  UploadTicketDTO,
} from '@scriptcraft/shared';
import { SCRIPT_MIME_TYPES, MAX_SCRIPT_BYTES } from '@scriptcraft/shared';
import { apiFetch } from '../../../services/api.client';
import { supabase } from '../../../services/supabase.client';

export function fetchEpisodesForShow(showId: string): Promise<EpisodeDTO[]> {
  return apiFetch<EpisodeDTO[]>(`/shows/${showId}/episodes`);
}

export function fetchEpisode(id: string): Promise<EpisodeDTO> {
  return apiFetch<EpisodeDTO>(`/episodes/${id}`);
}

/** Deletes the episode and cascades to every conversation, message, promo, and performance report on it. */
export function deleteEpisode(id: string): Promise<null> {
  return apiFetch<null>(`/episodes/${id}`, { method: 'DELETE' });
}

export interface UploadScriptInput {
  showId: string;
  episodeNumber: number;
  title: string | null;
  file: File;
}

type ScriptMime = (typeof SCRIPT_MIME_TYPES)[number];

function assertUploadable(file: File): asserts file is File & { type: ScriptMime } {
  if (!SCRIPT_MIME_TYPES.includes(file.type as ScriptMime)) {
    throw new Error('Only PDF, DOCX or plain text scripts can be uploaded.');
  }
  if (file.size > MAX_SCRIPT_BYTES) {
    throw new Error('That file is larger than the 25 MB limit.');
  }
}

/**
 * Three steps, in the order the API expects: reserve a signed URL (which also
 * allocates the episode id), push the bytes straight to Storage, then register
 * the row. The file never passes through the Express server.
 */
export async function uploadScript(input: UploadScriptInput): Promise<EpisodeDTO> {
  const { file, showId } = input;
  assertUploadable(file);

  const ticket = await apiFetch<UploadTicketDTO>('/episodes/upload-url', {
    method: 'POST',
    body: JSON.stringify({ showId, filename: file.name, mimeType: file.type }),
  });

  const { error } = await supabase.storage
    .from('scripts')
    .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return apiFetch<EpisodeDTO>('/episodes', {
    method: 'POST',
    body: JSON.stringify({
      id: ticket.episodeId,
      showId,
      episodeNumber: input.episodeNumber,
      title: input.title,
      scriptPath: ticket.path,
      scriptFilename: file.name,
      scriptMime: file.type,
      fileSize: file.size,
    }),
  });
}

export function fetchEpisodeScript(id: string): Promise<EpisodeScriptDTO> {
  return apiFetch<EpisodeScriptDTO>(`/episodes/${id}/script`);
}

export function fetchScriptFileUrl(id: string): Promise<ScriptFileUrlDTO> {
  return apiFetch<ScriptFileUrlDTO>(`/episodes/${id}/script-url`);
}
