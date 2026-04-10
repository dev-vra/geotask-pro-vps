import useSWR from "swr";
import { authFetcher, authFetch } from "@/lib/authFetch";

export function useTemplates(userId?: number) {
  const url = userId ? `/api/templates?user_id=${userId}` : "/api/templates";
  const { data, error, isLoading, mutate } = useSWR(url, authFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  const saveTemplate = async (templateData: any, userId?: number) => {
    const isEdit = !!templateData.id;
    const res = await authFetch("/api/templates", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...templateData, created_by: userId }),
    });
    if (res.ok) {
      mutate();
      return true;
    }
    return false;
  };

  const deleteTemplate = async (id: number) => {
    await authFetch(`/api/templates?id=${id}`, { method: "DELETE" });
    mutate();
  };

  return {
    templates: Array.isArray(data) ? data : [],
    isLoading,
    error,
    mutate,
    saveTemplate,
    deleteTemplate,
  };
}
