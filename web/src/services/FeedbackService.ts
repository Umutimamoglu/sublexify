import api from './api';

export interface MediaRequest {
    id?: number;
    userId?: number;
    userName?: string;
    userEmail?: string;
    tmdbId: number;
    imdbId?: string;
    title: string;
    posterPath?: string;
    mediaType: string;
    status?: string;
    createdAt?: string;
}

export interface Feedback {
    id?: number;
    userId?: number;
    userName?: string;
    userEmail?: string;
    message: string;
    category: string;
    createdAt?: string;
}

const FeedbackService = {
    getAllRequests: async (): Promise<MediaRequest[]> => {
        const response = await api.get('/feedback/media-requests');
        return response.data;
    },

    getAllFeedbacks: async (): Promise<Feedback[]> => {
        const response = await api.get('/feedback');
        return response.data;
    },

    updateRequestStatus: async (id: number, status: string): Promise<void> => {
        await api.put(`/feedback/media-requests/${id}/status`, { status });
    },

    submitMediaRequests: async (requests: MediaRequest[]): Promise<void> => {
        await api.post('/feedback/media-request', requests);
    },

    submitFeedback: async (data: { message: string, category: string }): Promise<void> => {
        await api.post('/feedback/submit', data);
    },

    searchTmdb: async (query: string, type: 'movie' | 'tv') => {
        if (!query || query.length < 2) return [];
        const response = await api.get(`/media/tmdb/search?query=${query}&type=${type}`);
        return response.data;
    }
};

export default FeedbackService;
