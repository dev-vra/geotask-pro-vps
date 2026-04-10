import { SECTOR_ENUM_TO_DISPLAY } from "./constants";
import type { ThemeColors } from "@/types";

export type { ThemeColors };

export const getTheme = (dark: boolean): ThemeColors =>
  dark
    ? {
        bg: "#030712",
        sb: "#111827",
        card: "#1f2937",
        header: "#111827",
        text: "#f9fafb",
        sub: "#9ca3af",
        border: "#374151",
        inp: "#374151",
        hover: "rgba(255,255,255,0.05)",
        col: "#111827",
        tag: "#374151",
        tagText: "#d1d5db",
        mmBg: "#0f172a",
        section: "#111827",
      }
    : {
        bg: "#f8fafc",
        sb: "#ffffff",
        card: "#ffffff",
        header: "#ffffff",
        text: "#0f172a",
        sub: "#64748b",
        border: "#e2e8f0",
        inp: "#f1f5f9",
        hover: "#f1f5f9",
        col: "#f1f5f9",
        tag: "#e2e8f0",
        tagText: "#374151",
        mmBg: "#f1f5f9",
        section: "#ffffff",
      };

export const sectorDisplay = (s: unknown): string => {
  if (!s) return "";
  if (typeof s === "object" && s !== null) {
    const obj = s as Record<string, unknown>;
    return String(obj.name || obj.id || "");
  }
  return SECTOR_ENUM_TO_DISPLAY[String(s)] ?? String(s);
};

export const fmtTime = (m: number): string =>
  m > 0 ? `${Math.floor(m / 60)}h ${m % 60}m` : "—";

export const parseDate = (str: string | null | undefined): Date | null => {
  if (!str) return null;
  const [d, m, y] = str.split("/");
  if (!d || !m || !y) return null;
  return new Date(`${y}-${m}-${d}`);
};

export const parseDateStr = (s?: string): Date | undefined => {
  if (!s) return undefined;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return parseDate(s) || undefined;
};

export const getTaskState = (
  task: { deadline?: string | null; status?: string | null; completed_at?: string | null },
): { label: string; color: string } | null => {
  if (!task.deadline) return null;
  const deadlineDate = parseDateStr(task.deadline);
  if (!deadlineDate) return null;
  deadlineDate.setHours(23, 59, 59, 999);
  const now = new Date();
  const isDone = task.status === "Concluído" || !!task.completed_at;

  if (!isDone) {
    // 1 dia de atraso = Em Atraso
    // Math.floor para tirar o resíduo de ms na diferença de dias não é o mais ideal puro, mas podemos usar startOfDay.
    // simpler:
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / msPerDay);

    if (now > deadlineDate) return { label: "Em Atraso", color: "#ef4444" };
    if (diffDays <= 2) return { label: "Próximo do Prazo", color: "#f59e0b" }; // Faltam 2 dias ou menos
    return { label: "Dentro do Prazo", color: "#10b981" }; // Faltam 3 ou mais
  } else {
    // Se está concluída
    const doneAt = task.completed_at ? new Date(task.completed_at) : now;
    if (doneAt > deadlineDate)
      return { label: "Atraso na Entrega", color: "#f97316" }; // orange-500
    return { label: "Entregue no Prazo", color: "#059669" }; // emerald-600
  }
};
