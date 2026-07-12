import api from './api';

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    deviceCount: number;
}

export interface AppNotification {
    id: number;
    title: string;
    body: string;
    type?: string;
    url?: string;
    imageUrl?: string;
    isRead: boolean;
    createdAt: string;
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

    // User Methods
    getNotifications: async (): Promise<AppNotification[]> => {
        const response = await api.get('/user/notifications');
        return response.data;
    },
    
    getUnreadCount: async (): Promise<number> => {
        const response = await api.get('/user/notifications/unread-count');
        return response.data.count;
    },
    
    markAllRead: async (): Promise<void> => {
        await api.post('/user/notifications/mark-read');
    }
};

export default NotificationService;
