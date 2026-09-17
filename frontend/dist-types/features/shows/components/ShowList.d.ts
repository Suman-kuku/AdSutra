import type { ShowDTO } from '@scriptcraft/shared';
/**
 * The left rail of the shows page. Rows are links rather than buttons so a
 * show stays a URL — `/shows/:id` is shareable and survives a refresh, which
 * a selection held in component state would not.
 */
export declare function ShowList({ shows }: {
    shows: ShowDTO[];
}): React.JSX.Element;
//# sourceMappingURL=ShowList.d.ts.map