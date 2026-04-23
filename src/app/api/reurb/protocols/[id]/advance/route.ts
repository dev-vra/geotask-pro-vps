import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/requirePermission";
import { logActivity, extractIp } from "@/lib/activityLog";
import { advanceStage } from "@/lib/services/reurbService";
import { updateStatusSchema } from "@/lib/validators/reurb";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const user = await requirePermission(req, (p) => p.reurb.advance_stage);
  if (user instanceof NextResponse) return user;
  const { id } = await params;

  const body = await req.json();
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  try {
    const solicitacao = await advanceStage(
      Number(id),
      parsed.data,
      (user as any).id,
      extractIp(req),
      req.headers.get("user-agent") || undefined,
    );

    logActivity((user as any).id, (user as any).name, "reurb_stage_advanced",
      "reurb_solicitacao", solicitacao.id,
      `Status: ${parsed.data.status_novo}`, req);

    return NextResponse.json(solicitacao);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
}
