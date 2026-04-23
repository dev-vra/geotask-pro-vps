import useSWR from "swr";

function authFetch(url: string) {
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("geotask_user") || "null") : null;
  return fetch(url, { headers: user ? { "X-User-Id": String(user.id) } : {} }).then((r) => r.json());
}

export function useReurbProcesses(filters?: Record<string, string>) {
  const cleaned = Object.fromEntries(Object.entries(filters || {}).filter(([, v]) => v));
  const params = new URLSearchParams(cleaned).toString();
  return useSWR(`/api/reurb/processes${params ? `?${params}` : ""}`, authFetch);
}

export function useReurbProtocol(id: number | null) {
  return useSWR(id ? `/api/reurb/protocols/${id}` : null, authFetch);
}

export function useReurbHistory(solicitacaoId: number | null) {
  return useSWR(solicitacaoId ? `/api/reurb/protocols/${solicitacaoId}/history` : null, authFetch);
}

export function useReurbDashboard() {
  return useSWR("/api/reurb/dashboard", authFetch);
}
