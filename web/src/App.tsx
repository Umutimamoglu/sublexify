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
import ProgressCategoryPage from '@/pages/ProgressCategoryPage';
import ProfilePage from '@/pages/ProfilePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import VocabularyPage from '@/pages/VocabularyPage';
import ProtectedRoute from '@/components/ProtectedRoute';

import SettingsPage from '@/pages/SettingsPage';
import OnboardingPage from '@/pages/OnboardingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth pages (no layout) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* App routes inside layout */}
        <Route path="/" element={<MainLayout />}>
          {/* Public */}
          <Route index element={<LandingPage />} />
          <Route path="browse/:type" element={<BrowsePage />} />
          <Route path="series/:tmdbId" element={<SeriesDetailPage />} />
          <Route path="media/:id" element={<MediaDetailPage />} />
          <Route path="onboarding" element={<OnboardingPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="lists" element={<UserListsPage />} />
            <Route path="study/:listId" element={<StudyPage />} />
            <Route path="vocabulary" element={<VocabularyPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/settings" element={<SettingsPage />} />
            <Route path="progress" element={<ProgressDashboard />} />
            <Route path="progress/:category" element={<ProgressCategoryPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
