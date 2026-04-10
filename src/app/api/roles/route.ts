import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/roles
export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: "asc" },
    });
    const response = NextResponse.json(roles);
    response.headers.set("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return response;
  } catch (error) {
    console.error("Erro ao buscar cargos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cargos" },
      { status: 500 },
    );
  }
}

// POST /api/roles — criar cargo
export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 },
      );
    }
    const role = await prisma.role.create({
      data: { name },
    });
    return NextResponse.json(role, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar cargo:", error);
    if ((error as any)?.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um cargo com esse nome" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Erro ao criar cargo" }, { status: 500 });
  }
}

// PATCH /api/roles — editar cargo (nome ou permissões)
export async function PATCH(req: Request) {
  try {
    const { id, name, permissions } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (permissions !== undefined) data.permissions = permissions;

    const role = await prisma.role.update({
      where: { id: Number(id) },
      data,
    });
    return NextResponse.json(role);
  } catch (error: unknown) {
    console.error("Erro ao atualizar cargo:", error);
    if ((error as any)?.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um cargo com esse nome" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao atualizar cargo" },
      { status: 500 },
    );
  }
}

// DELETE /api/roles?id=X
export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    // Check if any user is using this role
    const usersWithRole = await prisma.user.count({
      where: { role_id: Number(id) },
    });
    if (usersWithRole > 0) {
      return NextResponse.json(
        {
          error: `Não é possível excluir: ${usersWithRole} usuário(s) com este cargo`,
        },
        { status: 409 },
      );
    }

    await prisma.role.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Cargo excluído" });
  } catch (error) {
    console.error("Erro ao excluir cargo:", error);
    return NextResponse.json(
      { error: "Erro ao excluir cargo" },
      { status: 500 },
    );
  }
}
