import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import type { StudyQuestionDTO, StudyResultDTO } from '@/src/types/api';

export const studyKeys = {
  batch: (listId: number) => ['study', 'batch', listId] as const,
};

export function useStudyBatch(listId: number) {
  return useQuery<StudyQuestionDTO[]>({
    queryKey: studyKeys.batch(listId),
    queryFn: async () => {
      const res = await apiClient.get<StudyQuestionDTO[]>(
        `${ENDPOINTS.study.nextBatch}?userId=1&listId=${listId}&size=10`,
      );
      return res.data;
    },
    enabled: !!listId,
    staleTime: 0,
  });
}

export function useSubmitStudyResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (results: StudyResultDTO[]) => {
      await apiClient.post(`${ENDPOINTS.study.result}?userId=1`, results);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study'] });
      qc.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}
