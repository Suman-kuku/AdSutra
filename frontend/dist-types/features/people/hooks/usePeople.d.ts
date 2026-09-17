import type { Enums, PersonAdminDTO } from '@scriptcraft/shared';
import type { AccessStatus } from '../services/people.service';
export declare const peopleKeys: {
    all: readonly ["people"];
    byStatus: (status: AccessStatus) => readonly ["people", "pending" | "approved" | "denied"];
};
export declare function usePeople(status: AccessStatus): import("@tanstack/react-query").UseQueryResult<PersonAdminDTO[], Error>;
/** The waitlist count in the tab label — kept loaded whichever tab is open. */
export declare function useWaitlistCount(): number | null;
export declare function useUpdatePersonRole(): import("@tanstack/react-query").UseMutationResult<PersonAdminDTO, Error, {
    id: string;
    role: Enums<"user_role">;
}, unknown>;
export declare function useApprovePerson(): import("@tanstack/react-query").UseMutationResult<PersonAdminDTO, Error, string, unknown>;
export declare function useDenyPerson(): import("@tanstack/react-query").UseMutationResult<PersonAdminDTO, Error, string, unknown>;
//# sourceMappingURL=usePeople.d.ts.map