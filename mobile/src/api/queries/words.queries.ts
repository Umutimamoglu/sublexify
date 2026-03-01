import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import { mediaKeys } from './media.queries';
import { userKeys } from './user.queries';

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
