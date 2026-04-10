import useSWR from "swr";
import type { Team } from "@/types";
import { authFetcher } from "@/lib/authFetch";

export function useTeams() {
  const { data, error, isLoading, mutate } = useSWR<Team[]>(
    "/api/teams",
    authFetcher,
    { revalidateOnFocus: false },
  );
  return { teams: data || [], isLoading, error, mutate };
}
