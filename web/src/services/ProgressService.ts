import api from './api';

export interface ProgressStats {
    totalWordsStudied: number;
    highRetentionWords: number;
    wordsToReviewToday: number;
}

const ProgressService = {
    getStats: async (userId: number): Promise<ProgressStats> => {
        const response = await api.get<ProgressStats>('/progress/stats', {
            params: { userId }
        });
        return response.data;
    }
};

export default ProgressService;
