import 'dotenv/config';
import { z } from 'zod';

/**
 * Every environment variable the backend reads, validated once at boot.
 * Importing this module anywhere guarantees the process has a valid config —
 * or it exits before serving a single request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),

  /** Sign-in is restricted to this email domain. See CLAUDE.md §4. */
  ALLOWED_EMAIL_DOMAIN: z.string().min(1).default('kukufm.com'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  // Backend only. This key bypasses RLS — it must never reach the browser.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // OpenAI-compatible LiteLLM gateway. The model must be on the team's allow list.
  LITELLM_API_KEY: z.string().min(1, 'LITELLM_API_KEY is required'),
  LITELLM_BASE_URL: z.string().url(),
  LITELLM_MODEL: z.string().min(1),
  // Intent classifier — deliberately separate from LITELLM_MODEL so a cheap/fast
  // model can be used for routing without touching promo generation quality.
  CLASSIFIER_MODEL: z.string().min(1, 'CLASSIFIER_MODEL is required'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }

  return parsed.data;
}

export const env: Env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
