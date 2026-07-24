import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppTour from '@/components/features/AppTour';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useListPreferencesStore } from '@/store/useListPreferencesStore';
import { useEffect, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import AuthService from '@/services/AuthService';

// The landing page is the entry route for every visitor, so it ships in the
// main bundle: code-splitting it only adds a round trip before the page can
import { HelmetProvider } from 'react-helmet-async';
import LandingPage from '@/pages/LandingPage';

// Lazy loaded pages
const BrowsePage = lazy(() => import('@/pages/BrowsePage'));
const SeriesDetailPage = lazy(() => import('@/pages/SeriesDetailPage'));
const MediaDetailPage = lazy(() => import('@/pages/MediaDetailPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const UserListsPage = lazy(() => import('@/pages/UserListsPage'));
const StudyPage = lazy(() => import('@/pages/StudyPage'));
const ProgressDashboard = lazy(() => import('@/pages/ProgressDashboard'));
const ProgressCategoryPage = lazy(() => import('@/pages/ProgressCategoryPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const MembershipPage = lazy(() => import('@/pages/MembershipPage'));
const MediaRequestPage = lazy(() => import('@/pages/MediaRequestPage'));
const FeedbackPage = lazy(() => import('@/pages/FeedbackPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const VocabularyPage = lazy(() => import('@/pages/VocabularyPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));

const PageLoader = () => (
  <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
  </div>
);

function App() {
  const { themePreference } = useSettingsStore();
  const { isAuthenticated, setAuth, token, clearAuth } = useAuthStore();
  const { fetchHiddenLists } = useListPreferencesStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchHiddenLists();
      // Fetch fresh user data (e.g. to sync premium status if it expired)
      AuthService.me().then(freshUser => {
        setAuth(freshUser, token);
      }).catch(err => {
        if (err.response?.status === 401) {
          clearAuth();
        }
      });
    }
  }, [isAuthenticated, fetchHiddenLists, setAuth, token, clearAuth]);

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
    <HelmetProvider>
      <BrowserRouter>
        <AppTour />
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
