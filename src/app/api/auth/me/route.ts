import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id)
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: {
        Role: true,
        Sector: true,
        Team: true,
        user_sectors: { include: { sector: true } },
      },
    });

    if (!user)
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    if (!user.active)
      return NextResponse.json({ error: "Usuário inativo" }, { status: 403 });

    const { password_hash: _, ...userWithoutPassword } = user as any;

    return NextResponse.json({
      ...userWithoutPassword,
      role: (user as any).Role,
      sector: (user as any).Sector,
      team: (user as any).Team,
      user_sectors: (user as any).user_sectors,
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
