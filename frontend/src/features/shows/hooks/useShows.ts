import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateShowInput, ShowDTO } from '@scriptcraft/shared';
import * as showService from '../services/show.service';

export const showKeys = {
  all: ['shows'] as const,
  detail: (id: string) => ['shows', id] as const,
};

export function useShows() {
  return useQuery<ShowDTO[]>({ queryKey: showKeys.all, queryFn: showService.fetchShows });
}

export function useShow(id: string) {
  return useQuery<ShowDTO>({
    queryKey: showKeys.detail(id),
    queryFn: () => showService.fetchShow(id),
    enabled: id.length > 0,
  });
}

export function useCreateShow() {
  const queryClient = useQueryClient();
  return useMutation<ShowDTO, Error, CreateShowInput>({
    mutationFn: showService.createShow,
    onSuccess: (show) => {
      queryClient.setQueryData(showKeys.detail(show.id), show);
      void queryClient.invalidateQueries({ queryKey: showKeys.all });
    },
  });
}
