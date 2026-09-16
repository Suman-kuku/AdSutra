import type { GenerateStreamEvent } from '@scriptcraft/shared';
/**
 * The one `text/event-stream` reader. Both streaming endpoints — the episode
 * chat's `/generate` and the skill file chat's `/chat` — emit the same
 * `GenerateStreamEvent` frames, so they share this parser rather than each
 * keeping their own copy.
 *
 * `EventSource` can neither POST nor set an Authorization header, so this
 * reads the body off `fetch` and splits the frames by hand.
 */
export interface SseHandlers {
    onIntent: (event: Extract<GenerateStreamEvent, {
        type: 'intent';
    }>) => void;
    onToken: (text: string) => void;
    onUsage: (event: Extract<GenerateStreamEvent, {
        type: 'usage';
    }>) => void;
    onDone: () => void;
    onError: (message: string) => void;
}
export declare function streamSSE(url: string, body: unknown, handlers: SseHandlers, signal?: AbortSignal): Promise<void>;
//# sourceMappingURL=sse.client.d.ts.map