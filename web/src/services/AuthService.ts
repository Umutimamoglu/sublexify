import api from './api';

export interface AuthRequest {
    email: string;
    password: string;
    name?: string;
}

export interface AuthUser {
    id: number;
    email: string;
    name: string;
    role: string;
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
};

export default AuthService;
