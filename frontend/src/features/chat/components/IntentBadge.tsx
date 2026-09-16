import type { Intent, RouteSource } from '@scriptcraft/shared';

interface Props {
  intent: Intent;
  source: RouteSource;
  confidence?: number;
}

const INTENT_LABEL: Record<Intent, string> = {
  CREATE: 'Creating promo',
  EDIT: 'Refining promo',
  QUESTION: 'Answering',
};

const INTENT_STYLE: Record<Intent, string> = {
  CREATE: 'bg-indigo-50 text-indigo-700',
  EDIT: 'bg-amber-50 text-amber-700',
  QUESTION: 'bg-slate-100 text-slate-700',
};

const SOURCE_LABEL: Record<RouteSource, string> = {
  forced: 'chosen',
  precondition: '@mention',
  classifier: 'auto-detected',
};

/** Shows what the router decided for this turn — emitted first over SSE so the UI can react immediately. */
export function IntentBadge({ intent, source, confidence }: Props): React.JSX.Element {
  const pct = confidence !== undefined ? ` · ${Math.round(confidence * 100)}%` : '';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${INTENT_STYLE[intent]}`}
      title={`Routed by ${SOURCE_LABEL[source]}${pct}`}
    >
      {INTENT_LABEL[intent]}
      <span className="text-[10px] font-normal opacity-70">({SOURCE_LABEL[source]})</span>
    </span>
  );
}
