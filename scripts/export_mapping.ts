import { PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching data from DB...");
  
  const neighborhoods = await prisma.neighborhood.findMany({
    include: {
      city: true,
      contract: true,
    },
    orderBy: [
      { contract: { name: 'asc' } },
      { city: { name: 'asc' } },
      { name: 'asc' }
    ]
  });

  const linkedData = neighborhoods
    .filter(n => n.contract_id !== null)
    .map(n => ({
      "CONTRATO": n.contract?.name || "",
      "CIDADE": n.city.name,
      "BAIRRO/NÚCLEO": n.name
    }));

  const unlinkedData = neighborhoods
    .filter(n => n.contract_id === null)
    .map(n => ({
      "CONTRATO": "PENDENTE",
      "CIDADE": n.city.name,
      "BAIRRO/NÚCLEO": n.name
    }));

  const wb = xlsx.utils.book_new();

  const wsLinked = xlsx.utils.json_to_sheet(linkedData);
  xlsx.utils.book_append_sheet(wb, wsLinked, "Vinculados");

  const wsUnlinked = xlsx.utils.json_to_sheet(unlinkedData);
  xlsx.utils.book_append_sheet(wb, wsUnlinked, "Não Vinculados");

  const fileName = "Mapeamento_Bairros_GeoTask.xlsx";
  const filePath = path.join(process.cwd(), fileName);
  
  xlsx.writeFile(wb, filePath);

  console.log(`\nRelatório gerado com sucesso!`);
  console.log(`Total Vinculados: ${linkedData.length}`);
  console.log(`Total Não Vinculados: ${unlinkedData.length}`);
  console.log(`Arquivo salvo em: ${filePath}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
