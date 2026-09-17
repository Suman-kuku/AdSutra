import type { TeamDTO, UpdateTeamInput } from '@scriptcraft/shared';
export declare const teamKeys: {
    all: readonly ["teams"];
};
export declare function useTeams(): import("@tanstack/react-query").UseQueryResult<TeamDTO[], Error>;
export declare function useCreateTeam(): import("@tanstack/react-query").UseMutationResult<TeamDTO, Error, {
    name: string;
    memberIds: string[];
}, unknown>;
export declare function useUpdateTeam(): import("@tanstack/react-query").UseMutationResult<TeamDTO, Error, {
    id: string;
    input: UpdateTeamInput;
}, unknown>;
export declare function useDeleteTeam(): import("@tanstack/react-query").UseMutationResult<{
    id: string;
}, Error, string, unknown>;
//# sourceMappingURL=useTeams.d.ts.map