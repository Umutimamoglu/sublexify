import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react';

const ProtectedRoute = () => {
    const { isAuthenticated, openLoginModal } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated) {
            openLoginModal('Bu sayfaya erişmek için hesabınıza giriş yapmalısınız.');
        }
    }, [isAuthenticated, openLoginModal]);

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
