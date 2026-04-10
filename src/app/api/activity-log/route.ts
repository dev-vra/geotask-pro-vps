import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/activity-log — Fetch logs with filters, pagination & summary
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    const action = url.searchParams.get("action");
    const entity = url.searchParams.get("entity");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");
    const search = url.searchParams.get("search");
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") || "30")),
    );
    const summaryOnly = url.searchParams.get("summary") === "true";

    const where: any = {};

    if (userId) where.user_id = Number(userId);
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (search) {
      where.OR = [
        { user_name: { contains: search, mode: "insensitive" } },
        { details: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
      ];
    }

    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.created_at.lte = to;
      }
    }

    // Summary stats (for the mini dashboard)
    if (summaryOnly) {
      const [total, byAction, byUser, taskCreated] = await Promise.all([
        prisma.activityLog.count({ where }),
        prisma.activityLog.groupBy({
          by: ["action"],
          where,
          _count: { action: true },
          orderBy: { _count: { action: "desc" } },
          take: 5,
        }),
        prisma.activityLog.groupBy({
          by: ["user_name", "user_id"],
          where,
          _count: { user_name: true },
          orderBy: { _count: { user_name: "desc" } },
          take: 5,
        }),
        prisma.activityLog.count({
          where: { ...where, action: "task_created" },
        }),
      ]);

      return NextResponse.json({
        total,
        topActions: byAction.map((a) => ({
          action: a.action,
          count: a._count.action,
        })),
        topUsers: byUser.map((u) => ({
          user_name: u.user_name,
          user_id: u.user_id,
          count: u._count.user_name,
        })),
        tasksCreated: taskCreated,
      });
    }

    // Paginated list
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    // Distinct actions for filter dropdown
    const actions = await prisma.activityLog.groupBy({
      by: ["action"],
      orderBy: { action: "asc" },
    });

    // Distinct users for filter dropdown
    const users = await prisma.activityLog.groupBy({
      by: ["user_name", "user_id"],
      orderBy: { user_name: "asc" },
    });

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        actions: actions.map((a) => a.action),
        users: users.map((u) => ({
          id: u.user_id,
          name: u.user_name,
        })),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar logs:", error);
    return NextResponse.json(
      { error: "Erro ao buscar logs de atividade" },
      { status: 500 },
    );
  }
}

// POST /api/activity-log — Record a log entry (internal use)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, user_name, action, entity, entity_id, details } = body;

    await prisma.activityLog.create({
      data: {
        user_id: user_id ? Number(user_id) : null,
        user_name: user_name || "Sistema",
        action,
        entity: entity || null,
        entity_id: entity_id ? Number(entity_id) : null,
        details: details || null,
      },
    });

    return NextResponse.json({ message: "Log registrado" });
  } catch (error) {
    console.error("Erro ao registrar log:", error);
    return NextResponse.json(
      { error: "Erro ao registrar log" },
      { status: 500 },
    );
  }
}
