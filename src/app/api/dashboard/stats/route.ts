import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { PRIORITIES } from "@/lib/constants";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") ? Number(searchParams.get("user_id")) : undefined;
    const teamId = searchParams.get("team_id") ? Number(searchParams.get("team_id")) : undefined;
    const sectorId = searchParams.get("sector_id") ? Number(searchParams.get("sector_id")) : undefined;

    // Build common where clause for stats
    const where: any = {};
    if (teamId) {
      where.OR = [
        { team_id: teamId },
        { responsible: { team_id: teamId } }
      ];
    }
    if (sectorId) where.sector_id = sectorId;

    // Optional: Filter by user role if not admin
    // For now, keep it simple and filter by where params provided by client

    const tasks = await prisma.task.findMany({
      where,
      select: {
        id: true,
        status: true,
        priority: true,
        type: true,
        sector_id: true,
        Sector: { select: { name: true } },
        responsible_id: true,
        responsible: { select: { name: true, sector_id: true, Sector: { select: { name: true } } } },
        created_at: true,
        started_at: true,
        completed_at: true,
        time_spent: true,
        coworkers: { select: { user: { select: { name: true } } } },
      },
    });

    const total = tasks.length;
    const byStatus = {
      "A Fazer": tasks.filter((t) => t.status === "A Fazer").length,
      "Em Andamento": tasks.filter((t) => t.status === "Em Andamento").length,
      "Pausado": tasks.filter((t) => t.status === "Pausado").length,
      "Concluído": tasks.filter((t) => t.status === "Concluído").length,
    };

    const byPriority: Record<string, number> = {};
    PRIORITIES.forEach(p => {
      byPriority[p] = tasks.filter(t => t.priority === p).length;
    });

    const byType: Record<string, number> = {};
    tasks.forEach(t => {
      if (t.type) byType[t.type] = (byType[t.type] || 0) + 1;
    });

    const sectorStats: Record<string, { total: number; completed: number }> = {};
    tasks.forEach(t => {
      const sName = t.Sector?.name || "Sem Setor";
      if (!sectorStats[sName]) sectorStats[sName] = { total: 0, completed: 0 };
      sectorStats[sName].total++;
      if (t.status === "Concluído") sectorStats[sName].completed++;
    });

    const userStats: Record<string, { total: number; completed: number; sector: string }> = {};
    tasks.forEach(t => {
      const users = [];
      if (t.responsible?.name) users.push({ name: t.responsible.name, sector: t.responsible.Sector?.name || "" });
      t.coworkers.forEach(cw => {
         if (cw.user?.name) users.push({ name: cw.user.name, sector: "" }); // Sector not easily available here without more includes
      });

      users.forEach(u => {
        if (!userStats[u.name]) userStats[u.name] = { total: 0, completed: 0, sector: u.sector };
        userStats[u.name].total++;
        if (t.status === "Concluído") userStats[u.name].completed++;
      });
    });

    const concluded = tasks.filter(t => t.status === "Concluído" && t.completed_at && t.started_at);
    const avgTime = concluded.length > 0 
      ? Math.round(concluded.reduce((acc, t) => {
          const start = new Date(t.started_at!).getTime();
          const end = new Date(t.completed_at!).getTime();
          return acc + (end - start);
        }, 0) / concluded.length / (1000 * 60)) // in minutes
      : 0;

    const response = NextResponse.json({
      total,
      byStatus,
      byPriority,
      byType,
      sectorStats,
      userStats,
      avgTime,
      lastUpdated: new Date().toISOString(),
    });
    response.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return response;
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
