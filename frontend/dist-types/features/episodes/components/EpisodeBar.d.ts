import type { EpisodeDTO } from '@scriptcraft/shared';
/**
 * The episode's identity, collapsed into one row at the top of the chat.
 *
 * It replaces the page header this screen used to carry: which episode you are
 * in matters constantly, but the file size and the original PDF matter once,
 * so only the first line is always on screen and the rest is behind the
 * chevron.
 */
export declare function EpisodeBar({ episode }: {
    episode: EpisodeDTO;
}): React.JSX.Element;
//# sourceMappingURL=EpisodeBar.d.ts.map