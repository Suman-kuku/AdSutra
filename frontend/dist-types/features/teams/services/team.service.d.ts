import type { CreateTeamInput, TeamDTO, UpdateTeamInput } from '@scriptcraft/shared';
export declare function fetchTeams(): Promise<TeamDTO[]>;
export declare function createTeam(input: CreateTeamInput): Promise<TeamDTO>;
export declare function updateTeam(id: string, input: UpdateTeamInput): Promise<TeamDTO>;
export declare function deleteTeam(id: string): Promise<{
    id: string;
}>;
//# sourceMappingURL=team.service.d.ts.map