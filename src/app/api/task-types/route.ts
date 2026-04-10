import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const types = await prisma.taskType.findMany({
      include: {
        Sector: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    const response = NextResponse.json(types);
    response.headers.set("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return response;
  } catch (error) {
    console.error("Error fetching task types:", error);
    return NextResponse.json(
      { error: "Erro ao buscar tipos de tarefa" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, sector_id } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 },
      );
    }

    const newType = await prisma.taskType.create({
      data: {
        name: name.trim(),
        sector_id: sector_id ? Number(sector_id) : null,
      },
      include: {
        Sector: true,
      },
    });

    return NextResponse.json(newType, { status: 201 });
  } catch (error: any) {
    console.error("Error creating task type:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um tipo de tarefa com este nome" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao criar tipo de tarefa" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, sector_id } = body;

    if (!id || !name?.trim()) {
      return NextResponse.json(
        { error: "Id e nome são obrigatórios" },
        { status: 400 },
      );
    }

    const updatedType = await prisma.taskType.update({
      where: { id: Number(id) },
      data: {
        name: name.trim(),
        sector_id: sector_id ? Number(sector_id) : null,
      },
      include: {
        Sector: true,
      },
    });

    return NextResponse.json(updatedType);
  } catch (error: any) {
    console.error("Error updating task type:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um tipo de tarefa com este nome" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao atualizar tipo de tarefa" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Id obrigatório" }, { status: 400 });
    }

    await prisma.taskType.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task type:", error);
    return NextResponse.json(
      { error: "Erro ao deletar tipo de tarefa" },
      { status: 500 },
    );
  }
}
