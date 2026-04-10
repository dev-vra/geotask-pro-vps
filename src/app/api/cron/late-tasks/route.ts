import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    // Simple security check
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find late tasks
    // Logic: Deadline < Now AND Status != Concluído
    const lateTasks = await prisma.task.findMany({
      where: {
        deadline: { lt: now },
        status: { not: "Concluído" },
      },
      include: {
        responsible: true,
        Sector: true,
      },
    });

    let notificationsSent = 0;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const taskIds = lateTasks.map((t) => t.id);
    const sectorIds = [...new Set(lateTasks.map((t) => t.Sector?.id).filter(Boolean))] as number[];

    // Batch: fetch all existing notifications for today
    const existingNotifs = await prisma.notification.findMany({
      where: {
        task_id: { in: taskIds },
        type: "task_late",
        created_at: { gte: todayStart },
      },
      select: { task_id: true },
    });
    const alreadyNotified = new Set(existingNotifs.map((n) => n.task_id));

    // Batch: fetch all managers for all relevant sectors
    const allManagers = sectorIds.length > 0
      ? await prisma.user.findMany({
          where: {
            sector_id: { in: sectorIds },
            Role: { name: { in: ["Gestor", "Gerente"] } },
          },
          select: { id: true, sector_id: true },
        })
      : [];
    const managersBySector = new Map<number, number[]>();
    allManagers.forEach((m) => {
      if (!m.sector_id) return;
      const list = managersBySector.get(m.sector_id) || [];
      list.push(m.id);
      managersBySector.set(m.sector_id, list);
    });

    // Build all notifications to create
    const notificationsToCreate: any[] = [];

    for (const task of lateTasks) {
      if (alreadyNotified.has(task.id)) continue;

      if (task.responsible_id) {
        notificationsToCreate.push({
          user_id: task.responsible_id,
          type: "task_late",
          title: "Tarefa Atrasada",
          message: `A tarefa "${task.title}" está atrasada e fora do prazo de entrega.`,
          task_id: task.id,
        });
      }

      if (task.Sector) {
        const managers = managersBySector.get(task.Sector.id) || [];
        for (const mId of managers) {
          if (mId === task.responsible_id) continue;
          notificationsToCreate.push({
            user_id: mId,
            type: "task_late",
            title: `Tarefa Atrasada: ${task.Sector.name}`,
            message: `A tarefa "${task.title}", designada à "${task.responsible?.name || "Ninguém"}" do setor "${task.Sector.name}", está atrasada.`,
            task_id: task.id,
          });
        }
      }
    }

    if (notificationsToCreate.length > 0) {
      await prisma.notification.createMany({ data: notificationsToCreate });
    }
    notificationsSent = notificationsToCreate.length;

    return NextResponse.json({
      message: "Cron executed successfully",
      late_tasks_found: lateTasks.length,
      notifications_sent: notificationsSent,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
