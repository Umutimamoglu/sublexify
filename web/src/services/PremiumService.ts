import api from './api';

export interface AdminPremiumUser {
    id: number;
    email: string;
    name: string;
    role: string;
    plan: 'FREE' | 'PREMIUM';
    isPremium: boolean;
    premiumUntil?: string | null;
    premiumSince?: string | null;
    createdAt: string;
}

export interface SubscriptionRow {
    id: number;
    provider: string;
    plan: string;
    status: string;
    startedAt?: string | null;
    currentPeriodEnd?: string | null;
    canceledAt?: string | null;
    externalId?: string | null;
    price?: number | null;
    currency?: string | null;
    invoiceId?: string | null;
    note?: string | null;
    createdAt: string;
}

export interface GrantPremiumBody {
    days?: number;
    lifetime?: boolean;
    note?: string;
}

const PremiumService = {
    searchUsers: async (search = ''): Promise<AdminPremiumUser[]> => {
        const res = await api.get<AdminPremiumUser[]>('/admin/users', { params: { search } });
        return res.data;
    },

    grantPremium: async (userId: number, body: GrantPremiumBody): Promise<AdminPremiumUser> => {
        const res = await api.post<AdminPremiumUser>(`/admin/users/${userId}/premium`, body);
        return res.data;
    },

    revokePremium: async (userId: number): Promise<AdminPremiumUser> => {
        const res = await api.delete<AdminPremiumUser>(`/admin/users/${userId}/premium`);
        return res.data;
    },

    getSubscriptions: async (userId: number): Promise<SubscriptionRow[]> => {
        const res = await api.get<SubscriptionRow[]>(`/admin/users/${userId}/subscriptions`);
        return res.data;
    },
};

export default PremiumService;
