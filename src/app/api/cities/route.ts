import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      include: { _count: { select: { neighborhoods: true } } },
      orderBy: { name: "asc" },
    });
    const response = NextResponse.json(cities);
    response.headers.set("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar cidades" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name)
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 },
      );
    const city = await prisma.city.create({ data: { name } });
    return NextResponse.json(city, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002")
      return NextResponse.json({ error: "Cidade já existe" }, { status: 400 });
    return NextResponse.json(
      { error: "Erro ao criar cidade" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    await prisma.city.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Cidade removida" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Erro ao remover cidade. Verifique se há bairros ou tarefas vinculadas.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { id, name } = await req.json();
    if (!id || !name) {
      return NextResponse.json(
        { error: "ID e Nome são obrigatórios" },
        { status: 400 },
      );
    }
    const city = await prisma.city.update({
      where: { id: Number(id) },
      data: { name },
    });
    return NextResponse.json(city);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe uma cidade com este nome" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao atualizar cidade" },
      { status: 500 },
    );
  }
}
