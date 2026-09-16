import type { SkillFileDetailDTO, SkillFileSummaryDTO, SkillFileVersionDTO } from '@scriptcraft/shared';
export declare function fetchSkillFiles(category?: string, includeAllVersions?: boolean): Promise<SkillFileSummaryDTO[]>;
export declare function fetchSkillFile(slug: string): Promise<SkillFileDetailDTO>;
export declare function fetchSkillFileVersions(slug: string): Promise<SkillFileVersionDTO[]>;
/** Reads the `.md` in the browser and posts it as text — no multipart needed. */
export declare function uploadSkillFile(file: File): Promise<SkillFileDetailDTO>;
//# sourceMappingURL=skill-file.service.d.ts.map