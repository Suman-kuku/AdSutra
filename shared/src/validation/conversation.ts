import { z } from 'zod';

/** Body of POST /conversations. */
export const createConversationSchema = z.object({
  episodeId: z.string().uuid(),
  title: z.string().trim().max(200).nullish(),
  /** Optional starting skill file; the user can also pick one later via @mention. */
  skillFileId: z.string().uuid().nullish(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
