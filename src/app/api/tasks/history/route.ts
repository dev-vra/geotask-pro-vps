import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("task_id");

    if (!taskId) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 },
      );
    }

    const history = await prisma.taskHistory.findMany({
      where: { task_id: Number(taskId) },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching task history:", error);
    return NextResponse.json(
      { error: "Error fetching task history" },
      { status: 500 },
    );
  }
}
