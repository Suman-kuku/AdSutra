import type { MessageDTO } from '@scriptcraft/shared';
interface Props {
    messages: MessageDTO[];
    streamingText: string;
    isGenerating: boolean;
    /** The turn in flight, rendered before the server's copy arrives. */
    pendingMessage: string | null;
}
export declare function MessageList({ messages, streamingText, isGenerating, pendingMessage, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=MessageList.d.ts.map