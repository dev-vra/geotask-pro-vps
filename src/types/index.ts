/**
 * Shared TypeScript interfaces for GeoTask Pro.
 * Derived from Prisma schema — used across components, hooks, and services.
 */

// ── Base entities ─────────────────────────────────────────────────────

export interface Role {
  id?: number;
  name: string;
  permissions?: Record<string, string> | null;
  created_at?: string;
  updated_at?: string;
}

export interface Sector {
  id?: number | string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
  _count?: { users: number; tasks: number };
}

export interface UserSector {
  id: number;
  user_id: number;
  sector_id: number;
  created_at?: string;
  sector?: Sector;
}

export interface TaskAttachment {
  id: number;
  task_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  uploaded_by_id?: number | null;
  created_at: string;
  uploaded_by?: { id: number; name: string; avatar?: string | null } | null;
}

export interface Contract {
  id: number;
  name: string;
}

export interface City {
  id: number;
  name: string;
  neighborhoods?: Neighborhood[];
}

export interface Neighborhood {
  id: number;
  name: string;
  city_id: number;
}

// ── User ──────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  sector_id: number;
  avatar?: string | null;
  active: boolean;
  must_change_password: boolean;
  created_at?: string;
  role?: Role | null;
  sector?: Sector | null;
  team_id?: number | null;
  team?: Team | null;
  user_sectors?: UserSector[];
  /** Alias — some API responses use Role/Sector (capitalized Prisma names) */
  Role?: Role | null;
  Sector?: Sector | null;
}

// ── Task ──────────────────────────────────────────────────────────────

export interface Subtask {
  id: number;
  title: string;
  done: boolean;
  sector_id?: number | null;
  task_id: number;
  responsible_id?: number | null;
  done_at?: string | null;
  responsible?: User | null;
}

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  type?: string | null;
  status: string;
  priority?: string | null;
  sector_id?: number | null;
  responsible_id?: number | null;
  contract_id?: number | null;
  city_id?: number | null;
  neighborhood_id?: number | null;
  nucleus?: string | null;
  quadra?: string | null;
  lote?: string | null;
  deadline?: string | null;
  link?: string | null;
  created_by_id?: number | null;
  created_at?: string;
  updated_at?: string | null;
  status_updated_at?: string | null;
  started_at?: string | null;
  paused_at?: string | null;
  completed_at?: string | null;
  time_spent?: number;
  parent_id?: number | null;
  // Relations
  responsible?: User | null;
  created_by?: User | null;
  sector?: Sector | string | null;
  contract?: Contract | null;
  city?: City | null;
  neighborhood?: Neighborhood | null;
  parent?: Task | null;
  children?: Task[];
  subtasks?: Subtask[];
  coworkers?: {
    id: number;
    name: string;
    avatar?: string | null;
    role?: string | null;
    sector?: string | null;
  }[];
  comments?: Comment[];
  /** Pause history from enriched API responses */
  pauses?: { started_at: string; ended_at?: string }[];
  attachments?: TaskAttachment[];
  team_id?: number | null;
  team?: Team | null;
  /** Pre-formatted date aliases used by some views */
  created?: string;
  assigned?: string;
  started?: string;
  paused?: string;
  completed?: string;
}

// ── Notification ──────────────────────────────────────────────────────

export type NotificationType =
  | "task_assigned"
  | "task_completed"
  | "task_late"
  | "mention"
  | "status_change"
  | "comment"
  | "general";

export interface Notification {
  id: number;
  type: string;
  title: string;
  message?: string | null;
  read: boolean;
  created_at: string;
  user_id: number;
  task_id?: number | null;
  comment_id?: number | null;
}

// ── Comment ───────────────────────────────────────────────────────────

export interface Comment {
  id: number;
  content: string;
  created_at: string;
  task_id: number;
  user_id?: number | null;
  user?: User | null;
}

// ── Template ──────────────────────────────────────────────────────────

export interface TemplateSubtask {
  id: number;
  title: string;
  order_index: number;
  template_task_id: number;
  sector_id?: number | null;
  responsible_id?: number | null;
}

export interface TemplateTask {
  id: number;
  title: string;
  order_index: number;
  template_id: number;
  subtasks?: TemplateSubtask[];
}

export interface Template {
  id: number;
  name: string;
  sector_id: number;
  created_by_id?: number | null;
  created_at?: string;
  tasks?: TemplateTask[];
}

// ── Theme ─────────────────────────────────────────────────────────────

export interface ThemeColors {
  bg: string;
  sb: string;
  card: string;
  header: string;
  text: string;
  sub: string;
  border: string;
  inp: string;
  hover: string;
  col: string;
  tag: string;
  tagText: string;
  mmBg: string;
  section: string;
}

// ── Lookups ───────────────────────────────────────────────────────────

export interface CitiesNeighborhoods {
  [cityName: string]: string[];
}
