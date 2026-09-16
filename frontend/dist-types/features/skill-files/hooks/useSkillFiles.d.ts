import type { SkillFileDetailDTO, SkillFileSummaryDTO, SkillFileVersionDTO } from '@scriptcraft/shared';
export declare const skillFileKeys: {
    all: readonly ["skill-files"];
    list: (category?: string) => readonly ["skill-files", {
        readonly category: string | null;
    }];
    allVersions: () => readonly ["skill-files", {
        readonly versions: "all";
    }];
    detail: (slug: string) => readonly ["skill-files", string];
    versions: (slug: string) => readonly ["skill-files", string, "versions"];
};
export declare function useSkillFiles(category?: string): import("@tanstack/react-query").UseQueryResult<SkillFileSummaryDTO[], Error>;
/**
 * Every version of every skill file, newest first within each slug — what the
 * chat's `@` picker lists, so a promo can be generated from a retired version
 * and not only the current one.
 *
 * Deliberately a separate cache entry from `useSkillFiles`: the library list
 * and this one differ in both contents and ordering, and sharing a key would
 * make whichever page loaded last win.
 */
export declare function useAllSkillFileVersions(): import("@tanstack/react-query").UseQueryResult<SkillFileSummaryDTO[], Error>;
export declare function useSkillFile(slug: string): import("@tanstack/react-query").UseQueryResult<SkillFileDetailDTO, Error>;
/** `enabled` lets the library list hold off until a row is actually expanded. */
export declare function useSkillFileVersions(slug: string, enabled?: boolean): import("@tanstack/react-query").UseQueryResult<SkillFileVersionDTO[], Error>;
export declare function useUploadSkillFile(): import("@tanstack/react-query").UseMutationResult<SkillFileDetailDTO, Error, File, unknown>;
//# sourceMappingURL=useSkillFiles.d.ts.map