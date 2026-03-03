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
    judgeStatus?: string;
    judgeApprovedAt?: string;
}

export interface WordListDTO {
    id: number;
    name: string;
    createdAt: string;
    totalWords: number;
    unknownWords: number;
    isSystem?: boolean;
    levelCounts: Record<string, number>;
}

export interface WordListWordsResponseDTO {
    list: WordListDTO;
    words: (Word & {
        isKnown: boolean;
        frequency?: number;
    })[];
    totalWords: number;
    unknownWords: number;
    levelCounts: Record<string, number>;
}

// Keep the old WordList interface for compatibility if needed, but mark it for removal
export interface WordList extends WordListDTO {
    words: Word[]; 
}

const WordListService = {
    getUserLists: async (): Promise<WordListDTO[]> => {
        const response = await api.get<WordListDTO[]>('/lists');
        return response.data;
    },

    getStandardLists: async (): Promise<WordListDTO[]> => {
        const response = await api.get<WordListDTO[]>('/lists/standard');
        return response.data;
    },

    createList: async (name: string): Promise<WordListDTO> => {
        // Backend expects raw string or JSON string. Based on controller: @RequestBody String name
        // Our previous impl in list.ts used text/plain
        const response = await api.post<WordListDTO>('/lists', name, {
            headers: { 'Content-Type': 'text/plain' }
        });
        return response.data;
    },

    getListById: async (id: number): Promise<WordListDTO> => {
        const response = await api.get<WordListDTO>(`/lists/${id}`);
        return response.data;
    },

    getListWords: async (id: number, userId?: number, onlyUnknown?: boolean): Promise<WordListWordsResponseDTO> => {
        const response = await api.get<WordListWordsResponseDTO>(`/lists/${id}/words`, {
            params: { userId, onlyUnknown }
        });
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

    generateUnknownWordsList: async (mediaId: number): Promise<WordListDTO> => {
        const response = await api.post<WordListDTO>('/lists/generate/unknown', null, { params: { mediaId } });
        return response.data;
    },

    createSubListFromUnknown: async (listId: number): Promise<WordListDTO> => {
        const response = await api.post<WordListDTO>(`/lists/${listId}/generate/unknown`);
        return response.data;
    },

    getListsContainingWord: async (wordId: number): Promise<number[]> => {
        const response = await api.get<number[]>(`/lists/containing-word/${wordId}`);
        return response.data;
    }
};

export default WordListService;
