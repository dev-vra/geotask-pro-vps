import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role_id: number;
  sector_id: number;
  team_id: number | null;
  active: boolean;
  role: { name: string; permissions: unknown };
  sector: { name: string };
}

/**
 * Extracts and validates the authenticated user from the request.
 * Reads the X-User-Id header set by the frontend.
 *
 * Returns the user object or null if not authenticated.
 */
export async function getAuthUser(
  req: Request,
): Promise<AuthUser | null> {
  const header = req.headers.get("X-User-Id");
  if (!header) return null;

  const userId = Number(header);
  if (!userId || isNaN(userId)) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId, active: true },
    include: {
      Role: { select: { name: true, permissions: true } },
      Sector: { select: { name: true } },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role_id: user.role_id,
    sector_id: user.sector_id,
    team_id: user.team_id,
    active: user.active,
    role: { name: user.Role.name, permissions: user.Role.permissions },
    sector: { name: user.Sector.name },
  };
}

/**
 * Require authentication — returns 401 response if not authenticated.
 * Use in API routes: const user = await requireAuth(req); if (user instanceof NextResponse) return user;
 */
export async function requireAuth(
  req: Request,
): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Autenticação necessária" },
      { status: 401 },
    );
  }
  return user;
}
