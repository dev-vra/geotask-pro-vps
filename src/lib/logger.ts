import { NextRequest } from "next/server";

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, any>;
  userId?: number | null;
  ip?: string | null;
  path?: string;
  method?: string;
}

/**
 * Helper to extract client IP from request headers.
 */
export function getClientIP(req: Request | NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "0.0.0.0";
}

/**
 * Structured logger for system events.
 * Outputs JSON format for better parsing in production environments.
 */
class Logger {
  private format(level: LogEntry["level"], message: string, context?: Record<string, any>, req?: Request | NextRequest, userId?: number | null): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userId,
    };

    if (req) {
      entry.method = req.method;
      entry.path = new URL(req.url).pathname;
      entry.ip = getClientIP(req);
    }

    return JSON.stringify(entry);
  }

  getIp(req: Request | NextRequest): string {
    return getClientIP(req);
  }

  info(message: string, context?: Record<string, any>, req?: Request | NextRequest, userId?: number | null) {
    console.log(this.format("info", message, context, req, userId));
  }

  warn(message: string, context?: Record<string, any>, req?: Request | NextRequest, userId?: number | null) {
    console.warn(this.format("warn", message, context, req, userId));
  }

  error(message: string, context?: Record<string, any>, req?: Request | NextRequest, userId?: number | null) {
    console.error(this.format("error", message, context, req, userId));
  }

  /**
   * Specifically for logging unauthorized or forbidden attempts.
   */
  security(message: string, context?: Record<string, any>, req?: Request | NextRequest, userId?: number | null) {
    this.warn(`[SECURITY] ${message}`, context, req, userId);
  }
}

export const logger = new Logger();
