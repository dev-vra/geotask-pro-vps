import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/requirePermission";
import { logActivity } from "@/lib/activityLog";
import { generateForensicsReport } from "@/lib/services/reurbForensicsService";

export async function POST(req: Request) {
  const user = await requirePermission(req, (p) => p.reurb.manage);
  if (user instanceof NextResponse) return user;

  const { solicitacao_id } = await req.json();
  if (!solicitacao_id) return NextResponse.json({ error: "solicitacao_id obrigatório" }, { status: 400 });

  try {
    const report = await generateForensicsReport(Number(solicitacao_id), (user as any).id);

    logActivity((user as any).id, (user as any).name, "reurb_forensics_export",
      "reurb_solicitacao", Number(solicitacao_id),
      `Relatório forense gerado. Cadeia: ${report.chain_valid ? "VÁLIDA" : "INVÁLIDA"}`, req);

    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
