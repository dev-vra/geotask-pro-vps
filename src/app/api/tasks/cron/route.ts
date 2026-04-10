import prisma from "@/lib/prisma";
import { calculateNextRecurrence, RecurrenceConfig } from "@/lib/recurrence";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token") || req.headers.get("x-cron-token");

    // Security check
    if (token !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // 1. Find master tasks that are due for recurrence
    const masterTasks = await prisma.task.findMany({
      where: {
        is_recurring: true,
        next_recurrence_at: {
          lte: now,
        },
      },
      include: {
        children: {
          include: {
            coworkers: true,
          }
        },
        coworkers: true,
      },
    });

    if (masterTasks.length === 0) {
      return NextResponse.json({ message: "No tasks to process" });
    }

    const results = [];

    for (const master of masterTasks) {
      // 2. Create the new task instance
      const { 
        id: masterId, 
        created_at, 
        updated_at, 
        last_recurrence_at, 
        next_recurrence_at, 
        is_recurring, 
        recurrence_config,
        children,
        coworkers,
        status_updated_at,
        ...rest 
      } = master;

      // Prepare new task data
      const newTaskData: any = {
        ...rest,
        status: "A Fazer",
        created_at: now,
        parent_id: null, // Ensure it's not a subtask of itself
        // Coworkers
        coworkers: {
          create: coworkers.map(cw => ({ user_id: cw.user_id }))
        },
        // Children (Subtasks)
        children: {
          create: children.map(child => {
             const { id, created_at, updated_at, parent_id, coworkers, status_updated_at, ...childRest } = child;
             return {
               ...childRest,
               status: "A Fazer",
               coworkers: {
                 create: coworkers.map(cw => ({ user_id: cw.user_id }))
               }
             };
          })
        }
      };

      const createdTask = await prisma.task.create({
        data: newTaskData,
      });

      // 3. Update master task
      const nextDate = calculateNextRecurrence(recurrence_config as unknown as RecurrenceConfig, master.next_recurrence_at || now);
      
      await prisma.task.update({
        where: { id: masterId },
        data: {
          last_recurrence_at: now,
          next_recurrence_at: nextDate,
        },
      });

      results.push({ masterId, newTaskId: createdTask.id, nextDate });
    }

    return NextResponse.json({ 
      message: `Processed ${masterTasks.length} recurring tasks`,
      results 
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
