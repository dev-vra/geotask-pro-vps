"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Clock, AlertCircle, FileText, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useReurbDashboard } from "@/hooks/useReurb";
import { ReurbStatusBadge, ReurbTipoBadge } from "./ReurbStatusBadge";
import { TIPO_LABELS, STATUS_LABELS } from "@/lib/reurb/constants";

function KpiCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex-1 min-w-[160px] rounded-xl bg-[var(--t-card)] border border-[var(--t-border)] px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-semibold text-[var(--t-sub)] uppercase tracking-wide">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${color}20` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div className="font-kpi text-[28px] font-bold" style={{ color, fontFamily: "var(--font-mono), monospace" }}>
        {value}
      </div>
    </div>
  );
}

export default function ReurbDashboardPage({ user }: { user: any }) {
  const { data, isLoading } = useReurbDashboard();

  if (isLoading) return (
    <div className="p-6 flex flex-col gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-[var(--t-card)] border border-[var(--t-border)] animate-pulse" />
      ))}
    </div>
  );

  const kpis = data?.kpis ?? {};
  const alerts = data?.alerts ?? { overdue_solicitacoes: [] };
  const stageBreakdown = data?.stage_breakdown ?? [];

  const chartData = stageBreakdown.map((s: any) => ({
    name: STATUS_LABELS[s.status] ?? s.status.replace(/_/g, " ").slice(0, 16),
    total: s.count,
  }));

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader title="REURB — Dashboard" subtitle="Métricas de controle processual e auditoria" />

      {/* KPIs */}
      <div className="flex flex-wrap gap-3">
        <KpiCard icon={FileText} label="Processos" value={kpis.total_processes ?? 0} color="#98af3b" />
        <KpiCard icon={TrendingUp} label="Solicitações ativas" value={kpis.active_solicitacoes ?? 0} color="#3b82f6" />
        <KpiCard icon={AlertCircle} label="Devolutivas ativas" value={kpis.devolutivas_ativas ?? 0} color="#ef4444" />
        <KpiCard icon={Clock} label="Prazo estourado" value={kpis.overdue_count ?? 0} color="#f59e0b" />
      </div>

      {/* Chart — status distribution */}
      {chartData.length > 0 && (
        <div className="rounded-xl bg-[var(--t-card)] border border-[var(--t-border)] p-5 shadow-sm">
          <h3 className="text-[13px] font-semibold text-[var(--t-text)] mb-4 font-display">Distribuição de status (histórico recente)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--t-sub)" }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 10, fill: "var(--t-sub)" }} />
              <Tooltip
                contentStyle={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="total" fill="#98af3b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Alerts */}
      <div className="rounded-xl bg-[var(--t-card)] border border-[var(--t-border)] p-4 shadow-sm">
        <h3 className="text-[13px] font-semibold text-[var(--t-text)] mb-3 font-display flex items-center gap-2">
          <AlertCircle size={14} className="text-red-500" />
          Prazos Estourados
        </h3>
        {(alerts.overdue_solicitacoes || []).length === 0 ? (
          <p className="text-[12px] text-[var(--t-sub)]">Nenhum prazo estourado.</p>
        ) : (alerts.overdue_solicitacoes || []).map((sol: any) => (
          <div key={sol.id} className="flex items-center justify-between py-2 border-b border-[var(--t-border)] last:border-0">
            <div>
              <p className="text-[13px] font-medium text-[var(--t-text)]">{sol.process?.neighborhood?.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <ReurbTipoBadge tipo={sol.tipo} />
                <ReurbStatusBadge status={sol.status_atual} />
              </div>
            </div>
            <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">
              {sol.prazo_alerta ? new Date(sol.prazo_alerta).toLocaleDateString("pt-BR") : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
