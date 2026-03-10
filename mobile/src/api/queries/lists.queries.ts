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

export function useListDetail(id: number) {
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
    enabled: id > 0,
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
    onSuccess: ({ listId }) => {
      qc.invalidateQueries({ queryKey: listKeys.detail(listId) });
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
