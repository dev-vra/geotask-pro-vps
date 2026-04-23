import prisma from "@/lib/prisma";
import { verifyHashChain } from "./reurbService";

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

export async function generateForensicsReport(solicitacaoId: number, requestedById: number) {
  const solicitacao = await prisma.reurbSolicitacao.findUnique({
    where: { id: solicitacaoId },
    include: {
      process: { include: { neighborhood: true, sector: true } },
      history: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { data_acao: "asc" },
      },
      attachments: { include: { uploaded_by: { select: { id: true, name: true } } } },
    },
  });

  if (!solicitacao) throw new Error("Solicitação não encontrada");

  const integrity = await verifyHashChain(solicitacaoId);

  // History CSV
  const historyCsv = toCsv(
    ["id", "data_acao", "status_anterior", "status_novo", "user_id", "user_name",
     "ip_address", "user_agent", "metadata", "previous_hash", "entry_hash"],
    solicitacao.history.map((h) => [
      h.id,
      h.data_acao.toISOString(),
      h.status_anterior ?? "",
      h.status_novo,
      h.user_id,
      h.user.name,
      h.ip_address,
      h.user_agent ?? "",
      h.metadata ? JSON.stringify(h.metadata) : "",
      h.previous_hash ?? "",
      h.entry_hash,
    ]),
  );

  // Attachments JSON manifest
  const attachmentsManifest = JSON.stringify(
    solicitacao.attachments.map((a) => ({
      id: a.id,
      original_name: a.original_name,
      file_url: a.file_url,
      file_hash_sha256: a.file_hash,
      file_type: a.file_type,
      size_bytes: a.size,
      uploaded_by: a.uploaded_by.name,
      uploaded_ip: a.uploaded_ip,
      created_at: a.created_at.toISOString(),
    })),
    null,
    2,
  );

  // Integrity check report
  const integrityText = [
    `RELATÓRIO DE INTEGRIDADE — Solicitação #${solicitacaoId}`,
    `Gerado em: ${new Date().toISOString()}`,
    `Gerado por: User #${requestedById}`,
    `Processo: ${solicitacao.process.neighborhood.name} — Tipo: ${solicitacao.tipo}`,
    ``,
    `STATUS DA CADEIA DE HASHES: ${integrity.valid ? "VÁLIDA ✓" : `INVÁLIDA ✗ — quebra no registro #${integrity.broken_at}`}`,
    `Total de registros verificados: ${solicitacao.history.length}`,
    ``,
    `Algoritmo: SHA-256`,
    `Estrutura: sha256(JSON.stringify({ previousHash, payload }))`,
    ``,
    `ATENÇÃO: qualquer alteração retroativa nos registros de histórico`,
    `quebra a cadeia e invalida este relatório.`,
  ].join("\n");

  return {
    history_csv: historyCsv,
    attachments_manifest: attachmentsManifest,
    integrity_check: integrityText,
    solicitacao_id: solicitacaoId,
    chain_valid: integrity.valid,
  };
}
