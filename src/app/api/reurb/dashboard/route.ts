import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/requirePermission";
import { getPermissions } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await requirePermission(req, (p) => p.reurb.view_dashboard);
  if (user instanceof NextResponse) return user;

  const perms = getPermissions(user as any);
  const sectorFilter = perms.reurb.view_all ? {} : { sector_id: (user as any).sector_id };

  const processWhere = { deleted_at: null, ...sectorFilter };

  const [
    totalProcesses,
    activeSolicitacoes,
    devolutivasAtivas,
    overdueSolicitacoes,
  ] = await Promise.all([
    prisma.reurbProcess.count({ where: processWhere }),
    prisma.reurbSolicitacao.count({
      where: {
        status_atual: { notIn: ["REGISTRADO_CONFIRMADO", "CANCELADO"] },
        process: processWhere,
      },
    }),
    prisma.reurbSolicitacao.count({
      where: { status_atual: "NOTA_DEVOLUTIVA", process: processWhere },
    }),
    prisma.reurbSolicitacao.findMany({
      where: {
        prazo_alerta: { lt: new Date() },
        status_atual: { notIn: ["REGISTRADO_CONFIRMADO", "CANCELADO"] },
        process: processWhere,
      },
      include: {
        process: { include: { neighborhood: { include: { city: true } } } },
      },
      orderBy: { prazo_alerta: "asc" },
      take: 20,
    }),
  ]);

  // Status breakdown from recent history
  const recentHistory = await prisma.reurbSolicitacaoHistory.findMany({
    where: { solicitacao: { process: processWhere } },
    select: { status_novo: true, data_acao: true },
    orderBy: { data_acao: "desc" },
    take: 200,
  });

  const statusCounts: Record<string, number> = {};
  for (const h of recentHistory) {
    statusCounts[h.status_novo] = (statusCounts[h.status_novo] ?? 0) + 1;
  }

  const stageBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  return NextResponse.json({
    kpis: {
      total_processes: totalProcesses,
      active_solicitacoes: activeSolicitacoes,
      devolutivas_ativas: devolutivasAtivas,
      overdue_count: overdueSolicitacoes.length,
    },
    alerts: {
      overdue_solicitacoes: overdueSolicitacoes,
    },
    stage_breakdown: stageBreakdown,
  });
}
