import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/requirePermission";

// GET /api/sectors
export async function GET(req: Request) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const sectors = await prisma.sector.findMany({
      orderBy: { name: "asc" },
    });
    const response = NextResponse.json(sectors);
    response.headers.set("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return response;
  } catch (error) {
    console.error("Erro ao buscar setores:", error);
    return NextResponse.json(
      { error: "Erro ao buscar setores" },
      { status: 500 },
    );
  }
}

// POST /api/sectors — criar setor
export async function POST(req: Request) {
  try {
    const authResult = await requirePermission(req, p => p.settings.manage_locations || p.settings.manage_user_sectors);
    if (authResult instanceof NextResponse) return authResult;

    const { name } = await req.json();
    if (!name) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 },
      );
    }
    const sector = await prisma.sector.create({
      data: { name },
    });
    return NextResponse.json(sector, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar setor:", error);
    if ((error as any)?.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um setor com esse nome" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Erro ao criar setor" }, { status: 500 });
  }
}

// PATCH /api/sectors — editar setor
export async function PATCH(req: Request) {
  try {
    const authResult = await requirePermission(req, p => p.settings.manage_locations || p.settings.manage_user_sectors);
    if (authResult instanceof NextResponse) return authResult;

    const { id, name } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }
    const sector = await prisma.sector.update({
      where: { id: Number(id) },
      data: { name },
    });
    return NextResponse.json(sector);
  } catch (error: unknown) {
    console.error("Erro ao atualizar setor:", error);
    if ((error as any)?.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um setor com esse nome" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao atualizar setor" },
      { status: 500 },
    );
  }
}

// DELETE /api/sectors?id=X
export async function DELETE(req: Request) {
  try {
    const authResult = await requirePermission(req, p => p.settings.manage_locations || p.settings.manage_user_sectors);
    if (authResult instanceof NextResponse) return authResult;

    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    // Check if any user is assigned to this sector
    const usersInSector = await prisma.user.count({
      where: { sector_id: Number(id) },
    });
    if (usersInSector > 0) {
      return NextResponse.json(
        {
          error: `Não é possível excluir: ${usersInSector} usuário(s) neste setor`,
        },
        { status: 409 },
      );
    }

    await prisma.sector.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Setor excluído" });
  } catch (error) {
    console.error("Erro ao excluir setor:", error);
    return NextResponse.json(
      { error: "Erro ao excluir setor" },
      { status: 500 },
    );
  }
}
