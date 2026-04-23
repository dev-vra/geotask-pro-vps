import prisma from "@/lib/prisma";
import { getTokenFromRequest, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/me
 * Validates the current JWT cookie and returns the user's full profile.
 * Used by the frontend to check if the user is still authenticated
 * and to refresh user data (e.g., after role/sector changes).
 */
export async function POST(req: Request) {
  try {
    // Try JWT cookie first
    const token = getTokenFromRequest(req);
    let userId: number | null = null;

    if (token) {
      const payload = await verifyJWT(token);
      if (payload?.userId) {
        userId = payload.userId;
      }
    }

    // Fallback: body { id } for backward compatibility during migration
    if (!userId) {
      try {
        const body = await req.json();
        if (body?.id) userId = Number(body.id);
      } catch {
        // No body or invalid JSON
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Autenticação necessária" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
