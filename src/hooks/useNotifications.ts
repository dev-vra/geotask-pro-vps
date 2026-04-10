import useSWR from "swr";
import { authFetcher, authFetch } from "@/lib/authFetch";

export function useNotifications(userId: number | null) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/notifications?user_id=${userId}` : null,
    authFetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 10000,
    },
  );

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  const markRead = async (id: number) => {
    // Optimistic update
    const optimistic = {
      ...data,
      notifications: notifications.map((n: any) =>
        n.id === id ? { ...n, read: true } : n,
      ),
      unread_count: Math.max(0, unreadCount - 1),
    };
    mutate(optimistic, false);

    await authFetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    mutate();
  };

  const markAllRead = async () => {
    if (!userId) return;
    // Optimistic update
    const optimistic = {
      ...data,
      notifications: notifications.map((n: any) => ({ ...n, read: true })),
      unread_count: 0,
    };
    mutate(optimistic, false);

    await authFetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, mark_all: true }),
    });
    mutate();
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markRead,
    markAllRead,
    mutate,
  };
}
