import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import type { ProgressStatsDTO } from '@/src/types/api';

export function useProgressStats() {
  return useQuery<ProgressStatsDTO>({
    queryKey: ['progress', 'stats'],
    queryFn: async () => {
      const res = await apiClient.get<ProgressStatsDTO>(
        `${ENDPOINTS.progress.stats}?userId=1`,
      );
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}
