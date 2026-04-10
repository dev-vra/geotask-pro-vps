import prisma from "@/lib/prisma";

/**
 * Resolve sector ID from either an ID or a name string.
 * Used across task creation/update and user assignment.
 */
export async function resolveSectorId(
  sector: number | string | null | undefined,
): Promise<number | null> {
  if (sector == null) return null;

  // Already a numeric ID
  if (typeof sector === "number") return sector;

  const num = Number(sector);
  if (!isNaN(num) && num > 0) return num;

  // Try to find by name
  const found = await prisma.sector.findFirst({
    where: { name: { equals: String(sector), mode: "insensitive" } },
  });
  if (found) return found.id;

  // Create if not found
  const created = await prisma.sector.create({
    data: { name: String(sector) },
  });
  return created.id;
}

/**
 * Resolve responsible user ID from either an ID or a name string.
 */
export async function resolveResponsibleId(
  responsible: number | string | null | undefined,
): Promise<number | null> {
  if (responsible == null) return null;

  if (typeof responsible === "number") return responsible;

  const num = Number(responsible);
  if (!isNaN(num) && num > 0) return num;

  // Try to find user by name
  const found = await prisma.user.findFirst({
    where: { name: { equals: String(responsible), mode: "insensitive" } },
  });
  return found?.id ?? null;
}

/**
 * Resolve contract ID from either an ID or a name string.
 */
export async function resolveContractId(
  contract: number | string | null | undefined,
): Promise<number | null> {
  if (contract == null) return null;

  if (typeof contract === "number") return contract;

  const num = Number(contract);
  if (!isNaN(num) && num > 0) return num;

  const found = await prisma.contract.findFirst({
    where: { name: { equals: String(contract), mode: "insensitive" } },
  });
  return found?.id ?? null;
}
