import { create } from 'zustand';

type User = {
    id: number;
    email: string;
    name: string;
    role: string;
    plan?: 'FREE' | 'PREMIUM';
    isPremium?: boolean;
    premiumUntil?: string | null;
    features?: string[];
};

type AuthState = {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoginModalOpen: boolean;
    loginModalMessage: string | null;
    setAuth: (user: User, token: string) => void;
    clearAuth: () => void;
    openLoginModal: (message?: string) => void;
    closeLoginModal: () => void;
};

export const useAuthStore = create<AuthState>()((set) => {
    // Restore from localStorage on init
    const storedToken = localStorage.getItem('sublex-token');
    const storedUser = localStorage.getItem('sublex-user');

    return {
        user: storedUser ? JSON.parse(storedUser) : null,
        token: storedToken,
        isAuthenticated: !!storedToken,
        isLoginModalOpen: false,
        loginModalMessage: null,

        setAuth: (user, token) => {
            localStorage.setItem('sublex-token', token);
            localStorage.setItem('sublex-user', JSON.stringify(user));
            set({ user, token, isAuthenticated: true });
        },

        clearAuth: () => {
            localStorage.removeItem('sublex-token');
            localStorage.removeItem('sublex-user');
            set({ user: null, token: null, isAuthenticated: false });
        },

        openLoginModal: (message = null) => {
            set({ isLoginModalOpen: true, loginModalMessage: message });
        },

        closeLoginModal: () => {
            set({ isLoginModalOpen: false, loginModalMessage: null });
        },
    };
});
