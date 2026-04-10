import { createRequire } from "module";
const require = createRequire(import.meta.url);
const xlsx = require("xlsx");

try {
  const wb = xlsx.readFile("RELAÇÃO CONTRATO CIDADE BAIRRO.xlsx");
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);

  console.log("=== EXCEL HEADERS & FIRST 5 ROWS ===");
  if (data.length > 0) {
    console.log("Headers:", Object.keys(data[0]));
    console.log(JSON.stringify(data.slice(0, 5), null, 2));
    console.log(`Total rows: ${data.length}`);
  } else {
    console.log("Empty sheet");
  }
} catch (e: any) {
  console.error("Error reading Excel file:", e.message);
}
