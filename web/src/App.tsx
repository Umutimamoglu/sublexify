import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import LandingPage from '@/pages/LandingPage';
import BrowsePage from '@/pages/BrowsePage';
import SeriesDetailPage from '@/pages/SeriesDetailPage';
import MediaDetailPage from '@/pages/MediaDetailPage';
import AdminPage from '@/pages/AdminPage';
import UserListsPage from '@/pages/UserListsPage';
import StudyPage from '@/pages/StudyPage';
import ProgressDashboard from '@/pages/ProgressDashboard';
import MasteredWordsPage from '@/pages/MasteredWordsPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ProtectedRoute from '@/components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth pages (no layout) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* App routes inside layout */}
        <Route path="/" element={<MainLayout />}>
          {/* Public */}
          <Route index element={<LandingPage />} />
          <Route path="browse/:type" element={<BrowsePage />} />
          <Route path="series/:tmdbId" element={<SeriesDetailPage />} />
          <Route path="media/:id" element={<MediaDetailPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="lists" element={<UserListsPage />} />
            <Route path="study/:listId" element={<StudyPage />} />
            <Route path="progress" element={<ProgressDashboard />} />
            <Route path="progress/mastered" element={<MasteredWordsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
