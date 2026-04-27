import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// ---------------------------------------------------------------------------
// JWT Configuration
// ---------------------------------------------------------------------------

const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET environment variable is required in production");
}
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW ?? "dev-only-insecure-secret");
const JWT_EXPIRATION = "8h";
const COOKIE_NAME = "geotask_token";

export interface JWTUserPayload extends JWTPayload {
  userId: number;
  roleId: number;
  sectorId: number;
  teamId: number | null;
}

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

// ---------------------------------------------------------------------------
// JWT Helpers
// ---------------------------------------------------------------------------

/**
 * Signs a JWT token with user info.
 */
export async function signJWT(user: {
  id: number;
  role_id: number;
  sector_id: number;
  team_id: number | null;
}): Promise<string> {
  return new SignJWT({
    userId: user.id,
    roleId: user.role_id,
    sectorId: user.sector_id,
    teamId: user.team_id,
  } satisfies JWTUserPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);
}

/**
 * Verifies and decodes a JWT token.
 * Returns the payload or null if invalid/expired.
 */
export async function verifyJWT(token: string): Promise<JWTUserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTUserPayload;
  } catch {
    return null;
  }
}

/**
 * Creates a Set-Cookie header value for the JWT token.
 */
export function createAuthCookie(token: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${8 * 60 * 60}`, // 8 hours
  ];
  if (isProduction) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Creates a Set-Cookie header that clears the auth cookie.
 */
export function clearAuthCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// ---------------------------------------------------------------------------
// Auth extraction from Request
// ---------------------------------------------------------------------------

/**
 * Extracts the JWT token from the request cookies.
 */
export function getTokenFromRequest(req: NextRequest | Request): string | null {
  // NextRequest has a cookies API
  if ("cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
    return (req as NextRequest).cookies.get(COOKIE_NAME)?.value || null;
  }
  // Fallback: parse Cookie header
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match ? match[1] : null;
}

/**
 * Extracts and validates the authenticated user from the request.
 * Reads the JWT from HttpOnly cookie, then fetches the user from the DB.
 *
 * Returns the user object or null if not authenticated.
 */
export async function getAuthUser(
  req: Request,
): Promise<AuthUser | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId, active: true },
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
    logger.security("Unauthenticated access attempt in requireAuth", req);
    return NextResponse.json(
      { error: "Autenticação necessária" },
      { status: 401 },
    );
  }
  return user;
}

export { COOKIE_NAME };
