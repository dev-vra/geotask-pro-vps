import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/requirePermission";
import prisma from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const user = await requirePermission(req, (p) => p.reurb.view);
  if (user instanceof NextResponse) return user;
  const { id } = await params;

  const solicitacao = await prisma.reurbSolicitacao.findUnique({
    where: { id: Number(id) },
    include: {
      process: { include: { neighborhood: { include: { city: true } }, sector: true } },
      history: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { data_acao: "desc" },
      },
      attachments: {
        include: { uploaded_by: { select: { id: true, name: true } } },
        orderBy: { created_at: "desc" },
      },
      comments: {
        include: { user: { select: { id: true, name: true, avatar: true } }, mentions: true },
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!solicitacao) return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });
  return NextResponse.json(solicitacao);
}
