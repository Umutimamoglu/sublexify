import api from './api';

export interface AuthRequest {
    email: string;
    password: string;
    name?: string;
}

export type PremiumFeature = 'PREMIUM_CONTENT' | 'BACKGROUND_PLAYBACK' | 'LIST_EXPORT';

export interface AuthUser {
    id: number;
    email: string;
    name: string;
    role: string;
    // Entitlement
    plan?: 'FREE' | 'PREMIUM';
    isPremium?: boolean;
    premiumUntil?: string | null;
    features?: PremiumFeature[];
}

export interface AuthResponse {
    token: string;
    user: AuthUser;
}

const AuthService = {
    login: async (data: AuthRequest): Promise<AuthResponse> => {
        const res = await api.post('/auth/login', data);
        return res.data;
    },

    register: async (data: AuthRequest): Promise<AuthResponse> => {
        const res = await api.post('/auth/register', data);
        return res.data;
    },

    me: async (): Promise<AuthUser> => {
        const res = await api.get('/auth/me');
        return res.data;
    },

    forgotPassword: async (email: string): Promise<void> => {
        await api.post('/auth/forgot-password', { email });
    },

    resetPassword: async (code: string, newPassword: string): Promise<AuthResponse> => {
        const res = await api.post('/auth/reset-password', { code, newPassword });
        return res.data;
    },
};

export default AuthService;
