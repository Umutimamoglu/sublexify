import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import { mediaKeys } from './media.queries';

export function useMarkKnown() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ wordId, mediaId }: { wordId: number; mediaId?: number }) => {
      await apiClient.post(ENDPOINTS.words.markKnown(wordId));
      return { wordId, mediaId };
    },
    onSuccess: ({ mediaId }) => {
      // Cache'i invalidate et
      qc.invalidateQueries({ queryKey: ['user', 'known-words'] });
      if (mediaId) {
        qc.invalidateQueries({ queryKey: mediaKeys.words(mediaId) });
      }
    },
  });
}
