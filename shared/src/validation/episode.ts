import { z } from 'zod';

/** Scripts are PDFs today; the bucket also accepts docx and plain text. */
export const SCRIPT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

/** 25 MB — matches the `scripts` bucket's file_size_limit. */
export const MAX_SCRIPT_BYTES = 26_214_400;

/** Body of POST /episodes/upload-url. */
export const uploadUrlSchema = z.object({
  showId: z.string().uuid(),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(SCRIPT_MIME_TYPES),
});

export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;

/** Body of POST /episodes — sent after the file has landed in Storage. */
export const createEpisodeSchema = z.object({
  id: z.string().uuid(),
  showId: z.string().uuid(),
  episodeNumber: z.number().int().positive(),
  title: z.string().trim().max(200).nullish(),
  scriptPath: z.string().trim().min(1),
  scriptFilename: z.string().trim().min(1).max(255),
  scriptMime: z.enum(SCRIPT_MIME_TYPES),
  fileSize: z.number().int().positive().max(MAX_SCRIPT_BYTES),
});

export type CreateEpisodeInput = z.infer<typeof createEpisodeSchema>;
