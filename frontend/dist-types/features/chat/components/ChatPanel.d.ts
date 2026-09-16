import type { EpisodeDTO } from '@scriptcraft/shared';
/**
 * The promo chat for one episode. A conversation is created lazily on the
 * first turn, so opening an episode does not litter the database with empty
 * threads. Every turn — CREATE, EDIT, or QUESTION — goes through the same
 * `/generate` endpoint; the backend router decides which one it is.
 *
 * Nothing is written to `promos` by chat turns themselves: the draft lives in
 * the transcript until the user clicks Save.
 */
export declare function ChatPanel({ episode }: {
    episode: EpisodeDTO;
}): React.JSX.Element;
//# sourceMappingURL=ChatPanel.d.ts.map