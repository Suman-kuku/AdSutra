import type { CreateShowInput, ShowDTO } from '@scriptcraft/shared';
import { apiFetch } from '../../../services/api.client';

export function fetchShows(): Promise<ShowDTO[]> {
  return apiFetch<ShowDTO[]>('/shows');
}

export function fetchShow(id: string): Promise<ShowDTO> {
  return apiFetch<ShowDTO>(`/shows/${id}`);
}

export function createShow(input: CreateShowInput): Promise<ShowDTO> {
  return apiFetch<ShowDTO>('/shows', { method: 'POST', body: JSON.stringify(input) });
}
