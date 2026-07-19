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
    setAuth: (user: User, token: string) => void;
    clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()((set) => {
    // Restore from localStorage on init
    const storedToken = localStorage.getItem('sublex-token');
    const storedUser = localStorage.getItem('sublex-user');

    return {
        user: storedUser ? JSON.parse(storedUser) : null,
        token: storedToken,
        isAuthenticated: !!storedToken,

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
    };
});
