import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { ShowsPage } from '../pages/ShowsPage';
import { ShowDetailPage } from '../pages/ShowDetailPage';
import { EpisodeDetailPage } from '../pages/EpisodeDetailPage';
import { SkillFilesPage } from '../pages/SkillFilesPage';
import { SkillFileDetailPage } from '../pages/SkillFileDetailPage';
import { SkillFileChatPage } from '../pages/SkillFileChatPage';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<ShowsPage />} />
          <Route path="/shows/:id" element={<ShowDetailPage />} />
          <Route path="/episodes/:id" element={<EpisodeDetailPage />} />
          <Route path="/skill-files" element={<SkillFilesPage />} />
          <Route path="/skill-files/:slug" element={<SkillFileDetailPage />} />
          <Route path="/skill-files/:slug/chat" element={<SkillFileChatPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
