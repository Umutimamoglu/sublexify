import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import type { MediaDTO, MediaWordsResponseDTO, WordListDTO } from '@/src/types/api';

export const mediaKeys = {
  all:              ['media'] as const,
  continueLearning: ['media', 'continue-learning'] as const,
  detail:           (id: number) => ['media', id] as const,
  words:            (id: number, onlyUnknown?: boolean) => ['media', id, 'words', onlyUnknown] as const,
};

export function useMedia() {
  return useQuery<MediaDTO[]>({
    queryKey: mediaKeys.all,
    queryFn:  async () => {
      const res = await apiClient.get<MediaDTO[]>(`${ENDPOINTS.media.list}?userId=1`);
      return res.data;
    },
  });
}

export function useMediaDetail(id: number) {
  return useQuery<MediaDTO>({
    queryKey: mediaKeys.detail(id),
    queryFn:  async () => {
      const res = await apiClient.get<MediaDTO>(`${ENDPOINTS.media.detail(id)}?userId=1`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useContinueLearning(limit = 5) {
  return useQuery<MediaDTO[]>({
    queryKey: mediaKeys.continueLearning,
    queryFn:  async () => {
      const res = await apiClient.get<MediaDTO[]>(
        `${ENDPOINTS.media.continueLearning}?userId=1&limit=${limit}`,
      );
      return res.data;
    },
  });
}

export function useMediaWords(mediaId: number, onlyUnknown = false) {
  return useQuery<MediaWordsResponseDTO>({
    queryKey: mediaKeys.words(mediaId, onlyUnknown),
    queryFn:  async () => {
      const res = await apiClient.get<MediaWordsResponseDTO>(
        `${ENDPOINTS.media.words(mediaId)}?userId=1&onlyUnknown=${onlyUnknown}`,
      );
      return res.data;
    },
    enabled: !!mediaId,
  });
}

export function useSeriesEpisodes(imdbId: string) {
  return useQuery<MediaDTO[]>({
    queryKey: ['media', 'series', imdbId],
    queryFn:  async () => {
      const res = await apiClient.get<MediaDTO[]>(ENDPOINTS.media.seriesEpisodes(imdbId));
      return res.data;
    },
    enabled: !!imdbId,
  });
}

export function useGenerateListFromMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mediaId: number) => {
      const res = await apiClient.post<WordListDTO>(
        `${ENDPOINTS.lists.generateFromMedia}?mediaId=${mediaId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}
