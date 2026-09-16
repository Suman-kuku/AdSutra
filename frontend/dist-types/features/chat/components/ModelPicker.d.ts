import { type SelectableModelId } from '@scriptcraft/shared';
interface Props {
    value: SelectableModelId;
    disabled: boolean;
    onChange: (model: SelectableModelId) => void;
}
/**
 * Picks which model generates promos in this chat. Applies to every turn —
 * generate, refine, and questions alike — but never to intent classification,
 * which always runs on the backend's `CLASSIFIER_MODEL`.
 *
 * A custom popover rather than a `<select>` so each model can carry a one-line
 * hint; native option elements can't be styled to show one. It sits in the
 * composer at the bottom of the page, so the list opens upward.
 */
export declare function ModelPicker({ value, disabled, onChange }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=ModelPicker.d.ts.map