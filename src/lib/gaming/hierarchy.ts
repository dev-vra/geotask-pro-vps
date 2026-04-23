import { PrismaClient } from "@prisma/client";
import { User, Sector, Role } from "@/types";
import { getPermissions } from "../permissions";

/**
 * Verifica se um usuário possui a permissão de "bypass",
 * ou seja, ver e editar Gamings de toda a empresa (Admin, Diretores, RH, Controladoria).
 */
export const canManageAllGamings = (
  user: User & { Role?: Role | null; Sector?: Sector | null },
): boolean => {
  if (!user) return false;
  const perms = getPermissions(user as any);
  return perms.pages.gaming && (perms.tasks.view_all_sectors || perms.settings.manage_users);
};

/**
 * Busca toda a ramificação de Liderados abaixo de um usuário na hierarquia,
 * de forma recursiva, retornando um array de IDs.
 */
export async function getSubordinatesRecursiveIds(
  userId: number,
  prisma: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
): Promise<number[]> {
  const queue = [userId];
  const subordinateIds = new Set<number>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    // Prisma Omit type compatibility workaround
    const prs = prisma as any;
    const directSubordinates = await prs.user.findMany({
      where: { manager_id: currentId },
      select: { id: true },
    });

    for (const sub of directSubordinates) {
      if (!subordinateIds.has(sub.id)) {
        subordinateIds.add(sub.id);
        queue.push(sub.id);
      }
    }
  }

  return Array.from(subordinateIds);
}
