import api from './api';

export interface WordList {
    id: number;
    name: string;
    createdAt: string;
    words: any[]; // We can refine this type if needed, but 'any' avoids circular dependency issues for now
}

export const listService = {
    getUserLists: async (): Promise<WordList[]> => {
        const response = await api.get<WordList[]>('/lists');
        return response.data;
    },

    getListById: async (id: number): Promise<WordList> => {
        const response = await api.get<WordList>(`/lists/${id}`);
        return response.data;
    },

    createList: async (name: string): Promise<WordList> => {
        // The backend expects a raw string, but axios sends JSON by default.
        // We can send it as a plain string with correct headers or just let axios handle it if backend accepts JSON string.
        // Based on controller, it accepts @RequestBody String name.
        const response = await api.post<WordList>('/lists', name, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });
        return response.data;
    },

    addWordToList: async (listId: number, wordId: number): Promise<void> => {
        await api.post(`/lists/${listId}/words/${wordId}`);
    },

    removeWordFromList: async (listId: number, wordId: number): Promise<void> => {
        await api.delete(`/lists/${listId}/words/${wordId}`);
    },

    generateUnknownList: async (mediaId: number): Promise<WordList> => {
        const response = await api.post<WordList>(`/lists/generate/unknown?mediaId=${mediaId}`);
        return response.data;
    }
};
