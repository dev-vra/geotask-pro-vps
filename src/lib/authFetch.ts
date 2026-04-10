/**
 * Centralized auth-aware fetch utility.
 * Reads user ID from localStorage and attaches the X-User-Id header
 * required by the middleware for all protected API routes.
 */

function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("geotask_user");
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return parsed?.id ? String(parsed.id) : null;
  } catch {
    return null;
  }
}

/**
 * SWR-compatible fetcher that automatically adds X-User-Id header.
 */
export const authFetcher = (url: string) => {
  const userId = getUserId();
  const headers: HeadersInit = {};
  if (userId) headers["X-User-Id"] = userId;
  return fetch(url, { headers }).then((r) => r.json());
};

/**
 * General-purpose auth-aware fetch wrapper.
 * Use this for non-SWR calls (POST, PUT, DELETE, etc.).
 */
export function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const userId = getUserId();
  const headers = new Headers(init?.headers);
  if (userId && !headers.has("X-User-Id")) {
    headers.set("X-User-Id", userId);
  }
  return fetch(url, { ...init, headers });
}
