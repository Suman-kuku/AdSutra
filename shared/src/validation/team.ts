import { z } from 'zod';

/** Body of POST /teams. */
export const createTeamSchema = z.object({
  name: z.string().trim().min(1, 'Team name is required').max(100),
  /** The whole membership, not a delta — see `setMembers` in team.service. */
  memberIds: z.array(z.string().uuid()).max(200).default([]),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

/** Body of PATCH /teams/:id. Either field may be sent on its own. */
export const updateTeamSchema = z
  .object({
    name: z.string().trim().min(1, 'Team name is required').max(100).optional(),
    memberIds: z.array(z.string().uuid()).max(200).optional(),
  })
  .refine((body) => body.name !== undefined || body.memberIds !== undefined, {
    message: 'Nothing to update',
  });

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
