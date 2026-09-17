import type { Enums, PersonAdminDTO, UpdatePersonRoleInput } from '@scriptcraft/shared';
import { apiFetch } from '../../../services/api.client';

export type AccessStatus = Enums<'access_status'>;

export function fetchPeople(status: AccessStatus): Promise<PersonAdminDTO[]> {
  return apiFetch<PersonAdminDTO[]>(`/admin/people?status=${status}`);
}

export function updatePersonRole(
  id: string,
  input: UpdatePersonRoleInput,
): Promise<PersonAdminDTO> {
  return apiFetch<PersonAdminDTO>(`/admin/people/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** Grants access — a waitlist approval, or giving a removed person access back. */
export function approvePerson(id: string): Promise<PersonAdminDTO> {
  return apiFetch<PersonAdminDTO>(`/admin/people/${id}/approve`, { method: 'POST' });
}

/** "Remove" and "Reject" are the same write: access denied. Nothing is deleted. */
export function denyPerson(id: string): Promise<PersonAdminDTO> {
  return apiFetch<PersonAdminDTO>(`/admin/people/${id}/deny`, { method: 'POST' });
}
