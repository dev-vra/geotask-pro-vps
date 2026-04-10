import useSWR from "swr";
import { authFetcher } from "@/lib/authFetch";

export function useLookups() {
  const { data, error, isLoading, mutate } = useSWR(
    typeof window !== "undefined" && localStorage.getItem("geotask_user") ? "/api/lookups" : null,
    authFetcher,
    {
      revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 300000,
  });

  if (error) console.error("useLookups error:", error);
  if (data?.error) console.error("useLookups API error:", data.error);

  return {
    contracts: data?.contracts || [],
    sectors: data?.sectors || [],
    taskTypes: data?.task_types || [],
    citiesNeighborhoods: data?.cities_neighborhoods || {},
    contractCitiesNeighborhoods: data?.contract_cities_neighborhoods || {},
    users: data?.users || [],
    isLoading,
    error,
    mutate,
  };
}
