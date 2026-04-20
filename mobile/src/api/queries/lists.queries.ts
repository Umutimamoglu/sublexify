import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import type { WordListDTO, ListDetailDTO } from '@/src/types/api';

export const listKeys = {
  all:      ['lists'] as const,
  standard: ['lists', 'standard'] as const,
  detail:   (id: number) => ['lists', id] as const,
};

export function useLists() {
  return useQuery<WordListDTO[]>({
    queryKey: listKeys.all,
    queryFn:  async () => {
      const res = await apiClient.get<WordListDTO[]>(ENDPOINTS.lists.list);
      return res.data;
    },
  });
}

export function useStandardLists() {
  return useQuery<WordListDTO[]>({
    queryKey: listKeys.standard,
    staleTime: Infinity, // Sabit listeler değişmez
    queryFn:  async () => {
      const res = await apiClient.get<WordListDTO[]>(ENDPOINTS.lists.standard);
      return res.data;
    },
  });
}

type WordListWordsResponse = {
  list: { id: number; name: string; createdAt: string };
  words: ListDetailDTO['words'];
};

export function useListDetail(id: number, options?: { enabled?: boolean }) {
  return useQuery<ListDetailDTO>({
    queryKey: listKeys.detail(id),
    queryFn:  async () => {
      const res = await apiClient.get<WordListWordsResponse>(ENDPOINTS.lists.words(id));
      return {
        id:        res.data.list.id,
        name:      res.data.list.name,
        words:     res.data.words,
        createdAt: res.data.list.createdAt,
      };
    },
    enabled: options?.enabled !== undefined ? options.enabled : id > 0,
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.post<WordListDTO>(ENDPOINTS.lists.list, name, {
        headers: { 'Content-Type': 'text/plain' },
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKeys.all });
    },
  });
}

export function useUpdateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, color }: { id: number; name?: string; color?: string }) => {
      const res = await apiClient.patch<WordListDTO>(ENDPOINTS.lists.update(id), { name, color });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKeys.all });
    },
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listId: number) => {
      await apiClient.delete(ENDPOINTS.lists.detail(listId));
      return listId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKeys.all });
    },
  });
}

export function useAddWordToList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, wordId }: { listId: number; wordId: number }) => {
      await apiClient.post(ENDPOINTS.lists.wordItem(listId, wordId));
      return { listId, wordId };
    },
    onMutate: async ({ listId }) => {
      await qc.cancelQueries({ queryKey: listKeys.all });
      const previousLists = qc.getQueryData<WordListDTO[]>(listKeys.all);
      
      qc.setQueryData<WordListDTO[]>(listKeys.all, (old) => {
        if (!old) return old;
        return old.map(list => 
          list.id === listId 
            ? { ...list, totalWords: list.totalWords + 1, unknownWords: list.unknownWords + 1 }
            : list
        );
      });
      return { previousLists };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLists) {
        qc.setQueryData(listKeys.all, context.previousLists);
      }
    },
    onSuccess: ({ listId }) => {
      qc.invalidateQueries({ queryKey: listKeys.detail(listId) });
      qc.invalidateQueries({ queryKey: listKeys.all });
    },
  });
}

export function useRemoveWordFromList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, wordId }: { listId: number; wordId: number }) => {
      await apiClient.delete(ENDPOINTS.lists.wordItem(listId, wordId));
      return { listId, wordId };
    },
    onMutate: async ({ listId }) => {
      await qc.cancelQueries({ queryKey: listKeys.all });
      const previousLists = qc.getQueryData<WordListDTO[]>(listKeys.all);
      
      qc.setQueryData<WordListDTO[]>(listKeys.all, (old) => {
        if (!old) return old;
        return old.map(list => 
          list.id === listId 
            ? { 
                ...list, 
                totalWords: Math.max(0, list.totalWords - 1), 
                // We optimistically decrease unknownWords too as a safe guess
                unknownWords: Math.max(0, list.unknownWords - 1) 
              }
            : list
        );
      });
      return { previousLists };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLists) {
        qc.setQueryData(listKeys.all, context.previousLists);
      }
    },
    onSuccess: ({ listId }) => {
      qc.invalidateQueries({ queryKey: listKeys.detail(listId) });
      qc.invalidateQueries({ queryKey: listKeys.all });
    },
  });
}

export function useListsContainingWord(wordId: number) {
  return useQuery<number[]>({
    queryKey: ['lists', 'containing-word', wordId],
    queryFn:  async () => {
      const res = await apiClient.get<number[]>(ENDPOINTS.lists.containingWord(wordId));
      return res.data;
    },
    enabled: wordId > 0,
  });
}

export function useCreateSubListFromUnknown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listId: number) => {
      const res = await apiClient.post<WordListDTO>(ENDPOINTS.lists.generateSubList(listId));
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKeys.all });
    },
  });
}
