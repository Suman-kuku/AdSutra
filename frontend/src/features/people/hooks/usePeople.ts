import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Enums, PersonAdminDTO } from '@scriptcraft/shared';
import * as peopleService from '../services/people.service';
import type { AccessStatus } from '../services/people.service';

export const peopleKeys = {
  all: ['people'] as const,
  byStatus: (status: AccessStatus) => ['people', status] as const,
};

export function usePeople(status: AccessStatus) {
  return useQuery<PersonAdminDTO[]>({
    queryKey: peopleKeys.byStatus(status),
    queryFn: () => peopleService.fetchPeople(status),
  });
}

/** The waitlist count in the tab label — kept loaded whichever tab is open. */
export function useWaitlistCount(): number | null {
  const { data } = usePeople('pending');
  return data?.length ?? null;
}

export function useUpdatePersonRole() {
  const queryClient = useQueryClient();
  return useMutation<PersonAdminDTO, Error, { id: string; role: Enums<'user_role'> }>({
    mutationFn: ({ id, role }) => peopleService.updatePersonRole(id, { role }),
    onSuccess: (person) => {
      // Patch the row in place: refetching would re-sort the table under the
      // cursor the moment a role changes.
      queryClient.setQueryData<PersonAdminDTO[]>(peopleKeys.byStatus('approved'), (rows) =>
        rows?.map((row) => (row.id === person.id ? person : row)),
      );
    },
  });
}

/**
 * Approve and deny both move a person between lists, so both invalidate every
 * list rather than patching one — the row has to leave one tab and appear in
 * another.
 */
function useAccessMutation(mutationFn: (id: string) => Promise<PersonAdminDTO>) {
  const queryClient = useQueryClient();
  return useMutation<PersonAdminDTO, Error, string>({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}

export function useApprovePerson() {
  return useAccessMutation(peopleService.approvePerson);
}

export function useDenyPerson() {
  return useAccessMutation(peopleService.denyPerson);
}
