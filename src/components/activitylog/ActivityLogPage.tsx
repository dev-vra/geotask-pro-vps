"use client";

import type { ThemeColors, User } from "@/types";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  FileText,
  Search,
  TrendingUp,
  User as UserIcon,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";

interface ActivityLogPageProps {
  T: ThemeColors;
  user: User | null;
  users?: User[];
}

interface LogEntry {
  id: number;
  user_id: number | null;
  user_name: string;
  action: string;
  entity: string | null;
  entity_id: number | null;
  details: string | null;
  created_at: string;
}

interface SummaryData {
  total: number;
  topActions: { action: string; count: number }[];
  topUsers: { user_name: string; user_id: number | null; count: number }[];
  tasksCreated: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_LABELS: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  task_created: { label: "Tarefa Criada", color: "#22c55e", icon: "➕" },
  task_updated: { label: "Tarefa Editada", color: "#3b82f6", icon: "✏️" },
  task_status_changed: {
    label: "Status Alterado",
    color: "#f59e0b",
    icon: "🔄",
  },
  task_deleted: { label: "Tarefa Removida", color: "#ef4444", icon: "🗑️" },
  comment_added: { label: "Comentário", color: "#8b5cf6", icon: "💬" },
  user_login: { label: "Login", color: "#06b6d4", icon: "🔑" },
  password_changed: { label: "Senha Alterada", color: "#ec4899", icon: "🔒" },
  report_ai_requested: { label: "Relatório IA", color: "#f97316", icon: "🤖" },
  excel_exported: { label: "Export Excel", color: "#10b981", icon: "📊" },
  template_created: { label: "Template Criado", color: "#14b8a6", icon: "📋" },
  template_updated: { label: "Template Editado", color: "#0ea5e9", icon: "📋" },
  template_deleted: {
    label: "Template Removido",
    color: "#f43f5e",
    icon: "📋",
  },
};

function getActionInfo(action: string) {
  return (
    ACTION_LABELS[action] || { label: action, color: "#94a3b8", icon: "📌" }
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityLogPage({
  T,
  user,
  users = [],
}: ActivityLogPageProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
  });
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchText, setSearchText] = useState("");
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<
    { id: number | null; name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const buildParams = useCallback(
    (page: number, extra?: Record<string, string>) => {
      const p = new URLSearchParams();
      p.set("page", String(page));
      p.set("limit", "30");
      if (filterUser) p.set("user_id", filterUser);
      if (filterAction) p.set("action", filterAction);
      if (filterDateFrom) p.set("date_from", filterDateFrom);
      if (filterDateTo) p.set("date_to", filterDateTo);
      if (searchText) p.set("search", searchText);
      if (extra) Object.entries(extra).forEach(([k, v]) => p.set(k, v));
      return p.toString();
    },
    [filterUser, filterAction, filterDateFrom, filterDateTo, searchText],
  );

  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const [logsRes, summaryRes] = await Promise.all([
          authFetch(`/api/activity-log?${buildParams(page)}`),
          authFetch(`/api/activity-log?${buildParams(page, { summary: "true" })}`),
        ]);

        if (!logsRes.ok || !summaryRes.ok) {
          console.warn(
            "Activity log API not available yet (table may not exist).",
          );
          setLogs([]);
          setSummary({
            total: 0,
            topActions: [],
            topUsers: [],
            tasksCreated: 0,
          });
          setLoading(false);
          return;
        }

        const logsData = await logsRes.json();
        const summaryData = await summaryRes.json();

        setLogs(logsData.data || []);
        setPagination(
          logsData.pagination || {
            page: 1,
            limit: 30,
            total: 0,
            totalPages: 0,
          },
        );
        if (logsData.filters) {
          setAvailableActions(logsData.filters.actions || []);
          setAvailableUsers(logsData.filters.users || []);
        }
        setSummary({
          total: summaryData.total ?? 0,
          topActions: summaryData.topActions || [],
          topUsers: summaryData.topUsers || [],
          tasksCreated: summaryData.tasksCreated ?? 0,
        });
      } catch (err) {
        console.error("Erro ao buscar logs:", err);
        setSummary({ total: 0, topActions: [], topUsers: [], tasksCreated: 0 });
      } finally {
        setLoading(false);
      }
    },
    [buildParams],
  );

  useEffect(() => {
    fetchLogs(1);
  }, [filterUser, filterAction, filterDateFrom, filterDateTo]);

  const handleSearch = () => fetchLogs(1);
  const goToPage = (p: number) => fetchLogs(p);

  const clearFilters = () => {
    setFilterUser("");
    setFilterAction("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchText("");
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-slate-900 dark:text-gray-50 flex items-center gap-2">
            <Activity size={22} className="text-primary" />
            Log de Atividades
          </h1>
          <p className="mt-1 mb-0 text-[13px] text-slate-500 dark:text-gray-400">
            Monitoramento completo de ações no sistema
          </p>
        </div>
      </div>

      {/* Mini Dashboard */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Total de Ações",
              value: summary.total.toLocaleString("pt-BR"),
              icon: <Zap size={18} />,
              color: "#3b82f6",
            },
            {
              label: "Usuário Mais Ativo",
              value: summary.topUsers[0]?.user_name || "—",
              sub: summary.topUsers[0]
                ? `${summary.topUsers[0].count} ações`
                : "",
              icon: <UserIcon size={18} />,
              color: "#8b5cf6",
            },
            {
              label: "Ação Mais Frequente",
              value: summary.topActions[0]
                ? getActionInfo(summary.topActions[0].action).label
                : "—",
              sub: summary.topActions[0]
                ? `${summary.topActions[0].count}x`
                : "",
              icon: <TrendingUp size={18} />,
              color: "#f59e0b",
            },
            {
              label: "Tarefas Criadas",
              value: String(summary.tasksCreated),
              icon: <FileText size={18} />,
              color: "#22c55e",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-slate-200 dark:border-gray-700 flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: card.color + "18", color: card.color }}
              >
                {card.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">
                  {card.label}
                </div>
                <div className="text-[16px] font-bold text-slate-900 dark:text-gray-50 truncate">
                  {card.value}
                </div>
                {card.sub && (
                  <div className="text-[11px] text-slate-500 dark:text-gray-400">
                    {card.sub}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Actions Breakdown */}
      {summary && summary.topActions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-slate-200 dark:border-gray-700 mb-6">
          <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-3">
            Distribuição por Tipo de Ação
          </div>
          <div className="flex gap-2 flex-wrap">
            {summary.topActions.map((a, i) => {
              const info = getActionInfo(a.action);
              const pct =
                summary.total > 0
                  ? Math.round((a.count / summary.total) * 100)
                  : 0;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-slate-50 dark:bg-gray-900 rounded-lg px-3 py-2 border border-slate-100 dark:border-gray-700"
                >
                  <span className="text-sm">{info.icon}</span>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-900 dark:text-gray-50">
                      {info.label}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-gray-400">
                      {a.count}x ({pct}%)
                    </div>
                  </div>
                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden ml-1">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: info.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-slate-200 dark:border-gray-700 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">
              Usuário
            </label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-slate-900 dark:text-gray-50 min-w-[150px]"
            >
              <option value="">Todos</option>
              {availableUsers.map((u) => (
                <option key={u.id || u.name} value={u.id || ""}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">
              Ação
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-slate-900 dark:text-gray-50 min-w-[150px]"
            >
              <option value="">Todas</option>
              {availableActions.map((a) => (
                <option key={a} value={a}>
                  {getActionInfo(a).label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">
              Data Início
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-slate-900 dark:text-gray-50"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">
              Data Fim
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-slate-900 dark:text-gray-50"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">
              Buscar
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Buscar nos detalhes..."
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-slate-900 dark:text-gray-50"
              />
              <button
                onClick={handleSearch}
                className="px-2.5 py-1.5 bg-primary text-white border-none rounded-lg cursor-pointer flex items-center"
              >
                <Search size={13} />
              </button>
            </div>
          </div>
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-none rounded-lg text-xs cursor-pointer font-semibold h-[30px]"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 overflow-x-auto">
        <div className="overflow-x-auto">
          <table
            className="w-full text-left"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr className="border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900">
                <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">
                  Data/Hora
                </th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">
                  Usuário
                </th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">
                  Ação
                </th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-8 text-slate-500 dark:text-gray-400 text-sm"
                  >
                    Carregando...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-8 text-slate-500 dark:text-gray-400 text-sm"
                  >
                    Nenhum log encontrado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const info = getActionInfo(log.action);
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-[12px] text-slate-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                            {log.user_name?.charAt(0) || "?"}
                          </div>
                          <span className="text-[12px] font-semibold text-slate-900 dark:text-gray-50">
                            {log.user_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                          style={{
                            background: info.color + "18",
                            color: info.color,
                          }}
                        >
                          <span className="text-xs">{info.icon}</span>
                          {info.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-slate-600 dark:text-gray-300 max-w-[400px]">
                        <div className="group relative">
                          <span className="block truncate cursor-default">
                            {log.details || "—"}
                          </span>
                          {log.details && log.details.length > 40 && (
                            <div
                              className="absolute left-0 top-full mt-2 z-50 hidden group-hover:block w-[420px] max-h-[300px] overflow-auto bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-xl shadow-2xl p-3"
                              style={{ pointerEvents: "auto" }}
                            >
                              <div className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase mb-2 flex items-center gap-1">
                                <span>{info.icon}</span> {info.label}
                              </div>
                              {log.action === "task_updated" &&
                              log.details.includes("→") ? (
                                <div className="space-y-1.5">
                                  {/* Parse: "Tarefa" — Campo: "old" → "new" | Campo2: ... */}
                                  {(() => {
                                    const dashIdx = log.details.indexOf(" — ");
                                    const taskName =
                                      dashIdx > -1
                                        ? log.details.slice(0, dashIdx)
                                        : "";
                                    const rest =
                                      dashIdx > -1
                                        ? log.details.slice(dashIdx + 3)
                                        : log.details;
                                    const parts = rest.split(" | ");
                                    return (
                                      <>
                                        {taskName && (
                                          <div className="text-[11px] font-semibold text-slate-900 dark:text-gray-50 mb-2 pb-1 border-b border-slate-100 dark:border-gray-700">
                                            {taskName}
                                          </div>
                                        )}
                                        {parts.map((part, pi) => {
                                          const colonIdx = part.indexOf(":");
                                          if (colonIdx === -1)
                                            return (
                                              <div
                                                key={pi}
                                                className="text-[11px] text-slate-600 dark:text-gray-300"
                                              >
                                                {part}
                                              </div>
                                            );
                                          const fieldName = part
                                            .slice(0, colonIdx)
                                            .trim();
                                          const values = part
                                            .slice(colonIdx + 1)
                                            .trim();
                                          const arrowIdx = values.indexOf("→");
                                          const oldVal =
                                            arrowIdx > -1
                                              ? values
                                                  .slice(0, arrowIdx)
                                                  .trim()
                                                  .replace(/^"|"$/g, "")
                                              : values;
                                          const newVal =
                                            arrowIdx > -1
                                              ? values
                                                  .slice(arrowIdx + 1)
                                                  .trim()
                                                  .replace(/^"|"$/g, "")
                                              : "";
                                          return (
                                            <div
                                              key={pi}
                                              className="flex items-start gap-2 text-[11px]"
                                            >
                                              <span className="font-semibold text-slate-500 dark:text-gray-400 shrink-0 w-[80px] text-right">
                                                {fieldName}:
                                              </span>
                                              <span className="text-red-400 line-through">
                                                {oldVal}
                                              </span>
                                              <span className="text-slate-400">
                                                →
                                              </span>
                                              <span className="text-emerald-500 font-semibold">
                                                {newVal}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-700 dark:text-gray-200 whitespace-pre-wrap break-words">
                                  {log.details}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-gray-700">
            <div className="text-[11px] text-slate-500 dark:text-gray-400">
              Página {pagination.page} de {pagination.totalPages} —{" "}
              {pagination.total} registros
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-2 py-1 rounded border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 text-xs cursor-pointer disabled:opacity-40 flex items-center"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from(
                { length: Math.min(5, pagination.totalPages) },
                (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer border ${
                        pageNum === pagination.page
                          ? "bg-primary text-white border-primary"
                          : "bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                },
              )}
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-2 py-1 rounded border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 text-xs cursor-pointer disabled:opacity-40 flex items-center"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
