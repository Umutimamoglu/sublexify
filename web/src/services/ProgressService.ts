import api from './api';
import { Word } from './WordListService';

export interface ProgressStats {
    totalWordsLearnt: number;
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
    },

    getLearntWords: async (): Promise<Word[]> => {
    const response = await api.get('/progress/words/learnt');
    return response.data;
  },

  getStudiedWords: async (): Promise<Word[]> => {
    const response = await api.get('/progress/words/studied');
    return response.data;
  },

  getDueWords: async (): Promise<Word[]> => {
    const response = await api.get('/progress/words/due');
    return response.data;
  },

  getMasteredWords: async (): Promise<Word[]> => {
    const response = await api.get('/progress/words/mastered');
    return response.data;
  },
};

export default ProgressService;
