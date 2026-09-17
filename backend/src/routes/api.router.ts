import { Router } from 'express';
import type { APIResponse, HealthStatus } from '@scriptcraft/shared';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { createSession, getMe } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.js';
import {
  createConversationSchema,
  generateRequestSchema,
  createEpisodeSchema,
  createShowSchema,
  publishRequestSchema,
  updateVersionRequestSchema,
  skillChatRequestSchema,
  createTeamSchema,
  updatePersonRoleSchema,
  updateTeamSchema,
  uploadSkillFileSchema,
  uploadUrlSchema,
} from '@scriptcraft/shared';
import {
  archiveConversation,
  createConversation,
  generateTurn,
  listConversations,
  listMessages,
} from '../controllers/conversation.controller.js';
import {
  clearSkillChat,
  getSkillChat,
  getSkillFile,
  getSkillFileVersionDetail,
  getSkillFileVersions,
  listSkillFilePromos,
  listSkillFiles,
  postSkillChat,
  publishSkillFile,
  updateSkillFileVersion,
  uploadSkillFile,
} from '../controllers/skill-file.controller.js';
import {
  createEpisode,
  createUploadUrl,
  deleteEpisode,
  getEpisode,
  getEpisodeScript,
  getScriptFileUrl,
  listEpisodesForShow,
} from '../controllers/episode.controller.js';
import { createShow, getShow, listShows } from '../controllers/show.controller.js';
import { deletePromo, listEpisodePromos, savePromo } from '../controllers/promo.controller.js';
import {
  createTeam,
  deleteTeam,
  listTeams,
  updateTeam,
} from '../controllers/team.controller.js';
import {
  approvePerson,
  denyPerson,
  listPeople,
  updatePersonRole,
} from '../controllers/people.controller.js';

export const apiRouter: Router = Router();

apiRouter.get('/health', (_req, res) => {
  const body: APIResponse<HealthStatus> = {
    ok: true,
    data: {
      status: 'ok',
      service: 'scriptcraft-api',
      version: process.env.npm_package_version ?? '0.0.0',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  };
  res.json(body);
});

apiRouter.post('/auth/session', requireAuth, createSession);
apiRouter.get('/me', requireAuth, getMe);

apiRouter.get('/shows', requireAuth, listShows);
apiRouter.post('/shows', requireAuth, validateBody(createShowSchema), createShow);
apiRouter.get('/shows/:id', requireAuth, getShow);

apiRouter.get('/shows/:id/episodes', requireAuth, listEpisodesForShow);
apiRouter.post('/episodes/upload-url', requireAuth, validateBody(uploadUrlSchema), createUploadUrl);
apiRouter.post('/episodes', requireAuth, validateBody(createEpisodeSchema), createEpisode);
apiRouter.get('/episodes/:id', requireAuth, getEpisode);
apiRouter.get('/episodes/:id/script', requireAuth, getEpisodeScript);
apiRouter.get('/episodes/:id/script-url', requireAuth, getScriptFileUrl);
apiRouter.delete('/episodes/:id', requireAuth, deleteEpisode);

apiRouter.get('/skill-files', requireAuth, listSkillFiles);
apiRouter.post('/skill-files', requireAuth, validateBody(uploadSkillFileSchema), uploadSkillFile);
apiRouter.get('/skill-files/:slug', requireAuth, getSkillFile);
apiRouter.get('/skill-files/:slug/versions', requireAuth, getSkillFileVersions);
apiRouter.get('/skill-files/:slug/versions/:version', requireAuth, getSkillFileVersionDetail);
// Edit in place — no new row. `/publish` is the other save path.
apiRouter.put(
  '/skill-files/:slug/versions/:version',
  requireAuth,
  validateBody(updateVersionRequestSchema),
  updateSkillFileVersion,
);

// Skill file chat — CLAUDE.md section 12. The chat never writes `skill_files`;
// only /publish does.
apiRouter.get('/skill-files/:slug/promos', requireAuth, listSkillFilePromos);
apiRouter.get('/skill-files/:slug/chat', requireAuth, getSkillChat);
apiRouter.post(
  '/skill-files/:slug/chat',
  requireAuth,
  validateBody(skillChatRequestSchema),
  postSkillChat,
);
apiRouter.post('/skill-files/:slug/chat/clear', requireAuth, clearSkillChat);
apiRouter.post(
  '/skill-files/:slug/publish',
  requireAuth,
  validateBody(publishRequestSchema),
  publishSkillFile,
);

apiRouter.get('/conversations', requireAuth, listConversations);
apiRouter.post(
  '/conversations',
  requireAuth,
  validateBody(createConversationSchema),
  createConversation,
);
apiRouter.get('/conversations/:id/messages', requireAuth, listMessages);
apiRouter.post(
  '/conversations/:id/generate',
  requireAuth,
  validateBody(generateRequestSchema),
  generateTurn,
);
apiRouter.get('/episodes/:id/promos', requireAuth, listEpisodePromos);
apiRouter.post('/conversations/:id/save-promo', requireAuth, savePromo);
apiRouter.delete('/promos/:id', requireAuth, deletePromo);
apiRouter.post('/conversations/:id/archive', requireAuth, archiveConversation);

// People — admin only. Access is a status on the row; no row is ever deleted.
// ?status=approved (Active tab) | pending (waitlist) | denied.
apiRouter.get('/admin/people', requireAuth, requireAdmin, listPeople);
apiRouter.patch(
  '/admin/people/:id/role',
  requireAuth,
  requireAdmin,
  validateBody(updatePersonRoleSchema),
  updatePersonRole,
);
apiRouter.post('/admin/people/:id/approve', requireAuth, requireAdmin, approvePerson);
// Reject from the waitlist and remove from the Active tab are the same write.
apiRouter.post('/admin/people/:id/deny', requireAuth, requireAdmin, denyPerson);

// Teams — everyone can see them, only admins manage them. A team grants
// nothing on its own; it is a named group of people.
apiRouter.get('/teams', requireAuth, listTeams);
apiRouter.post('/teams', requireAuth, requireAdmin, validateBody(createTeamSchema), createTeam);
apiRouter.patch(
  '/teams/:id',
  requireAuth,
  requireAdmin,
  validateBody(updateTeamSchema),
  updateTeam,
);
apiRouter.delete('/teams/:id', requireAuth, requireAdmin, deleteTeam);
