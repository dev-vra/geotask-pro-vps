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
  
  const excelContracts = new Set<string>();
  const excelCities = new Set<string>();
  const excelNeighborhoods = new Set<string>();
  
  data.forEach((row: any) => {
    const c = String(row["CONTRATO"] || row["Contrato"] || "").trim();
    const ci = String(row["CIDADE"] || row["Cidade"] || "").trim();
    const b = String(row["BAIRRO"] || row["Bairro"] || "").trim();
    if (c) excelContracts.add(c);
    if (ci) excelCities.add(ci);
    if (b) excelNeighborhoods.add(b);
  });

  const dbContracts = await prisma.contract.findMany();
  const dbCities = await prisma.city.findMany({ include: { neighborhoods: true } });
  
  const dbContractSet = new Set(dbContracts.map(c => c.name.trim().toLowerCase()));
  const dbCitySet = new Set(dbCities.map(c => c.name.trim().toLowerCase()));
  const dbNeighborhoodSet = new Set(dbCities.flatMap(c => c.neighborhoods.map(n => n.name.trim().toLowerCase())));

  let report = "# Comparação Excel vs Banco de Dados\n\n";

  // Compare
  const missingContracts = Array.from(excelContracts).filter(c => !dbContractSet.has(c.toLowerCase()));
  const extraContracts = dbContracts.filter(c => !Array.from(excelContracts).map(x => x.toLowerCase()).includes(c.name.toLowerCase()));

  const missingCities = Array.from(excelCities).filter(c => !dbCitySet.has(c.toLowerCase()));
  const missingNeighborhoods = Array.from(excelNeighborhoods).filter(b => !dbNeighborhoodSet.has(b.toLowerCase()));

  report += "## 1. Contratos\n";
  report += `**No Excel que não estão no DB:** ${missingContracts.length ? missingContracts.join(", ") : "Nenhum"}\n\n`;
  report += `**No DB que não estão no Excel:** ${extraContracts.length ? extraContracts.map(c => c.name).join(", ") : "Nenhum"}\n\n`;

  report += "## 2. Cidades\n";
  report += `**No Excel que não estão no DB:** ${missingCities.length ? missingCities.join(", ") : "Nenhuma"}\n\n`;

  report += "## 3. Bairros/Núcleos\n";
  report += `**No Excel que não estão no DB:** ${missingNeighborhoods.length ? missingNeighborhoods.join(", ") : "Nenhum"}\n\n`;

  // Plan Prisma Update
  report += "## Mudança Necessária (Nova feature)\n";
  report += "Para suportar a hierarquia solicitada (`Contrato -> Cidade -> Bairro`) sendo que algumas cidades aparecem em mais de um contrato, mas os bairros mudam, precisamos relacionar `Neighborhood` (Bairro) ao `Contract` (Contrato) no banco de dados.\n\n";
  report += "### Plano de Ação:\n";
  report += "1. **Schema Prisma**: Adicionar no schema do banco que `Neighborhood` tenha `contract_id`.\n";
  report += "2. **Migração do Banco**: Rodar comando de db push para que o banco passe a ter o ID do Contrato junto ao Bairro.\n";
  report += "3. **Script de Seed Segura**: Criar um seed do zero puxando as relações precisas desse Excel e preenchendo o BD sem deletar as tarefas.\n";
  report += "4. **Frontend/Modais de Tarefas**: Implementar regras para que a City apareça filtrada pelo Contrato, e Bairro filtrado pela Cidade+Contrato.\n";

  fs.writeFileSync("C:/Users/viniciusaraujo/.gemini/antigravity/brain/e835d583-33ff-4dd5-95e2-99a9ae21e546/analysis_report.md", report);
  fs.writeFileSync("analysis_report.md", report);
  console.log("DONE");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
