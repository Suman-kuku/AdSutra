/** Thrown whenever the API answers with `ok: false` or a non-JSON failure. */
export declare class ApiError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(status: number, code: string, message: string);
}
/**
 * The single fetch wrapper every feature uses. It unwraps the APIResponse
 * envelope so callers deal in plain data, never in `{ ok, data }`.
 */
export declare function apiFetch<T>(path: string, init?: RequestInit): Promise<T>;
//# sourceMappingURL=api.client.d.ts.map