import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EpisodeDTO, EpisodeScriptDTO } from '@scriptcraft/shared';
import * as episodeService from '../services/episode.service';

export const episodeKeys = {
  forShow: (showId: string) => ['shows', showId, 'episodes'] as const,
  detail: (id: string) => ['episodes', id] as const,
};

/** Parsing runs in the background, so poll while anything is still in flight. */
const POLL_MS = 2000;
const isPending = (status: EpisodeDTO['status']): boolean =>
  status === 'uploaded' || status === 'parsing';

export function useEpisodes(showId: string) {
  return useQuery<EpisodeDTO[]>({
    queryKey: episodeKeys.forShow(showId),
    queryFn: () => episodeService.fetchEpisodesForShow(showId),
    enabled: showId.length > 0,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((episode) => isPending(episode.status)) ? POLL_MS : false,
  });
}

export function useEpisode(id: string) {
  return useQuery<EpisodeDTO>({
    queryKey: episodeKeys.detail(id),
    queryFn: () => episodeService.fetchEpisode(id),
    enabled: id.length > 0,
    refetchInterval: (query) =>
      query.state.data && isPending(query.state.data.status) ? POLL_MS : false,
  });
}

export function useUploadScript(showId: string) {
  const queryClient = useQueryClient();
  return useMutation<EpisodeDTO, Error, episodeService.UploadScriptInput>({
    mutationFn: episodeService.uploadScript,
    onSuccess: (episode) => {
      queryClient.setQueryData(episodeKeys.detail(episode.id), episode);
      void queryClient.invalidateQueries({ queryKey: episodeKeys.forShow(showId) });
    },
  });
}

export function useDeleteEpisode(showId: string) {
  const queryClient = useQueryClient();
  return useMutation<null, Error, string>({
    mutationFn: episodeService.deleteEpisode,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: episodeKeys.forShow(showId) });
    },
  });
}

/** The parsed text, fetched only once an episode is `ready`. */
export function useEpisodeScript(id: string, status: EpisodeDTO['status'] | undefined) {
  return useQuery<EpisodeScriptDTO>({
    queryKey: [...episodeKeys.detail(id), 'script'] as const,
    queryFn: () => episodeService.fetchEpisodeScript(id),
    enabled: id.length > 0 && status === 'ready',
    staleTime: Infinity,
  });
}
