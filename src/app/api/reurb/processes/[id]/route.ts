import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/requirePermission";
import { logActivity } from "@/lib/activityLog";
import prisma from "@/lib/prisma";
import { updateProcessSchema } from "@/lib/validators/reurb";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const user = await requirePermission(req, (p) => p.reurb.view);
  if (user instanceof NextResponse) return user;
  const { id } = await params;

  const process = await prisma.reurbProcess.findFirst({
    where: { id: Number(id), deleted_at: null },
    include: {
      neighborhood: { include: { city: true } },
      sector: { select: { id: true, name: true } },
      created_by: { select: { id: true, name: true } },
      solicitacoes: {
        include: {
          history: { orderBy: { data_acao: "desc" }, take: 1 },
          attachments: { select: { id: true, original_name: true, file_url: true, created_at: true } },
        },
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!process) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  return NextResponse.json(process);
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await requirePermission(req, (p) => p.reurb.edit);
  if (user instanceof NextResponse) return user;
  const { id } = await params;

  const body = await req.json();
  const parsed = updateProcessSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const process = await prisma.reurbProcess.update({
    where: { id: Number(id) },
    data: parsed.data,
  });

  logActivity((user as any).id, (user as any).name, "reurb_process_updated", "reurb_process", process.id,
    `Processo atualizado`, req);

  return NextResponse.json(process);
}

export async function DELETE(req: Request, { params }: Params) {
  const user = await requirePermission(req, (p) => p.reurb.manage);
  if (user instanceof NextResponse) return user;
  const { id } = await params;

  const process = await prisma.reurbProcess.update({
    where: { id: Number(id) },
    data: { deleted_at: new Date() },
  });

  logActivity((user as any).id, (user as any).name, "reurb_process_deleted", "reurb_process", process.id,
    `Processo removido (soft delete)`, req);

  return NextResponse.json({ ok: true });
}
