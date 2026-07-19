import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import type { MembershipDTO } from '@/src/types/api';

export const subscriptionKeys = {
  membership: ['subscription', 'me'] as const,
};

/** Current user's membership detail for the profile screen. */
export function useMembership(enabled = true) {
  return useQuery<MembershipDTO>({
    queryKey: subscriptionKeys.membership,
    staleTime: 1000 * 60 * 5,
    enabled,
    queryFn: async () => {
      const res = await apiClient.get<MembershipDTO>(ENDPOINTS.subscription.me);
      return res.data;
    },
  });
}
