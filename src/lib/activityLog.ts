import prisma from "@/lib/prisma";
import { logger } from "./logger";
import { NextRequest } from "next/server";

export function extractIp(req?: Request | NextRequest): string {
  if (!req) return "unknown";
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Log a user activity to the ActivityLog table.
 * Fire-and-forget: errors are silently caught to avoid breaking the main flow.
 */
export async function logActivity(
  userId: number | null | undefined,
  userName: string,
  action: string,
  entity?: string | null,
  entityId?: number | null,
  details?: string | null,
  req?: Request | NextRequest,
) {
  try {
    const ipAddress = req ? logger.getIp(req) : null;

    await prisma.activityLog.create({
      data: {
        user_id: userId ?? null,
        user_name: userName || "Sistema",
        action,
        entity: entity || null,
        entity_id: entityId || null,
        details: details || null,
        ip_address: ipAddress,
      },
    });
  } catch (err) {
    logger.error("[ActivityLog] Failed to log activity", { error: String(err), action, userId });
  }
}
