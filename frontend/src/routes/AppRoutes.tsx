import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { ShowsPage } from '../pages/ShowsPage';
import { EpisodeDetailPage } from '../pages/EpisodeDetailPage';
import { SkillFilesPage } from '../pages/SkillFilesPage';
import { SkillFileDetailPage } from '../pages/SkillFileDetailPage';
import { SkillFileChatPage } from '../pages/SkillFileChatPage';
import { PeoplePage } from '../pages/PeoplePage';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';

export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          {/* One page, two URLs: the shows rail is always on screen, and
              `/shows/:id` only decides which show fills the right pane. */}
          <Route path="/" element={<ShowsPage />} />
          <Route path="/shows/:id" element={<ShowsPage />} />
          <Route path="/episodes/:id" element={<EpisodeDetailPage />} />
          <Route path="/skill-files" element={<SkillFilesPage />} />
          <Route path="/skill-files/:slug" element={<SkillFileDetailPage />} />
          <Route path="/skill-files/:slug/chat" element={<SkillFileChatPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/people" element={<PeoplePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
