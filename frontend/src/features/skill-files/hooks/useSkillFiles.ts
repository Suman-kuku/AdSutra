import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  SkillFileDetailDTO,
  SkillFileSummaryDTO,
  SkillFileVersionDTO,
} from '@scriptcraft/shared';
import * as skillFileService from '../services/skill-file.service';

export const skillFileKeys = {
  all: ['skill-files'] as const,
  list: (category?: string) => ['skill-files', { category: category ?? null }] as const,
  allVersions: () => ['skill-files', { versions: 'all' }] as const,
  detail: (slug: string) => ['skill-files', slug] as const,
  versions: (slug: string) => ['skill-files', slug, 'versions'] as const,
};

export function useSkillFiles(category?: string) {
  return useQuery<SkillFileSummaryDTO[]>({
    queryKey: skillFileKeys.list(category),
    queryFn: () => skillFileService.fetchSkillFiles(category),
  });
}

/**
 * Every version of every skill file, newest first within each slug — what the
 * chat's `@` picker lists, so a promo can be generated from a retired version
 * and not only the current one.
 *
 * Deliberately a separate cache entry from `useSkillFiles`: the library list
 * and this one differ in both contents and ordering, and sharing a key would
 * make whichever page loaded last win.
 */
export function useAllSkillFileVersions() {
  return useQuery<SkillFileSummaryDTO[]>({
    queryKey: skillFileKeys.allVersions(),
    queryFn: () => skillFileService.fetchSkillFiles(undefined, true),
  });
}

export function useSkillFile(slug: string) {
  return useQuery<SkillFileDetailDTO>({
    queryKey: skillFileKeys.detail(slug),
    queryFn: () => skillFileService.fetchSkillFile(slug),
    enabled: slug.length > 0,
  });
}

/** `enabled` lets the library list hold off until a row is actually expanded. */
export function useSkillFileVersions(slug: string, enabled = true) {
  return useQuery<SkillFileVersionDTO[]>({
    queryKey: skillFileKeys.versions(slug),
    queryFn: () => skillFileService.fetchSkillFileVersions(slug),
    enabled: enabled && slug.length > 0,
  });
}

export function useUploadSkillFile() {
  const queryClient = useQueryClient();
  return useMutation<SkillFileDetailDTO, Error, File>({
    mutationFn: skillFileService.uploadSkillFile,
    onSuccess: () => {
      // A new version deactivates the previous one, so every list and history
      // view is now stale.
      void queryClient.invalidateQueries({ queryKey: skillFileKeys.all });
    },
  });
}
