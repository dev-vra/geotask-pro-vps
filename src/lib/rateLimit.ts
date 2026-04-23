import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  lastReset: number;
}

const cache = new Map<string, RateLimitEntry>();

/**
 * Simple in-memory rate limiter.
 * @param key Unique key for the client (e.g. IP + endpoint)
 * @param limit Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = cache.get(key) || { count: 0, lastReset: now };

  if (now - entry.lastReset > windowMs) {
    entry.count = 1;
    entry.lastReset = now;
  } else {
    entry.count++;
  }

  cache.set(key, entry);

  return entry.count <= limit;
}

/**
 * Middleware-friendly rate limit helper
 */
export function rateLimitResponse(req: Request, key: string, limit: number, windowMs: number) {
  const isAllowed = rateLimit(key, limit, windowMs);
  if (!isAllowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Por favor, aguarde um momento." },
      { status: 429 }
    );
  }
  return null;
}
