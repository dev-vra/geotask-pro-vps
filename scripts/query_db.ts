import { PrismaClient } from "@prisma/client";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const contracts = await prisma.contract.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });
  
  const cities = await prisma.city.findMany({
    select: {
      id: true,
      name: true,
      neighborhoods: {
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      }
    },
    orderBy: { name: "asc" }
  });

  console.log("================== CONTRATOS ==================");
  contracts.forEach(c => console.log(`- [${c.id}] ${c.name}`));
  
  console.log("\n================== CIDADES ==================");
  cities.forEach(city => {
    console.log(`\n📍 ${city.name} [ID: ${city.id}]`);
    if (city.neighborhoods.length === 0) {
      console.log("   Nenhum núcleo/bairro cadastrado.");
    } else {
      city.neighborhoods.forEach(n => {
        console.log(`   - ${n.name} [ID: ${n.id}]`);
      });
    }
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("Erro na consulta:");
    console.error(e.message);
    prisma.$disconnect();
    process.exit(1);
  });
