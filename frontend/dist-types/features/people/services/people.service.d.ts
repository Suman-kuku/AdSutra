import type { Enums, PersonAdminDTO, UpdatePersonRoleInput } from '@scriptcraft/shared';
export type AccessStatus = Enums<'access_status'>;
export declare function fetchPeople(status: AccessStatus): Promise<PersonAdminDTO[]>;
export declare function updatePersonRole(id: string, input: UpdatePersonRoleInput): Promise<PersonAdminDTO>;
/** Grants access — a waitlist approval, or giving a removed person access back. */
export declare function approvePerson(id: string): Promise<PersonAdminDTO>;
/** "Remove" and "Reject" are the same write: access denied. Nothing is deleted. */
export declare function denyPerson(id: string): Promise<PersonAdminDTO>;
//# sourceMappingURL=people.service.d.ts.map