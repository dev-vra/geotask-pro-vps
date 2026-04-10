"use client";

import { authFetch } from "@/lib/authFetch";
import {
  AlertCircle,
  BarChart2,
  BookOpen,
  Check,
  ChevronUp,
  Copy,
  FileDown,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AnalysisOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface Stats {
  total: number;
  created: number;
  completed: number;
  pending: number;
  overdue: number;
  byStatus: Record<string, number>;
  bySector: Record<string, number>;
}

interface AIReportModalProps {
  user?: { id?: number; name?: string; role?: { name?: string } | null } | null;
}

// ─── Opções de análise disponíveis ───────────────────────────────────────────

const ANALYSIS_OPTIONS: AnalysisOption[] = [
  {
    id: "weekly",
    label: "Relatório Semanal",
    description: "Resumo geral do período: criadas, concluídas, pendentes",
    icon: <BarChart2 size={16} />,
  },
  {
    id: "sector",
    label: "Análise por Setor",
    description: "Desempenho e gargalos por setor da organização",
    icon: <BookOpen size={16} />,
  },
  {
    id: "priorities",
    label: "Priorização de Tarefas",
    description: "Sugestão de ordem ideal de execução das pendências",
    icon: <TrendingUp size={16} />,
  },
  {
    id: "contracts",
    label: "Análise de Contratos",
    description: "Taxa de conclusão e riscos por contrato",
    icon: <FileText size={16} />,
  },
  {
    id: "responsible",
    label: "Desempenho por Responsável",
    description: "Carga de trabalho e produtividade por colaborador",
    icon: <Users size={16} />,
  },
  {
    id: "execution",
    label: "Execução Diária",
    description: "Atividades diárias, ociosidade e tempo médio por pessoa",
    icon: <FileText size={16} />,
  },
];

// ─── Renderizador de Markdown simples ────────────────────────────────────────

function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          className="text-sm font-bold text-slate-800 dark:text-gray-100 mt-5 mb-2 border-b border-indigo-500/20 pb-1"
        >
          {line.replace("### ", "")}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="text-base font-bold text-slate-800 dark:text-gray-100 mt-6 mb-2.5 flex items-center gap-1.5"
        >
          {line.replace("## ", "")}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={i}
          className="text-lg font-extrabold text-slate-800 dark:text-gray-100 mb-4"
        >
          {line.replace("# ", "")}
        </h1>,
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li
          key={i}
          className="text-[13px] text-slate-800 dark:text-gray-100 leading-relaxed ml-4 mb-0.5"
        >
          {renderInline(line.replace(/^[-*] /, ""))}
        </li>,
      );
    } else if (line.match(/^\d+\. /)) {
      elements.push(
        <li
          key={i}
          className="text-[13px] text-slate-800 dark:text-gray-100 leading-relaxed ml-4 mb-0.5 list-decimal"
        >
          {renderInline(line.replace(/^\d+\. /, ""))}
        </li>,
      );
    } else if (line.startsWith("|") && line.endsWith("|")) {
      // Coleta todas as linhas da tabela
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!lines[i].match(/^\|[-| :]+\|$/)) {
          tableLines.push(lines[i]);
        }
        i++;
      }
      const [headerRow, ...bodyRows] = tableLines;

      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-3">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-indigo-500/10 border-b border-indigo-500/25">
                {headerRow
                  .split("|")
                  .filter((c) => c.trim() !== "")
                  .map((cell, ci) => (
                    <th
                      key={ci}
                      className="px-2.5 py-1.5 text-slate-800 dark:text-gray-100 font-bold text-left"
                    >
                      {renderInline(cell.trim())}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((tl, ti) => {
                const cells = tl.split("|").filter((c) => c.trim() !== "");
                return (
                  <tr key={ti} className="border-b border-indigo-500/10">
                    {cells.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-2.5 py-1.5 text-slate-800 dark:text-gray-100 font-normal"
                      >
                        {renderInline(cell.trim())}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>,
      );
      continue;
    } else if (line.startsWith("---")) {
      elements.push(
        <hr
          key={i}
          className="border-none border-t border-indigo-500/20 my-4"
        />,
      );
    } else if (line.trim() !== "") {
      elements.push(
        <p
          key={i}
          className="text-[13px] text-slate-800 dark:text-gray-100 leading-[1.7] my-1.5"
        >
          {renderInline(line)}
        </p>,
      );
    }
    i++;
  }

  return <div>{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    } else if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="bg-indigo-500/15 rounded px-1.5 py-px text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="rounded-[10px] px-3.5 py-2.5 flex flex-col gap-0.5 flex-1 min-w-[80px]"
      style={{ background: bg }}
    >
      <span className="text-[22px] font-extrabold" style={{ color }}>
        {value}
      </span>
      <span className="text-[11px] text-white/70 font-medium">{label}</span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AIReportModal({ user }: AIReportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  // Configurações
  const [selectedAnalyses, setSelectedAnalyses] = useState<string[]>([
    "weekly",
  ]);
  const [customMessage, setCustomMessage] = useState("");
  const [periodDays, setPeriodDays] = useState(7);
  const [showConfig, setShowConfig] = useState(true);

  const toggleAnalysis = (id: string) => {
    setSelectedAnalyses((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const generateReport = async () => {
    if (selectedAnalyses.length === 0 && !customMessage.trim()) {
      setError(
        "Selecione ao menos um tipo de análise ou escreva uma mensagem.",
      );
      return;
    }
    setLoading(true);
    setReport(null);
    setStats(null);
    setError(null);
    setShowConfig(false);

    try {
      const res = await authFetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analyses: selectedAnalyses,
          customMessage,
          periodDays,
          userId: user?.id,
          userName: user?.name,
        }),
      });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setStats(data.stats ?? null);
        setGeneratedAt(new Date());
      } else {
        setError(data.error || "Erro ao gerar análise.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro na conexão com a API.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Exportar PDF (premium) ──────────────────────────────────────────────────────────
  const exportToPDF = async () => {
    if (!report || !stats) return;
    setExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");

      // Landscape A4 — mesmo padrao do exportUtils
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const PW = 297,
        PH = 210,
        ML = 12,
        MR = 12;
      const CW = PW - ML - MR;
      const HEADER_H = 28;
      const FOOTER_H = 10;

      const PRIMARY: [number, number, number] = [152, 175, 59];
      const DARK: [number, number, number] = [30, 41, 59];
      const SLATE5: [number, number, number] = [100, 116, 139];
      const BORDER_C: [number, number, number] = [226, 232, 240];
      const LIGHT: [number, number, number] = [248, 250, 252];

      const KPI_COL: [number, number, number][] = [
        [59, 130, 246],
        [6, 182, 212],
        [34, 197, 94],
        [234, 179, 8],
        [239, 68, 68],
      ];
      const CHART_COL: [number, number, number][] = [
        [152, 175, 59],
        [59, 130, 246],
        [245, 158, 11],
        [239, 68, 68],
        [139, 92, 246],
        [16, 185, 129],
        [236, 72, 153],
      ];

      const now = generatedAt || new Date();
      const dateStr = now.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const analysisLabels = selectedAnalyses
        .map((a) => ANALYSIS_OPTIONS.find((o) => o.id === a)?.label || a)
        .join(", ");
      const userName = user?.name || "Nao identificado";

      // Rodape com quem, quando e como filtrou (sem emojis — jsPDF nao suporta unicode extra)
      const footerLine = [
        `Gerado em: ${dateStr} as ${timeStr}`,
        `Por: ${userName}`,
        `Periodo: ultimos ${periodDays} dias`,
        analysisLabels ? `Analises: ${analysisLabels}` : "",
        customMessage.trim()
          ? `Solicitacao: ${customMessage.trim().slice(0, 60)}${customMessage.length > 60 ? "..." : ""}`
          : "",
      ]
        .filter(Boolean)
        .join("   |   ");

      // Carregar logo
      let logo: string | null = null;
      try {
        const res = await fetch("/logo.png");
        const blob = await res.blob();
        logo = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch {
        /* sem logo */
      }

      // Funcao de cabecalho identica ao exportUtils.drawHeader
      let pageCount = 0;
      const drawPageHeader = (title: string): number => {
        pageCount++;
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, PW, HEADER_H, "F");
        if (logo) {
          try {
            doc.addImage(logo, "PNG", ML, 4, 55, 14);
          } catch {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(...DARK);
            doc.text("GEOGIS", ML, 17);
          }
        } else {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.setTextColor(...DARK);
          doc.text("GEOGIS", ML, 17);
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...DARK);
        doc.text(title, PW / 2, 12, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...SLATE5);
        doc.text("Relatorio de Analise Inteligente de Tarefas", PW / 2, 18, {
          align: "center",
        });
        const infoX = PW - MR;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...DARK);
        doc.text("Geogis Geotecnologia", infoX, 8, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...SLATE5);
        doc.text("CNPJ: 14.116.593/0001-60", infoX, 13, { align: "right" });
        doc.text(
          "R. Das Acacias, 227 - Sao Francisco, Cuiaba - MT",
          infoX,
          18,
          { align: "right" },
        );
        doc.text("Transformar e Desenvolver Territorios", infoX, 23, {
          align: "right",
        });
        doc.setDrawColor(...PRIMARY);
        doc.setLineWidth(0.8);
        doc.line(0, HEADER_H, PW, HEADER_H);
        // Rodape em cada pagina
        const fy = PH - 4;
        doc.setDrawColor(...BORDER_C);
        doc.setLineWidth(0.2);
        doc.line(ML, fy - 2.5, PW - MR, fy - 2.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...SLATE5);
        doc.text(doc.splitTextToSize(footerLine, CW - 20)[0], ML, fy);
        doc.text(`Pag. ${pageCount}`, PW - MR, fy, { align: "right" });
        return HEADER_H + 4;
      };

      // Limpa markdown e remove emojis (jsPDF nao renderiza unicode extra-plano)
      const cleanMd = (s: string) =>
        s
          .replace(/^#+\s+/, "")
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/`([^`]+)`/g, "$1")
          .replace(/[\u{1F300}-\u{1FFFF}]|[\u{2600}-\u{27BF}]/gu, "")
          .trim();

      // ── PAGINA 1: KPIs + Graficos ──────────────────────────────────────────
      let y = drawPageHeader("GEOTASK IA  |  Analise Inteligente");

      // Titulo KPIs
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text("INDICADORES DO PERIODO", ML, y);
      doc.setDrawColor(...PRIMARY);
      doc.setLineWidth(0.5);
      doc.line(ML, y + 1.5, ML + 60, y + 1.5);
      y += 5;

      // KPI cards: fundo claro, borda colorida, numero colorido (SEM fill solido)
      const KPIS = [
        {
          label: "TOTAL",
          value: stats.total,
          sub: "no sistema",
          col: KPI_COL[0],
        },
        {
          label: "CRIADAS",
          value: stats.created,
          sub: `ult. ${periodDays} dias`,
          col: KPI_COL[1],
        },
        {
          label: "CONCLUIDAS",
          value: stats.completed,
          sub: `ult. ${periodDays} dias`,
          col: KPI_COL[2],
        },
        {
          label: "PENDENTES",
          value: stats.pending,
          sub: "em aberto",
          col: KPI_COL[3],
        },
        {
          label: "ATRASADAS",
          value: stats.overdue,
          sub: "prazo vencido",
          col: KPI_COL[4],
        },
      ];
      const CARD_W = (CW - 4 * 4) / 5;
      const CARD_H = 24;

      KPIS.forEach((kpi, i) => {
        const cx = ML + i * (CARD_W + 4);
        doc.setFillColor(...LIGHT);
        doc.setDrawColor(kpi.col[0], kpi.col[1], kpi.col[2]);
        doc.setLineWidth(0.8);
        doc.roundedRect(cx, y, CARD_W, CARD_H, 2, 2, "FD");
        // Tira superior colorida (2 mm)
        doc.setFillColor(kpi.col[0], kpi.col[1], kpi.col[2]);
        doc.roundedRect(cx, y, CARD_W, 2, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...SLATE5);
        doc.text(kpi.label, cx + CARD_W / 2, y + 8, { align: "center" });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(kpi.col[0], kpi.col[1], kpi.col[2]);
        doc.text(String(kpi.value), cx + CARD_W / 2, y + 18, {
          align: "center",
        });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(...SLATE5);
        doc.text(kpi.sub, cx + CARD_W / 2, y + CARD_H - 2, { align: "center" });
      });
      y += CARD_H + 6;

      // Titulo graficos
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text("GRAFICOS", ML, y);
      doc.setDrawColor(...PRIMARY);
      doc.setLineWidth(0.5);
      doc.line(ML, y + 1.5, ML + 28, y + 1.5);
      y += 5;

      const CHART_AREA_H = PH - y - FOOTER_H - 6;
      const CHART_W = (CW - 6) / 2;

      // Canvas 3x para alta resolucao
      const SC = 3;
      const CVW = Math.round(CHART_W * SC * 3.7795);
      const CVH = Math.round(CHART_AREA_H * SC * 3.7795);

      const makeBarChart = (
        entries: [string, number][],
        title: string,
      ): string => {
        const cv = document.createElement("canvas");
        cv.width = CVW;
        cv.height = CVH;
        const ctx = cv.getContext("2d")!;
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, CVW, CVH);
        const pad = { top: 60, right: 40, bottom: 28, left: 90 };
        const aW = CVW - pad.left - pad.right;
        const aH = CVH - pad.top - pad.bottom;
        const maxV = Math.max(...entries.map((e) => e[1]), 1);
        const barH = Math.max(16, Math.min(44, aH / entries.length - 10));
        const gap = (aH - barH * entries.length) / (entries.length + 1);

        ctx.fillStyle = "#1e293b";
        ctx.font = `bold ${16 * SC}px Arial`;
        ctx.fillText(title, pad.left, 44);

        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = SC;
        for (let g = 0; g <= 4; g++) {
          const gx = pad.left + (g / 4) * aW;
          ctx.beginPath();
          ctx.moveTo(gx, pad.top);
          ctx.lineTo(gx, pad.top + aH);
          ctx.stroke();
          ctx.fillStyle = "#94a3b8";
          ctx.font = `${9 * SC}px Arial`;
          ctx.textAlign = "center";
          ctx.fillText(
            String(Math.round((g / 4) * maxV)),
            gx,
            pad.top + aH + 22,
          );
        }

        entries.forEach(([label, val], idx) => {
          const bw = Math.max(4, (val / maxV) * aW);
          const by = pad.top + gap + idx * (barH + gap);
          const col = CHART_COL[idx % CHART_COL.length];
          ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
          const r = 5;
          ctx.beginPath();
          ctx.moveTo(pad.left + r, by);
          ctx.lineTo(pad.left + bw - r, by);
          ctx.quadraticCurveTo(pad.left + bw, by, pad.left + bw, by + r);
          ctx.lineTo(pad.left + bw, by + barH - r);
          ctx.quadraticCurveTo(
            pad.left + bw,
            by + barH,
            pad.left + bw - r,
            by + barH,
          );
          ctx.lineTo(pad.left + r, by + barH);
          ctx.quadraticCurveTo(pad.left, by + barH, pad.left, by + barH - r);
          ctx.lineTo(pad.left, by + r);
          ctx.quadraticCurveTo(pad.left, by, pad.left + r, by);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#e2e8f0";
          ctx.fillRect(pad.left + bw, by, aW - bw, barH);
          ctx.fillStyle = "#475569";
          ctx.font = `${10 * SC}px Arial`;
          ctx.textAlign = "right";
          ctx.fillText(
            label.length > 14 ? label.slice(0, 14) + "..." : label,
            pad.left - 8,
            by + barH / 2 + 5,
          );
          ctx.fillStyle = "#1e293b";
          ctx.font = `bold ${11 * SC}px Arial`;
          ctx.textAlign = "left";
          ctx.fillText(String(val), pad.left + bw + 8, by + barH / 2 + 5);
        });
        return cv.toDataURL("image/png");
      };

      const makePieChart = (
        entries: [string, number][],
        title: string,
      ): string => {
        const cv = document.createElement("canvas");
        cv.width = CVW;
        cv.height = CVH;
        const ctx = cv.getContext("2d")!;
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, CVW, CVH);
        ctx.fillStyle = "#1e293b";
        ctx.font = `bold ${16 * SC}px Arial`;
        ctx.fillText(title, 20, 44);
        const total = entries.reduce((s, [, v]) => s + v, 0);
        if (total === 0) return cv.toDataURL("image/png");
        const cx = CVW * 0.3,
          cy = CVH * 0.56,
          radius = Math.min(CVW, CVH) * 0.3;
        let startAngle = -Math.PI / 2;
        entries.forEach(([, val], i) => {
          const slice = (val / total) * Math.PI * 2;
          const col = CHART_COL[i % CHART_COL.length];
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
          ctx.closePath();
          ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 4;
          ctx.stroke();
          startAngle += slice;
        });
        let ly = 55;
        const legX = CVW * 0.58;
        entries.forEach(([label, val], i) => {
          const pct = Math.round((val / total) * 100);
          const col = CHART_COL[i % CHART_COL.length];
          ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
          ctx.fillRect(legX, ly - 13 * SC, 12 * SC, 12 * SC);
          ctx.fillStyle = "#1e293b";
          ctx.font = `${10 * SC}px Arial`;
          ctx.textAlign = "left";
          const short = label.length > 18 ? label.slice(0, 18) + "..." : label;
          ctx.fillText(`${short} - ${val} (${pct}%)`, legX + 16 * SC, ly);
          ly += 18 * SC;
        });
        return cv.toDataURL("image/png");
      };

      const statusEntries = Object.entries(stats.byStatus).sort(
        (a, b) => b[1] - a[1],
      );
      const sectorEntries = Object.entries(stats.bySector)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7);

      if (statusEntries.length > 0) {
        const imgBar = makeBarChart(
          statusEntries as [string, number][],
          "Tarefas por Status",
        );
        doc.setFillColor(...LIGHT);
        doc.setDrawColor(...BORDER_C);
        doc.setLineWidth(0.2);
        doc.roundedRect(ML, y, CHART_W, CHART_AREA_H, 2, 2, "FD");
        doc.addImage(
          imgBar,
          "PNG",
          ML + 1,
          y + 1,
          CHART_W - 2,
          CHART_AREA_H - 2,
        );
      }
      if (sectorEntries.length > 0) {
        const imgPie = makePieChart(
          sectorEntries as [string, number][],
          "Tarefas por Setor",
        );
        const cx2 = ML + CHART_W + 6;
        doc.setFillColor(...LIGHT);
        doc.setDrawColor(...BORDER_C);
        doc.setLineWidth(0.2);
        doc.roundedRect(cx2, y, CHART_W, CHART_AREA_H, 2, 2, "FD");
        doc.addImage(
          imgPie,
          "PNG",
          cx2 + 1,
          y + 1,
          CHART_W - 2,
          CHART_AREA_H - 2,
        );
      }

      // ── PAGINAS 2+: Relatorio da IA ──────────────────────────────────────
      doc.addPage();
      y = drawPageHeader("ANALISE GEOTASK IA");
      const BOTTOM = PH - FOOTER_H - 8;

      const newPage = (h: number) => {
        if (y + h > BOTTOM) {
          doc.addPage();
          y = drawPageHeader("ANALISE GEOTASK IA (cont.)");
        }
      };

      for (const raw of report.split("\n")) {
        if (raw.trim() === "" || raw.startsWith("---")) {
          y += 2;
          continue;
        }
        if (raw.startsWith("# ")) {
          newPage(14);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          doc.setTextColor(...DARK);
          const w = doc.splitTextToSize(cleanMd(raw), CW);
          doc.text(w, ML, y);
          y += w.length * 6.5 + 3;
        } else if (raw.startsWith("## ")) {
          newPage(12);
          doc.setFillColor(237, 244, 220);
          doc.setDrawColor(...PRIMARY);
          doc.setLineWidth(0.3);
          doc.roundedRect(ML, y - 4.5, CW, 9, 1, 1, "FD");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(...DARK);
          const w = doc.splitTextToSize(cleanMd(raw), CW - 6);
          doc.text(w, ML + 3, y + 1);
          y += w.length * 5.5 + 4;
        } else if (raw.startsWith("### ")) {
          newPage(9);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(...DARK);
          const w = doc.splitTextToSize(cleanMd(raw), CW);
          doc.text(w, ML, y);
          y += w.length * 5 + 2;
        } else if (raw.match(/^[-*] /) || raw.match(/^\d+\. /)) {
          newPage(6);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(...DARK);
          const txt =
            "- " + cleanMd(raw.replace(/^[-*]\s/, "").replace(/^\d+\.\s/, ""));
          const w = doc.splitTextToSize(txt, CW - 8);
          doc.text(w, ML + 5, y);
          y += w.length * 4.8 + 1;
        } else if (raw.startsWith("|")) {
          const cells = raw.split("|").filter((c) => c.trim());
          if (cells.length > 0 && !raw.match(/^\|[-| :]+\|$/)) {
            newPage(7);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(...DARK);
            const cellW = CW / cells.length;
            cells.forEach((cell, ci) => {
              doc.text(
                doc.splitTextToSize(
                  cell.trim().replace(/\*\*/g, ""),
                  cellW - 2,
                )[0],
                ML + ci * cellW,
                y,
              );
            });
            y += 5.5;
          }
        } else {
          newPage(6);
          const txt = cleanMd(raw);
          if (!txt) {
            y += 1;
            continue;
          }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(...DARK);
          const w = doc.splitTextToSize(txt, CW);
          doc.text(w, ML, y);
          y += w.length * 4.8 + 1;
        }
      }

      const filename = `GeoTask_IA_${now.toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar o PDF. Tente novamente.");
    } finally {
      setExportingPdf(false);
    }
  };

  const reset = () => {
    setReport(null);
    setStats(null);
    setError(null);
    setShowConfig(true);
    setCustomMessage("");
  };

  const copyToClipboard = () => {
    if (report) {
      navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ─── Botão trigger ──────────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        id="ai-report-btn"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-linear-to-br from-[#3b43af] via-indigo-600 to-violet-600 text-white border-none rounded-lg h-9 px-4 text-[13px] font-bold cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all duration-200 hover:-translate-y-px hover:brightness-110 active:scale-95"
      >
        <Sparkles size={15} />
        Análise IA
      </button>
    );
  }

  // ─── Modal ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 z-9999 flex items-center justify-center p-5 backdrop-blur-sm">
      <div
        id="ai-report-modal"
        className="bg-white dark:bg-gray-900 w-full max-w-[760px] max-h-[92vh] rounded-[20px] flex flex-col border border-slate-200 dark:border-gray-700 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="px-5 py-4 bg-linear-to-br from-[#1e1b4b] via-[#312e81] to-[#1e1b4b] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-500/30 p-2 rounded-[10px] border border-indigo-500/40">
              <Sparkles size={18} color="#a5b4fc" />
            </div>
            <div>
              <h3 className="m-0 text-base font-bold text-white">GeoTask IA</h3>
              <p className="m-0 text-[11px] text-indigo-300">
                • Análise e Relatório com IA •
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <button
                onClick={reset}
                className="bg-white/10 text-indigo-200 border border-white/20 rounded-lg px-2.5 py-1.5 text-[11px] cursor-pointer font-medium"
              >
                Nova análise
              </button>
            )}
            <button
              id="ai-modal-close"
              onClick={() => {
                setIsOpen(false);
                reset();
              }}
              className="bg-white/10 border-none cursor-pointer text-indigo-300 rounded-lg p-1.5 flex"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Corpo ── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* === CONFIGURAÇÃO === */}
          {showConfig && !loading && (
            <div className="px-6 py-5">
              {/* Período */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide block mb-2">
                  Período de análise
                </label>
                <div className="flex gap-2">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setPeriodDays(d)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${
                        periodDays === d
                          ? "border-[1.5px] border-indigo-500 bg-indigo-500/15 text-indigo-500"
                          : "border-[1.5px] border-slate-200 dark:border-gray-700 bg-transparent text-slate-500 dark:text-gray-400"
                      }`}
                    >
                      {d} dias
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipos de análise */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide block mb-2">
                  Tipos de análise
                </label>
                <div className="flex flex-col gap-2">
                  {ANALYSIS_OPTIONS.map((opt) => {
                    const selected = selectedAnalyses.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        id={`analysis-opt-${opt.id}`}
                        onClick={() => toggleAnalysis(opt.id)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] cursor-pointer text-left transition-all duration-150 ${
                          selected
                            ? "border-[1.5px] border-indigo-500 bg-indigo-500/10"
                            : "border-[1.5px] border-slate-200 dark:border-gray-700 bg-transparent"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            selected
                              ? "bg-indigo-500/20 text-indigo-500"
                              : "bg-black/5 dark:bg-white/5 text-slate-500 dark:text-gray-400"
                          }`}
                        >
                          {opt.icon}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`m-0 text-[13px] font-semibold ${
                              selected
                                ? "text-indigo-500"
                                : "text-slate-800 dark:text-gray-100"
                            }`}
                          >
                            {opt.label}
                          </p>
                          <p className="m-0 text-[11px] text-slate-500 dark:text-gray-400 mt-px">
                            {opt.description}
                          </p>
                        </div>
                        <div
                          className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0 ${
                            selected
                              ? "border-2 border-indigo-500 bg-indigo-500"
                              : "border-2 border-slate-200 dark:border-gray-700 bg-transparent"
                          }`}
                        >
                          {selected && <Check size={11} color="#fff" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mensagem customizada */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <MessageSquare size={12} />
                  Solicitação especial (opcional)
                </label>
                <textarea
                  id="ai-custom-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={`Ex: "Quero uma análise especial sobre a não conclusão do contrato X" ou "Por que o setor Y está atrasado?"`}
                  rows={3}
                  className={`w-full rounded-[10px] bg-transparent text-slate-800 dark:text-gray-100 text-[13px] px-3.5 py-2.5 resize-y outline-none font-[inherit] leading-normal transition-[border-color] duration-150 box-border ${
                    customMessage
                      ? "border-[1.5px] border-indigo-500"
                      : "border-[1.5px] border-slate-200 dark:border-gray-700"
                  }`}
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 flex items-center gap-2 mb-4">
                  <AlertCircle size={14} color="#ef4444" />
                  <span className="text-xs text-red-500">{error}</span>
                </div>
              )}

              <button
                id="ai-generate-btn"
                onClick={generateReport}
                disabled={
                  selectedAnalyses.length === 0 && !customMessage.trim()
                }
                className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-[10px] border-none text-white text-sm font-bold transition-all duration-200 ${
                  selectedAnalyses.length === 0 && !customMessage.trim()
                    ? "bg-indigo-500/30 cursor-not-allowed shadow-none"
                    : "bg-linear-to-br from-[#3b43af] via-indigo-500 to-violet-500 cursor-pointer shadow-[0_4px_15px_rgba(99,102,241,0.4)]"
                }`}
              >
                <Send size={16} />
                Gerar Análise com IA
              </button>
            </div>
          )}

          {/* === CARREGANDO === */}
          {loading && (
            <div className="flex flex-col items-center justify-center px-6 py-[60px] gap-4">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center border border-indigo-500/30">
                <Loader2 size={28} className="animate-spin text-indigo-500" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-slate-800 dark:text-gray-100 mb-1.5 mt-0">
                  GeoTask IA está analisando seus dados...
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-400 m-0">
                  {selectedAnalyses.length} tipo(s) de análise selecionado(s)
                  {customMessage ? " + solicitação especial" : ""}
                </p>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-indigo-500 opacity-40"
                    style={{
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* === RESULTADO === */}
          {report && !loading && (
            <div>
              {/* Stats rápidos */}
              {stats && (
                <div className="px-6 py-4 bg-linear-to-br from-[#1e1b4b] to-[#312e81] flex gap-2.5 flex-wrap">
                  <StatCard
                    label="Total"
                    value={stats.total}
                    color="#fff"
                    bg="rgba(255,255,255,0.1)"
                  />
                  <StatCard
                    label="Criadas"
                    value={stats.created}
                    color="#a5f3fc"
                    bg="rgba(6,182,212,0.2)"
                  />
                  <StatCard
                    label="Concluídas"
                    value={stats.completed}
                    color="#86efac"
                    bg="rgba(34,197,94,0.2)"
                  />
                  <StatCard
                    label="Pendentes"
                    value={stats.pending}
                    color="#fde68a"
                    bg="rgba(234,179,8,0.2)"
                  />
                  <StatCard
                    label="Atrasadas"
                    value={stats.overdue}
                    color="#fca5a5"
                    bg="rgba(239,68,68,0.2)"
                  />
                </div>
              )}

              {/* Relatório em markdown */}
              <div className="px-6 py-5">
                <MarkdownRenderer text={report} />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer quando há relatório ── */}
        {report && !loading && (
          <div className="px-5 py-3 border-t border-slate-200 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900 shrink-0">
            <span className="text-[11px] text-slate-500 dark:text-gray-400">
              Gerado por GeoTask IA
            </span>
            <div className="flex gap-2">
              <button
                id="ai-nova-analise-footer"
                onClick={reset}
                className="flex items-center gap-1.5 bg-transparent text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-gray-700 rounded-lg px-3 py-[7px] text-xs cursor-pointer"
              >
                <ChevronUp size={13} />
                Configurar
              </button>
              <button
                id="ai-pdf-btn"
                onClick={exportToPDF}
                disabled={exportingPdf}
                className={`flex items-center gap-1.5 text-red-500 border border-red-500/30 rounded-lg px-3.5 py-[7px] text-xs font-semibold transition-all duration-200 ${
                  exportingPdf
                    ? "bg-red-500/5 cursor-not-allowed opacity-60"
                    : "bg-red-500/10 cursor-pointer opacity-100"
                }`}
              >
                {exportingPdf ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <FileDown size={13} />
                )}
                {exportingPdf ? "Gerando PDF..." : "Exportar PDF"}
              </button>
              <button
                id="ai-copy-btn"
                onClick={copyToClipboard}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-[7px] text-xs font-semibold cursor-pointer transition-all duration-200 ${
                  copied
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                    : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/30"
                }`}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copiado!" : "Copiar relatório"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
