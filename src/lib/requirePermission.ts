import { getAuthUser, AuthUser } from "@/lib/auth";
import { getPermissions, AppPermissions } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { logger } from "./logger";

export type PermissionCheck = (permissions: AppPermissions) => boolean;

/**
 * Helper to require specific permissions for an API route.
 * Returns either the AuthUser, or a NextResponse (401/403) if denied.
 */
export async function requirePermission(
  req: Request,
  check: PermissionCheck
): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser(req);

  if (!user) {
    logger.security("Unauthenticated access attempt", req);
    return NextResponse.json(
      { error: "Autenticação necessária" },
      { status: 401 }
    );
  }

  const permissions = getPermissions((user as unknown) as any);

  if (!check(permissions)) {
    logger.security(`Forbidden access attempt by user ${user.id} (${user.email})`, {}, req, user.id);
    
    return NextResponse.json(
      { error: "Acesso negado: você não tem permissão para realizar esta ação." },
      { status: 403 }
    );
  }

  return user;
}
