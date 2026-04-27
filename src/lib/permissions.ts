import { User } from "@/types";

export interface AppPermissions {
  pages: {
    dashboard: boolean;
    kanban: boolean;
    cronograma: boolean;
    mindmap: boolean;
    list: boolean;
    templates: boolean;
    activity_log: boolean;
    gaming: boolean;
    settings: boolean;
    view_all_templates: boolean;
    reurb: boolean;
    reurb_dashboard: boolean;
    reurb_processos: boolean;
    reurbDocs: boolean;
  };
  tasks: {
    create: boolean;
    edit_all: boolean;
    edit_retroactive_dates: boolean;
    view_all_sectors: boolean;
    view_own_team: boolean;
    view_own_sector: boolean;
    view_created_by_me: boolean;
    assign_any: boolean;
    assign_own_team: boolean;
    assign_own_sector: boolean;
    manage_pauses: boolean;
    edit_deadline_all: boolean;
  };
  settings: {
    manage_users: boolean;
    manage_roles: boolean;
    manage_locations: boolean;
    manage_task_types: boolean;
    manage_teams: boolean;
    manage_user_sectors: boolean;
  };
  reurb: {
    view: boolean;
    view_all: boolean;
    create: boolean;
    edit: boolean;
    advance_stage: boolean;
    add_comment: boolean;
    upload_attachment: boolean;
    confirm_registration: boolean;
    manage: boolean;
    view_dashboard: boolean;
  };
}

// Display name mapping: Admin appears as "Gestor" in the UI
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  Admin: "Gestor",
  GM: "GM",
};

export const getRoleDisplayName = (roleName: string): string =>
  ROLE_DISPLAY_NAMES[roleName] ?? roleName;

export const getPermissions = (user?: User | null): AppPermissions => {
  const defaultPerms: AppPermissions = {
    pages: {
      dashboard: false, kanban: false, cronograma: false, mindmap: false,
      list: true, templates: false, activity_log: false, gaming: true, settings: false,
      view_all_templates: false, reurb: false, reurb_dashboard: false, reurb_processos: false, reurbDocs: false,
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
    reurb: {
      view: false, view_all: false, create: false, edit: false,
      advance_stage: false, add_comment: false, upload_attachment: false,
      confirm_registration: false, manage: false, view_dashboard: false,
    },
  };

  if (!user || !user.role) return defaultPerms;

  const roleName = user.role.name;
  const rawPerms: any = user.role.permissions || {};

  // If the rawPerms has the new structure with `pages`, use it as base.
  // Fall through to role-name logic anyway so new modules (e.g. reurb) that
  // aren't stored in legacy DB permissions still get computed correctly.
  const hasDbStructure = rawPerms && typeof rawPerms === "object" && "pages" in rawPerms;

  // Fallback to hardcoded role-name logic (migration/legacy mode)
  const isAdmin = roleName === "Admin";
  const isSocio = roleName === "Socio";
  const isDiretor = roleName === "Diretor";
  const isGerente = roleName === "Gerente";
  const isCoordPolo = roleName === "Coordenador de Polo";
  const isCoordSetores = roleName === "Coordenador de Setores";
  const isGestor = roleName === "Gestor";
  const isLiderado = roleName === "Liderado";
  const isGM = roleName === "GM";

  const p: AppPermissions = {
    pages: { ...defaultPerms.pages, ...(hasDbStructure ? (rawPerms.pages || {}) : {}) },
    tasks: { ...defaultPerms.tasks, ...(hasDbStructure ? (rawPerms.tasks || {}) : {}) },
    settings: { ...defaultPerms.settings, ...(hasDbStructure ? (rawPerms.settings || {}) : {}) },
    reurb: { ...defaultPerms.reurb, ...(hasDbStructure ? (rawPerms.reurb || {}) : {}) },
  };

  // Pages
  p.pages.kanban = true;
  p.pages.cronograma = !isLiderado;
  p.pages.mindmap = !isLiderado;
  p.pages.list = true;
  p.pages.dashboard = !isLiderado;
  p.pages.templates = !isLiderado && !isSocio;
  p.pages.activity_log = isAdmin || isGerente || isGM;
  p.pages.gaming = true;
  p.pages.settings = isAdmin || isGerente || isCoordSetores || isGestor;
  p.pages.view_all_templates = isAdmin || isGerente || isCoordPolo || isCoordSetores || isDiretor || isGM;

  // Tasks
  p.tasks.create = isAdmin || isGerente || isDiretor || isCoordPolo || isCoordSetores || isGestor;
  p.tasks.edit_all = isAdmin || isGerente || isCoordSetores;
  p.tasks.edit_retroactive_dates = isAdmin || isGerente;
  p.tasks.view_all_sectors = isAdmin || isSocio || isDiretor || isGerente || isGM;
  p.tasks.view_own_team = isCoordPolo;
  p.tasks.view_own_sector = isCoordSetores || isGestor;
  p.tasks.view_created_by_me = !isLiderado && !isSocio;
  p.tasks.assign_any = isAdmin || isGerente || isDiretor;
  p.tasks.assign_own_team = isCoordPolo;
  p.tasks.assign_own_sector = isCoordSetores || isGestor;
  p.tasks.manage_pauses = isAdmin || isGerente;
  p.tasks.edit_deadline_all = false; // "apenas quem criou a tarefa poderá editar o campo do prazo", so this stays false for everyone unless they are creator (checked in UI/API)
  // Wait, user said "apenas quem criou poderá editar... e gestores podem editar... sómente as criadas por ele"
  // Let's actually keep edit_deadline_all false for everyone if we want to follow "APENAS QUEM CRIOU" strictly.
  // But usually Admin/Gerente should have it. User said: "logo o gestor da reurb nao ve as tarefas criadas por outros gestores... dando foco ao seu setor"
  // And "apenas quem criou a tarefa poderá editar o campo do prazo".
  // I will strictly allow only creator to edit deadline.

  // Settings
  p.settings.manage_users = isAdmin || isGerente;
  p.settings.manage_roles = isAdmin;
  p.settings.manage_locations = isAdmin || isGerente || isCoordSetores;
  p.settings.manage_task_types = isAdmin || isGerente || isCoordSetores;
  p.settings.manage_teams = isAdmin || isGerente;
  p.settings.manage_user_sectors = isAdmin || isGerente;

  // REURB
  const canViewReurb = isAdmin || isGerente || isGestor || isCoordSetores || isLiderado || isSocio || isDiretor || isGM;
  p.reurb.view            = canViewReurb;
  p.reurb.view_all        = isAdmin || isGerente || isSocio || isDiretor || isGM;
  p.reurb.create          = isAdmin || isGerente || isGestor || isCoordSetores;
  p.reurb.edit            = isAdmin || isGerente || isGestor || isCoordSetores;
  p.reurb.advance_stage   = isAdmin || isGerente || isGestor || isCoordSetores;
  p.reurb.add_comment     = canViewReurb;
  p.reurb.upload_attachment = isAdmin || isGerente || isGestor || isCoordSetores;
  p.reurb.confirm_registration = isAdmin || isGerente || isGestor;
  p.reurb.manage          = isAdmin || isGerente;
  p.reurb.view_dashboard  = isAdmin || isGerente || isGestor || isCoordSetores || isSocio || isDiretor || isGM;
  p.pages.reurb           = p.reurb.view;
  p.pages.reurb_dashboard = p.reurb.view_dashboard;
  p.pages.reurb_processos = p.reurb.view;

  // reurbDocs: acesso por setor (Reurb, Gerencia, Coordenação, Diretoria)
  const userSectorName = ((user as any)?.sector?.name || "").toLowerCase();
  const reurbDocsSectors = ["reurb", "gerencia", "coordenação", "coordenacao", "diretoria"];
  p.pages.reurbDocs = reurbDocsSectors.some((s) => userSectorName.includes(s));

  return p;
};

export const canAccessResource = (
  user: User | null | undefined,
  resource: (perms: AppPermissions) => boolean,
) => {
  const perms = getPermissions(user);
  return resource(perms);
};

/**
 * Returns the visibility mode and related IDs for task filtering.
 * Used by the tasks API to build Prisma where clauses.
 */
export type TaskVisibility =
  | { mode: "all" }
  | { mode: "team"; teamId: number; userId: number }
  | { mode: "sectors"; sectorIds: number[]; userId: number }
  | { mode: "sector"; sectorId: number; userId: number }
  | { mode: "assigned"; userId: number };

export const getTaskVisibilityMode = (user: User): TaskVisibility => {
  const perms = getPermissions(user);

  if (perms.tasks.view_all_sectors) {
    return { mode: "all" };
  }

  if (perms.tasks.view_own_team && (user as any).team_id) {
    return { mode: "team", teamId: (user as any).team_id, userId: user.id };
  }

  if (perms.tasks.view_own_sector) {
    // For Coordenador de Setores, sector IDs come from UserSector junction
    // The API will need to query those separately
    return { mode: "sectors", sectorIds: [user.sector_id], userId: user.id };
  }

  return { mode: "assigned", userId: user.id };
};
