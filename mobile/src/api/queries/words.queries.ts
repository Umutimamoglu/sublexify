import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import type { WordDTO } from '@/src/types/api';
import { mediaKeys } from './media.queries';
import { userKeys } from './user.queries';
import { listKeys } from './lists.queries';

export const wordKeys = {
  search:   (q: string) => ['words', 'search', q] as const,
  frequent: ['words', 'frequent'] as const,
};

export function useWordSearch(query: string) {
  return useQuery<WordDTO[]>({
    queryKey: wordKeys.search(query),
    queryFn:  async () => {
      const res = await apiClient.get<WordDTO[]>(
        `${ENDPOINTS.words.search}?q=${encodeURIComponent(query)}&language=en&userId=1`,
      );
      return res.data;
    },
    enabled: query.trim().length >= 2,
  });
}

export function useFrequentWords(limit = 50) {
  return useQuery<WordDTO[]>({
    queryKey: wordKeys.frequent,
    queryFn:  async () => {
      const res = await apiClient.get<WordDTO[]>(
        `${ENDPOINTS.words.frequent}?language=en&limit=${limit}&userId=1`,
      );
      return res.data;
    },
  });
}

export function useMarkKnown() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      wordId,
      isKnown,
      mediaId,
    }: {
      wordId: number;
      /** Mevcut durum: true ise unmark (DELETE), false ise mark (POST) */
      isKnown: boolean;
      mediaId?: number;
    }) => {
      const url = `${ENDPOINTS.words.markKnown(wordId)}?userId=1`;
      if (isKnown) {
        await apiClient.delete(url);
      } else {
        await apiClient.post(url);
      }
      return { wordId, mediaId };
    },
    onSuccess: ({ mediaId }) => {
      qc.invalidateQueries({ queryKey: userKeys.knownWords });
      if (mediaId) {
        qc.invalidateQueries({ queryKey: mediaKeys.words(mediaId) });
      }
    },
  });
}

export function useMarkKnownBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (wordIds: number[]) => {
      await Promise.all(
        wordIds.map((id) => apiClient.post(`${ENDPOINTS.words.markKnown(id)}?userId=1`)),
      );
      return wordIds;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.knownWords });
      qc.invalidateQueries({ queryKey: listKeys.all });
    },
  });
}
