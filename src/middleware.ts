import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Middleware de autenticação via JWT (HttpOnly cookie).
 *
 * Rotas públicas: /login, /api/auth/login, /api/auth/logout, /api/setup, assets estáticos.
 * Rotas de API protegidas requerem cookie JWT válido.
 * Rotas de páginas redirecionam para /login se não autenticado.
 */

const COOKIE_NAME = "geotask_token";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "CHANGE_ME_IN_PRODUCTION_jwt_secret_32chars!!"
);

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/auth/logout", "/api/setup"]);

const PUBLIC_API_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/change-password",
  "/api/setup",
  "/api/health",
]);

const PUBLIC_PREFIXES = ["/_next", "/favicon", "/logo", "/icon"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|woff2?)$/)) return true;
  return false;
}

async function verifyToken(token: string): Promise<{ userId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (typeof payload.userId === "number") {
      return { userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Get JWT from cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Protected API routes
  if (pathname.startsWith("/api/")) {
    // Allow public API paths
    if (PUBLIC_API_PATHS.has(pathname)) {
      return NextResponse.next();
    }

    // Cron and Admin tasks use their own secret-based auth
    if (
      pathname.startsWith("/api/cron/") ||
      pathname === "/api/tasks/cron" ||
      pathname === "/api/admin/recalculate-time"
    ) {
      return NextResponse.next();
    }

    // Validate JWT
    if (!token) {
      return NextResponse.json(
        { error: "Autenticação necessária" },
        { status: 401 },
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Token inválido ou expirado" },
        { status: 401 },
      );
    }

    // Attach userId to request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-auth-user-id", String(payload.userId));

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Page routes — redirect to login if no valid token
  if (!token) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.host = request.headers.get("host") || request.nextUrl.host;
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.host = request.headers.get("host") || request.nextUrl.host;
    const response = NextResponse.redirect(loginUrl);
    // Clear invalid cookie
    response.headers.set(
      "Set-Cookie",
      `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
    );
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
