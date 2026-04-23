import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/requirePermission";

export async function GET(req: Request) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const cityId = new URL(req.url).searchParams.get("cityId");
    const where = cityId ? { city_id: Number(cityId) } : {};
    const neighborhoods = await prisma.neighborhood.findMany({
      where,
      include: { city: true },
      orderBy: { name: "asc" },
    });
    const response = NextResponse.json(neighborhoods);
    response.headers.set("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar bairros" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requirePermission(req, p => p.settings.manage_locations);
    if (authResult instanceof NextResponse) return authResult;

    const { name, cityId } = await req.json();
    if (!name || !cityId)
      return NextResponse.json(
        { error: "Nome e Cidade são obrigatórios" },
        { status: 400 },
      );
    const neighborhood = await prisma.neighborhood.create({
      data: {
        name,
        city_id: Number(cityId),
      },
    });
    return NextResponse.json(neighborhood, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "Bairro já existe nesta cidade" },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "Erro ao criar bairro" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const authResult = await requirePermission(req, p => p.settings.manage_locations);
    if (authResult instanceof NextResponse) return authResult;

    const id = new URL(req.url).searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    await prisma.neighborhood.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Bairro removido" });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao remover bairro. Verifique se há tarefas vinculadas." },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const authResult = await requirePermission(req, p => p.settings.manage_locations);
    if (authResult instanceof NextResponse) return authResult;

    const { id, name } = await req.json();
    if (!id || !name) {
      return NextResponse.json(
        { error: "ID e Nome são obrigatórios" },
        { status: 400 },
      );
    }
    const neighborhood = await prisma.neighborhood.update({
      where: { id: Number(id) },
      data: { name },
    });
    return NextResponse.json(neighborhood);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um bairro com este nome" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao atualizar bairro" },
      { status: 500 },
    );
  }
}

