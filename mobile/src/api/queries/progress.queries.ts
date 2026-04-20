import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import type { ProgressStatsDTO } from '@/src/types/api';

export function useProgressStats() {
  return useQuery<ProgressStatsDTO>({
    queryKey: ['progress', 'stats'],
    queryFn: async () => {
      const res = await apiClient.get<ProgressStatsDTO>(ENDPOINTS.progress.stats);
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useCategoryWords(category: 'learnt' | 'studied' | 'due' | 'difficult', options?: { enabled?: boolean }) {
  return useQuery<any[]>({
    queryKey: ['progress', category],
    queryFn: async () => {
      const res = await apiClient.get<any[]>(ENDPOINTS.progress[category]);
      return res.data;
    },
    enabled: options?.enabled ?? true,
  });
}
