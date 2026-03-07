import api from './api';

export interface StudyQuestion {
    wordId: number;
    word: string;
    definition: string;
    exampleSentence: string;
    difficulty: string;
    questionType: 'MULTIPLE_CHOICE' | 'FILL_IN_THE_BLANKS' | 'LISTENING';
    options?: string[];
}

export interface StudyResult {
    wordId: number;
    isCorrect: boolean;
}

const StudyService = {
    getNextBatch: async (userId: number, listId: number, size: number = 10): Promise<StudyQuestion[]> => {
        const response = await api.get<StudyQuestion[]>('/study/next-batch', {
            params: { userId, listId, size },
        });
        return response.data;
    },

    processStudyResults: async (userId: number, results: StudyResult[]): Promise<void> => {
        await api.post('/study/result', results, {
            params: { userId },
        });
    }
};

export default StudyService;
