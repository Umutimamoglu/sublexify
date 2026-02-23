import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import type { MediaDTO, MediaWordsResponseDTO } from '@/src/types/api';

export const mediaKeys = {
  all:    ['media'] as const,
  detail: (id: number) => ['media', id] as const,
  words:  (id: number) => ['media', id, 'words'] as const,
};

export function useMedia() {
  return useQuery<MediaDTO[]>({
    queryKey: mediaKeys.all,
    queryFn:  async () => {
      const res = await apiClient.get<MediaDTO[]>(ENDPOINTS.media.list);
      return res.data;
    },
  });
}

export function useMediaDetail(id: number) {
  return useQuery<MediaDTO>({
    queryKey: mediaKeys.detail(id),
    queryFn:  async () => {
      const res = await apiClient.get<MediaDTO>(ENDPOINTS.media.detail(id));
      return res.data;
    },
    enabled: !!id,
  });
}

export function useMediaWords(mediaId: number) {
  return useQuery<MediaWordsResponseDTO>({
    queryKey: mediaKeys.words(mediaId),
    queryFn:  async () => {
      const res = await apiClient.get<MediaWordsResponseDTO>(ENDPOINTS.media.words(mediaId));
      return res.data;
    },
    enabled: !!mediaId,
  });
}
