import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id obrigatório" }, { status: 400 });
  }
  const links = await prisma.userSector.findMany({
    where: { user_id: Number(userId) },
    include: { sector: true },
    orderBy: { sector: { name: "asc" } },
  });
  return NextResponse.json(links);
}

export async function POST(req: NextRequest) {
  const { user_id, sector_ids } = await req.json();
  if (!user_id || !Array.isArray(sector_ids)) {
    return NextResponse.json({ error: "user_id e sector_ids obrigatórios" }, { status: 400 });
  }
  // Remove existing links and recreate (sync approach)
  await prisma.userSector.deleteMany({ where: { user_id: Number(user_id) } });
  const data = sector_ids.map((sid: number) => ({
    user_id: Number(user_id),
    sector_id: Number(sid),
  }));
  if (data.length > 0) {
    await prisma.userSector.createMany({ data, skipDuplicates: true });
  }
  const updated = await prisma.userSector.findMany({
    where: { user_id: Number(user_id) },
    include: { sector: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  }
  await prisma.userSector.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
