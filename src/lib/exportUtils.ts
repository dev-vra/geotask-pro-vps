import { Task } from "@/types";
import type jsPDF from "jspdf";
import type * as ExcelJSTypes from "exceljs";

// Lazy-loaded to avoid 1MB+ upfront bundle cost
const getJsPDF = () => import("jspdf").then((m) => m.default);
const getAutoTable = () => import("jspdf-autotable").then((m) => m.default);
const getExcelJS = () => import("exceljs");
const getFileSaver = () => import("file-saver").then((m) => m.saveAs);

// ─── Company Info ────────────────────────────────────────────────────────────
const COMPANY = {
  name: "Geogis Geotécnologia",
  cnpj: "14.116.593/0001-60",
  address: "R. Das Acacias, 227 - São Francisco, Cuiabá - MT, 78043-228",
  slogan: "Transformar e Desenvolver Territórios",
  reportTitle: "Relatório de Tarefas",
};

// ─── Colors & Styles ─────────────────────────────────────────────────────────
const COLORS = {
  headerGreen: "9BBF41",
  bodyDark: "2F3341",
  white: "FFFFFF",
  borderDark: "2F3341",
};

const FONTS = {
  header: {
    name: "Cambria",
    size: 12,
    bold: true,
    color: { argb: COLORS.white },
  },
  body: {
    name: "Cambria",
    size: 11,
    italic: true,
    color: { argb: COLORS.bodyDark },
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────
// ExportTask extends Task so any Task[] can be passed directly without casts.
// Extra optional fields support pre-flattened / enriched data from views.
export interface ExportTask extends Omit<Task, "subtasks" | "children"> {
  /** Pre-computed time (alias for time_spent) */
  time?: number;
  /** Flat boolean for subtask done state */
  done?: boolean;
  /** Subtasks in export context carry full task-like data */
  subtasks?: ExportTask[];
  children?: ExportTask[];
}

/**
 * Helper: safely cast Task[] to ExportTask[] for the export functions.
 * At runtime the shapes are compatible; the cast resolves the subtasks mismatch.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asExport = (tasks: any[]): ExportTask[] => tasks as ExportTask[];

export interface ExportKPIs {
  concludedCount: number;
  avgTime: number;
  highPriorityCount: number;
  midPriorityCount: number;
  lowPriorityCount: number;
  delayedCount: number;
  pieData: { name: string; value: number }[];
  sectorRank: { name: string; v: number }[];
  userRank: { name: string; v: number; sector?: string }[];
}

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  primary: [152, 175, 59] as [number, number, number],
  dark: [45, 55, 72] as [number, number, number],
  secondary: [100, 116, 139] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  success: [16, 185, 129] as [number, number, number],
  warning: [245, 158, 11] as [number, number, number],
  info: [59, 130, 246] as [number, number, number],
  light: [248, 250, 252] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  chart: [
    [152, 175, 59],
    [59, 130, 246],
    [245, 158, 11],
    [239, 68, 68],
    [139, 92, 246],
    [16, 185, 129],
  ] as [number, number, number][],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number): string => {
  if (!n) return "0 min";
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
};

const parseDateStr = (s?: string | null): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const parts = s.split("/");
  if (parts.length === 3) {
    const d2 = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
};

export const getName = (obj: unknown): string => {
  if (!obj) return "—";
  if (typeof obj === "string") return obj || "—";
  if (typeof obj === "object" && obj !== null && "name" in obj)
    return (obj as { name: string }).name || "—";
  return "—";
};

export const getTaskState = (task: Partial<Task>) => {
  if (!task.deadline) return null;
  const deadlineDate = parseDateStr(task.deadline);
  if (!deadlineDate) return null;
  deadlineDate.setHours(23, 59, 59, 999);
  const now = new Date();
  const isDone = task.status === "Concluído";
  if (!isDone) {
    if (now > deadlineDate) return { label: "Em Atraso", color: "#ef4444" };
    return { label: "Dentro do Prazo", color: "#10b981" };
  } else {
    const doneAt = task.completed_at ? new Date(task.completed_at) : now;
    if (doneAt > deadlineDate)
      return { label: "Atraso na Entrega", color: "#f59e0b" };
    return { label: "No Prazo", color: "#10b981" };
  }
};

export const getKpiData = (filtered: Task[], users: unknown[]) => {
  const concluded = filtered.filter((t) => t.status === "Concluído");
  const high = filtered.filter((t) => t.priority === "Alta").length;
  const mid = filtered.filter((t) => t.priority === "Média").length;
  const low = filtered.filter((t) => t.priority === "Baixa").length;
  const delayed = filtered.filter(
    (t) => getTaskState(t)?.label === "Em Atraso",
  ).length;
  const concludedForAvg = concluded.filter(
    (t) => !t.subtasks || t.subtasks.length === 0,
  );
  const avgTime = concludedForAvg.length
    ? Math.round(
        concludedForAvg.reduce((a, t) => a + (t.time_spent || 0), 0) /
          concludedForAvg.length,
      )
    : 0;

  const pieData = ["A Fazer", "Em Andamento", "Pausado", "Concluído"]
    .map((s) => ({
      name: s,
      value: filtered.filter((t) => t.status === s).length,
    }))
    .filter((d) => d.value > 0);

  const SECTORS = Array.from(
    new Set(filtered.map((t) => getName(t.sector)).filter((x) => x !== "—")),
  );
  const sectorRank = SECTORS.map((s) => ({
    name: String(s),
    v: filtered.filter(
      (t) => getName(t.sector) === s && t.status === "Concluído",
    ).length,
  }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);

  const userRank = (users as { name: string; sector?: unknown }[])
    .map((u) => ({
      name: u.name,
      v: filtered.filter(
        (t) => getName(t.responsible) === u.name && t.status === "Concluído",
      ).length,
      sector: getName(u.sector),
    }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);

  return {
    concludedCount: concluded.length,
    avgTime,
    highPriorityCount: high,
    midPriorityCount: mid,
    lowPriorityCount: low,
    delayedCount: delayed,
    pieData,
    sectorRank,
    userRank,
  };
};

// ─── Load logo as base64 ──────────────────────────────────────────────────────
const getLogoBase64 = async (): Promise<string | null> => {
  try {
    const res = await fetch("/logo.png");
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// PDF page dimensions (landscape A4)
const PW = 297;
const PH = 210;
const ML = 12;
const MR = 12;
const CW = PW - ML - MR; // usable width

// ─── Shared PDF header ────────────────────────────────────────────────────────
const drawHeader = (
  doc: jsPDF,
  logo: string | null,
  pageTitle: string,
  pageNum: number,
  footerMeta?: { generatedBy?: string; filters?: string },
) => {
  const HEADER_H = 28;
  const slate800: [number, number, number] = [30, 41, 59];
  const slate500: [number, number, number] = [100, 116, 139];

  // White header background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PW, HEADER_H, "F");

  // Logo — 30% wider: 42 → 55
  if (logo) {
    try {
      doc.addImage(logo, "PNG", ML, 4, 55, 14);
    } catch {
      doc.setFontSize(12);
      doc.setTextColor(...slate800);
      doc.setFont("helvetica", "bold");
      doc.text("GEOGIS", ML, 17);
    }
  }

  // Center: page title + report subtitle
  doc.setFontSize(12);
  doc.setTextColor(...slate800);
  doc.setFont("helvetica", "bold");
  doc.text(pageTitle, PW / 2, 12, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate500);
  doc.text(COMPANY.reportTitle, PW / 2, 18, { align: "center" });

  // Right: company info in slate-800
  doc.setFontSize(7);
  const infoX = PW - MR;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...slate800);
  doc.text(COMPANY.name, infoX, 8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate500);
  doc.text(`CNPJ: ${COMPANY.cnpj}`, infoX, 13, { align: "right" });
  doc.text(COMPANY.address, infoX, 18, { align: "right" });
  doc.text(COMPANY.slogan, infoX, 23, { align: "right" });

  // Green accent bottom line
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.8);
  doc.line(0, HEADER_H, PW, HEADER_H);

  // Footer
  if (pageNum > 0) {
    const fy = PH - 4;
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(ML, fy - 2.5, PW - MR, fy - 2.5);
    doc.setFontSize(6.5);
    doc.setTextColor(...slate500);
    const parts: string[] = [
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    ];
    if (footerMeta?.generatedBy)
      parts.push(`Gerado por: ${footerMeta.generatedBy}`);
    if (footerMeta?.filters) parts.push(`Filtros: ${footerMeta.filters}`);
    doc.text(parts.join("   |   "), ML, fy);
    doc.text(`Pág. ${pageNum}`, PW - MR, fy, { align: "right" });
  }
};

// ─── Draw KPI card ────────────────────────────────────────────────────────────
const drawKpiCard = (
  doc: jsPDF,
  label: string,
  value: string,
  sub: string,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: [number, number, number],
) => {
  // Card background
  doc.setFillColor(...C.light);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  // Accent left bar
  doc.setFillColor(...accent);
  doc.roundedRect(x, y, 2, h, 1, 1, "F");

  // Value
  doc.setFontSize(20);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.setFont("helvetica", "bold");
  doc.text(value, x + 6, y + h / 2 + 2);

  // Label
  doc.setFontSize(8);
  doc.setTextColor(...C.secondary);
  doc.setFont("helvetica", "normal");
  doc.text(label.toUpperCase(), x + 6, y + 7);

  // Sub
  doc.setFontSize(7);
  doc.text(sub, x + 6, y + h - 4);
};

// ─── Draw horizontal bar chart ────────────────────────────────────────────────
const drawBarChart = (
  doc: jsPDF,
  data: { name: string; value: number }[],
  colors: [number, number, number][],
  x: number,
  y: number,
  w: number,
  title: string,
) => {
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.setFont("helvetica", "bold");
  doc.text(title, x, y);
  doc.setFont("helvetica", "normal");
  y += 4;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barH = 7;
  const gap = 3;
  const labelW = 40;
  const barAreaW = w - labelW - 15;

  data.forEach((d, i) => {
    const bw = (d.value / maxVal) * barAreaW;
    const col = colors[i % colors.length];
    doc.setFillColor(...col);
    doc.rect(x + labelW, y, bw, barH, "F");

    // Light background remainder
    doc.setFillColor(230, 230, 230);
    doc.rect(x + labelW + bw, y, barAreaW - bw, barH, "F");

    doc.setFontSize(7);
    doc.setTextColor(...C.secondary);
    doc.text(d.name, x, y + barH - 1);

    doc.setTextColor(...C.dark);
    doc.setFont("helvetica", "bold");
    doc.text(String(d.value), x + labelW + bw + 2, y + barH - 1);
    doc.setFont("helvetica", "normal");

    y += barH + gap;
  });
  return y;
};

// ─── Draw temporal line chart ─────────────────────────────────────────────────
const drawLineChart = (
  doc: jsPDF,
  tasks: Task[],
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.setFont("helvetica", "bold");
  doc.text("EVOLUÇÃO TEMPORAL (CRIAÇÃO vs CONCLUSÃO)", x, y);
  doc.setFont("helvetica", "normal");
  y += 4;

  // Build monthly data
  const monthMap: Record<string, { created: number; done: number }> = {};

  tasks.forEach((t) => {
    const createdDate = parseDateStr(t.created_at || t.created);
    if (createdDate) {
      const key = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap[key]) monthMap[key] = { created: 0, done: 0 };
      monthMap[key].created++;
    }
    if (t.status === "Concluído") {
      const doneDate = parseDateStr(t.completed_at || t.completed);
      if (doneDate) {
        const key = `${doneDate.getFullYear()}-${String(doneDate.getMonth() + 1).padStart(2, "0")}`;
        if (!monthMap[key]) monthMap[key] = { created: 0, done: 0 };
        monthMap[key].done++;
      }
    }
  });

  const months = Object.keys(monthMap).sort();
  if (months.length < 2) {
    doc.setFontSize(8);
    doc.setTextColor(...C.secondary);
    doc.text("Dados insuficientes para gráfico temporal.", x, y + 10);
    return y + 20;
  }

  const chartY = y;
  const chartH = h - 10;
  const chartW = w;
  const maxVal = Math.max(
    ...months.map((m) => Math.max(monthMap[m].created, monthMap[m].done)),
    1,
  );

  // Chart background
  doc.setFillColor(...C.light);
  doc.rect(x, chartY, chartW, chartH, "F");
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.rect(x, chartY, chartW, chartH);

  // Grid lines (horizontal)
  const gridLines = 4;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.15);
  for (let i = 1; i <= gridLines; i++) {
    const gy = chartY + chartH - (i / gridLines) * chartH;
    doc.line(x, gy, x + chartW, gy);
    doc.setFontSize(5);
    doc.setTextColor(...C.secondary);
    doc.text(String(Math.round((i / gridLines) * maxVal)), x - 4, gy + 1, {
      align: "right",
    });
  }

  // Data points
  const stepX = chartW / (months.length - 1);
  const toChartY = (v: number) => chartY + chartH - (v / maxVal) * chartH;

  const drawLine = (
    values: number[],
    color: [number, number, number],
    label: string,
  ) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.8);
    for (let i = 0; i < months.length - 1; i++) {
      const x1 = x + i * stepX;
      const y1 = toChartY(values[i]);
      const x2 = x + (i + 1) * stepX;
      const y2 = toChartY(values[i + 1]);
      doc.line(x1, y1, x2, y2);
    }
    // Dots
    doc.setFillColor(...color);
    months.forEach((_m, i) => {
      const px = x + i * stepX;
      const py = toChartY(values[i]);
      doc.circle(px, py, 1, "F");
    });
    return label;
  };

  const createdVals = months.map((m) => monthMap[m].created);
  const doneVals = months.map((m) => monthMap[m].done);
  drawLine(createdVals, C.info, "Criadas");
  drawLine(doneVals, C.success, "Concluídas");

  // X-axis labels
  const labelEvery = Math.max(1, Math.floor(months.length / 6));
  months.forEach((m, i) => {
    if (i % labelEvery === 0) {
      const px = x + i * stepX;
      doc.setFontSize(5);
      doc.setTextColor(...C.secondary);
      const [yr, mo] = m.split("-");
      const label = `${mo}/${yr.slice(2)}`;
      doc.text(label, px, chartY + chartH + 4, { align: "center" });
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.15);
      doc.line(px, chartY + chartH, px, chartY + chartH + 2);
    }
  });

  // Legend
  const legendY = chartY + chartH + 8;
  doc.setFillColor(...C.info);
  doc.rect(x, legendY, 6, 2, "F");
  doc.setFontSize(6);
  doc.setTextColor(...C.secondary);
  doc.text("Criadas", x + 8, legendY + 1.5);
  doc.setFillColor(...C.success);
  doc.rect(x + 28, legendY, 6, 2, "F");
  doc.text("Concluídas", x + 36, legendY + 1.5);

  return legendY + 8;
};

// ─── Draw Timeline (Cronograma) ──────────────────────────────────────────────
const drawTimeline = (
  doc: jsPDF,
  tasks: Task[],
  x: number,
  y: number,
  w: number,
  logo: string | null,
  pageNum: () => number,
  footerMeta?: { generatedBy?: string; filters?: string },
): number => {
  const HEADER_H = 8;
  const ROW_H = 14;
  const LABEL_W = 65;

  const events = [
    { k: "created", l: "Criado", c: [99, 102, 241] }, // #6366f1
    { k: "assigned", l: "Atribuído", c: [139, 92, 246] }, // #8b5cf6
    { k: "started", l: "Iniciado", c: [245, 158, 11] }, // #f59e0b
    { k: "paused", l: "Pausado", c: [239, 68, 68] }, // #ef4444
    { k: "completed", l: "Concluído", c: [16, 185, 129] }, // #10b981
  ];

  doc.setFontSize(8);
  doc.setTextColor(...C.dark);
  doc.setFont("helvetica", "bold");
  doc.text("TAREFA", x + 2, y + 5);
  doc.text("LINHA DO TEMPO (HISTÓRICO)", x + LABEL_W + 2, y + 5);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(x, y + HEADER_H, x + w, y + HEADER_H);

  let curY = y + HEADER_H;
  const maxRowsPerPage = Math.floor((PH - curY - 20) / ROW_H);
  let rowCount = 0;

  tasks.forEach((t, i) => {
    if (rowCount >= maxRowsPerPage) {
      doc.addPage();
      drawHeader(doc, logo, "CRONOGRAMA DE ENTREGA", pageNum(), footerMeta);
      curY = 32;
      rowCount = 0;

      doc.setFontSize(8);
      doc.setTextColor(...C.dark);
      doc.setFont("helvetica", "bold");
      doc.text("TAREFA", x + 2, curY - 3);
      doc.text("LINHA DO TEMPO", x + LABEL_W + 2, curY - 3);
      doc.line(x, curY, x + w, curY);
    }

    if (i % 2 === 0) {
      doc.setFillColor(250, 251, 253);
      doc.rect(x, curY, w, ROW_H, "F");
    }

    doc.setFontSize(7);
    doc.setTextColor(...C.dark);
    doc.setFont("helvetica", "bold");
    const title = t.title.length > 38 ? t.title.slice(0, 38) + "..." : t.title;
    doc.text(title, x + 2, curY + 5);

    doc.setFontSize(6);
    doc.setTextColor(...C.secondary);
    doc.setFont("helvetica", "normal");
    const resp = getName(t.responsible);
    doc.text(resp, x + 2, curY + 10);

    let lastDotX = 0;
    const dotSpacing = 24;
    events.forEach((ev, ei) => {
      const val = t[ev.k as keyof Task] as string | undefined;
      if (!val) return;

      const dotX = x + LABEL_W + 8 + ei * dotSpacing;

      if (lastDotX > 0) {
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.2);
        doc.line(
          lastDotX + 1.5,
          curY + ROW_H / 2,
          dotX - 1.5,
          curY + ROW_H / 2,
        );
      }

      doc.setFillColor(...(ev.c as [number, number, number]));
      doc.circle(dotX, curY + ROW_H / 2, 1.2, "F");

      doc.setFontSize(5);
      doc.setTextColor(...(ev.c as [number, number, number]));
      doc.setFont("helvetica", "bold");
      doc.text(val, dotX, curY + ROW_H / 2 + 3.5, { align: "center" });

      doc.setFontSize(4.5);
      doc.setTextColor(...C.secondary);
      doc.setFont("helvetica", "normal");
      doc.text(ev.l, dotX, curY + ROW_H / 2 + 5.5, { align: "center" });

      lastDotX = dotX;
    });

    curY += ROW_H;
    rowCount++;
  });

  return curY;
};

// ─── EXCEL STYLING HELPERS ───────────────────────────────────────────────────
const applyHeaderStyle = (cell: ExcelJSTypes.Cell) => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.headerGreen },
  };
  cell.font = FONTS.header;
  cell.alignment = { vertical: "middle", horizontal: "center" };
  cell.border = {
    top: { style: "thin", color: { argb: COLORS.borderDark } },
    left: { style: "thin", color: { argb: COLORS.borderDark } },
    bottom: { style: "thin", color: { argb: COLORS.borderDark } },
    right: { style: "thin", color: { argb: COLORS.borderDark } },
  };
};

const applyBodyStyle = (cell: ExcelJSTypes.Cell, isItalic = true) => {
  cell.font = { ...FONTS.body, italic: isItalic };
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  cell.border = {
    top: { style: "thin", color: { argb: COLORS.borderDark } },
    left: { style: "thin", color: { argb: COLORS.borderDark } },
    bottom: { style: "thin", color: { argb: COLORS.borderDark } },
    right: { style: "thin", color: { argb: COLORS.borderDark } },
  };
};

const autoWidth = (ws: ExcelJSTypes.Worksheet) => {
  ws.columns.forEach((column: any) => {
    let maxLen = 0;
    column.eachCell!({ includeEmpty: true }, (cell: any) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    column.width = Math.min(Math.max(maxLen + 2, 10), 50);
  });
};

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────
export const exportToExcel = async (
  tasks: Task[],
  kpi?: ExportKPIs,
  currentUser?: { name?: string } | null,
  filterLabel?: string,
  sourcePage?: "dashboard" | "kanban" | "cronograma" | "lista",
) => {
  const ExcelJS = await getExcelJS();
  const wb = new ExcelJS.Workbook();

  // Tentar carregar o modelo do arquivo público para preservar formatação/logo
  try {
    const response = await fetch("/modelo_relatorio.xlsx");
    const arrayBuffer = await response.arrayBuffer();
    await wb.xlsx.load(arrayBuffer);
  } catch (error) {
    console.error(
      "Erro ao carregar modelo_relatorio.xlsx, criando novo:",
      error,
    );
    wb.addWorksheet("Resumo");
  }

  // ── 1. SHEET: RESUMO ──
  // Pegamos a primeira aba que deve ser o resumo do modelo
  const wsResumo = wb.getWorksheet(1) || wb.addWorksheet("Resumo");

  // Preencher dados básicos conforme endereços do modelo mapeado
  wsResumo.getCell("C2").value = COMPANY.cnpj;
  wsResumo.getCell("C4").value = COMPANY.address;
  wsResumo.getCell("C5").value = COMPANY.address; // O modelo tem C5 igual
  wsResumo.getCell("A5").value = COMPANY.slogan;

  if (kpi) {
    // Indicadores Gerais
    wsResumo.getCell("B10").value = tasks.length;
    wsResumo.getCell("B11").value = kpi.concludedCount;
    wsResumo.getCell("B12").value = tasks.length
      ? `${Math.round((kpi.concludedCount / tasks.length) * 100)}%`
      : "0%";
    wsResumo.getCell("B13").value = kpi.delayedCount;
    wsResumo.getCell("B14").value = fmt(kpi.avgTime);

    // Prioridade
    wsResumo.getCell("B17").value = kpi.highPriorityCount;
    wsResumo.getCell("B18").value = kpi.midPriorityCount;
    wsResumo.getCell("B19").value = kpi.lowPriorityCount;

    // Status (A partir da A22)
    let sRow = 22;
    kpi.pieData.forEach((d) => {
      const r = wsResumo.getRow(sRow++);
      r.getCell(1).value = d.name;
      r.getCell(2).value = d.value;
      // Manter estilo se possível ou aplicar o padrão
      r.getCell(1).font = { name: "Cambria", size: 11, italic: true };
    });

    // Setores (A26...)
    let secRow = 26;
    kpi.sectorRank.slice(0, 5).forEach((s) => {
      const r = wsResumo.getRow(secRow++);
      r.getCell(1).value = s.name;
      r.getCell(2).value = s.v;
    });

    // Colaboradores (A30...)
    let userRow = 30;
    kpi.userRank.slice(0, 5).forEach((u) => {
      const r = wsResumo.getRow(userRow++);
      r.getCell(1).value = u.name;
      r.getCell(2).value = u.v;
    });

    // Metadados Rodapé
    wsResumo.getCell("A33").value =
      "Data de geração: " + new Date().toLocaleString("pt-BR");
    wsResumo.getCell("A34").value =
      "Gerado por: " + (currentUser?.name || "Usuário não identificado");
    wsResumo.getCell("A35").value =
      "Filtros aplicados: " + (filterLabel || "Nenhum filtro aplicado");
  }

  // ── 2. ABAS ADICIONAIS CONFORME PÁGINA ──

  // PÁGINA: KANBAN -> Tarefas e Subtarefas
  if (sourcePage === "kanban" || !sourcePage) {
    const wsTasks = wb.addWorksheet("Tarefas");
    const headers = [
      "ID",
      "Título",
      "Tipo",
      "Prioridade",
      "Status",
      "Estado",
      "Setor",
      "Responsável",
      "Prazo",
      "Tempo",
    ];
    const headerRow = wsTasks.getRow(1);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      applyHeaderStyle(cell);
    });

    tasks.forEach((t, idx) => {
      const r = wsTasks.getRow(idx + 2);
      const rowData = [
        t.id,
        t.title,
        t.type || "—",
        t.priority || "—",
        t.status,
        getTaskState(t)?.label || "Sem Prazo",
        getName(t.sector),
        getName(t.responsible),
        t.deadline || "—",
        fmt(t.time_spent || 0),
      ];
      rowData.forEach((val, i) => {
        const cell = r.getCell(i + 1);
        cell.value = val;
        applyBodyStyle(cell);
      });
    });
    autoWidth(wsTasks);

    const wsSub = wb.addWorksheet("Subtarefas");
    const subHeaders = [
      "ID",
      "Pai (Título)",
      "Título",
      "Status",
      "Responsável",
      "Prazo",
      "Concluída",
    ];
    const subHeaderRow = wsSub.getRow(1);
    subHeaders.forEach((h, i) => {
      const cell = subHeaderRow.getCell(i + 1);
      cell.value = h;
      applyHeaderStyle(cell);
    });

    let sIdx = 2;
    tasks.forEach((t) => {
      (t.subtasks || []).forEach((sub) => {
        const r = wsSub.getRow(sIdx++);
        const rowData = [
          sub.id,
          t.title,
          sub.title,
          sub.done ? "Concluído" : "A Fazer",
          getName(sub.responsible),
          (sub as any).deadline || "—",
          sub.done ? "Sim" : "Não",
        ];
        rowData.forEach((val, i) => {
          const cell = r.getCell(i + 1);
          cell.value = val;
          applyBodyStyle(cell);
        });
      });
    });
    autoWidth(wsSub);
  }

  // PÁGINA: CRONOGRAMA -> Cronograma
  if (sourcePage === "cronograma") {
    const wsCron = wb.addWorksheet("Cronograma");
    const headers = [
      "ID",
      "Tarefa",
      "Status",
      "Início",
      "Prazo",
      "Conclusão",
      "Responsável",
    ];
    const hRow = wsCron.getRow(1);
    headers.forEach((h, i) => {
      const cell = hRow.getCell(i + 1);
      cell.value = h;
      applyHeaderStyle(cell);
    });

    tasks.forEach((t, idx) => {
      const r = wsCron.getRow(idx + 2);
      const rowData = [
        t.id,
        t.title,
        t.status,
        t.started || "—",
        t.deadline || "—",
        t.completed || "—",
        getName(t.responsible),
      ];
      rowData.forEach((val, i) => {
        const cell = r.getCell(i + 1);
        cell.value = val;
        applyBodyStyle(cell);
        // Colorir texto baseado no status
        if (i === 2) {
          // Coluna Status
          if (t.status === "Concluído")
            cell.font = { ...cell.font, color: { argb: "10B981" }, bold: true };
          else if (t.status === "Pausado")
            cell.font = { ...cell.font, color: { argb: "EF4444" }, bold: true };
          else if (t.status === "Em Andamento")
            cell.font = { ...cell.font, color: { argb: "F59E0B" }, bold: true };
        }
      });
    });
    autoWidth(wsCron);
  }

  // PÁGINA: DASHBOARD -> Próximas Tarefas
  if (sourcePage === "dashboard") {
    const wsNext = wb.addWorksheet("Próximas Tarefas");
    const headers = [
      "Data Prazo",
      "Setor",
      "Responsável",
      "Tarefa",
      "Status",
      "Atraso/Tempo",
    ];
    const hRow = wsNext.getRow(1);
    headers.forEach((h, i) => {
      const cell = hRow.getCell(i + 1);
      cell.value = h;
      applyHeaderStyle(cell);
    });

    const nextTasks = tasks
      .filter((t) => t.status !== "Concluído" && t.deadline)
      .sort(
        (a, b) =>
          (parseDateStr(a.deadline)?.getTime() || 0) -
          (parseDateStr(b.deadline)?.getTime() || 0),
      )
      .slice(0, 50);

    nextTasks.forEach((t, idx) => {
      const r = wsNext.getRow(idx + 2);
      const state = getTaskState(t);
      const rowData = [
        t.deadline,
        getName(t.sector),
        getName(t.responsible),
        t.title,
        t.status,
        state?.label || "—",
      ];
      rowData.forEach((val, i) => {
        const cell = r.getCell(i + 1);
        cell.value = val;
        applyBodyStyle(cell);
        if (i === 5 && state?.label === "Em Atraso") {
          cell.font = { ...cell.font, color: { argb: "EF4444" }, bold: true };
        }
      });
    });
    autoWidth(wsNext);
  }

  // Finalização e Download
  const buffer = await wb.xlsx.writeBuffer();
  const fileName = `relatorio_geotask_${new Date().toISOString().split("T")[0]}.xlsx`;
  const saveAs = await getFileSaver();
  saveAs(new Blob([buffer]), fileName);

  // Activity Log (fire-and-forget)
  try {
    fetch("/api/activity-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_name: currentUser?.name || "Usuário",
        action: "excel_exported",
        entity: "export",
        details: `Export Excel (${sourcePage || "geral"}) — ${tasks.length} tarefas`,
      }),
    }).catch(() => {});
  } catch {}
};

// ─── PDF EXPORT ───────────────────────────────────────────────────────────────
export const exportToPDF = async (
  tasks: Task[],
  kpi: ExportKPIs,
  users: unknown[] = [],
  currentUser?: { name?: string } | null,
  filterLabel?: string,
) => {
  const footerMeta = {
    generatedBy: currentUser?.name || "",
    filters: filterLabel || "Nenhum filtro aplicado",
  };
  const jsPDF = await getJsPDF();
  const autoTable = await getAutoTable();
  const doc = new jsPDF("l", "mm", "a4");
  const logo = await getLogoBase64();
  let p = 1;
  const nextPage = () => {
    doc.addPage();
    p++;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1: KPIs + Charts
  // ══════════════════════════════════════════════════════════════════════════
  drawHeader(doc, logo, "VISÃO GERAL E INDICADORES", p, footerMeta);

  let y = 30;

  // ── KPI Cards row ──
  const cardW = (CW - 9) / 4;
  const cardH = 24;
  const totalTasks = tasks.length;
  const concludedPct = totalTasks
    ? Math.round((kpi.concludedCount / totalTasks) * 100)
    : 0;

  drawKpiCard(
    doc,
    "Total de Tarefas",
    String(totalTasks),
    `${tasks.filter((t) => t.status === "Em Andamento").length} em andamento`,
    ML,
    y,
    cardW,
    cardH,
    C.info,
  );
  drawKpiCard(
    doc,
    "Concluídas",
    String(kpi.concludedCount),
    `${concludedPct}% de conclusão`,
    ML + cardW + 3,
    y,
    cardW,
    cardH,
    C.success,
  );
  drawKpiCard(
    doc,
    "Em Atraso",
    String(kpi.delayedCount),
    `${totalTasks ? Math.round((kpi.delayedCount / totalTasks) * 100) : 0}% do total`,
    ML + (cardW + 3) * 2,
    y,
    cardW,
    cardH,
    C.danger,
  );
  drawKpiCard(
    doc,
    "Tempo Médio",
    fmt(kpi.avgTime),
    "por tarefa concluída",
    ML + (cardW + 3) * 3,
    y,
    cardW,
    cardH,
    C.warning,
  );

  y += cardH + 6;

  // ── Two chart columns ──
  const col1W = (CW - 6) / 2;
  const col2X = ML + col1W + 6;

  // Left: Status distribution
  const statusColors: [number, number, number][] = [
    C.info,
    C.warning,
    C.danger,
    C.success,
  ];
  let leftY = drawBarChart(
    doc,
    kpi.pieData,
    statusColors,
    ML,
    y,
    col1W,
    "DISTRIBUIÇÃO POR STATUS",
  );

  // Priority under status (left col)
  leftY += 2;
  const prioData = [
    { name: "Alta Prioridade", value: kpi.highPriorityCount },
    { name: "Média Prioridade", value: kpi.midPriorityCount },
    { name: "Baixa Prioridade", value: kpi.lowPriorityCount },
  ].filter((d) => d.value > 0);
  drawBarChart(
    doc,
    prioData,
    [C.danger, C.warning, C.success],
    ML,
    leftY,
    col1W,
    "DISTRIBUIÇÃO POR PRIORIDADE",
  );

  // Right: Temporal line chart
  const lineH = PH - y - 20;
  drawLineChart(doc, tasks, col2X, y, col1W, lineH);

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2+: Sector Reports
  // ══════════════════════════════════════════════════════════════════════════
  const sectorsList = Array.from(
    new Set(tasks.map((t) => getName(t.sector)).filter((s) => s !== "—")),
  );

  for (const sectorName of sectorsList) {
    nextPage();
    drawHeader(doc, logo, `SETOR: ${sectorName.toUpperCase()}`, p, footerMeta);

    const sectorTasks = tasks.filter((t) => getName(t.sector) === sectorName);
    const usersArr = users as { name: string; sector?: unknown }[];
    const sectorUsers = usersArr.filter(
      (u) => getName(u.sector) === sectorName,
    );
    const sectorDone = sectorTasks.filter(
      (t) => t.status === "Concluído",
    ).length;
    const sectorDelayed = sectorTasks.filter(
      (t) => getTaskState(t)?.label === "Em Atraso",
    ).length;
    const sectorInProgress = sectorTasks.filter(
      (t) => t.status === "Em Andamento",
    ).length;
    const pct = sectorTasks.length
      ? Math.round((sectorDone / sectorTasks.length) * 100)
      : 0;

    let sy = 30;

    // Sector KPI cards
    const sCardW = (CW - 9) / 4;
    const sCardH = 20;
    drawKpiCard(
      doc,
      "Total",
      String(sectorTasks.length),
      "tarefas no setor",
      ML,
      sy,
      sCardW,
      sCardH,
      C.info,
    );
    drawKpiCard(
      doc,
      "Concluídas",
      String(sectorDone),
      `${pct}% de conclusão`,
      ML + sCardW + 3,
      sy,
      sCardW,
      sCardH,
      C.success,
    );
    drawKpiCard(
      doc,
      "Em Andamento",
      String(sectorInProgress),
      "em execução",
      ML + (sCardW + 3) * 2,
      sy,
      sCardW,
      sCardH,
      C.warning,
    );
    drawKpiCard(
      doc,
      "Em Atraso",
      String(sectorDelayed),
      "tarefas atrasadas",
      ML + (sCardW + 3) * 3,
      sy,
      sCardW,
      sCardH,
      C.danger,
    );
    sy += sCardH + 6;

    // Two columns: ranking + status bar
    const sc1W = 80;
    const sc2X = ML + sc1W + 8;
    const sc2W = CW - sc1W - 8;

    // User ranking table (left)
    const sectorUserRank = sectorUsers
      .map((u) => ({
        name: u.name,
        done: sectorTasks.filter(
          (t) => getName(t.responsible) === u.name && t.status === "Concluído",
        ).length,
        total: sectorTasks.filter((t) => getName(t.responsible) === u.name)
          .length,
      }))
      .sort((a, b) => b.done - a.done);

    doc.setFontSize(8);
    doc.setTextColor(...C.dark);
    doc.setFont("helvetica", "bold");
    doc.text("RANKING DE COLABORADORES", ML, sy);
    doc.setFont("helvetica", "normal");
    sy += 3;

    autoTable(doc, {
      startY: sy,
      head: [["Colaborador", "Total", "Concluídas", "%"]],
      body: sectorUserRank.map((r) => [
        r.name,
        r.total,
        r.done,
        r.total ? `${Math.round((r.done / r.total) * 100)}%` : "—",
      ]),
      theme: "grid",
      headStyles: {
        fillColor: C.primary,
        textColor: C.white,
        fontSize: 7,
        fontStyle: "bold",
      },
      styles: { fontSize: 7 },
      columnStyles: {
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
      },
      margin: { left: ML, right: PW - ML - sc1W },
      tableWidth: sc1W,
    });

    // Status bar chart (right)
    const sectorPieData = ["A Fazer", "Em Andamento", "Pausado", "Concluído"]
      .map((s) => ({
        name: s,
        value: sectorTasks.filter((t) => t.status === s).length,
      }))
      .filter((d) => d.value > 0);
    const chartEndY = drawBarChart(
      doc,
      sectorPieData,
      statusColors,
      sc2X,
      sy,
      sc2W,
      "STATUS DAS TAREFAS",
    );

    // @ts-expect-error: jspdf types or missing property in custom build
    const rankingEndY = doc.lastAutoTable?.finalY || sy + 30;
    const afterRank = Math.max(rankingEndY, chartEndY) + 6;

    // Sector task table
    const tableData: (string | number)[][] = [];
    sectorTasks.forEach((t) => {
      tableData.push([
        t.id,
        t.title.length > 40 ? t.title.slice(0, 40) + "…" : t.title,
        t.priority || "—",
        t.status,
        getTaskState(t)?.label || "Sem Prazo",
        getName(t.responsible),
        t.deadline || "—",
        getName(t.contract),
        `${t.subtasks?.length || 0}`,
        fmt(t.time_spent || 0),
      ]);
      (t.subtasks || []).forEach((sub) => {
        const sr = sub as unknown as Record<string, unknown>;
        tableData.push([
          sub.id,
          `  ↳ ${sub.title.length > 37 ? sub.title.slice(0, 37) + "…" : sub.title}`,
          (sr.priority as string) || t.priority || "—",
          (sr.status as string) || (sub.done ? "Concluído" : "A Fazer"),
          getTaskState(sr as Partial<Task>)?.label || "—",
          getName(sub.responsible) !== "—" ? getName(sub.responsible) : "—",
          (sr.deadline as string) || "—",
          getName(sr.contract) !== "—"
            ? getName(sr.contract)
            : getName(t.contract),
          "—",
          fmt((sr.time_spent as number) || 0),
        ]);
      });
    });

    autoTable(doc, {
      startY: afterRank,
      head: [
        [
          "ID",
          "Título",
          "Prio.",
          "Status",
          "Estado",
          "Responsável",
          "Prazo",
          "Contrato",
          "Subs",
          "Tempo",
        ],
      ],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: C.dark,
        textColor: C.white,
        fontSize: 6.5,
        fontStyle: "bold",
      },
      styles: { fontSize: 6.5 },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 70 },
        2: { cellWidth: 12, halign: "center" },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 22, halign: "center" },
        5: { cellWidth: 30 },
        6: { cellWidth: 18, halign: "center" },
        7: { cellWidth: 24 },
        8: { cellWidth: 8, halign: "center" },
        9: { cellWidth: 16, halign: "center" },
      },
      margin: { left: ML, right: MR },
      didDrawPage: () => {
        drawHeader(
          doc,
          logo,
          `SETOR: ${sectorName.toUpperCase()}`,
          p,
          footerMeta,
        );
      },
    });
    // @ts-expect-error: jspdf types or missing property in custom build
    p = doc.internal.getCurrentPageInfo().pageNumber;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Page 3: Chronograma de Tarefas (Timeline)
  doc.addPage();
  drawHeader(doc, logo, "CRONOGRAMA DE TAREFAS", p, footerMeta);
  drawTimeline(doc, tasks, ML, 35, PW - ML - MR, logo, () => ++p, footerMeta);
  // @ts-expect-error: jspdf types or missing property in custom build
  p = doc.internal.getCurrentPageInfo().pageNumber;

  // ══════════════════════════════════════════════════════════════════════════
  // DETAIL PAGE: Full task details table
  // ══════════════════════════════════════════════════════════════════════════
  nextPage();
  drawHeader(doc, logo, "DETALHAMENTO COMPLETO", p, footerMeta);

  const detailData: (string | number)[][] = [];
  tasks.forEach((t) => {
    const state = getTaskState(t);
    detailData.push([
      t.id,
      t.title.length > 38 ? t.title.slice(0, 38) + "…" : t.title,
      t.type || "—",
      t.priority || "—",
      t.status,
      state?.label || "Sem Prazo",
      getName(t.sector),
      getName(t.responsible),
      getName(t.contract),
      getName(t.city),
      t.nucleus || "—",
      t.quadra || "—",
      t.lote || "—",
      t.created || "—",
      t.deadline || "—",
      t.completed || "—",
      fmt(t.time_spent || 0),
    ]);
    (t.subtasks || []).forEach((sub) => {
      const sr = sub as unknown as Record<string, unknown>;
      const ss = getTaskState(sr as Partial<Task>);
      detailData.push([
        sub.id,
        `  ↳ ${sub.title.length > 35 ? sub.title.slice(0, 35) + "…" : sub.title}`,
        (sr.type as string) || t.type || "—",
        (sr.priority as string) || t.priority || "—",
        (sr.status as string) || (sub.done ? "Concluído" : "A Fazer"),
        ss?.label || "—",
        getName(sr.sector) !== "—" ? getName(sr.sector) : getName(t.sector),
        getName(sub.responsible),
        getName(t.contract),
        getName(t.city),
        t.nucleus || "—",
        t.quadra || "—",
        t.lote || "—",
        "—",
        (sr.deadline as string) || "—",
        "—",
        fmt((sr.time_spent as number) || 0),
      ]);
    });
  });

  autoTable(doc, {
    startY: 30,
    head: [
      [
        "ID",
        "Título",
        "Tipo",
        "Prio.",
        "Status",
        "Estado",
        "Setor",
        "Responsável",
        "Contrato",
        "Cidade",
        "Bairro",
        "Quadra",
        "Lote",
        "Criação",
        "Prazo",
        "Conclusão",
        "Tempo",
      ],
    ],
    body: detailData,
    theme: "grid",
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontSize: 5.5,
      fontStyle: "bold",
    },
    styles: { fontSize: 5.5, cellPadding: 1.2 },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 52 },
      2: { cellWidth: 16 },
      3: { cellWidth: 10, halign: "center" },
      4: { cellWidth: 20, halign: "center" },
      5: { cellWidth: 20, halign: "center" },
      6: { cellWidth: 18 },
      7: { cellWidth: 22 },
      8: { cellWidth: 18 },
      9: { cellWidth: 14 },
      10: { cellWidth: 14 },
      11: { cellWidth: 10, halign: "center" },
      12: { cellWidth: 8, halign: "center" },
      13: { cellWidth: 14, halign: "center" },
      14: { cellWidth: 14, halign: "center" },
      15: { cellWidth: 16, halign: "center" },
      16: { cellWidth: 14, halign: "center" },
    },
    margin: { left: ML, right: MR },
    didDrawPage: () => {
      drawHeader(doc, logo, "DETALHAMENTO COMPLETO", p++, footerMeta);
    },
    rowPageBreak: "avoid",
  });

  doc.save(`relatorio_geotask_${new Date().toISOString().split("T")[0]}.pdf`);
};
