import type { Intent, RouteSource } from '@scriptcraft/shared';
interface Props {
    intent: Intent;
    source: RouteSource;
    confidence?: number;
}
/** Shows what the router decided for this turn — emitted first over SSE so the UI can react immediately. */
export declare function IntentBadge({ intent, source, confidence }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=IntentBadge.d.ts.map