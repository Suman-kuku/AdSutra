import type { Enums } from './db.js';

/**
 * Cross-boundary DTOs. Everything the frontend and backend both need lives here
 * — never duplicated on either side.
 *
 * Feature DTOs (PromoDTO, SkillFileDTO, …) get added by the feature that needs
 * them, not up front.
 */

/** Uniform envelope for every JSON response the API returns. */
export type APIResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: APIErrorBody };

export interface APIErrorBody {
  /** Stable machine-readable code, e.g. 'NOT_FOUND'. Never a stack trace. */
  code: string;
  message: string;
}

/**
 * A signed-in person. Derived from the `people` row so it cannot drift from the
 * schema — camelCased for the API boundary.
 */
export interface PersonDTO {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: Enums<'user_role'>;
  isActive: boolean;
}

/** A show, as the API exposes it. */
export interface ShowDTO {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  genre: string | null;
  language: string | null;
  defaultSkillFileId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** An episode, as the API exposes it. `extractedText` is deliberately omitted —
 * it can be megabytes, and only the parsing job and prompt builder need it. */
export interface EpisodeDTO {
  id: string;
  showId: string;
  episodeNumber: number;
  title: string | null;
  scriptPath: string | null;
  scriptFilename: string | null;
  scriptMime: string | null;
  fileSize: number | null;
  pageCount: number | null;
  status: Enums<'episode_status'>;
  parseError: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A chat thread. `kind` says what it is about: an episode (the promo chat) or
 * a skill file (CLAUDE.md section 12). Exactly one of `episodeId` /
 * `skillFileSlug` is set, enforced by a check constraint.
 */
export interface ConversationDTO {
  id: string;
  kind: Enums<'conversation_kind'>;
  episodeId: string | null;
  skillFileSlug: string | null;
  createdBy: string;
  title: string | null;
  activeSkillFileId: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  archived: boolean;
  createdAt: string;
}

/** One turn in a conversation. The transcript is append-only — never edited. */
export interface MessageDTO {
  id: string;
  conversationId: string;
  role: Enums<'message_role'>;
  content: string;
  skillFileId: string | null;
  promoId: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  error: string | null;
  createdAt: string;
}

/** A skill file version, as the API exposes it. `rawMd` is omitted — detail only. */
export interface SkillFileDTO {
  id: string;
  slug: string;
  version: number;
  name: string;
  category: string;
  description: string | null;
  language: string | null;
  tags: string[];
  defaultDurationSec: number | null;
  model: string | null;
  temperature: number | null;
  isActive: boolean;
  changelog: string | null;
  uploadedBy: string | null;
  /** Byte length of the `.md`, not character count — skill files carry Devanagari. */
  sizeBytes: number;
  createdAt: string;
}

/** GET /skill-files/:slug — the active version plus its prompt body. */
export interface SkillFileDetailDTO extends SkillFileDTO {
  promptBody: string;
  rawMd: string;
}

/**
 * GET /skill-files — one row per slug, with the numbers the library list shows.
 *
 * `totalUses` counts promos made from *any* version of the slug and is
 * library-wide, not per-person: this is a shared library, so "uses" that only
 * counted your own promos would read as a global signal and mislead.
 */
export interface SkillFileSummaryDTO extends SkillFileDTO {
  /** How many versions this slug has, including retired ones. */
  versionCount: number;
  totalUses: number;
}

/** GET /skill-files/:slug/versions — every version, with what each produced. */
export interface SkillFileVersionDTO extends SkillFileDTO {
  /** Promos made with this exact version. Library-wide, like `totalUses`. */
  uses: number;
}

/**
 * Response of POST /conversations/:id/save-promo — the chat's current draft,
 * now persisted as a versioned `promos` row.
 */
export interface SavedPromoDTO {
  id: string;
  version: number;
  rootPromoId: string;
  parentPromoId: string | null;
  skillFileId: string | null;
  /** Snapshotted by the promos trigger — labels a promo without a second lookup. */
  skillFileSlug: string | null;
  content: string;
  createdAt: string;
}

/** Response of GET /episodes/:id/script — the parsed text, fetched on demand. */
export interface EpisodeScriptDTO {
  episodeId: string;
  text: string;
  pageCount: number | null;
}

/** Response of GET /episodes/:id/script-url — short-lived link to the original file. */
export interface ScriptFileUrlDTO {
  url: string;
  expiresInSeconds: number;
}

/** Response of POST /episodes/upload-url. */
export interface UploadTicketDTO {
  /** Pre-allocated episode id — send it back with POST /episodes. */
  episodeId: string;
  /** Storage key: {showId}/{episodeId}/{filename} */
  path: string;
  signedUrl: string;
  token: string;
}

/** Payload of GET /health. */
export interface HealthStatus {
  status: 'ok';
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}
