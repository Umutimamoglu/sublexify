import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import type { StudyQuestionDTO, StudyResultDTO } from '@/src/types/api';

export const studyKeys = {
  batch: (listId: number | null, types?: string[], difficulties?: string[], onlyUnknown?: boolean) => 
    ['study', 'batch', listId, types, difficulties, onlyUnknown] as const,
};

export function useStudyBatch(
  listId: number | null, 
  types?: string[], 
  difficulties?: string[], 
  onlyUnknown?: boolean
) {
  return useQuery<StudyQuestionDTO[]>({
    queryKey: studyKeys.batch(listId, types, difficulties, onlyUnknown),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('size', '10');
      if (listId) params.append('listId', listId.toString());
      if (types && types.length > 0) params.append('types', types.join(','));
      if (difficulties && difficulties.length > 0) params.append('difficulties', difficulties.join(','));
      if (onlyUnknown) params.append('onlyUnknown', 'true');

      const res = await apiClient.get<StudyQuestionDTO[]>(
        `${ENDPOINTS.study.nextBatch}?${params.toString()}`,
      );
      return res.data;
    },
    enabled: !!listId || (difficulties !== undefined && onlyUnknown !== undefined),
    staleTime: 0,
  });
}

export function useSubmitStudyResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (results: StudyResultDTO[]) => {
      await apiClient.post(ENDPOINTS.study.result, results);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study'] });
      qc.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}
