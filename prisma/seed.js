const { PrismaClient } = require("@prisma/client");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const { PrismaNeon } = require("@prisma/adapter-neon");
const ws = require("ws");
const fs = require("fs");
const path = require("path");

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

try {
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
      const [key, value] = line.split("=");
      if (key && value && !process.env[key.trim()]) {
        process.env[key.trim()] = value.trim().replace(/^"|"$/g, "");
      }
    });
  }
} catch (e) {
  console.error("Error loading .env", e);
}

const connectionString = process.env.DATABASE_URL;
console.log("DB URL:", connectionString ? "Defined" : "Undefined");

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["query", "info", "warn", "error"],
});

async function main() {
  const adminEmail = "admin@admin.com";

  const upsertAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Vinicios Reis de Araújo",
      email: adminEmail,
      password_hash: "997578", // Storing as plain text for now as per user request/current logic
      role: "Admin",
      sector: "Controladoria",
      avatar:
        "https://img.freepik.com/vetores-gratis/ilustracao-do-jovem-sorridente_1308-174669.jpg?semt=ais_wordcount_boost&w=740&q=80",
    },
  });

  console.log({ upsertAdmin });
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
