import api from './api';

export interface WordDefinition {
    word: string;
    difficulty: string;
    meanings: {
        pos: string;
        definition: string;
        example: string;
    }[];
    phrasal_verbs: {
        phrase: string;
        definition: string;
        example: string;
    }[];
    verb_forms?: {
        v1: string;
        v2: string;
        v3: string;
        ing: string;
    };
}

export interface Word {
    id: number;
    word: string;
    language: string;
    definition?: WordDefinition;
    difficulty?: string;
    isEnriched?: boolean;
    isVerified?: boolean;
    isGravityApproved?: boolean;
}

export interface WordList {
    id: number;
    name: string;
    words: Word[];
    wordCount?: number;
}

const WordListService = {
    getUserLists: async (): Promise<WordList[]> => {
        const response = await api.get<WordList[]>('/lists');
        return response.data;
    },

    getStandardLists: async (): Promise<WordList[]> => {
        const response = await api.get<WordList[]>('/lists/standard');
        return response.data;
    },

    createList: async (name: string): Promise<WordList> => {
        const response = await api.post<WordList>('/lists', null, { params: { name } });
        return response.data;
    },

    getListById: async (id: number): Promise<WordList> => {
        const response = await api.get<WordList>(`/lists/${id}`);
        return response.data;
    },

    addWordToList: async (listId: number, wordId: number): Promise<void> => {
        await api.post(`/lists/${listId}/words/${wordId}`);
    },

    removeWordFromList: async (listId: number, wordId: number): Promise<void> => {
        await api.delete(`/lists/${listId}/words/${wordId}`);
    },

    deleteList: async (id: number): Promise<void> => {
        await api.delete(`/lists/${id}`);
    },

    generateUnknownWordsList: async (mediaId: number): Promise<WordList> => {
        const response = await api.post<WordList>('/lists/generate/unknown', null, { params: { mediaId } });
        return response.data;
    }
};

export default WordListService;
