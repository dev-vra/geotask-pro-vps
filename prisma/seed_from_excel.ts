import { PrismaClient } from "@prisma/client";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const xlsx = require("xlsx");
const bcrypt = require("bcryptjs");

const { readFile, utils } = xlsx;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  try {
    console.log("🌱 Starting seed from Excel...");
    const filePath = "data/Email_Institucional.xlsx";
    
    // Check if file exists to avoid ENOENT on Vercel
    const fs = require("fs");
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Skip: ${filePath} not found. Skipping Excel seed.`);
      return;
    }

    const workbook = readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = utils.sheet_to_json(sheet) as any[];

    console.log(`📊 Found ${data.length} users in Excel.`);

    const defaultPassword = "Geogis2026";
    console.log("🔑 Hashing password...");
    // Use a simple hash for now to see if bcrypt is the issue, or just use it normally
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);
    console.log("🔑 Password hashed.");

    // 1. Ensure Roles and Sectors exist
    const roles = [...new Set(data.map((d) => String(d.Cargo || "").trim()))].filter(Boolean);
    const sectors = [...new Set(data.map((d) => String(d.Setor || "").trim()))].filter(Boolean);

    console.log("🎭 Seeding Roles:", roles);
    for (const r of roles) {
      await prisma.role.upsert({
        where: { name: r },
        update: {},
        create: { name: r },
      });
    }

    console.log("🏢 Seeding Sectors:", sectors);
    for (const s of sectors) {
      await prisma.sector.upsert({
        where: { name: s },
        update: {},
        create: { name: s },
      });
    }

    // 2. Upsert Users
    console.log("👥 Seeding Users...");
    for (const row of data) {
      const name = String(row.Nome || "").trim();
      const email = String(row["e-mail"] || "").trim().toLowerCase();
      const cargo = String(row.Cargo || "").trim();
      const setor = String(row.Setor || "").trim();

      if (!email || !name) {
        console.warn(`⚠️ Skipping invalid row: ${JSON.stringify(row)}`);
        continue;
      }

      const role = await prisma.role.findUnique({ where: { name: cargo } });
      const sector = await prisma.sector.findUnique({ where: { name: setor } });

      if (!role || !sector) {
        console.warn(`⚠️ Skipping user ${name}: Role (${cargo}) or Sector (${setor}) not found.`);
        continue;
      }

      const initials = name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);

      await prisma.user.upsert({
        where: { email },
        update: {
          name,
          role_id: role.id,
          sector_id: sector.id,
          active: true,
        },
        create: {
          email,
          name,
          password_hash: passwordHash,
          role_id: role.id,
          sector_id: sector.id,
          avatar: initials,
          active: true,
          must_change_password: true,
        },
      });
    }

    console.log("✅ Seed from Excel completed!");
  } catch (error) {
    console.error("❌ Error during seed:", error);
    throw error;
  }
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
