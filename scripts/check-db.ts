import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({ select: { name: true } });
  const sectors = await prisma.sector.findMany({ select: { name: true } });
  
  console.log("Existing Roles:", roles.map(r => r.name));
  console.log("Existing Sectors:", sectors.map(s => s.name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
