import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/requirePermission";
import { getPermissions } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";
import prisma from "@/lib/prisma";
import { createProcessSchema } from "@/lib/validators/reurb";

export async function GET(req: Request) {
  const user = await requirePermission(req, (p) => p.reurb.view);
  if (user instanceof NextResponse) return user;

  const perms = getPermissions(user as any);
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const neighborhoodId = url.searchParams.get("neighborhood_id");
  const sectorId = url.searchParams.get("sector_id");
  const tipo = url.searchParams.get("tipo");
  const statusFilter = url.searchParams.get("status");

  const where: any = {
    deleted_at: null,
    ...(neighborhoodId && { neighborhood_id: Number(neighborhoodId) }),
    ...(search && { neighborhood: { name: { contains: search, mode: "insensitive" } } }),
    ...(sectorId && perms.reurb.view_all && { sector_id: Number(sectorId) }),
    ...(tipo && { solicitacoes: { some: { tipo: tipo as any } } }),
    ...(statusFilter && { solicitacoes: { some: { status_atual: statusFilter } } }),
  };

  if (!perms.reurb.view_all) {
    where.sector_id = (user as any).sector_id;
  }

  const processes = await prisma.reurbProcess.findMany({
    where,
    include: {
      neighborhood: { include: { city: true } },
      sector: { select: { id: true, name: true } },
      created_by: { select: { id: true, name: true } },
      solicitacoes: {
        select: { id: true, tipo: true, status_atual: true, updated_at: true },
        orderBy: { updated_at: "desc" },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json(processes);
}

export async function POST(req: Request) {
  const user = await requirePermission(req, (p) => p.reurb.create);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = createProcessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  let process;
  try {
    process = await prisma.reurbProcess.create({
      data: { ...parsed.data, created_by_id: (user as any).id },
      include: {
        neighborhood: { include: { city: true } },
        sector: { select: { id: true, name: true } },
      },
    });
  } catch (e: any) {
    if (e?.code === "P2003") {
      const field = e?.meta?.field_name?.includes("neighborhood") ? "Bairro" : "Setor";
      return NextResponse.json({ error: `${field} não encontrado. Verifique o ID informado.` }, { status: 400 });
    }
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Já existe um processo para este bairro." }, { status: 409 });
    }
    console.error("[REURB] Erro ao criar processo:", e);
    return NextResponse.json({ error: "Erro interno ao criar processo." }, { status: 500 });
  }

  logActivity((user as any).id, (user as any).name, "reurb_process_created", "reurb_process", process.id,
    `Processo REURB criado: ${process.neighborhood.name}`, req);

  return NextResponse.json(process, { status: 201 });
}
