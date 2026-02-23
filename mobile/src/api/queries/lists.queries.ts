import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import type { WordListDTO } from '@/src/types/api';

export const listKeys = {
  all:    ['lists'] as const,
  detail: (id: number) => ['lists', id] as const,
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

export function useCreateList() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.post<WordListDTO>(ENDPOINTS.lists.list, { name });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKeys.all });
    },
  });
}
