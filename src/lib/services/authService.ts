import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { Role: true, Sector: true },
  });
}

export async function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    include: { Role: true, Sector: true },
  });
}

/**
 * Sanitize user object for API response — strips password_hash
 */
export function sanitizeUser(user: Record<string, unknown>) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

export const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || "Mudar@123";
