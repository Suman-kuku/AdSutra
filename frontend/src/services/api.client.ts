import type { APIResponse } from '@scriptcraft/shared';
import { supabase } from './supabase.client';

const BASE_URL = '/api';

/** Thrown whenever the API answers with `ok: false` or a non-JSON failure. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * The single fetch wrapper every feature uses. It unwraps the APIResponse
 * envelope so callers deal in plain data, never in `{ ok, data }`.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // Read the token from Supabase rather than React state, so a refreshed token
  // is picked up without a re-render.
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });

  let body: APIResponse<T>;
  try {
    body = (await response.json()) as APIResponse<T>;
  } catch {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'The server returned a non-JSON response.');
  }

  if (!body.ok) {
    throw new ApiError(response.status, body.error.code, body.error.message);
  }

  return body.data;
}
