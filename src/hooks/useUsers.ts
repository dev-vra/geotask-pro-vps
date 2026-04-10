import useSWR from "swr";
import { authFetcher } from "@/lib/authFetch";

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR("/api/users", authFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  return {
    users: Array.isArray(data) ? data : [],
    isLoading,
    error,
    mutate,
  };
}
