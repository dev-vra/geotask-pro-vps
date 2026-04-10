import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { broadcast } from "../events/route";

// GET /api/notifications?user_id=X&unread_only=true
// GET /api/notifications
// Supports:
// - ?user_id=X (Required unless implementing session)
// - ?page=1 & ?limit=15 (Pagination)
// - ?unread_only=true (For sidebar / quick view)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const unreadOnly = searchParams.get("unread_only") === "true";
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 15;

    if (!userId) {
      return NextResponse.json(
        { error: "user_id obrigatório" },
        { status: 400 },
      );
    }

    const whereClause: any = {
      user_id: Number(userId),
    };
    if (unreadOnly) {
      whereClause.read = false;
    }

    // Determine pagination skip
    const skip = (page - 1) * limit;

    // Fetch data and count in parallel
    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        include: {
          task: {
            select: { title: true },
          },
        },
        orderBy: { created_at: "desc" },
        // If unreadOnly is true, maybe we dont paginate traditionally or just show top X?
        // Let's support pagination always.
        take: limit,
        skip: skip,
      }),
      prisma.notification.count({ where: whereClause }),
    ]);

    // Also get total unread count regardless of pagination for badge
    const unreadCount = await prisma.notification.count({
      where: {
        user_id: Number(userId),
        read: false,
      },
    });

    const notificationsFormatted = notifications.map((n) => ({
      ...n,
      task_title: n.task?.title || null,
    }));

    return NextResponse.json({
      notifications: notificationsFormatted,
      unread_count: unreadCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      totalItems: totalCount,
    });
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar notificações" },
      { status: 500 },
    );
  }
}

// PATCH /api/notifications
// Body: { id } to mark one as read, or { user_id, mark_all: true } to mark all
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, user_id, mark_all } = body;

    if (mark_all && user_id) {
      await prisma.notification.updateMany({
        where: { user_id: Number(user_id), read: false },
        data: { read: true },
      });
      broadcast("NOTIFICATIONS_UPDATED", { userId: Number(user_id) });
      return NextResponse.json({
        message: "Todas notificações marcadas como lidas",
      });
    }

    if (id) {
      await prisma.notification.update({
        where: { id: Number(id) },
        data: { read: true },
      });
      broadcast("NOTIFICATIONS_UPDATED", { notificationId: Number(id) });
      return NextResponse.json({ message: "Notificação marcada como lida" });
    }

    return NextResponse.json(
      { error: "Parâmetros inválidos" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Erro ao atualizar notificação:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar notificação" },
      { status: 500 },
    );
  }
}
