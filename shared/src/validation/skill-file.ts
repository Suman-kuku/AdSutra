import { z } from 'zod';

/** Lowercase, hyphen-separated. Identifies a skill file across all its versions. */
export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens');

/**
 * YAML frontmatter at the top of a skill file.
 *
 * `name` and `category` are required — `category` because ranking happens
 * *within* a category and a file with no category can never be ranked fairly
 * (see section 9). `slug` falls back to the filename when omitted.
 */
export const skillFileFrontmatterSchema = z.object({
  name: z.string().trim().min(1, 'Frontmatter must include a `name`').max(200),
  category: z.string().trim().min(1, 'Frontmatter must include a `category`').max(100),
  slug: slugSchema.optional(),
  description: z.string().trim().max(2000).nullish(),
  language: z.string().trim().max(50).nullish(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  default_duration_sec: z.coerce.number().int().positive().max(600).nullish(),
  model: z.string().trim().max(100).nullish(),
  temperature: z.coerce.number().min(0).max(2).nullish(),
  changelog: z.string().trim().max(2000).nullish(),
});

export type SkillFileFrontmatter = z.infer<typeof skillFileFrontmatterSchema>;

/** 1 MB — matches the `skill-files` bucket limit. */
export const MAX_SKILL_FILE_BYTES = 1_048_576;

/**
 * Body of POST /skill-files. The `.md` arrives as text rather than multipart:
 * these files are small, and it avoids a file-upload dependency on the server.
 */
export const uploadSkillFileSchema = z.object({
  filename: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/\.md$/i, 'Skill files must be Markdown (.md)'),
  content: z.string().min(1, 'The file is empty').max(MAX_SKILL_FILE_BYTES),
});

export type UploadSkillFileInput = z.infer<typeof uploadSkillFileSchema>;
