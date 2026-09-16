import type { EpisodeDTO, EpisodeScriptDTO, ScriptFileUrlDTO } from '@scriptcraft/shared';
export declare function fetchEpisodesForShow(showId: string): Promise<EpisodeDTO[]>;
export declare function fetchEpisode(id: string): Promise<EpisodeDTO>;
/** Deletes the episode and cascades to every conversation, message, promo, and performance report on it. */
export declare function deleteEpisode(id: string): Promise<null>;
export interface UploadScriptInput {
    showId: string;
    episodeNumber: number;
    title: string | null;
    file: File;
}
/**
 * Three steps, in the order the API expects: reserve a signed URL (which also
 * allocates the episode id), push the bytes straight to Storage, then register
 * the row. The file never passes through the Express server.
 */
export declare function uploadScript(input: UploadScriptInput): Promise<EpisodeDTO>;
export declare function fetchEpisodeScript(id: string): Promise<EpisodeScriptDTO>;
export declare function fetchScriptFileUrl(id: string): Promise<ScriptFileUrlDTO>;
//# sourceMappingURL=episode.service.d.ts.map