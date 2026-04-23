interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

const store = new Map<string, RateLimitEntry>();
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 5;

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.firstAttempt > WINDOW_MS) store.delete(key);
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry) {
    store.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (now - entry.firstAttempt > WINDOW_MS) {
    store.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - entry.firstAttempt)) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimit(ip: string) {
  store.delete(ip);
}
