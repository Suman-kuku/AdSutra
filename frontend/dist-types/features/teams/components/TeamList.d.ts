import type { TeamDTO } from '@scriptcraft/shared';
interface Props {
    teams: TeamDTO[];
    onEdit: (team: TeamDTO) => void;
    onDelete: (team: TeamDTO) => void;
}
export declare function TeamList({ teams, onEdit, onDelete }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=TeamList.d.ts.map