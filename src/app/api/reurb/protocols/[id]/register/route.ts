import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/requirePermission";
import { logActivity, extractIp } from "@/lib/activityLog";
import { computeEntryHash, getLastEntryHash } from "@/lib/services/reurbService";
import prisma from "@/lib/prisma";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const registerSchema = z.object({
  numero_protocolo_cartorio: z.string().min(1, "Nº protocolo obrigatório"),
  data_registro_cartorio: z.string().datetime("Data inválida"),
});

export async function POST(req: Request, { params }: Params) {
  const user = await requirePermission(req, (p) => p.reurb.confirm_registration);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const solicitacaoId = Number(id);

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const solicitacao = await prisma.reurbSolicitacao.findUnique({ where: { id: solicitacaoId } });
  if (!solicitacao) return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });

  const ip = extractIp(req);
  const previousHash = await getLastEntryHash(solicitacaoId);
  const payload = {
    solicitacao_id: solicitacaoId,
    status_anterior: solicitacao.status_atual,
    status_novo: "REGISTRADO_CONFIRMADO",
    user_id: (user as any).id,
    data_acao: new Date().toISOString(),
  };
  const entryHash = computeEntryHash(previousHash, payload);

  const [updated] = await prisma.$transaction([
    prisma.reurbSolicitacao.update({
      where: { id: solicitacaoId },
      data: { status_atual: "REGISTRADO_CONFIRMADO" },
    }),
    prisma.reurbSolicitacaoHistory.create({
      data: {
        solicitacao_id: solicitacaoId,
        status_anterior: solicitacao.status_atual,
        status_novo: "REGISTRADO_CONFIRMADO",
        metadata: {
          numero_protocolo_cartorio: parsed.data.numero_protocolo_cartorio,
          data_registro_cartorio: parsed.data.data_registro_cartorio,
          acao: "Registro cartorial confirmado",
        },
        user_id: (user as any).id,
        ip_address: ip,
        user_agent: req.headers.get("user-agent") || null,
        previous_hash: previousHash,
        entry_hash: entryHash,
      },
    }),
  ]);

  logActivity((user as any).id, (user as any).name, "reurb_registration_confirmed",
    "reurb_solicitacao", solicitacaoId,
    `Protocolo cartório: ${parsed.data.numero_protocolo_cartorio}`, req);

  return NextResponse.json(updated);
}
