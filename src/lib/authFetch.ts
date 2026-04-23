/**
 * Centralized auth-aware fetch utility.
 * Since authentication now uses HttpOnly cookies, the browser
 * automatically includes the auth cookie in every same-origin request.
 * We just need to ensure `credentials: 'include'` is set.
 */

/**
 * SWR-compatible fetcher that includes cookies for auth.
 */
export const authFetcher = (url: string) => {
  return fetch(url, { credentials: "include" }).then((r) => {
    if (r.status === 401) {
      // Token expired or invalid — redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("geotask_user");
        window.location.href = "/login";
      }
      throw new Error("Não autenticado");
    }
    return r.json();
  });
};

/**
 * General-purpose auth-aware fetch wrapper.
 * Use this for non-SWR calls (POST, PUT, DELETE, etc.).
 */
export function authFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    credentials: "include",
  });
}
