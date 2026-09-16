import { z } from 'zod';

/** Body of POST /shows. Shared by the Express validator and the React form. */
export const createShowSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(2000).nullish(),
  genre: z.string().trim().max(100).nullish(),
  language: z.string().trim().max(50).nullish(),
});

export type CreateShowInput = z.infer<typeof createShowSchema>;
