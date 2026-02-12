import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import LandingPage from '@/pages/LandingPage';
import BrowsePage from '@/pages/BrowsePage';
import SeriesDetailPage from '@/pages/SeriesDetailPage';
import MediaDetailPage from '@/pages/MediaDetailPage';
import AdminPage from '@/pages/AdminPage';
import UserListsPage from '@/pages/UserListsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="browse/:type" element={<BrowsePage />} />
          <Route path="series/:tmdbId" element={<SeriesDetailPage />} />
          <Route path="media/:id" element={<MediaDetailPage />} />
          <Route path="lists" element={<UserListsPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

