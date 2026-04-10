import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware de autenticacao.
 *
 * Rotas publicas: /login, /api/auth/login, /api/setup, assets estaticos.
 * Rotas de API protegidas requerem o header X-User-Id.
 *
 * Nota: A autenticacao atual usa localStorage no cliente.
 * O frontend envia X-User-Id em cada request. O middleware valida
 * presenca e formato. A validacao completa (usuario existe e esta ativo)
 * e feita por `requireAuth()` em cada route handler.
 */

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/setup"]);

const PUBLIC_API_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/me",
  "/api/auth/change-password",
  "/api/setup",
]);

const PUBLIC_PREFIXES = ["/_next", "/favicon", "/logo", "/icon"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|woff2?)$/)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Protected API routes — require X-User-Id header
  if (pathname.startsWith("/api/")) {
    // Allow public API paths
    if (PUBLIC_API_PATHS.has(pathname)) {
      return NextResponse.next();
    }

    // Cron and Admin tasks use their own secret-based auth
    if (pathname.startsWith("/api/cron/") || pathname === "/api/admin/recalculate-time") {
      return NextResponse.next();
    }

    // Require X-User-Id header
    let userId = request.headers.get("X-User-Id");

    // Fallback for SSE: allow userId query param for /api/events
    if (!userId && pathname === "/api/events") {
      userId = request.nextUrl.searchParams.get("userId");
    }

    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json(
        { error: "Autenticação necessária" },
        { status: 401 },
      );
    }

    return NextResponse.next();
  }

  // Page routes — client-side handles auth redirect
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
