import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const contracts = await prisma.contract.findMany({
      orderBy: { name: "asc" },
    });
    const response = NextResponse.json(contracts);
    response.headers.set("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar contratos" },
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
    const contract = await prisma.contract.create({ data: { name } });
    return NextResponse.json(contract, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "Contrato já existe" },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "Erro ao criar contrato" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    await prisma.contract.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Contrato removido" });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro ao remover contrato. Verifique se há tarefas vinculadas.",
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
    const contract = await prisma.contract.update({
      where: { id: Number(id) },
      data: { name },
    });
    return NextResponse.json(contract);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um contrato com este nome" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao atualizar contrato" },
      { status: 500 },
    );
  }
}
