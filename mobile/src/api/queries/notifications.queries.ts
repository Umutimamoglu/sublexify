import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';

export type AppNotification = {
  id: number;
  title: string;
  body: string;
  type: string | null;
  url: string | null;
  imageUrl: string | null;
  read: boolean;
  createdAt: string;
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get<AppNotification[]>(ENDPOINTS.user.notifications);
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await apiClient.get<{ count: number }>(ENDPOINTS.user.notifUnread);
      return res.data.count;
    },
    staleTime: 60_000,
  });
}

export function usePushEnabled() {
  return useQuery<boolean>({
    queryKey: ['notifications', 'push-enabled'],
    queryFn: async () => {
      const res = await apiClient.get<{ pushEnabled: boolean }>(ENDPOINTS.user.notifPushToggle);
      return res.data.pushEnabled;
    },
    staleTime: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post(ENDPOINTS.user.notifMarkRead);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useSetPushEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiClient.put(ENDPOINTS.user.notifPushToggle, { enabled });
      return enabled;
    },
    onSuccess: (enabled) => {
      qc.setQueryData(['notifications', 'push-enabled'], enabled);
    },
  });
}
