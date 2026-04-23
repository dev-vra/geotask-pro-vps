"use client";

import { useState, useRef, useEffect } from "react";
import { useSWRConfig } from "swr";
import {
  Paperclip, MessageSquare, History, FileText,
  Send, Upload, AlertCircle, ChevronRight, CheckCircle2, Circle, ArrowRight,
} from "lucide-react";
import { SideDrawer } from "@/components/ui/SideDrawer";
import { ReurbStatusBadge, ReurbTipoBadge } from "./ReurbStatusBadge";
import { useReurbProtocol } from "@/hooks/useReurb";
import { useReurbStore } from "@/stores/reurbStore";
import {
  TIPO_LABELS, STATUS_LABELS, STATUS_COLORS, ADVANCE_METADATA,
  VALID_TRANSITIONS, PRAZO_FIELD, getNextStatuses, isFinalStatus,
} from "@/lib/reurb/constants";
import type { TipoSolicitacao } from "@/lib/reurb/constants";

function authFetch(url: string, options?: RequestInit) {
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("geotask_user") || "null") : null;
  return fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(user ? { "X-User-Id": String(user.id) } : {}), ...(options?.headers || {}) },
  });
}

export function ProtocolDrawer({ user: _user }: { user: any }) {
  const { selectedSolicitacaoId, drawerOpen, closeDrawer } = useReurbStore();
  const { data: protocol, mutate } = useReurbProtocol(selectedSolicitacaoId);
  const { mutate: globalMutate } = useSWRConfig();
  const [tab, setTab] = useState<"dados" | "historico" | "anexos" | "comentarios">("dados");

  // Reset to "dados" tab every time drawer opens a new solicitação
  useEffect(() => {
    if (drawerOpen) setTab("dados");
  }, [selectedSolicitacaoId, drawerOpen]);

  // Advance form
  const [statusNovo, setStatusNovo] = useState("");
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [advSaving, setAdvSaving] = useState(false);
  const [advError, setAdvError] = useState("");
  const [advSuccess, setAdvSuccess] = useState(false);

  // Comment form
  const [comment, setComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  // File upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!protocol || !drawerOpen) return null;

  const tipo = protocol.tipo as TipoSolicitacao;
  const currentStatus = protocol.status_atual as string;
  const nextStatuses = getNextStatuses(tipo, currentStatus);
  const metaFields = statusNovo ? (ADVANCE_METADATA[tipo]?.[statusNovo] ?? []) : [];
  const prazoField = statusNovo ? PRAZO_FIELD[tipo]?.[statusNovo] : undefined;
  const allStatuses = Object.keys(VALID_TRANSITIONS[tipo] ?? {}).filter(s => s !== "CANCELADO");
  const statusOrder = [...allStatuses, "CANCELADO"];

  async function handleAdvance(e: React.FormEvent) {
    e.preventDefault();
    if (!statusNovo) return;
    setAdvSaving(true);
    setAdvError("");
    setAdvSuccess(false);
    try {
      let prazo_alerta: string | undefined;
      if (prazoField && metadata[prazoField]) {
        prazo_alerta = new Date(metadata[prazoField]).toISOString();
      }
      const body: any = { status_novo: statusNovo };
      if (Object.keys(metadata).length) body.metadata = metadata;
      if (prazo_alerta) body.prazo_alerta = prazo_alerta;

      const res = await authFetch(`/api/reurb/protocols/${selectedSolicitacaoId}/advance`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setAdvError(data.error || "Erro ao avançar"); return; }
      mutate();
      globalMutate((key: string) => typeof key === "string" && key.startsWith("/api/reurb/processes"));
      setStatusNovo("");
      setMetadata({});
      setAdvSuccess(true);
      setTimeout(() => setAdvSuccess(false), 3000);
    } finally {
      setAdvSaving(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommentSaving(true);
    try {
      const res = await authFetch(`/api/reurb/protocols/${selectedSolicitacaoId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: comment }),
      });
      if (res.ok) { mutate(); setComment(""); }
    } finally {
      setCommentSaving(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const u = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("geotask_user") || "null") : null;
      const res = await fetch(`/api/reurb/protocols/${selectedSolicitacaoId}/attachments`, {
        method: "POST",
        headers: u ? { "X-User-Id": String(u.id) } : {},
        body: fd,
      });
      if (res.ok) mutate();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const isFinal = isFinalStatus(tipo, currentStatus);

  return (
    <SideDrawer
      open={drawerOpen}
      onClose={closeDrawer}
      title={TIPO_LABELS[tipo] ?? tipo}
      subtitle={`${protocol.process?.neighborhood?.name} — ${protocol.process?.neighborhood?.city?.name}`}
      width="900px"
    >
      <div className="flex h-full min-h-0">

        {/* ── Left: Status timeline ── */}
        <div className="w-[210px] shrink-0 border-r border-[var(--t-border)] py-5 px-4 overflow-y-auto">
          <p className="text-[10px] font-bold text-[var(--t-sub)] uppercase tracking-wider mb-3">Progresso</p>
          <div className="flex flex-col gap-0">
            {allStatuses.map((s, idx) => {
              const isCurrent = s === currentStatus;
              const statusIdx = allStatuses.indexOf(currentStatus);
              const isDone = statusIdx > idx;
              const color = STATUS_COLORS[s] ?? "#94a3b8";
              return (
                <div key={s} className="relative flex items-start gap-2.5 pb-3">
                  {idx < allStatuses.length - 1 && (
                    <div className={`absolute left-[9px] top-[20px] w-0.5 h-full max-h-7 transition-colors ${isDone ? "bg-primary" : "bg-[var(--t-border)]"}`} />
                  )}
                  <div className={`mt-0.5 shrink-0 flex h-[18px] w-[18px] items-center justify-center rounded-full transition-all ${
                    isCurrent ? "border-2 ring-2 ring-offset-1" : isDone ? "bg-primary" : "border-2 border-[var(--t-border)] bg-[var(--t-card)]"
                  }`}
                    style={isCurrent ? { borderColor: color, background: `${color}15`, boxShadow: `0 0 0 2px ${color}40` } : isDone ? {} : {}}
                  >
                    {isDone
                      ? <CheckCircle2 size={11} className="text-white" />
                      : isCurrent
                        ? <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                        : <Circle size={9} className="text-[var(--t-border)]" />
                    }
                  </div>
                  <span className={`text-[11px] leading-snug pt-0.5 ${
                    isCurrent ? "font-bold" : isDone ? "text-[var(--t-sub)] line-through" : "text-[var(--t-sub)]"
                  }`}
                    style={isCurrent ? { color } : {}}
                  >
                    {STATUS_LABELS[s] ?? s.replace(/_/g, " ")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Content ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Tab bar */}
          <div className="flex border-b border-[var(--t-border)] px-5 pt-2 gap-1 shrink-0">
            {([
              { id: "dados",       label: "Dados",         icon: FileText,      badge: nextStatuses.length > 0 && !isFinal ? nextStatuses.length : null },
              { id: "historico",   label: "Histórico",     icon: History,       badge: protocol.history?.length || null },
              { id: "anexos",      label: "Anexos",        icon: Paperclip,     badge: protocol.attachments?.length || null },
              { id: "comentarios", label: "Comentários",   icon: MessageSquare, badge: protocol.comments?.length || null },
            ] as const).map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors cursor-pointer border-x-0 border-t-0 bg-transparent ${
                  tab === id ? "border-primary text-primary" : "border-transparent text-[var(--t-sub)] hover:text-[var(--t-text)]"
                }`}
              >
                <Icon size={13} />
                {label}
                {badge != null && (
                  <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    id === "dados" ? "bg-primary text-white animate-pulse" : "bg-[var(--t-tag)] text-[var(--t-sub)]"
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">

            {/* ──────── TAB: DADOS ──────── */}
            {tab === "dados" && (
              <div className="flex flex-col gap-5">

                {/* Info cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[var(--t-inp)] border border-[var(--t-border)] px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--t-sub)] mb-1.5">Status Atual</p>
                    <ReurbStatusBadge status={currentStatus} />
                  </div>
                  <div className="rounded-xl bg-[var(--t-inp)] border border-[var(--t-border)] px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--t-sub)] mb-1.5">Tipo</p>
                    <ReurbTipoBadge tipo={tipo} />
                  </div>
                  {protocol.prazo_alerta && (
                    <div className={`rounded-xl border px-4 py-3 col-span-2 ${
                      new Date(protocol.prazo_alerta) < new Date()
                        ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                        : "bg-[var(--t-inp)] border-[var(--t-border)]"
                    }`}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--t-sub)] mb-1">Prazo Alerta</p>
                      <span className={`text-[13px] font-semibold ${
                        new Date(protocol.prazo_alerta) < new Date() ? "text-red-600 dark:text-red-400" : "text-[var(--t-text)]"
                      }`}>
                        {new Date(protocol.prazo_alerta).toLocaleDateString("pt-BR")}
                        {new Date(protocol.prazo_alerta) < new Date() && " ⚠ Vencido"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Advance form */}
                {!isFinal && nextStatuses.length > 0 ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowRight size={14} className="text-primary" />
                      <p className="text-[12px] font-bold text-primary uppercase tracking-wide">Avançar Status</p>
                    </div>

                    <form onSubmit={handleAdvance} className="flex flex-col gap-3">
                      {/* Status select */}
                      <div className="flex flex-wrap gap-2">
                        {nextStatuses.map((s) => {
                          const color = STATUS_COLORS[s] ?? "#94a3b8";
                          const isSelected = statusNovo === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => { setStatusNovo(s); setMetadata({}); }}
                              className="rounded-lg px-3 py-2 text-[12px] font-semibold border-2 transition-all cursor-pointer"
                              style={{
                                borderColor: isSelected ? color : "var(--t-border)",
                                background: isSelected ? `${color}15` : "var(--t-card)",
                                color: isSelected ? color : "var(--t-sub)",
                              }}
                            >
                              {STATUS_LABELS[s] ?? s.replace(/_/g, " ")}
                            </button>
                          );
                        })}
                      </div>

                      {/* Dynamic metadata fields */}
                      {statusNovo && metaFields.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 mt-1">
                          {metaFields.map((field) => (
                            <div key={field.field} className={field.type !== "date" && metaFields.length === 1 ? "col-span-2" : ""}>
                              <label className="block text-[11px] font-semibold text-[var(--t-sub)] mb-1 uppercase tracking-wide">
                                {field.label}{field.required && " *"}
                              </label>
                              <input
                                type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                                value={metadata[field.field] ?? ""}
                                onChange={(e) => setMetadata((m) => ({ ...m, [field.field]: e.target.value }))}
                                required={field.required}
                                className="w-full rounded-lg border border-[var(--t-border)] bg-[var(--t-card)] px-3 py-2 text-[13px] text-[var(--t-text)]"
                              />
                              {field.hint && <p className="text-[10px] text-[var(--t-sub)] mt-0.5 italic">{field.hint}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {advError && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-[12px] text-red-700 dark:text-red-400">
                          <AlertCircle size={13} />{advError}
                        </div>
                      )}
                      {advSuccess && (
                        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2 text-[12px] text-green-700 dark:text-green-400">
                          <CheckCircle2 size={13} /> Status atualizado com sucesso!
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={advSaving || !statusNovo}
                        className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40 cursor-pointer border-none transition-opacity"
                        style={{ background: "var(--color-primary)" }}
                      >
                        {advSaving ? "Salvando..." : <>Confirmar Avanço <ChevronRight size={14} /></>}
                      </button>
                    </form>
                  </div>
                ) : isFinal ? (
                  <div className="rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 px-4 py-3 flex items-center gap-2 text-[13px] text-green-700 dark:text-green-400 font-medium">
                    <CheckCircle2 size={15} /> Solicitação concluída — sem mais etapas
                  </div>
                ) : (
                  <div className="rounded-xl bg-[var(--t-inp)] border border-[var(--t-border)] px-4 py-3 text-[12px] text-[var(--t-sub)]">
                    Nenhuma transição disponível para o status atual.
                  </div>
                )}
              </div>
            )}

            {/* ──────── TAB: HISTÓRICO ──────── */}
            {tab === "historico" && (
              <div className="flex flex-col gap-3">
                {(protocol.history || []).length === 0 ? (
                  <div className="flex flex-col items-center py-12 gap-2 text-[var(--t-sub)]">
                    <History size={32} className="opacity-30" />
                    <p className="text-[13px]">Nenhuma ação registrada ainda.</p>
                    <p className="text-[11px] opacity-60">Avance o status na aba <strong>Dados</strong> para criar o primeiro registro.</p>
                  </div>
                ) : (protocol.history || []).map((h: any, i: number) => {
                  const meta = h.metadata ?? {};
                  const fromColor = STATUS_COLORS[h.status_anterior ?? ""] ?? "#94a3b8";
                  const toColor = STATUS_COLORS[h.status_novo] ?? "#94a3b8";
                  return (
                    <div key={h.id} className="relative flex gap-3">
                      {i < (protocol.history?.length || 0) - 1 && (
                        <div className="absolute left-[15px] top-8 w-0.5 h-full bg-[var(--t-border)]" />
                      )}
                      <div className="shrink-0 mt-1 h-8 w-8 rounded-full bg-[var(--t-inp)] border border-[var(--t-border)] flex items-center justify-center text-[10px] font-bold text-[var(--t-sub)]">
                        {h.user?.name?.slice(0, 2).toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 rounded-xl bg-[var(--t-inp)] border border-[var(--t-border)] px-3.5 py-3">
                        <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                          {h.status_anterior && (
                            <span className="text-[11px] font-medium rounded-full px-2 py-0.5"
                              style={{ background: `${fromColor}20`, color: fromColor }}>
                              {STATUS_LABELS[h.status_anterior] ?? h.status_anterior}
                            </span>
                          )}
                          {h.status_anterior && <ArrowRight size={11} className="text-[var(--t-sub)]" />}
                          <span className="text-[11px] font-bold rounded-full px-2 py-0.5"
                            style={{ background: `${toColor}20`, color: toColor }}>
                            {STATUS_LABELS[h.status_novo] ?? h.status_novo}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 text-[11px] text-[var(--t-sub)]">
                          <span className="font-medium">{h.user?.name}</span>
                          <span>{new Date(h.data_acao).toLocaleString("pt-BR")}</span>
                        </div>
                        {/* Metadata highlights */}
                        {(meta.nr_protocolo || meta.data_protocolo) && (
                          <p className="mt-1.5 text-[11px] text-[var(--t-sub)] bg-[var(--t-card)] rounded-md px-2 py-1">
                            {meta.nr_protocolo && <>Protocolo: <strong>{meta.nr_protocolo}</strong></>}
                            {meta.data_protocolo && <> · {new Date(meta.data_protocolo).toLocaleDateString("pt-BR")}</>}
                          </p>
                        )}
                        {meta.veiculo && (
                          <p className="mt-1.5 text-[11px] text-[var(--t-sub)] bg-[var(--t-card)] rounded-md px-2 py-1">
                            Veículo: <strong>{meta.veiculo}</strong>{meta.nr_jornal && ` — Ed. ${meta.nr_jornal}`}
                          </p>
                        )}
                        {meta.qtd_matriculas && (
                          <p className="mt-1.5 text-[11px] text-[var(--t-sub)] bg-[var(--t-card)] rounded-md px-2 py-1">
                            {meta.qtd_matriculas} matrículas · {meta.qtd_titulares} titulares
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ──────── TAB: ANEXOS ──────── */}
            {tab === "anexos" && (
              <div className="flex flex-col gap-3">
                <div>
                  <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp" />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--t-border)] px-4 py-3 text-[13px] text-[var(--t-sub)] hover:bg-[var(--t-hover)] cursor-pointer transition-colors bg-transparent w-full justify-center disabled:opacity-50"
                  >
                    <Upload size={14} /> {uploading ? "Enviando..." : "Clique para adicionar arquivo"}
                  </button>
                </div>
                {(protocol.attachments || []).length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2 text-[var(--t-sub)]">
                    <Paperclip size={28} className="opacity-30" />
                    <p className="text-[12px]">Nenhum anexo ainda.</p>
                  </div>
                ) : (protocol.attachments || []).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl bg-[var(--t-inp)] border border-[var(--t-border)] px-3.5 py-3">
                    <Paperclip size={14} className="shrink-0 text-[var(--t-sub)]" />
                    <div className="flex-1 min-w-0">
                      <a href={a.file_url} target="_blank" rel="noreferrer"
                        className="text-[13px] font-medium text-[var(--t-text)] hover:text-primary truncate block">
                        {a.original_name}
                      </a>
                      <span className="text-[11px] text-[var(--t-sub)]">
                        {a.uploaded_by?.name} · {new Date(a.created_at).toLocaleString("pt-BR")} · {(a.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ──────── TAB: COMENTÁRIOS ──────── */}
            {tab === "comentarios" && (
              <div className="flex flex-col gap-3">
                {(protocol.comments || []).length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2 text-[var(--t-sub)]">
                    <MessageSquare size={28} className="opacity-30" />
                    <p className="text-[12px]">Nenhum comentário ainda.</p>
                  </div>
                ) : (protocol.comments || []).map((c: any) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="shrink-0 h-8 w-8 rounded-full bg-[var(--t-inp)] border border-[var(--t-border)] flex items-center justify-center text-[11px] font-bold text-[var(--t-sub)]">
                      {c.user?.name?.slice(0, 2).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 rounded-xl bg-[var(--t-inp)] border border-[var(--t-border)] px-3.5 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-semibold text-[var(--t-text)]">{c.user?.name}</span>
                        <span className="text-[11px] text-[var(--t-sub)]">{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                      <p className="text-[13px] text-[var(--t-text)] whitespace-pre-wrap m-0">{c.content}</p>
                    </div>
                  </div>
                ))}
                <form onSubmit={handleComment} className="flex gap-2 mt-2 sticky bottom-0">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Comentar... Use @Nome ou @#Setor para mencionar"
                    rows={2}
                    className="flex-1 rounded-lg border border-[var(--t-border)] bg-[var(--t-inp)] px-3 py-2 text-[13px] text-[var(--t-text)] resize-none"
                    onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleComment(e as any); }}
                  />
                  <button
                    type="submit"
                    disabled={commentSaving || !comment.trim()}
                    className="shrink-0 flex items-center justify-center h-[68px] w-10 rounded-lg text-white disabled:opacity-50 cursor-pointer border-none"
                    style={{ background: "var(--color-primary)" }}
                  >
                    {commentSaving ? "..." : <Send size={14} />}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </SideDrawer>
  );
}
