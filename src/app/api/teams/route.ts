import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true, tasks: true } } },
  });
  const response = NextResponse.json(teams);
  response.headers.set("Cache-Control", "s-maxage=600, stale-while-revalidate=1200");
  return response;
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  }
  const team = await prisma.team.create({ data: { name: name.trim() } });
  return NextResponse.json(team, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, name } = await req.json();
  if (!id || !name?.trim()) {
    return NextResponse.json({ error: "ID e nome obrigatórios" }, { status: 400 });
  }
  const team = await prisma.team.update({
    where: { id: Number(id) },
    data: { name: name.trim() },
  });
  return NextResponse.json(team);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  }
  const userCount = await prisma.user.count({ where: { team_id: Number(id) } });
  if (userCount > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: ${userCount} usuário(s) vinculado(s)` },
      { status: 409 },
    );
  }
  await prisma.team.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
