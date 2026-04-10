import prisma from "@/lib/prisma";
import { getPermissions } from "@/lib/permissions";
import { NextResponse } from "next/server";

async function resolveSectorId(s: any): Promise<number | null> {
  if (!s) return null;

  // If already an ID
  if (typeof s === "number") return s;
  if (typeof s === "string" && !isNaN(Number(s)) && s.trim() !== "")
    return Number(s);

  // If it's an object { id, name }
  if (typeof s === "object") {
    if (s.id && !isNaN(Number(s.id))) return Number(s.id);
    if (s.name) s = s.name;
  }

  const str = String(s).trim();
  // Try case-insensitive matching first
  const sector = await prisma.sector.findFirst({
    where: { name: { equals: str, mode: "insensitive" } },
  });
  if (sector) return sector.id;

  // Fallback to "Administrativo" if not found
  const admin = await prisma.sector.findFirst({
    where: { name: { contains: "Administrativo", mode: "insensitive" } },
  });
  return admin?.id || null;
}

async function resolveResponsibleId(r: any): Promise<number | null> {
  if (!r) return null;

  // If already an ID
  if (typeof r === "number") return r;
  if (typeof r === "string" && !isNaN(Number(r)) && r.trim() !== "")
    return Number(r);

  // If it's an object { id, name }
  if (typeof r === "object") {
    if (r.id && !isNaN(Number(r.id))) return Number(r.id);
    if (r.name) r = r.name;
  }

  // Find by name (case-insensitive and trimmed)
  const u = await prisma.user.findFirst({
    where: {
      name: { equals: String(r).trim(), mode: "insensitive" },
    },
  });
  return u?.id || null;
}

// Subtask can be a string (legacy) or { title, sector, responsible }
type SubtaskInput =
  | string
  | { title: string; sector?: string; responsible?: string };

function subtaskTitle(s: SubtaskInput): string {
  return typeof s === "string" ? s : s.title || "";
}

function subtaskSector(s: SubtaskInput): string | undefined {
  return typeof s === "string" ? undefined : s.sector;
}

function subtaskResponsible(s: SubtaskInput): string | undefined {
  return typeof s === "string" ? undefined : s.responsible;
}

// GET /api/templates
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    const where: any = {};

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        include: { Role: true },
      });

      const perms = getPermissions(user as any);
      if (!perms.pages.view_all_templates) {
        where.created_by_id = Number(userId);
      }
    }

    const templates = await prisma.template.findMany({
      where,
      include: {
        Sector: { select: { id: true, name: true } },
        tasks: {
          orderBy: { order_index: "asc" },
          include: {
            subtasks: {
              orderBy: { order_index: "asc" },
              include: {
                Sector: { select: { id: true, name: true } },
                responsible: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { id: "asc" },
    });

    const result = templates.map((tpl) => ({
      id: tpl.id,
      name: tpl.name,
      sector: tpl.Sector ? { name: tpl.Sector.name, id: tpl.Sector.id } : null,
      created_by: tpl.created_by_id,
      created_at: tpl.created_at,
      tasks: tpl.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        sector: tpl.Sector
          ? { name: tpl.Sector.name, id: tpl.Sector.id }
          : null,
        order_index: t.order_index,
        subtasks: t.subtasks.map((s) => ({
          title: s.title,
          sector: s.Sector ? { name: s.Sector.name, id: s.Sector.id } : null,
          responsible: s.responsible
            ? { name: s.responsible.name, id: s.responsible.id }
            : null,
        })),
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao buscar templates:", error);
    return NextResponse.json(
      { error: "Erro ao buscar templates" },
      { status: 500 },
    );
  }
}

// POST /api/templates
export async function POST(req: Request) {
  try {
    const { name, sector, tasks, created_by } = await req.json();
    if (!name)
      return NextResponse.json(
        { error: "name é obrigatório" },
        { status: 400 },
      );

    const sVal = sector || tasks?.[0]?.sector;
    const sectorId = await resolveSectorId(sVal);

    if (!sectorId) {
      return NextResponse.json(
        { error: "Setor inválido ou não encontrado." },
        { status: 400 },
      );
    }

    // Resolve all data before creation
    const resolvedTasks: {
      title: string;
      order_index: number;
      subtasks: {
        create: {
          title: string;
          order_index: number;
          sector_id: number | null;
          responsible_id: number | null;
        }[];
      };
    }[] = [];
    if (tasks) {
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        const subtasks: {
          title: string;
          order_index: number;
          sector_id: number | null;
          responsible_id: number | null;
        }[] = [];
        if (t.subtasks) {
          const filtered = t.subtasks.filter((s: any) =>
            subtaskTitle(s).trim(),
          );
          for (let j = 0; j < filtered.length; j++) {
            const s = filtered[j];
            subtasks.push({
              title: subtaskTitle(s),
              order_index: j,
              sector_id: await resolveSectorId(subtaskSector(s)),
              responsible_id: await resolveResponsibleId(subtaskResponsible(s)),
            });
          }
        }
        resolvedTasks.push({
          title: t.title,
          order_index: i,
          subtasks: { create: subtasks },
        });
      }
    }

    const template = await prisma.template.create({
      data: {
        name,
        sector_id: sectorId,
        created_by_id: created_by ? Number(created_by) : null,
        tasks: { create: resolvedTasks },
      },
    });

    return NextResponse.json(
      { message: "Template criado", id: template.id },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Erro ao criar template:", error);
    return NextResponse.json(
      { error: "Erro ao criar template: " + error.message },
      { status: 500 },
    );
  }
}

// PATCH /api/templates
export async function PATCH(req: Request) {
  try {
    const { id, name, sector, tasks } = await req.json();
    if (!id || !name)
      return NextResponse.json(
        { error: "id e name são obrigatórios" },
        { status: 400 },
      );

    const sVal = sector || tasks?.[0]?.sector;
    const sectorId = await resolveSectorId(sVal);

    const template = await prisma.$transaction(async (tx) => {
      const updateData: any = { name };
      if (sectorId) updateData.sector_id = sectorId;

      const updated = await tx.template.update({
        where: { id: Number(id) },
        data: updateData,
      });

      if (tasks && tasks.length > 0) {
        for (let i = 0; i < tasks.length; i++) {
          const t = tasks[i];
          const resolvedSubtasks: {
            title: string;
            order_index: number;
            sector_id: number | null;
            responsible_id: number | null;
          }[] = [];
          if (t.subtasks) {
            const filtered = t.subtasks.filter((s: any) =>
              subtaskTitle(s).trim(),
            );
            for (let j = 0; j < filtered.length; j++) {
              const s = filtered[j];
              resolvedSubtasks.push({
                title: subtaskTitle(s),
                order_index: j,
                sector_id: await resolveSectorId(subtaskSector(s)),
                responsible_id: await resolveResponsibleId(
                  subtaskResponsible(s),
                ),
              });
            }
          }

          await tx.templateTask.create({
            data: {
              template_id: updated.id,
              title: t.title,
              order_index: i,
              subtasks: {
                create: resolvedSubtasks,
              },
            },
          });
        }
      }
      return updated;
    });

    return NextResponse.json({
      message: "Template atualizado",
      id: template.id,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar template:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar template: " + error.message },
      { status: 500 },
    );
  }
}

// DELETE /api/templates
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    await prisma.template.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Template removido" });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao remover template" },
      { status: 500 },
    );
  }
}
