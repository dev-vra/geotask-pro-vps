import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting VPS Clean Seed...");

  // Roles to create
  const roles = ["Admin", "Gerente", "Gestor", "Coordenador", "Liderado"];
  
  // Sectors to create
  const sectors = [
    "Administrativo",
    "Atendimento",
    "Cadastro",
    "Engenharia",
    "Financeiro",
    "REURB",
    "TI"
  ];

  console.log("🎭 Seeding Roles...");
  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r },
      update: {},
      create: { name: r },
    });
  }

  console.log("🏢 Seeding Sectors...");
  for (const s of sectors) {
    await prisma.sector.upsert({
      where: { name: s },
      update: {},
      create: { name: s },
    });
  }

  const roleMap = await prisma.role.findMany();
  const sectorMap = await prisma.sector.findMany();

  const getRole = (name: string) => roleMap.find(r => r.name === name)!.id;
  const getSector = (name: string) => sectorMap.find(s => s.name === name)!.id;

  const defaultPassword = await bcrypt.hash("GeoTask2026!", 10);

  const testUsers = [
    {
      email: "admin@geotask.pro",
      name: "Admin Sistema",
      role: "Admin",
      sector: "TI"
    },
    {
      email: "gerente@geotask.pro",
      name: "Gerente Admin",
      role: "Gerente",
      sector: "Administrativo"
    },
    {
      email: "gestor@geotask.pro",
      name: "Gestor Engenharia",
      role: "Gestor",
      sector: "Engenharia"
    },
    {
      email: "coord@geotask.pro",
      name: "Coordenador TI",
      role: "Coordenador",
      sector: "TI"
    },
    {
      email: "user@geotask.pro",
      name: "Usuário Teste Reurb",
      role: "Liderado",
      sector: "REURB"
    }
  ];

  console.log("👤 Seeding Test Users...");
  for (const u of testUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password_hash: defaultPassword,
        role_id: getRole(u.role),
        sector_id: getSector(u.sector),
        active: true,
        must_change_password: false
      },
      create: {
        email: u.email,
        name: u.name,
        password_hash: defaultPassword,
        role_id: getRole(u.role),
        sector_id: getSector(u.sector),
        active: true,
        must_change_password: false
      }
    });
  }

  console.log("✅ VPS Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
