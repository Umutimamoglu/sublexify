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
      const typesQuery = types && types.length > 0 ? `&types=${types.join(',')}` : '';
      const diffsQuery = difficulties && difficulties.length > 0 ? `&difficulties=${difficulties.join(',')}` : '';
      const unknownQuery = onlyUnknown ? `&onlyUnknown=true` : '';
      const listIdQuery = listId ? `&listId=${listId}` : '';
      
      const res = await apiClient.get<StudyQuestionDTO[]>(
        `${ENDPOINTS.study.nextBatch}?size=10${listIdQuery}${typesQuery}${diffsQuery}${unknownQuery}`,
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
