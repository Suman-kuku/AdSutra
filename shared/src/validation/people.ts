import { z } from 'zod';

/** Body of PATCH /admin/people/:id/role. */
export const updatePersonRoleSchema = z.object({
  role: z.enum(['admin', 'creator']),
});

export type UpdatePersonRoleInput = z.infer<typeof updatePersonRoleSchema>;

/** Query of GET /admin/people — which access state to list. */
export const peopleListQuerySchema = z.object({
  status: z.enum(['approved', 'pending', 'denied']).default('approved'),
});

export type PeopleListQuery = z.infer<typeof peopleListQuerySchema>;
