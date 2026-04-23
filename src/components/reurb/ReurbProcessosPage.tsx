"use client";

import { useState, useEffect } from "react";
import { Plus, Search, MapPin, Building2, FolderOpen, AlertCircle, X } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useReurbProcesses } from "@/hooks/useReurb";
import { useReurbStore } from "@/stores/reurbStore";
import { getPermissions } from "@/lib/permissions";
import { ReurbStatusBadge, ReurbTipoBadge } from "./ReurbStatusBadge";
import { ProtocolDrawer } from "./ProtocolDrawer";
import { TIPO_LABELS, STATUS_LABELS } from "@/lib/reurb/constants";

const TIPOS = Object.keys(TIPO_LABELS) as (keyof typeof TIPO_LABELS)[];

function authFetch(url: string, options?: RequestInit) {
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("geotask_user") || "null") : null;
  return fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(user ? { "X-User-Id": String(user.id) } : {}), ...(options?.headers || {}) },
  });
}

export default function ReurbProcessosPage({ user }: { user: any }) {
  const perms = getPermissions(user);
  const { openSolicitacao } = useReurbStore();
  const [search, setSearch] = useState("");
  const [filterSector, setFilterSector] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showNewProcess, setShowNewProcess] = useState(false);

  const activeFilters = [filterSector, filterTipo, filterStatus].filter(Boolean).length;

  const { data: processes, isLoading, mutate } = useReurbProcesses({
    search,
    ...(filterSector && { sector_id: filterSector }),
    ...(filterTipo && { tipo: filterTipo }),
    ...(filterStatus && { status: filterStatus }),
  });

  // Dropdown data
  const [neighborhoods, setNeighborhoods] = useState<{ id: number; name: string; city: { name: string } }[]>([]);
  const [sectors, setSectors] = useState<{ id: number; name: string }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");

  // New process form
  const [newForm, setNewForm] = useState({ qtde_lotes: "", neighborhood_id: "", sector_id: "" });
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState("");

  // Load sectors on mount (for filter bar), neighborhoods only when modal opens
  useEffect(() => {
    if (!perms.reurb.view_all) return;
    authFetch("/api/sectors").then(r => r.json()).then(s => {
      setSectors(Array.isArray(s) ? s : []);
    }).catch(() => {});
  }, []);

  // Load neighborhoods when modal opens
  useEffect(() => {
    if (!showNewProcess) return;
    setLoadingOptions(true);
    Promise.all([
      authFetch("/api/neighborhoods").then(r => r.json()),
      // sectors already loaded above, but re-fetch in case not view_all user needs them for their own sector
      authFetch("/api/sectors").then(r => r.json()),
    ]).then(([n, s]) => {
      setNeighborhoods(Array.isArray(n) ? n : []);
      setSectors(Array.isArray(s) ? s : []);
    }).catch(() => {}).finally(() => setLoadingOptions(false));
  }, [showNewProcess]);

  const filteredNeighborhoods = neighborhoods.filter(n =>
    neighborhoodSearch === "" ||
    n.name.toLowerCase().includes(neighborhoodSearch.toLowerCase()) ||
    n.city?.name?.toLowerCase().includes(neighborhoodSearch.toLowerCase())
  );

  async function handleCreateProcess(e: React.FormEvent) {
    e.preventDefault();
    setNewError("");
    if (!newForm.neighborhood_id) { setNewError("Selecione um bairro."); return; }
    if (!newForm.sector_id) { setNewError("Selecione um setor."); return; }
    setNewSaving(true);
    try {
      const res = await authFetch("/api/reurb/processes", {
        method: "POST",
        body: JSON.stringify({
          qtde_lotes: Number(newForm.qtde_lotes) || 0,
          neighborhood_id: Number(newForm.neighborhood_id),
          sector_id: Number(newForm.sector_id),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        mutate();
        setShowNewProcess(false);
        setNewForm({ qtde_lotes: "", neighborhood_id: "", sector_id: "" });
        setNeighborhoodSearch("");
      } else {
        setNewError(data.error || "Erro ao criar processo.");
      }
    } catch {
      setNewError("Erro de rede. Tente novamente.");
    } finally {
      setNewSaving(false);
    }
  }

  async function handleCreateSolicitacao(processId: number, tipo: string) {
    const res = await authFetch("/api/reurb/protocols", {
      method: "POST",
      body: JSON.stringify({ process_id: processId, tipo }),
    });
    if (res.ok) {
      const sol = await res.json();
      mutate();
      openSolicitacao(sol.id, processId);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-5">
      <PageHeader
        title="REURB — Processos"
        subtitle="Gestão e atualização de processos de regularização fundiária"
        actionButtons={
          perms.reurb.create ? (
            <button
              onClick={() => setShowNewProcess(true)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white cursor-pointer border-none"
              style={{ background: "var(--color-primary)" }}
            >
              <Plus size={14} /> Novo Processo
            </button>
          ) : null
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--t-border)] bg-[var(--t-card)] px-3 h-9 min-w-[220px]">
          <Search size={13} className="text-[var(--t-sub)] shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por bairro..."
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-[var(--t-text)]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[var(--t-sub)] hover:text-[var(--t-text)] bg-transparent border-none cursor-pointer p-0">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Tipo filter */}
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="h-9 rounded-lg border border-[var(--t-border)] bg-[var(--t-card)] px-3 text-[13px] text-[var(--t-text)] cursor-pointer"
        >
          <option value="">Todos os tipos</option>
          {(Object.keys(TIPO_LABELS) as (keyof typeof TIPO_LABELS)[]).map(t => (
            <option key={t} value={t}>{TIPO_LABELS[t]}</option>
          ))}
        </select>

        {/* Sector filter — only for view_all users */}
        {perms.reurb.view_all && sectors.length > 0 && (
          <select
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value)}
            className="h-9 rounded-lg border border-[var(--t-border)] bg-[var(--t-card)] px-3 text-[13px] text-[var(--t-text)] cursor-pointer"
          >
            <option value="">Todos os setores</option>
            {sectors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-lg border border-[var(--t-border)] bg-[var(--t-card)] px-3 text-[13px] text-[var(--t-text)] cursor-pointer"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Clear all */}
        {activeFilters > 0 && (
          <button
            onClick={() => { setFilterSector(""); setFilterTipo(""); setFilterStatus(""); setSearch(""); }}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[var(--t-border)] bg-[var(--t-card)] text-[12px] text-[var(--t-sub)] hover:text-red-500 hover:border-red-300 cursor-pointer transition-colors"
          >
            <X size={12} />
            Limpar ({activeFilters})
          </button>
        )}
      </div>

      {/* Process grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-[var(--t-card)] border border-[var(--t-border)] animate-pulse" />
          ))}
        </div>
      ) : (processes || []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <FolderOpen size={40} className="text-[var(--t-sub)]" />
          <p className="text-[14px] text-[var(--t-sub)]">Nenhum processo encontrado.</p>
          {perms.reurb.create && (
            <button onClick={() => setShowNewProcess(true)} className="text-[13px] font-medium text-primary hover:underline bg-transparent border-none cursor-pointer">
              Criar primeiro processo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(processes || []).map((p: any) => (
            <div key={p.id} className="rounded-xl bg-[var(--t-card)] border border-[var(--t-border)] p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <MapPin size={11} className="text-[var(--t-sub)] shrink-0" />
                    <span className="text-[14px] font-bold text-[var(--t-text)] truncate font-display">{p.neighborhood?.name}</span>
                  </div>
                  <span className="text-[11px] text-[var(--t-sub)]">{p.neighborhood?.city?.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-[var(--t-sub)]">
                <span className="flex items-center gap-1"><Building2 size={10} />{p.qtde_lotes} lotes</span>
                <span className="flex items-center gap-1 ml-auto">{p.sector?.name}</span>
              </div>

              {/* Solicitacoes */}
              <div className="flex flex-col gap-1.5">
                {(p.solicitacoes || []).length === 0 && (
                  <p className="text-[11px] text-[var(--t-sub)] italic px-1">Nenhuma solicitação ainda.</p>
                )}
                {(p.solicitacoes || []).map((sol: any) => (
                  <button
                    key={sol.id}
                    onClick={() => openSolicitacao(sol.id, p.id)}
                    className="flex items-center justify-between rounded-lg bg-[var(--t-inp)] border border-[var(--t-border)] px-3 py-2 text-left cursor-pointer hover:bg-[var(--t-hover)] transition-colors"
                  >
                    <ReurbTipoBadge tipo={sol.tipo} />
                    <ReurbStatusBadge status={sol.status_atual} />
                  </button>
                ))}

                {perms.reurb.create && (
                  <div className="relative group">
                    <button
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--t-border)] px-3 py-2 text-[12px] text-[var(--t-sub)] hover:bg-[var(--t-hover)] cursor-pointer bg-transparent transition-colors w-full"
                    >
                      <Plus size={12} /> Adicionar solicitação
                    </button>
                    <div className="hidden group-hover:flex absolute top-full left-0 right-0 z-10 mt-1 flex-col rounded-lg border border-[var(--t-border)] bg-[var(--t-card)] shadow-lg overflow-hidden">
                      {TIPOS.map(tipo => (
                        <button
                          key={tipo}
                          onClick={() => handleCreateSolicitacao(p.id, tipo)}
                          className="px-3 py-2 text-[12px] text-left text-[var(--t-text)] hover:bg-[var(--t-hover)] cursor-pointer bg-transparent border-none"
                        >
                          {TIPO_LABELS[tipo]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-[var(--t-sub)] mt-auto">
                Criado por {p.created_by?.name} · {new Date(p.created_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Process Modal */}
      {showNewProcess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setShowNewProcess(false)} />
          <form onSubmit={handleCreateProcess} className="relative z-10 w-[500px] max-h-[90vh] overflow-y-auto rounded-xl bg-[var(--t-card)] border border-[var(--t-border)] p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="text-[16px] font-bold text-[var(--t-text)] font-display">Novo Processo REURB</h3>

            {loadingOptions && (
              <p className="text-[12px] text-[var(--t-sub)]">Carregando opções...</p>
            )}

            {newError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2">
                <AlertCircle size={13} className="text-red-500 shrink-0" />
                <span className="text-[12px] text-red-600 dark:text-red-400">{newError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--t-sub)] mb-1 uppercase tracking-wide">Qtde Lotes</label>
                <input
                  type="number"
                  min="0"
                  value={newForm.qtde_lotes}
                  onChange={(e) => setNewForm((f) => ({ ...f, qtde_lotes: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-lg border border-[var(--t-border)] bg-[var(--t-inp)] px-3 py-2 text-[13px] text-[var(--t-text)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--t-sub)] mb-1 uppercase tracking-wide">Setor Responsável *</label>
                <select
                  value={newForm.sector_id}
                  onChange={(e) => setNewForm((f) => ({ ...f, sector_id: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-[var(--t-border)] bg-[var(--t-inp)] px-3 py-2 text-[13px] text-[var(--t-text)]"
                >
                  <option value="">Selecionar setor...</option>
                  {sectors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bairro — full width com busca */}
            <div>
              <label className="block text-[11px] font-semibold text-[var(--t-sub)] mb-1 uppercase tracking-wide">Bairro / Núcleo *</label>
              <input
                value={neighborhoodSearch}
                onChange={(e) => setNeighborhoodSearch(e.target.value)}
                placeholder="Filtrar por nome ou cidade..."
                className="w-full rounded-lg border border-[var(--t-border)] bg-[var(--t-inp)] px-3 py-2 text-[13px] text-[var(--t-text)] mb-1"
              />
              <select
                value={newForm.neighborhood_id}
                onChange={(e) => setNewForm((f) => ({ ...f, neighborhood_id: e.target.value }))}
                required
                size={6}
                className="w-full rounded-lg border border-[var(--t-border)] bg-[var(--t-inp)] px-2 py-1 text-[13px] text-[var(--t-text)]"
              >
                <option value="">— selecione —</option>
                {filteredNeighborhoods.slice(0, 100).map(n => (
                  <option key={n.id} value={n.id}>
                    {n.name} — {n.city?.name}
                  </option>
                ))}
                {filteredNeighborhoods.length > 100 && (
                  <option disabled>... refine a busca ({filteredNeighborhoods.length} resultados)</option>
                )}
              </select>
              {newForm.neighborhood_id && (
                <p className="text-[11px] mt-1" style={{ color: "var(--color-primary)" }}>
                  ✓ {neighborhoods.find(n => n.id === Number(newForm.neighborhood_id))?.name}
                </p>
              )}
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => { setShowNewProcess(false); setNewError(""); setNeighborhoodSearch(""); }}
                className="flex-1 rounded-lg border border-[var(--t-border)] bg-transparent px-3 py-2 text-[13px] text-[var(--t-sub)] cursor-pointer hover:bg-[var(--t-hover)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={newSaving || loadingOptions}
                className="flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50 cursor-pointer border-none"
                style={{ background: "var(--color-primary)" }}
              >
                {newSaving ? "Criando..." : "Criar Processo"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ProtocolDrawer user={user} />
    </div>
  );
}
