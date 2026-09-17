import type { CreateTeamInput, TeamDTO, UpdateTeamInput } from '@scriptcraft/shared';
import { apiFetch } from '../../../services/api.client';

export function fetchTeams(): Promise<TeamDTO[]> {
  return apiFetch<TeamDTO[]>('/teams');
}

export function createTeam(input: CreateTeamInput): Promise<TeamDTO> {
  return apiFetch<TeamDTO>('/teams', { method: 'POST', body: JSON.stringify(input) });
}

export function updateTeam(id: string, input: UpdateTeamInput): Promise<TeamDTO> {
  return apiFetch<TeamDTO>(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteTeam(id: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/teams/${id}`, { method: 'DELETE' });
}
