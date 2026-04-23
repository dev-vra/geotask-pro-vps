import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/requirePermission";
import prisma from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const user = await requirePermission(req, (p) => p.reurb.view);
  if (user instanceof NextResponse) return user;
  const { id } = await params;

  const url = new URL(req.url);
  const take = Math.min(Number(url.searchParams.get("limit") || "50"), 100);
  const skip = Number(url.searchParams.get("offset") || "0");

  const [total, history] = await Promise.all([
    prisma.reurbSolicitacaoHistory.count({ where: { solicitacao_id: Number(id) } }),
    prisma.reurbSolicitacaoHistory.findMany({
      where: { solicitacao_id: Number(id) },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { data_acao: "desc" },
      take,
      skip,
    }),
  ]);

  return NextResponse.json({ total, history });
}
