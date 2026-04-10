import prisma from "@/lib/prisma";

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
) {
  try {
    await prisma.activityLog.create({
      data: {
        user_id: userId ?? null,
        user_name: userName || "Sistema",
        action,
        entity: entity || null,
        entity_id: entityId || null,
        details: details || null,
      },
    });
  } catch (err) {
    console.error("[ActivityLog] Failed to log activity:", err);
  }
}
