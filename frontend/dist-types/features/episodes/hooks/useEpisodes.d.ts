import type { EpisodeDTO, EpisodeScriptDTO } from '@scriptcraft/shared';
import * as episodeService from '../services/episode.service';
export declare const episodeKeys: {
    forShow: (showId: string) => readonly ["shows", string, "episodes"];
    detail: (id: string) => readonly ["episodes", string];
};
export declare function useEpisodes(showId: string): import("@tanstack/react-query").UseQueryResult<EpisodeDTO[], Error>;
export declare function useEpisode(id: string): import("@tanstack/react-query").UseQueryResult<EpisodeDTO, Error>;
export declare function useUploadScript(showId: string): import("@tanstack/react-query").UseMutationResult<EpisodeDTO, Error, episodeService.UploadScriptInput, unknown>;
export declare function useDeleteEpisode(showId: string): import("@tanstack/react-query").UseMutationResult<null, Error, string, unknown>;
/** The parsed text, fetched only once an episode is `ready`. */
export declare function useEpisodeScript(id: string, status: EpisodeDTO['status'] | undefined): import("@tanstack/react-query").UseQueryResult<EpisodeScriptDTO, Error>;
//# sourceMappingURL=useEpisodes.d.ts.map