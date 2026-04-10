import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TASK_TYPES = [
  "Atendimento",
  "Demanda Extra",
  "Informação Adicional",
  "Meta Engenharia",
  "Nota Devolutiva",
  "Nova Tarefa",
  "Retrabalho",
  "Solicitação Externa",
  "Viagem",
  "Visita Social",
  "Vistoria",
];

async function main() {
  console.log("Seeding TaskTypes...");
  for (const type of TASK_TYPES) {
    await prisma.taskType.upsert({
      where: { name: type },
      update: {},
      create: {
        name: type,
        sector_id: null, // by default, they are general types
      },
    });
  }
  console.log("TaskTypes seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
