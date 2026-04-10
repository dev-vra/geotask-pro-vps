import useSWR from "swr";
import { authFetch } from "@/lib/authFetch";

const fetcher = (url: string) => authFetch(url).then((res) => res.json());

export function useGaming(params?: { userId?: number; sectorId?: number; cycle?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.userId) query.append("userId", String(params.userId));
  if (params?.sectorId) query.append("sectorId", String(params.sectorId));
  if (params?.cycle) query.append("cycle", params.cycle);
  if (params?.status) query.append("status", params.status);

  const url = `/api/gaming${query.toString() ? `?${query.toString()}` : ""}`;

  const { data, error, mutate, isLoading } = useSWR(url, fetcher, {
      revalidateOnFocus: false
  });

  return {
    gamings: data?.items || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useGamingDetail(id?: number) {
    const { data, error, mutate, isLoading } = useSWR(id ? `/api/gaming/${id}` : null, fetcher, {
        revalidateOnFocus: false
    });
  
    return {
      gaming: data?.gaming || null,
      isLoading,
      isError: error,
      mutate,
    };
}
