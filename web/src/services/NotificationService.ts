import api from './api';

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    deviceCount: number;
}

const NotificationService = {
    getRecipients: async (): Promise<AdminUser[]> => {
        const response = await api.get('/admin/notifications/recipients');
        return response.data;
    },

    sendToUser: async (
        userId: number,
        title: string,
        body: string,
        url?: string,
        imageUrl?: string
    ): Promise<void> => {
        await api.post('/admin/notifications/send', { userId, title, body, url, imageUrl });
    },

    broadcast: async (
        title: string,
        body: string,
        url?: string,
        imageUrl?: string
    ): Promise<void> => {
        await api.post('/admin/notifications/broadcast', { title, body, url, imageUrl });
    },
};

export default NotificationService;
