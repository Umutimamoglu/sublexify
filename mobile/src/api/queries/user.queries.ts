import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import type { UserStatistics, WordDTO } from '@/src/types/api';

export const userKeys = {
  stats:      ['user', 'stats'] as const,
  knownWords: ['user', 'known-words'] as const,
};

export function useUserStats() {
  return useQuery<UserStatistics>({
    queryKey: userKeys.stats,
    queryFn:  async () => {
      const res = await apiClient.get<UserStatistics>(ENDPOINTS.user.stats);
      return res.data;
    },
  });
}

export function useKnownWords() {
  return useQuery<WordDTO[]>({
    queryKey: userKeys.knownWords,
    queryFn:  async () => {
      const res = await apiClient.get<WordDTO[]>(`${ENDPOINTS.user.knownWords}?userId=1`);
      return res.data;
    },
  });
}
