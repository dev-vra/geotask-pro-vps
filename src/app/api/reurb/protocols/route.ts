import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/requirePermission";
import { logActivity } from "@/lib/activityLog";
import prisma from "@/lib/prisma";
import { createSolicitacaoSchema } from "@/lib/validators/reurb";

export async function POST(req: Request) {
  const user = await requirePermission(req, (p) => p.reurb.create);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = createSolicitacaoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const process = await prisma.reurbProcess.findFirst({
    where: { id: parsed.data.process_id, deleted_at: null },
  });
  if (!process) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

  const solicitacao = await prisma.reurbSolicitacao.create({
    data: {
      process_id: parsed.data.process_id,
      tipo: parsed.data.tipo,
      status_atual: parsed.data.status_atual ?? "ELABORACAO_INTERNA",
      prazo_alerta: parsed.data.prazo_alerta ? new Date(parsed.data.prazo_alerta) : null,
      link: parsed.data.link || null,
      created_by_id: (user as any).id,
    },
    include: { process: { include: { neighborhood: true } } },
  });

  logActivity((user as any).id, (user as any).name, "reurb_solicitacao_created", "reurb_solicitacao", solicitacao.id,
    `Solicitação criada: ${solicitacao.tipo}`, req);

  return NextResponse.json(solicitacao, { status: 201 });
}
