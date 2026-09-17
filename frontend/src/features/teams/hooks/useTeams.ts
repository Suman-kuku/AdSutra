import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTeamInput, TeamDTO, UpdateTeamInput } from '@scriptcraft/shared';
import * as teamService from '../services/team.service';

export const teamKeys = {
  all: ['teams'] as const,
};

export function useTeams() {
  return useQuery<TeamDTO[]>({ queryKey: teamKeys.all, queryFn: teamService.fetchTeams });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation<TeamDTO, Error, CreateTeamInput>({
    mutationFn: teamService.createTeam,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation<TeamDTO, Error, { id: string; input: UpdateTeamInput }>({
    mutationFn: ({ id, input }) => teamService.updateTeam(id, input),
    onSuccess: (team) => {
      // The response already carries the new membership, so patch rather than
      // refetch — the list keeps its order and does not flash.
      queryClient.setQueryData<TeamDTO[]>(teamKeys.all, (teams) =>
        teams?.map((row) => (row.id === team.id ? team : row)),
      );
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, string>({
    mutationFn: teamService.deleteTeam,
    onSuccess: ({ id }) => {
      queryClient.setQueryData<TeamDTO[]>(teamKeys.all, (teams) =>
        teams?.filter((row) => row.id !== id),
      );
    },
  });
}
