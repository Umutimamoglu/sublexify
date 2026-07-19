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
import MembershipPage from '@/pages/MembershipPage';
import MediaRequestPage from '@/pages/MediaRequestPage';
import FeedbackPage from '@/pages/FeedbackPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import VocabularyPage from '@/pages/VocabularyPage';
import ProtectedRoute from '@/components/ProtectedRoute';

import NotificationsPage from '@/pages/NotificationsPage';
import SettingsPage from '@/pages/SettingsPage';
import OnboardingPage from '@/pages/OnboardingPage';
import AppTour from '@/components/features/AppTour';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useEffect } from 'react';

function App() {
  const { themePreference } = useSettingsStore();

  useEffect(() => {
    const isDark = themePreference === 'dark' || (themePreference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    
    // Listen for system theme changes if set to system
    if (themePreference === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle('dark', e.matches);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themePreference]);

  return (
    <BrowserRouter>
      <AppTour />
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
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/membership" element={<MembershipPage />} />
            <Route path="profile/settings" element={<SettingsPage />} />
            <Route path="profile/media-request" element={<MediaRequestPage />} />
            <Route path="profile/feedback" element={<FeedbackPage />} />
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
