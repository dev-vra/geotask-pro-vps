/**
 * Seed script for GeoTask Pro v2 — New roles, teams, and sector rename.
 * SAFE: Only upserts/updates. Never deletes existing data.
 *
 * Run: npx tsx prisma/seed_roles_v2.ts
 * Version: 2.0.1 (Triggering redeploy)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROLE_PERMISSIONS: Record<string, object> = {
  Admin: {
    pages: {
      dashboard: true, kanban: true, cronograma: true, mindmap: true,
      list: true, templates: true, activity_log: true, settings: true,
      view_all_templates: true,
    },
    tasks: {
      create: true, edit_all: true, edit_retroactive_dates: true,
      view_all_sectors: true, view_own_team: true, view_own_sector: true,
      view_created_by_me: true, assign_any: true, assign_own_team: true,
      assign_own_sector: true, manage_pauses: true, edit_deadline_all: false,
    },
    settings: {
      manage_users: true, manage_roles: true, manage_locations: true,
      manage_task_types: true, manage_teams: true, manage_user_sectors: true,
    },
  },
  Socio: {
    pages: {
      dashboard: true, kanban: true, cronograma: true, mindmap: true,
      list: true, templates: false, activity_log: false, settings: false,
      view_all_templates: false,
    },
    tasks: {
      create: false, edit_all: false, edit_retroactive_dates: false,
      view_all_sectors: true, view_own_team: true, view_own_sector: true,
      view_created_by_me: true, assign_any: false, assign_own_team: false,
      assign_own_sector: false, manage_pauses: false, edit_deadline_all: false,
    },
    settings: {
      manage_users: false, manage_roles: false, manage_locations: false,
      manage_task_types: false, manage_teams: false, manage_user_sectors: false,
    },
  },
  Diretor: {
    pages: {
      dashboard: true, kanban: true, cronograma: true, mindmap: true,
      list: true, templates: true, activity_log: false, settings: false,
      view_all_templates: true,
    },
    tasks: {
      create: true, edit_all: false, edit_retroactive_dates: false,
      view_all_sectors: true, view_own_team: true, view_own_sector: true,
      view_created_by_me: true, assign_any: true, assign_own_team: true,
      assign_own_sector: true, manage_pauses: false, edit_deadline_all: false,
    },
    settings: {
      manage_users: false, manage_roles: false, manage_locations: false,
      manage_task_types: false, manage_teams: false, manage_user_sectors: false,
    },
  },
  Gerente: {
    pages: {
      dashboard: true, kanban: true, cronograma: true, mindmap: true,
      list: true, templates: true, activity_log: true, settings: true,
      view_all_templates: true,
    },
    tasks: {
      create: true, edit_all: true, edit_retroactive_dates: true,
      view_all_sectors: true, view_own_team: true, view_own_sector: true,
      view_created_by_me: true, assign_any: true, assign_own_team: true,
      assign_own_sector: true, manage_pauses: true, edit_deadline_all: false,
    },
    settings: {
      manage_users: true, manage_roles: false, manage_locations: true,
      manage_task_types: true, manage_teams: true, manage_user_sectors: true,
    },
  },
  "Coordenador de Polo": {
    pages: {
      dashboard: true, kanban: true, cronograma: true, mindmap: true,
      list: true, templates: true, activity_log: false, settings: false,
      view_all_templates: true,
    },
    tasks: {
      create: true, edit_all: false, edit_retroactive_dates: false,
      view_all_sectors: false, view_own_team: true, view_own_sector: false,
      view_created_by_me: true, assign_any: false, assign_own_team: true,
      assign_own_sector: false, manage_pauses: false, edit_deadline_all: false,
    },
    settings: {
      manage_users: false, manage_roles: false, manage_locations: false,
      manage_task_types: false, manage_teams: false, manage_user_sectors: false,
    },
  },
  "Coordenador de Setores": {
    pages: {
      dashboard: true, kanban: true, cronograma: true, mindmap: true,
      list: true, templates: true, activity_log: false, settings: true,
      view_all_templates: true,
    },
    tasks: {
      create: true, edit_all: true, edit_retroactive_dates: false,
      view_all_sectors: false, view_own_team: false, view_own_sector: true,
      view_created_by_me: true, assign_any: false, assign_own_team: false,
      assign_own_sector: true, manage_pauses: false, edit_deadline_all: false,
    },
    settings: {
      manage_users: false, manage_roles: false, manage_locations: true,
      manage_task_types: true, manage_teams: false, manage_user_sectors: false,
    },
  },
  Gestor: {
    pages: {
      dashboard: true, kanban: true, cronograma: true, mindmap: true,
      list: true, templates: true, activity_log: false, settings: true,
      view_all_templates: false,
    },
    tasks: {
      create: true, edit_all: false, edit_retroactive_dates: false,
      view_all_sectors: false, view_own_team: false, view_own_sector: true,
      view_created_by_me: true, assign_any: false, assign_own_team: false,
      assign_own_sector: true, manage_pauses: false, edit_deadline_all: false,
    },
    settings: {
      manage_users: false, manage_roles: false, manage_locations: true,
      manage_task_types: true, manage_teams: false, manage_user_sectors: false,
    },
  },
  Liderado: {
    pages: {
      dashboard: false, kanban: true, cronograma: false, mindmap: false,
      list: true, templates: false, activity_log: false, settings: false,
      view_all_templates: false,
    },
    tasks: {
      create: false, edit_all: false, edit_retroactive_dates: false,
      view_all_sectors: false, view_own_team: false, view_own_sector: false,
      view_created_by_me: false, assign_any: false, assign_own_team: false,
      assign_own_sector: false, manage_pauses: false, edit_deadline_all: false,
    },
    settings: {
      manage_users: false, manage_roles: false, manage_locations: false,
      manage_task_types: false, manage_teams: false, manage_user_sectors: false,
    },
  },
};

async function main() {
  console.log("=== GeoTask Pro v2 — Safe Role & Sector Migration ===\n");

  // 1. Rename "Coordenador" → "Coordenador de Setores"
  const coordRole = await prisma.role.findUnique({ where: { name: "Coordenador" } });
  if (coordRole) {
    const exists = await prisma.role.findUnique({ where: { name: "Coordenador de Setores" } });
    if (!exists) {
      await prisma.role.update({
        where: { id: coordRole.id },
        data: { name: "Coordenador de Setores" },
      });
      console.log("Renamed: Coordenador → Coordenador de Setores");
    } else {
      console.log("Skip rename: 'Coordenador de Setores' already exists");
    }
  }

  // 2. Upsert all roles with permissions
  for (const [name, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await prisma.role.upsert({
      where: { name },
      update: { permissions },
      create: { name, permissions },
    });
    console.log(`Role upserted: ${name}`);
  }

  // 3. Rename sector "Atendimento Social" → "Assistência Social"
  const oldSector = await prisma.sector.findUnique({ where: { name: "Atendimento Social" } });
  if (oldSector) {
    const newExists = await prisma.sector.findUnique({ where: { name: "Assistência Social" } });
    if (!newExists) {
      await prisma.sector.update({
        where: { id: oldSector.id },
        data: { name: "Assistência Social" },
      });
      console.log("Renamed sector: Atendimento Social → Assistência Social");
    } else {
      console.log("Skip: 'Assistência Social' already exists");
    }
  } else {
    console.log("Skip: 'Atendimento Social' not found (may be already renamed)");
  }

  // 4. Seed default teams
  const teams = ["Polo Cuiabá", "Polo Maceió"];
  for (const name of teams) {
    await prisma.team.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`Team upserted: ${name}`);
  }

  console.log("\n=== Migration complete. No data was deleted. ===");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
