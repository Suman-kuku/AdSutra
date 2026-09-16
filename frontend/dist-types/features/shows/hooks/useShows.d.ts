import type { ShowDTO } from '@scriptcraft/shared';
export declare const showKeys: {
    all: readonly ["shows"];
    detail: (id: string) => readonly ["shows", string];
};
export declare function useShows(): import("@tanstack/react-query").UseQueryResult<ShowDTO[], Error>;
export declare function useShow(id: string): import("@tanstack/react-query").UseQueryResult<ShowDTO, Error>;
export declare function useCreateShow(): import("@tanstack/react-query").UseMutationResult<ShowDTO, Error, {
    title: string;
    description?: string | null | undefined;
    genre?: string | null | undefined;
    language?: string | null | undefined;
}, unknown>;
//# sourceMappingURL=useShows.d.ts.map