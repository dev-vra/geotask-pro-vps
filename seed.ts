import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

const CONTRACTS_LIST = [
  "001/2022/CIDES ARP",
  "004/2024/CIDESA GUAPORÉ",
  "005/2022/VG",
  "006/2020/INTERMAT",
  "008/2022/CIDES VRC",
  "009/2020/MTPAR",
  "010/2022/CIDES VJ",
  "119/2023/TANGARÁ",
  "234/2025/MACEIÓ",
];

const CITIES_NEIGHBORHOODS: Record<string, string[]> = {
  "Alto Paraguai": [
    "Catira",
    "Distrito Capão Verde",
    "Distrito Tira Sentido",
    "Loteamento Bela Vista",
  ],
  Arenápolis: [
    "Conjunto Habitacional Tapirapuã",
    "Núcleo Habitacional Parecis",
  ],
  Aripuanã: ["Cidade Alta", "Jardim Planalto", "Vila Operária"],
  "Barão de Melgaço": ["Loteamento Residencial Ana Terezinha Ribeiro"],
  "Barra do Bugres": [
    "Cohab São Raimundo",
    "Jardim República",
    "João Cristante",
    "Núcleo Habitacional Nhambiquara",
  ],
  "Campo Novo do Parecis": [
    "Marechal Rondon - Fase I",
    "Marechal Rondon - Fase II",
    "Patrimônio de Campo Novo do Parecis",
    "Patrimônio de Campo Novo do Parecis - Fase II",
  ],
  "Campos de Júlio": ["Loteamento Cidade Campos de Júlio"],
  Castanheira: [
    "Loteamento Noga II",
    "Núcleo Urbano de Castanheira - Centro",
    "Setor Industrial",
  ],
  "Chapada dos Guimarães": [
    "Altos da Chapada",
    "Distrito de João Carro",
    "Distrito de Água Fria",
    "Olho D'Água",
    "Pôr do Sol",
  ],
  Colniza: [
    "Bela Vista",
    "Castelo dos Sonhos",
    "Centro",
    "Cidade Alta",
    "Guariba",
  ],
  Comodoro: ["Copacabana", "Noroagro", "Sagrada Família", "São Francisco"],
  "Conquista D'Oeste": ["Amoreiras", "Flor dos Ipês", "Jardim do Vale"],
  Cotriguaçu: [
    "Distrito Ouro Verde dos Pioneiros",
    "Distrito de Nova União - Bairro Bela Vista",
    "Distrito de Nova União - Bairro Centro",
    "Distrito de Nova União - Bairro Fortaleza",
    "Distrito de Nova União - Bairro Industrial",
    "Distrito de Nova União - Bairro Jardim Planalto",
    "Distrito de Nova União - Bairro Jardim das Flores",
    "Distrito de Nova União - Bairro Morro das Pedras",
    "Distrito de Nova União - Bairro dos Imigrantes",
    "Loteamento Cooperativa",
  ],
  Cuiabá: [
    "JARDIM VITÓRIA",
    "1º DE MARÇO - 1ª FASE",
    "1º DE MARÇO - 2ª FASE",
    "Bairro Três Barras - Remanescente Área C",
    "CONJUNTO HABITACIONAL CPA II",
    "CONJUNTO HABITACIONAL CPA III - SETOR 01",
    "CONJUNTO HABITACIONAL CPA III - SETOR 02",
    "CONJUNTO HABITACIONAL CPA III - SETOR 03",
    "CONJUNTO HABITACIONAL CPA III - SETOR 04",
    "CONJUNTO HABITACIONAL CPA III - SETOR 05",
    "CONJUNTO HABITACIONAL GRANDE TERCEIRO",
    "CONJUNTO HABITACIONAL JARDIM PRESIDENTE II",
    "CONJUNTO HABITACIONAL VILA REAL",
    "CPA I",
    "Campo Verde",
    "Chácara dos Pinheiros",
    "Distrito Nossa Senhora da Guia",
    "JARDIM BRASIL PARTE 1",
    "JARDIM BRASIL PARTE 2",
    "JARDIM BRASIL PARTE 3",
    "JARDIM BRASIL PARTE 4",
    "JARDIM FLORIANÓPOLIS",
    "JARDIM SANTA AMALIA",
    "JARDIM UNIÃO",
    "Jardim Alvorada - Loteamento Jardim Fernandes",
    "Jardim Alvorada - Loteamento Quintandinha",
    "Jardim Alvorada - Loteamento Senhor dos Passos I",
    "Jardim Alvorada - Loteamento Senhor dos Passos II",
    "Jardim Alvorada - Loteamento Senhor dos Passos IV",
    "Jardim Alvorada - Quarta Feira",
    "Jardim Fortaleza",
    "Jardim Santa Izabel",
    "Loteamento 8 de Abril",
    "Loteamento Aricá Açu",
    "Loteamento São Roque",
    "Nova Esperança II",
    "Novo Paraiso II",
    "Novo Tempo",
    "NÚCLEO HABITACIONAL - TIJUCAL SETOR 3",
    "NÚCLEO HABITACIONAL - TIJUCAL SETOR 4",
    "NÚCLEO HABITACIONAL - TIJUCAL SETOR I",
    "NÚCLEO HABITACIONAL - TIJUCAL SETOR II",
    "NÚCLEO HABITACIONAL CIDADE VERDE",
    "NÚCLEO HABITACIONAL CPA IV - 1ª ETAPA",
    "NÚCLEO HABITACIONAL CPA IV - 2ª ETAPA",
    "NÚCLEO HABITACIONAL CPA IV - 3ª ETAPA",
    "NÚCLEO HABITACIONAL CPA IV - 4ª ETAPA",
    "NÚCLEO HABITACIONAL CPA IV - 5ª ETAPA",
    "NÚCLEO HABITACIONAL JARDIM INDUSTRIÁRIO II - 1ª ETAPA",
    "NÚCLEO HABITACIONAL JARDIM INDUSTRIÁRIO II - 2ª ETAPA",
    "NÚCLEO HABITACIONAL JARDIM INDUSTRIÁRIO II - 3ª ETAPA",
    "NÚCLEO HABITACIONAL NOVA CUIABÁ",
    "NÚCLEO HABITACIONAL SÃO GONÇALO",
    "Núcleo Habitacional - Tijucal",
    "Parque Mariana",
    "RESIDENCIAL ITAPAJÉ",
    "Renascer",
    "Residencial São Carlos",
    "SANTA INES",
    "SETOR 01 DO NÚCLEO HABITACIONAL CPA I",
    "SETOR 02 DO NÚCLEO HABITACIONAL CPA I",
    "SETOR 03 DO NÚCLEO HABITACIONAL CPA I",
    "Santo Antonio do Pedregal",
    "Sonho Meu",
    "São João Del Rey",
    "Vista da Chapada",
    "Voluntários da Pátria",
  ],
  Denise: [
    "Jardim Boa Esperança",
    "Loteamento Jardim Alvorecer",
    "Loteamento Jardim Boa Esperança II",
  ],
  Juína: [
    "Diamante Negro",
    "Distrito Fontanillas",
    "Distrito de Terra Roxa",
    "Loteamento Andorinha",
    "Loteamento Boa Esperança",
    "Loteamento Morada do Vento",
    "Loteamento Padre Duílio",
    "Loteamento Passo do Lago",
    "Loteamento Portal do Sol",
    "Palmiteira",
    "Setor Industrial",
    "São José Operário",
  ],
  Juruena: ["Loteamento Cidade Alta", "Primavera", "Zona Central"],
  Maceió: ["Vale do Reginaldo - 1ª Etapa"],
  Nobres: ["Bom Jardim", "Jardim Petrópolis", "Roda D'água"],
  Nortelândia: [
    "Bairro Da Ponte",
    "Bandeirantes",
    "Centro",
    "Joaquim da Silva",
    "Novo Horizonte",
    "Santo Antônio",
    "Tapirapuã",
  ],
  "Nossa Senhora do Livramento": [
    "Núcleo Habitacional Frei Salvador Rouquet",
    "Residencial Edite Maria de Campos",
  ],
  "Nova Brasilândia": [
    "Núcleo Urbano de Nova Brasilândia - Alvorada",
    "Núcleo Urbano de Nova Brasilândia - Centro",
    "Núcleo Urbano de Nova Brasilândia - Ipiranga",
    "Núcleo Urbano de Nova Brasilândia - Jardim da Paz",
    "Núcleo Urbano de Nova Brasilândia - Recanto dos Pássaros",
  ],
  "Nova Lacerda": ["Sol Nascente"],
  "Nova Marilândia": ["Jardim Planalto", "Jardim Planalto II"],
  "Nova Maringá": ["Jardim Tropical", "Mário Duílio Henry"],
  "Nova Olímpia": [
    "Jardim Boa Esperança",
    "Jardim Ouro Verde",
    "Jardim Santa Rosa",
    "Vila Alvorada",
  ],
  "Planalto da Serra": [
    "Loteameno Rio Manso - Nossa Senhora Aparecida",
    "Loteamento Rio Manso - São Gonçalo",
  ],
  "Porto Estrela": ["Centro", "Santa Isabel", "Vila da Mangueira"],
  "Santo Afonso": ["Loteamento Urbano do Distrito Boa Esperança"],
  "São José do Rio Claro": [
    "Jardim Arco Íris",
    "Jardim Olinda",
    "Residencial Casa Nova",
  ],
  "Tangará da Serra": [
    "Cidade Alta II",
    "Cidade Alta III",
    "Cidade Alta V",
    "Distrito de São Jorge",
    "JARDIM SÃO ROSALINO",
    "Jardim Bela Vista",
    "Jardim Maringá",
    "Jardim Morada do Sol",
    "Jardim Presidente",
    "Jardim Vitória",
    "Jardim dos Ipês",
    "Loteamento Monte Líbano",
    "Núcleo Habitacional 13 de Maio",
    "Núcleo Habitacional Tarumã",
    "Quadras R1 e R2 do Jardim 13 de Maio",
    "Residencial San Diego",
    "Residencial San Diego II",
    "Vila Esmeralda I",
    "Vila Esmeralda II",
    "Vila Goiás",
  ],
  "Vale de São Domingos": [
    "Distrito Adrianópolis",
    "Distrito Máquina Queimada",
  ],
  "Várzea Grande": [
    "ASA BELLA",
    "CONJUNTO HABITACIONAL CABO MICHEL",
    "CONJUNTO HABITACIONAL DOM BOSCO",
    "CONJUNTO HABITACIONAL DOM ORLANDO CHAVES",
    "CONJUNTO HABITACIONAL JAIME VERÍSSIMO DE CAMPOS",
    "CONJUNTO HABITACIONAL TARUMÃ I",
    "Domingos Sávio",
    "Governador José Fragelli",
    "Jardim Eldorado",
    "Jardim Manaíra",
    "Jardim Maringá I",
    "Jardim Maringá II",
    "Jardim de Alá",
    "Loteamento 15 de Maio",
    "Loteamento Industrial I - 1ª Parte",
    "Loteamento Industrial I - 2ª Parte",
    "Loteamento Industrial II",
    "Loteamento Industrial III",
    "Loteamento Núcleo 3",
    "Loteamento Parque Sabiá I",
    "Loteamento Sayonara",
    "Loteamento Serra Dourada",
    "Loteamento Terra Nova",
    "NÚCLEO HABITACIONAL CRISTO REI",
    "NÚCLEO HABITACIONAL JARDIM PRIMAVERA",
    "NÚCLEO HABITACIONAL NOSSA SENHORA DA GUIA",
    "NÚCLEO HABITACIONAL SANTA IZABEL",
    "Parque Sabiá II",
    "RESIDENCIAL ALBERTO CANELLAS",
    "RESIDENCIAL AM",
    "RESIDENCIAL ASA BRANCA",
    "RESIDENCIAL JR II",
    "Residencial 08 de Março",
    "Vitória Régia",
  ],
  "Vila Bela da Santíssima Trindade": ["Centro"],
};

async function main() {
  console.log("🌱 Starting seed...");

  console.log("🧹 Cleaning tasks and lookups (Preserving Users)...");
  // Delete in reverse order of relationships
  await prisma.notification.deleteMany();
  await prisma.taskHistory.deleteMany();
  await prisma.taskPause.deleteMany();
  await prisma.mention.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.templateSubtask.deleteMany();
  await prisma.templateTask.deleteMany();
  await prisma.template.deleteMany();
  // Cities and Contracts are usually lookups, we clear and repopulate them
  await prisma.neighborhood.deleteMany();
  await prisma.city.deleteMany();
  await prisma.contract.deleteMany();

  // 1. Create Admin User (Using Upsert to preserve)
  // 1. Create Default Roles & Sectors (Using Upsert to preserve)
  const roles = ["Admin", "Gerente", "Gestor", "Coordenador", "Liderado"];
  const sectors = [
    "Administrativo",
    "Atendimento ao Cliente",
    "Atendimento Social",
    "Cadastro",
    "Controladoria",
    "Coordenação",
    "Engenharia",
    "Financeiro",
    "Gerência",
    "REURB",
    "RH",
    "TI",
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

  const adminRole = await prisma.role.findUnique({ where: { name: "Admin" } });
  const controlSector = await prisma.sector.findUnique({
    where: { name: "Controladoria" },
  });

  if (!adminRole || !controlSector)
    throw new Error("Failed to seed roles/sectors");

  const adminEmail = "admin@admin.com";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Vinicios Araújo",
      password_hash: "997578",
      Role: { connect: { id: adminRole.id } },
      Sector: { connect: { id: controlSector.id } },
      active: true,
      must_change_password: false,
    },
    create: {
      email: adminEmail,
      name: "Vinicios Araújo",
      password_hash: "997578",
      Role: { connect: { id: adminRole.id } },
      Sector: { connect: { id: controlSector.id } },
      avatar: "VA",
      active: true,
      must_change_password: false,
    },
  });
  console.log("👤 Main Admin user seeded:", admin.name);
  console.log("👤 Default Admin user seeded:", admin.name);

  // 1.1. Create Geogis Team Users
  console.log("👥 Seeding Geogis Team...");
  const GEOGIS_USERS = [
    {
      name: "Camila Vitória dos Santos Cazzo",
      email: "camilavitoria@geogis.com.br",
      role: "Gestor",
      sector: "Atendimento ao Cliente",
    },
    {
      name: "Gabriel Bicudo Teixeira Cabestré",
      email: "gabrielbicudo@geogis.com.br",
      role: "Gestor",
      sector: "Engenharia",
    },
    {
      name: "Gabriel Vinicius Caldas SIlva",
      email: "gabrielcaldas@geogis.com.br",
      role: "Gestor",
      sector: "Atendimento ao Cliente",
    },
    {
      name: "Iago Sodré",
      email: "iagosodre@geogis.com.br",
      role: "Gerente",
      sector: "Gerência",
    },
    {
      name: "Ítalo Carvalho dos Santos",
      email: "italocarvalho@geogis.com.br",
      role: "Coordenador",
      sector: "Coordenação",
    },
    {
      name: "Josirene dos Santos",
      email: "josirene@geogis.com.br",
      role: "Gestor",
      sector: "Atendimento Social",
    },
    {
      name: "Kleber Fernando de Anunciação Britici",
      email: "kleberbritici@geogis.com.br",
      role: "Gerente",
      sector: "Gerência",
    },
    {
      name: "Leopoldo Miranda",
      email: "leopoldo@geogis.com.br",
      role: "Coordenador",
      sector: "Coordenação",
    },
    {
      name: "Patrícia Pinheiro Zubiolo",
      email: "patriciazubiolo@geogis.com.br",
      role: "Gestor",
      sector: "REURB",
    },
  ];

  const defaultPassword = "Geogis2026";

  for (const u of GEOGIS_USERS) {
    const role = await prisma.role.findUnique({ where: { name: u.role } });
    const sector = await prisma.sector.findUnique({
      where: { name: u.sector },
    });

    if (!role || !sector) {
      console.warn(
        `⚠️ Skipping user ${u.name}: Role (${u.role}) or Sector (${u.sector}) not found.`,
      );
      continue;
    }

    const initials = u.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role_id: role.id,
        sector_id: sector.id,
        active: true,
      },
      create: {
        email: u.email,
        name: u.name,
        password_hash: defaultPassword,
        role_id: role.id,
        sector_id: sector.id,
        avatar: initials,
        active: true,
        must_change_password: true,
      },
    });
  }
  console.log("✅ Geogis Team seeded!");

  // 2. Contracts
  console.log("📄 Seeding Contracts...");
  for (const name of CONTRACTS_LIST.sort()) {
    await prisma.contract.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 3. Cities & Neighborhoods
  console.log("🏙️ Seeding Cities & Neighborhoods...");
  const sortedCities = Object.keys(CITIES_NEIGHBORHOODS).sort();
  for (const cityName of sortedCities) {
    const city = await prisma.city.upsert({
      where: { name: cityName },
      update: {},
      create: { name: cityName },
    });

    const neighborhoods = CITIES_NEIGHBORHOODS[cityName].sort();
    for (const neighborhoodName of neighborhoods) {
      // Composite key handling typically requires finding unique constraint or using create on relation
      // Since map name is unique per city, we can try to find or create
      const existing = await prisma.neighborhood.findFirst({
        where: {
          city_id: city.id,
          name: neighborhoodName,
        },
      });

      if (!existing) {
        await prisma.neighborhood.create({
          data: {
            name: neighborhoodName,
            city_id: city.id,
          },
        });
      }
    }
  }

  console.log("✅ Seed completed!");
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
