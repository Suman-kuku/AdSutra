import type {
  SkillFileDetailDTO,
  SkillFileSummaryDTO,
  SkillFileVersionDTO,
} from '@scriptcraft/shared';
import { MAX_SKILL_FILE_BYTES } from '@scriptcraft/shared';
import { apiFetch } from '../../../services/api.client';

export function fetchSkillFiles(
  category?: string,
  includeAllVersions = false,
): Promise<SkillFileSummaryDTO[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (includeAllVersions) params.set('versions', 'all');
  const query = params.size > 0 ? `?${params.toString()}` : '';
  return apiFetch<SkillFileSummaryDTO[]>(`/skill-files${query}`);
}

export function fetchSkillFile(slug: string): Promise<SkillFileDetailDTO> {
  return apiFetch<SkillFileDetailDTO>(`/skill-files/${slug}`);
}

export function fetchSkillFileVersions(slug: string): Promise<SkillFileVersionDTO[]> {
  return apiFetch<SkillFileVersionDTO[]>(`/skill-files/${slug}/versions`);
}

/** Reads the `.md` in the browser and posts it as text — no multipart needed. */
export async function uploadSkillFile(file: File): Promise<SkillFileDetailDTO> {
  if (!/\.md$/i.test(file.name)) {
    throw new Error('Skill files must be Markdown (.md).');
  }
  if (file.size > MAX_SKILL_FILE_BYTES) {
    throw new Error('That file is larger than the 1 MB limit.');
  }

  const content = await file.text();
  return apiFetch<SkillFileDetailDTO>('/skill-files', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, content }),
  });
}
