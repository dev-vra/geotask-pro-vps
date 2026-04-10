import { PrismaClient } from "@prisma/client";
import xlsx from "xlsx";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

async function main() {
  const EXCEL_FILE = "RELAÇÃO CONTRATO CIDADE BAIRRO.xlsx";
  const fs = await import("fs");
  if (!fs.existsSync(EXCEL_FILE)) {
    console.log(`Excel file ${EXCEL_FILE} not found. Skipping sync.`);
    return;
  }

  console.log("Reading Excel...");
  const wb = xlsx.readFile(EXCEL_FILE);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  
  const contracts = await prisma.contract.findMany();
  const dbCities = await prisma.city.findMany({ 
    include: { neighborhoods: true } 
  });

  // Normalization helper
  const norm = (str: string) => String(str || "").toLowerCase().trim();

  let matched = 0;
  let skipped = 0;

  for (const row of data as any[]) {
    const rContract = norm(row["CONTRATO"] || row["Contrato"]);
    const rCity = norm(row["CIDADE"] || row["Cidade"]);
    const rBairro = norm(row["BAIRRO"] || row["Bairro"]);

    if (!rContract || !rCity || !rBairro) continue;

    // Find Contract ID
    // Some excel contracts are like "009 - MTPAR", but DB is "009/2020/MTPAR"
    // We'll do a partial match where we check if DB name includes excel name or vice-versa, or just check the first part
    let contractId: number | null = null;
    const cMatch = contracts.find(c => {
      const dbC = norm(c.name);
      return dbC === rContract || dbC.includes(rContract) || rContract.includes(dbC.split('/')[0]);
    });
    if (cMatch) contractId = cMatch.id;

    if (!contractId) {
      console.log(`Contract not found for excel value: ${rContract}`);
      continue;
    }

    const cityObj = dbCities.find(c => norm(c.name) === rCity);
    if (!cityObj) continue;

    const neighborhoodObj = cityObj.neighborhoods.find(n => {
      const nName = norm(n.name);
      return nName === rBairro || nName.includes(rBairro) || rBairro.includes(nName);
    });

    if (neighborhoodObj) {
      if (neighborhoodObj.contract_id !== contractId) {
        await prisma.neighborhood.update({
          where: { id: neighborhoodObj.id },
          data: { contract_id: contractId },
        });
        matched++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`Finished mapping! Neighborhoods updated: ${matched}. Unmatched excel rows skipped: ${skipped}`);
}

main().then(() => prisma.$disconnect()).catch(console.error);
