import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/admin/recalculate-time
 *
 * Temporary endpoint to recalculate time_spent for all tasks
 * based on started_at, completed_at, and TaskPause records.
 *
 * Access: requires ?secret=RECALC2026 query param as simple protection.
 * Remove this file after running.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== "RECALC2026") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const tasks = await prisma.task.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        created_at: true,
        completed_at: true,
        time_spent: true,
      },
      orderBy: { id: "asc" },
    });

    const now = new Date();
    const results: any[] = [];
    let updatedCount = 0;

    // Batch: fetch all status history at once
    const allHistory = await prisma.taskHistory.findMany({
      where: {
        task_id: { in: tasks.map((t) => t.id) },
        field: "status",
      },
      orderBy: { created_at: "asc" },
    });
    const historyByTask = new Map<number, typeof allHistory>();
    allHistory.forEach((h) => {
      const list = historyByTask.get(h.task_id) || [];
      list.push(h);
      historyByTask.set(h.task_id, list);
    });

    for (const task of tasks) {
      const history = historyByTask.get(task.id) || [];

      let totalElapsedMs = 0;
      let lastInProgressStart: Date | null = null;

      // Logic: 
      // 1. If history transitions TO "Em Andamento", start counting.
      // 2. If history transitions FROM "Em Andamento", stop counting and add interval.
      // 3. If there's no history but task was created "Em Andamento" (rare but possible),
      //    or if the first record is leaving "Em Andamento", assume it started at created_at.

      history.forEach((entry, index) => {
        const entryTime = new Date(entry.created_at);

        if (entry.new_value === "Em Andamento") {
          lastInProgressStart = entryTime;
        } else if (entry.old_value === "Em Andamento" && lastInProgressStart) {
          totalElapsedMs += entryTime.getTime() - lastInProgressStart.getTime();
          lastInProgressStart = null;
        } else if (entry.old_value === "Em Andamento" && !lastInProgressStart && index === 0) {
          // Task was started before the first history record (likely at creation)
          totalElapsedMs += entryTime.getTime() - new Date(task.created_at).getTime();
        }
      });

      // Handle current status if it's still In Progress
      if (task.status === "Em Andamento") {
        const startTime = lastInProgressStart || new Date(task.created_at);
        totalElapsedMs += now.getTime() - startTime.getTime();
      } else if (task.status === "Concluído" && lastInProgressStart) {
        // If it was concluded but we have a dangling start (shouldn't happen with correct logs)
        const endTime = task.completed_at ? new Date(task.completed_at) : now;
        totalElapsedMs += endTime.getTime() - (lastInProgressStart as Date).getTime();
      }

      const newTimeSpent = Math.floor(totalElapsedMs / 1000);
      const oldTimeSpent = task.time_spent || 0;

      // Only update if difference is significant (more than 1 minute) or if correcting a huge error
      if (Math.abs(newTimeSpent - oldTimeSpent) > 60 || (oldTimeSpent > 3600*10 && newTimeSpent < 3600*5)) {
        await prisma.task.update({
          where: { id: task.id },
          data: { time_spent: newTimeSpent },
        });
        updatedCount++;
        
        results.push({
          id: task.id,
          title: task.title,
          oldSeconds: oldTimeSpent,
          newSeconds: newTimeSpent,
          oldFormatted: fmtSec(oldTimeSpent),
          newFormatted: fmtSec(newTimeSpent),
          diff: fmtSec(Math.abs(oldTimeSpent - newTimeSpent)),
        });
      }
    }

    return NextResponse.json({
      message: `Recálculo via histórico concluído. ${updatedCount} tarefas corrigidas.`,
      updated: updatedCount,
      totalTasks: tasks.length,
      changes: results,
    });
  } catch (error: any) {
    console.error("Erro no recálculo:", error);
    return NextResponse.json(
      { error: "Erro: " + error.message },
      { status: 500 }
    );
  }
}

function fmtSec(s: number): string {
  if (s <= 0) return "0s";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
