import prisma from "@/lib/prisma";

export type NotificationType =
  | "task_assigned"
  | "task_completed"
  | "task_late"
  | "mention"
  | "status_change"
  | "comment"
  | "general";

interface CreateNotificationInput {
  user_id: number;
  title: string;
  message?: string;
  type?: NotificationType;
  task_id?: number;
}

/**
 * Create a single notification for a user.
 */
export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      user_id: input.user_id,
      title: input.title,
      message: input.message ?? "",
      type: input.type ?? "general",
      task_id: input.task_id ?? null,
      read: false,
    },
  });
}

/**
 * Create notifications for multiple users at once (batch).
 */
export async function createNotificationBatch(
  inputs: CreateNotificationInput[],
) {
  if (inputs.length === 0) return;
  return prisma.notification.createMany({
    data: inputs.map((input) => ({
      user_id: input.user_id,
      title: input.title,
      message: input.message ?? "",
      type: input.type ?? "general",
      task_id: input.task_id ?? null,
      read: false,
    })),
  });
}

/**
 * Get notifications for a user with optional pagination.
 */
export async function getUserNotifications(
  userId: number,
  options: { limit?: number; offset?: number } = {},
) {
  const { limit = 50, offset = 0 } = options;
  return prisma.notification.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(notifId: number) {
  return prisma.notification.update({
    where: { id: notifId },
    data: { read: true },
  });
}

/**
 * Mark all notifications for a user as read.
 */
export async function markAllNotificationsRead(userId: number) {
  return prisma.notification.updateMany({
    where: { user_id: userId, read: false },
    data: { read: true },
  });
}

/**
 * Count unread notifications for a user.
 */
export async function getUnreadCount(userId: number): Promise<number> {
  return prisma.notification.count({
    where: { user_id: userId, read: false },
  });
}
