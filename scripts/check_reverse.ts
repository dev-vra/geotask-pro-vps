import { PrismaClient } from "@prisma/client";
import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);
const xlsx = require("xlsx");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

async function main() {
  const wb = xlsx.readFile("RELAÇÃO CONTRATO CIDADE BAIRRO.xlsx");
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  
  const excelNeighborhoods = new Set<string>();
  
  data.forEach((row: any) => {
    const b = String(row["BAIRRO"] || row["Bairro"] || "").trim().toLowerCase();
    if (b) excelNeighborhoods.add(b);
  });

  const dbCities = await prisma.city.findMany({ include: { neighborhoods: true } });
  
  const notInExcel: string[] = [];

  dbCities.forEach(city => {
    city.neighborhoods.forEach(n => {
      const dbName = n.name.trim().toLowerCase();
      
      // Strict match
      if (!excelNeighborhoods.has(dbName)) {
        // Try loose match
        let foundLoose = false;
        for (const ex of excelNeighborhoods) {
          if (ex.includes(dbName) || dbName.includes(ex)) {
            foundLoose = true;
            break;
          }
        }
        
        if (!foundLoose) {
          notInExcel.push(`- ${n.name} (Cidade: ${city.name})`);
        }
      }
    });
  });

  fs.writeFileSync("missing_52.txt", notInExcel.join("\n"));
  console.log("Done missing_52.txt");
}

main().then(() => prisma.$disconnect()).catch(console.error);
