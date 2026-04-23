import crypto from "crypto";
import prisma from "@/lib/prisma";
import { UpdateStatusInput } from "@/lib/validators/reurb";

// ---------------------------------------------------------------------------
// Hash chain utilities
// ---------------------------------------------------------------------------
export function computeEntryHash(previousHash: string | null, payload: object): string {
  const data = JSON.stringify({ previousHash, payload });
  return crypto.createHash("sha256").update(data).digest("hex");
}

export async function getLastEntryHash(solicitacaoId: number): Promise<string | null> {
  const last = await prisma.reurbSolicitacaoHistory.findFirst({
    where: { solicitacao_id: solicitacaoId },
    orderBy: { data_acao: "desc" },
    select: { entry_hash: true },
  });
  return last?.entry_hash ?? null;
}

// ---------------------------------------------------------------------------
// Core: update status (advance stage)
// ---------------------------------------------------------------------------
export async function advanceStage(
  solicitacaoId: number,
  input: UpdateStatusInput,
  userId: number,
  ip: string,
  userAgent?: string,
) {
  const solicitacao = await prisma.reurbSolicitacao.findUnique({
    where: { id: solicitacaoId },
  });
  if (!solicitacao) throw new Error("Solicitação não encontrada");

  const now = new Date();
  const previousHash = await getLastEntryHash(solicitacaoId);

  const payload = {
    solicitacao_id: solicitacaoId,
    status_anterior: solicitacao.status_atual,
    status_novo: input.status_novo,
    user_id: userId,
    data_acao: now.toISOString(),
  };
  const entryHash = computeEntryHash(previousHash, payload);

  const [updated] = await prisma.$transaction([
    prisma.reurbSolicitacao.update({
      where: { id: solicitacaoId },
      data: {
        status_atual: input.status_novo,
        prazo_alerta: input.prazo_alerta ? new Date(input.prazo_alerta) : undefined,
        link: input.link || undefined,
      },
    }),
    prisma.reurbSolicitacaoHistory.create({
      data: {
        solicitacao_id: solicitacaoId,
        status_anterior: solicitacao.status_atual,
        status_novo: input.status_novo,
        metadata: (input.metadata as any) ?? null,
        user_id: userId,
        ip_address: ip,
        user_agent: userAgent || null,
        previous_hash: previousHash,
        entry_hash: entryHash,
      },
    }),
  ]);

  return updated;
}

// ---------------------------------------------------------------------------
// Verify hash chain integrity
// ---------------------------------------------------------------------------
export async function verifyHashChain(
  solicitacaoId: number,
): Promise<{ valid: boolean; broken_at?: number }> {
  const entries = await prisma.reurbSolicitacaoHistory.findMany({
    where: { solicitacao_id: solicitacaoId },
    orderBy: { data_acao: "asc" },
    select: {
      id: true,
      previous_hash: true,
      entry_hash: true,
      status_anterior: true,
      status_novo: true,
      user_id: true,
      data_acao: true,
    },
  });

  let prevHash: string | null = null;
  for (const entry of entries) {
    if (entry.previous_hash !== prevHash) {
      return { valid: false, broken_at: entry.id };
    }
    const payload = {
      solicitacao_id: solicitacaoId,
      status_anterior: entry.status_anterior,
      status_novo: entry.status_novo,
      user_id: entry.user_id,
      data_acao: entry.data_acao.toISOString(),
    };
    const expected = computeEntryHash(prevHash, payload);
    if (expected !== entry.entry_hash) {
      return { valid: false, broken_at: entry.id };
    }
    prevHash = entry.entry_hash;
  }
  return { valid: true };
}
