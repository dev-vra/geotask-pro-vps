"use client";

import { getPermissions } from "@/lib/permissions";
import { CheckCircle, Eye, Pause, Play, X, Send, Paperclip, FileText, Image, Trash2, Upload, Download, Plus, Clock, RotateCcw, Calendar, Check } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TeamSelectionModal from "./TeamSelectionModal";
import ConfirmPasswordModal from "../shared/ConfirmPasswordModal";

import { DatePicker } from "@/app/components/DatePicker";
import { STATUS_COLOR } from "@/lib/constants";
import { getTaskState, parseDateStr } from "@/lib/helpers";
import { authFetch } from "@/lib/authFetch";
import type {
  CitiesNeighborhoods,
  Sector,
  Subtask,
  Task,
  ThemeColors,
  User,
} from "@/types";

interface TaskDetailModalProps {
  T: ThemeColors;
  task: Task;
  user: User;
  onClose: () => void;
  onUpdate: (
    id: number,
    action: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
  users?: User[];
  contracts?: string[];
  taskTypes?: { id: number; name: string; sector_id?: number | null }[];
  citiesNeighborhoods?: CitiesNeighborhoods;
  contractCitiesNeighborhoods?: Record<string, Record<string, string[]>>;
  sectors?: (Sector | string)[];
  tasks?: Task[];
  setSelectedTask: (t: Task) => void;
  canViewAllSectors?: boolean;
}

interface HistoryEntry {
  id: number;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user?: { name: string } | null;
}

interface CommentEntry {
  id: number;
  content: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
}

interface AttachmentEntry {
  id: number;
  task_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  uploaded_by_id: number | null;
  uploaded_by: { id: number; name: string; avatar?: string | null } | null;
  created_at: string;
}

interface PauseEntry {
  started_at: string;
  ended_at?: string;
}

export default function TaskDetailModal({
  T,
  task: t,
  user,
  onClose,
  onUpdate,
  users = [],
  contracts = [],
  taskTypes = [],
  citiesNeighborhoods = {},
  contractCitiesNeighborhoods = {},
  sectors = [],
  tasks = [],
  setSelectedTask,
  canViewAllSectors,
}: TaskDetailModalProps) {
  const sc = STATUS_COLOR[t.status];

  const [tab, setTab] = useState("dados");
  const [form, setForm] = useState({
    ...t,
    sector: (typeof t.sector === "object" ? t.sector?.name : t.sector) || "",
    coworkers: (t.coworkers || []).map((c: any) => c.id),
  });
  const subtasks = form.subtasks || [];
  const [saving, setSaving] = useState(false);
  const [showResetTaskModal, setShowResetTaskModal] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resettingTask, setResettingTask] = useState(false);

  const handleResetTask = async () => {
    if (!resetPassword) {
      alert("Digite sua senha para confirmar.");
      return;
    }
    setResettingTask(true);
    try {
      const res = await authFetch(`/api/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: t.id, 
          action: "reset_status", 
          password: resetPassword, 
          user_id: user.id 
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erro ao resetar tarefa. Senha incorreta?");
      } else {
        setShowResetTaskModal(false);
        setResetPassword("");
        onClose();
        window.location.reload();
      }
    } catch (err) {
      alert("Erro ao conectar.");
    } finally {
      setResettingTask(false);
    }
  };

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);

  // Subtasks State
  const [newSubtask, setNewSubtask] = useState({
    title: "",
    sector: (typeof t.sector === "object" ? t.sector?.name : t.sector) || "",
    responsible_id: "",
    description: "",
  });
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Attachments State
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  const handleDeleteTask = async (password: string) => {
    setDeletingTask(true);
    try {
      const res = await authFetch(`/api/tasks?id=${t.id}&admin_id=${user.id}&password=${encodeURIComponent(password)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erro ao excluir tarefa. Verifique sua senha.");
      } else {
        setShowDeleteModal(false);
        onClose();
        if (onUpdate) await onUpdate(t.id, "refresh", {});
      }
    } catch (err) {
      alert("Erro ao conectar ao servidor.");
    } finally {
      setDeletingTask(false);
    }
  };

  // Timing/Pauses State
  const [showTimingModal, setShowTimingModal] = useState(false);
  const [editTiming, setEditTiming] = useState({
    started_at: t.started_at || "",
    completed_at: t.completed_at || "",
    pauses: (t.pauses || []).map((p: any) => ({
      started_at: p.started_at || "",
      ended_at: p.ended_at || "",
    })) as PauseEntry[],
  });
  const [savingTiming, setSavingTiming] = useState(false);

  const perms = useMemo(() => getPermissions(user), [user]);

  const filteredUsers = useMemo(() => {
    if (!form.sector) return [];
    return users.filter((u: User) => {
      const uSName = String(u.sector?.name || u.sector || "")
        .toLowerCase()
        .trim();
      const fSName = String(form.sector).toLowerCase().trim();
      const uSid = String(u.sector_id || u.sector?.id || "");
      const fSid = String(form.sector);
      return uSName === fSName || uSid === fSid;
    });
  }, [form.sector, users]);

  const filteredTaskTypes = useMemo(() => {
    // Helper para gerar os grupos
    const buildGroups = (types: any[]) => {
      const groups: Record<string, string[]> = { Geral: [] };
      types.forEach((t) => {
        if (!t.sector_id) {
          groups.Geral.push(t.name);
        } else {
          const sec = sectors.find((s: any) => s.id === t.sector_id);
          const secName =
            sec && typeof sec === "object" && "name" in sec
              ? sec.name
              : "Outros";
          if (!groups[secName]) groups[secName] = [];
          groups[secName].push(t.name);
        }
      });
      return Object.entries(groups)
        .filter(([_, opts]) => opts.length > 0)
        .map(([label, options]) => ({ label, options }));
    };

    if (!form.sector) return buildGroups(taskTypes);

    const sec = sectors.find(
      (s: any) =>
        String(s.id) === String(form.sector) ||
        (typeof s === "object" &&
          s !== null &&
          s.name &&
          String(s.name).toLowerCase() === String(form.sector).toLowerCase()) ||
        (typeof s === "string" &&
          s.toLowerCase() === String(form.sector).toLowerCase()),
    );

    if (!sec) return buildGroups(taskTypes);

    const secId = typeof sec === "object" ? sec.id : null;
    if (!secId) return buildGroups(taskTypes);

    const allowed = taskTypes.filter(
      (t: any) => !t.sector_id || t.sector_id === secId,
    );
    return buildGroups(allowed);
  }, [form.sector, taskTypes, sectors]);

  const subFilteredUsers = useMemo(() => {
    if (!newSubtask.sector) return [];
    return users.filter((u: User) => {
      const uSName = String(u.sector?.name || u.sector || "")
        .toLowerCase()
        .trim();
      const fSName = String(newSubtask.sector).toLowerCase().trim();
      const uSid = String(u.sector_id || u.sector?.id || "");
      const fSid = String(newSubtask.sector);
      return uSName === fSName || uSid === fSid;
    });
  }, [newSubtask.sector, users]);

  useEffect(() => {
    setForm({
      ...t,
      sector: (typeof t.sector === "object" ? t.sector?.name : t.sector) || "",
      coworkers: (t.coworkers || []).map((c: any) => c.id),
    });
  }, [t]);

  useEffect(() => {
    if (tab === "comentarios") {
      authFetch(`/api/comments?task_id=${t.id}`)
        .then((r) => r.json())
        .then((data) => setComments(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
    if (tab === "historico") {
      setLoadingHistory(true);
      authFetch(`/api/tasks/history?task_id=${t.id}`)
        .then((r) => r.json())
        .then((data) => setHistory(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    }
    if (tab === "anexos") {
      setLoadingAttachments(true);
      authFetch(`/api/tasks/${t.id}/attachments`)
        .then((r) => r.json())
        .then((data) => setAttachments(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoadingAttachments(false));
    }
  }, [tab, t.id]);

  const formatDatetimeLocal = (isoStr?: string | null) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.title.trim() || !newSubtask.sector) {
      alert("Preencha Título e Setor.");
      return;
    }
    setCreatingSubtask(true);
    try {
      const res = await authFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSubtask.title,
          description: newSubtask.description,
          status: "A Fazer",
          priority: form.priority || "Média",
          type: form.type || "Vistoria",
          deadline: form.deadline,
          sector: newSubtask.sector,
          contract: form.contract,
          city: form.city,
          nucleus: form.nucleus,
          quadra: form.quadra,
          lote: form.lote,
          parent_id: t.id,
          created_by: user?.id,
          responsible_id: newSubtask.responsible_id || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewSubtask({
          title: "",
          sector:
            (typeof t.sector === "object" ? t.sector?.name : t.sector) || "",
          responsible_id: "",
          description: "",
        });

        const newChild: Subtask = {
          id: data.id,
          title: newSubtask.title,
          done: false,
          task_id: t.id,
          sector_id: Number(newSubtask.sector) || null,
          responsible_id: Number(newSubtask.responsible_id) || null,
          responsible: newSubtask.responsible_id
            ? (users.find(
                (u: User) => u.id === Number(newSubtask.responsible_id),
              ) ?? null)
            : null,
        };
        setForm((prev) => ({
          ...prev,
          subtasks: [...(prev.subtasks || []), newChild],
        }));

        // Notifica o dashboard para re-sincronizar a lista de tarefas
        // sem isso a subtarefa some ao fechar o modal
        if (onUpdate) {
          await onUpdate(t.id, "refresh", {});
        }
      } else {
        alert("Erro ao criar subtarefa");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao criar subtarefa");
    } finally {
      setCreatingSubtask(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (onUpdate) {
        await onUpdate(t.id, "update_fields", form);
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  // Permission Logic
  const canEdit = (field: string) => {
    const role = user.role?.name || "";
    const isCreator = t.created_by_id === user.id;
    const isSuper = ["Admin", "Gerente", "Diretor", "Coordenador de Polo", "Coordenador de Setores", "Gestor"].includes(role);

    // "apenas quem criou a tarefa poderá editar o campo do prazo"
    if (field === "deadline") {
      return isCreator;
    }

    // Admin, Gerente, Coordenadores, Diretor, Gestor can edit everything else
    if (isSuper) return true;

    // Liderado/Others restrictions
    if (role === "Liderado") {
      if (field === "status") return true;
      if (field === "subtasks") return true;
      return false;
    }
    return false;
  };

  // Mapping existing comment logic
  const handleCommentChange = (val: string) => {
    setCommentText(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0) {
      const query = val.slice(lastAt + 1).toLowerCase();
      if (query.startsWith("#")) {
        const sectorQ = query.slice(1);
        const activeSectors = sectors || [];
        const matches = activeSectors
          .filter((s: Sector | string) => {
            const name = typeof s === "string" ? s : s.name || "";
            return name.toLowerCase().startsWith(sectorQ);
          })
          .slice(0, 5);
        setMentionSuggestions(
          matches.map(
            (s: Sector | string) => `#${typeof s === "string" ? s : s.name}`,
          ),
        );
      } else {
        const matches = users
          .filter((u: any) => u.name.toLowerCase().startsWith(query))
          .slice(0, 5);
        setMentionSuggestions(matches.map((u: User) => u.name));
      }
    } else {
      setMentionSuggestions([]);
    }
  };

  // --- Attachment helpers ---
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const refreshAttachments = useCallback(async () => {
    const res = await authFetch(`/api/tasks/${t.id}/attachments`);
    const data = await res.json();
    setAttachments(Array.isArray(data) ? data : []);
  }, [t.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("uploaded_by_id", String(user?.id || ""));
      const res = await authFetch(`/api/tasks/${t.id}/attachments`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        await refreshAttachments();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Erro ao enviar arquivo");
      }
    } catch {
      alert("Erro ao enviar arquivo");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm("Tem certeza que deseja remover este anexo?")) return;
    try {
      const res = await authFetch(
        `/api/tasks/${t.id}/attachments?attachment_id=${attachmentId}&user_id=${user?.id || ""}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        await refreshAttachments();
      } else {
        alert("Erro ao remover anexo");
      }
    } catch {
      alert("Erro ao remover anexo");
    }
  };

  const canDeleteAttachments = ["Admin", "Gerente"].includes(user.role?.name || "");

  // --- Timing/Pauses helpers ---
  const openTimingModal = () => {
    setEditTiming({
      started_at: t.started_at || "",
      completed_at: t.completed_at || "",
      pauses: (t.pauses || []).map((p: any) => ({
        started_at: p.started_at || "",
        ended_at: p.ended_at || "",
      })),
    });
    setShowTimingModal(true);
  };

  const handleSaveTiming = async () => {
    setSavingTiming(true);
    try {
      // Send pauses + dates in a single request to avoid race conditions
      const res = await authFetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: t.id,
          action: "manage_pauses",
          user_id: user?.id,
          pauses: editTiming.pauses.filter((p) => p.started_at),
          started_at: editTiming.started_at || null,
          completed_at: editTiming.completed_at || null,
        }),
      });

      if (res.ok) {
        setShowTimingModal(false);
        if (onUpdate) await onUpdate(t.id, "refresh", {});
      } else {
        alert("Erro ao salvar cronologia");
      }
    } catch {
      alert("Erro ao salvar cronologia");
    } finally {
      setSavingTiming(false);
    }
  };

  const insertMention = (suggestion: string) => {
    const lastAt = commentText.lastIndexOf("@");
    const before = commentText.slice(0, lastAt);
    setCommentText(`${before}@${suggestion} `);
    setMentionSuggestions([]);
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSendingComment(true);
    try {
      await authFetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: t.id,
          user_id: user?.id || null,
          user_name: user?.name || "Anônimo",
          user_avatar: user?.avatar || "?",
          content: commentText.trim(),
        }),
      });
      setCommentText("");
      setMentionSuggestions([]);
      const res = await authFetch(`/api/comments?task_id=${t.id}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setSendingComment(false);
    }
  };
  return (
    <div className="task-detail-modal-root leading-normal">
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-[6px] transition-all duration-300 p-4">
      <div 
        className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl w-full max-w-[800px] max-h-[90vh] flex flex-col rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-white/40 dark:border-gray-800/40 overflow-hidden transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-7 pb-5 flex items-start justify-between shrink-0 relative">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2">
                 <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm" style={{ background: sc + "22", color: sc, border: `1px solid ${sc}44` }}>
                   {t.status}
                 </span>
                 {t.priority && (
                   <span className="text-[10px] bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 px-2.5 py-1 rounded-full font-bold border border-slate-200 dark:border-gray-700">
                     {t.priority}
                   </span>
                 )}
                 {getTaskState(t) && (
                   <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ background: getTaskState(t)!.color + "22", color: getTaskState(t)!.color }}>
                     {getTaskState(t)!.label}
                   </span>
                 )}
            </div>
            {canEdit("title") ? (
              <input
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                className="w-full m-0 p-1 -ml-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-gray-50 leading-tight pr-8 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded-lg hover:bg-slate-100/50 dark:hover:bg-gray-800/50 transition-all"
                placeholder="Título da tarefa"
              />
            ) : (
              <h2 className="m-0 text-2xl font-bold tracking-tight text-slate-900 dark:text-gray-50 leading-tight pr-8">
                {form.title}
              </h2>
            )}
            <div className="flex items-center gap-3 mt-2 text-slate-500 dark:text-gray-400 text-[12px]">
                <span className="flex items-center gap-1"><Clock size={13} /> {t.created || "---"}</span>
                {t.deadline && <span className="flex items-center gap-1 font-semibold text-primary"><Calendar size={13} /> {t.deadline}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full border-none bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-500 transition-all duration-200 cursor-pointer shrink-0 ml-4"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-8 pb-4 border-b border-slate-100 dark:border-gray-800/50 shrink-0">
           <div className="flex bg-slate-100/50 dark:bg-gray-800/30 p-1 rounded-2xl gap-1">
             {[
               { id: "dados", label: "Dados" },
               { id: "subtarefas", label: `Subtarefas (${subtasks.length})` },
               { id: "comentarios", label: "Comentários" },
               { id: "anexos", label: "Anexos" },
               { id: "historico", label: "Histórico" },
             ].map((bt) => (
               <button
                 key={bt.id}
                 onClick={() => setTab(bt.id)}
                 className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300 border-none cursor-pointer ${
                   tab === bt.id
                     ? "bg-white dark:bg-gray-800 text-primary shadow-sm"
                     : "text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300"
                 }`}
               >
                 {bt.label}
               </button>
             ))}
           </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col no-scrollbar">
          {tab === "dados" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full">
                <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1">
                  DESCRIÇÃO
                </div>
                <textarea
                  value={form.description || ""}
                  disabled={!canEdit("description")}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className={`w-full p-2.5 rounded-lg border border-slate-200 dark:border-gray-700 text-[13px] resize-none text-slate-900 dark:text-gray-50 mb-4 ${
                    canEdit("description")
                      ? "bg-slate-100 dark:bg-gray-700"
                      : "bg-slate-100 dark:bg-gray-900"
                  }`}
                />

                {(perms.tasks.edit_retroactive_dates || perms.tasks.manage_pauses) && (
                  <button
                    type="button"
                    onClick={openTimingModal}
                    className="w-full flex items-center justify-center gap-2 p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg text-[13px] font-bold cursor-pointer hover:bg-amber-500/20 transition-all mb-4"
                  >
                    <Clock size={16} />
                    Editar Início, Pausas e Finalização
                  </button>
                )}
              </div>

              {[
                {
                  l: "Prioridade",
                  f: "priority",
                  o: ["Alta", "Média", "Baixa"],
                },
                { l: "Tipo", f: "type", o: [], groups: filteredTaskTypes },
                {
                  l: "Setor",
                  f: "sector",
                  o: sectors.map((s: Sector | string) =>
                    typeof s === "object" && s !== null ? s.name : String(s),
                  ),
                },
                {
                  l: "Responsável",
                  f: "responsible_id",
                  o: filteredUsers.map((u: User) => ({
                    value: u.id,
                    label: u.name,
                  })),
                },
                { l: "Contrato", f: "contract", o: contracts },
                { 
                  l: "Cidade", 
                  f: "city", 
                  o: form.contract && contractCitiesNeighborhoods[String(form.contract)] 
                    ? Object.keys(contractCitiesNeighborhoods[String(form.contract)]).sort() 
                    : Object.keys(citiesNeighborhoods).sort() 
                },
                { 
                  l: "Núcleo/Bairro", 
                  f: "nucleus", 
                  o: form.city 
                    ? (form.contract && contractCitiesNeighborhoods[String(form.contract)]
                        ? contractCitiesNeighborhoods[String(form.contract)][String(form.city)] || []
                        : citiesNeighborhoods[String(form.city)] || [])
                    : [] 
                },
                { l: "Quadra", f: "quadra" },
                { l: "Lote", f: "lote" },
                { l: "Prazo", f: "deadline", type: "date-picker" },
              ].map(({ l, f, o, type, groups }) => {
                const formRec = form as unknown as Record<
                  string,
                  string | null | undefined
                >;
                let disabled = !canEdit(
                  f === "responsible_id" ? "responsible" : f,
                );

                // Only users with "edit_retroactive_dates" capability can view/edit 'started_at' and 'completed_at'
                if (f === "started_at" || f === "completed_at") {
                  const appPerms = getPermissions(user);
                  if (!appPerms.tasks.edit_retroactive_dates) return null;
                  disabled = false;
                }

                return (
                  <div key={f} className="mb-3">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1">
                      {l.toUpperCase()}
                    </div>
                    {o && !groups ? (
                      <select
                        value={
                          ((form as Record<string, unknown>)[f] as string) || ""
                        }
                        disabled={disabled}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((prev) => ({ ...prev, [f]: v }));
                          if (f === "sector") {
                            setForm((prev) => ({
                              ...prev,
                              responsible_id: null,
                            }));
                          }
                          if (f === "city") {
                            setForm((prev) => ({
                              ...prev,
                              nucleus: "",
                            }));
                          }
                          if (f === "contract") {
                            setForm((prev) => ({
                              ...prev,
                              city: "" as any,
                              nucleus: "",
                            }));
                          }
                        }}
                        className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 text-[13px] appearance-none ${
                          disabled
                            ? "bg-slate-100 dark:bg-gray-900 text-slate-500 dark:text-gray-400"
                            : "bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50"
                        }`}
                      >
                        <option value="">Selecione...</option>
                        {o.map(
                          (
                            opt:
                              | string
                              | { value: string | number; label: string },
                          ) => {
                            const val =
                              typeof opt === "object" && opt !== null
                                ? opt.value
                                : opt;
                            const lab =
                              typeof opt === "object" && opt !== null
                                ? opt.label
                                : opt;
                            return (
                              <option key={val} value={val}>
                                {lab}
                              </option>
                            );
                          },
                        )}
                      </select>
                    ) : groups ? (
                      <select
                        value={
                          ((form as Record<string, unknown>)[f] as string) || ""
                        }
                        disabled={disabled}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((prev) => ({ ...prev, [f]: v }));
                        }}
                        className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 text-[13px] appearance-none ${
                          disabled
                            ? "bg-slate-100 dark:bg-gray-900 text-slate-500 dark:text-gray-400"
                            : "bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50"
                        }`}
                      >
                        <option value="">Selecione...</option>
                        {groups.map((g: any, i: number) => (
                          <optgroup key={`group-${i}`} label={g.label}>
                            {g.options.map((optLabel: string) => (
                              <option key={optLabel} value={optLabel}>
                                {optLabel}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full">
                        {type === "date-picker" ? (
                          <DatePicker
                            T={T}
                            date={parseDateStr(formRec[f] ?? undefined)}
                            setDate={(d) =>
                              setForm({
                                ...form,
                                [f]: d ? d.toISOString() : "",
                              })
                            }
                            label=""
                            openDirection="up"
                          />
                        ) : type === "datetime-local" ? (
                          <input
                            type="datetime-local"
                            value={formatDatetimeLocal(formRec[f])}
                            disabled={disabled}
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm({
                                ...form,
                                [f]: v ? new Date(v).toISOString() : null,
                              });
                            }}
                            className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 text-[13px] ${
                              disabled
                                ? "bg-slate-100 dark:bg-gray-900 text-slate-500 dark:text-gray-400"
                                : "bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50"
                            }`}
                          />
                        ) : (
                          <input
                            type={type || "text"}
                            value={formRec[f] || ""}
                            disabled={disabled}
                            onChange={(e) =>
                              setForm({ ...form, [f]: e.target.value })
                            }
                            className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 text-[13px] ${
                              disabled
                                ? "bg-slate-100 dark:bg-gray-900 text-slate-500 dark:text-gray-400"
                                : "bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50"
                            }`}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="col-span-full bg-white dark:bg-gray-900 rounded-[10px] p-3 border border-gray-200 dark:border-gray-700 mt-2 mb-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                      Equipe da Tarefa ({(form.coworkers || []).length})
                    </div>
                    {canEdit("responsible_id") && (
                      <button
                        type="button"
                        onClick={() => setIsTeamModalOpen(true)}
                        className="text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-md border-none cursor-pointer transition-colors"
                      >
                        Gerenciar Equipe
                      </button>
                    )}
                  </div>
                  
                  {(form.coworkers || []).length === 0 ? (
                    <div className="text-[11px] text-gray-400 py-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                      Nenhum outro membro selecionado.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(form.coworkers || []).map((id: number) => {
                        const u = users.find((user) => user.id === id);
                        if (!u) return null;
                        return (
                          <div key={id} className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-1">
                            <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center overflow-hidden">
                              {typeof u.avatar === "string" && u.avatar.startsWith("http") ? (
                                <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                              ) : u.name ? u.name.charAt(0) : "?"}
                            </div>
                            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 pr-1">{u.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              <div className="col-span-full pt-2.5 flex gap-2">
                {canEdit("status") && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 p-3 bg-primary text-white border-none rounded-[10px] text-[13px] font-semibold cursor-pointer disabled:opacity-70"
                  >
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </button>
                )}

                {user.role?.name === "Admin" && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-[10px] text-[13px] font-semibold cursor-pointer hover:bg-red-500/20 transition-colors"
                    title="Excluir tarefa definitivamente"
                  >
                    Excluir
                  </button>
                )}
              </div>

              {showDeleteModal && (
                <ConfirmPasswordModal
                  isOpen={showDeleteModal}
                  onClose={() => setShowDeleteModal(false)}
                  onConfirm={handleDeleteTask}
                  isLoading={deletingTask}
                  title="Excluir Tarefa"
                  description={`Tem certeza que deseja excluir DEFINITIVAMENTE a tarefa "${t.title}"? Esta ação não pode ser desfeita.`}
                />
              )}
            </div>
          )}

          {tab === "subtarefas" && (
            <div className="pb-5">
              <div className="mb-4">
                <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-2">
                  SUBTAREFAS ({(form.subtasks || []).length})
                </div>
                {(form.subtasks || []).length === 0 && (
                  <div className="text-[13px] text-slate-500 dark:text-gray-400 italic">
                    Nenhuma subtarefa.
                  </div>
                )}
                {(form.subtasks || []).map((child: Subtask & Partial<Task>) => (
                  <div
                    key={child.id}
                    className="p-2.5 border border-slate-200 dark:border-gray-700 rounded-lg mb-2 bg-white dark:bg-gray-800 flex justify-between items-center"
                  >
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50 flex items-center gap-2">
                        {child.title}
                        {getTaskState(child) && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-px rounded"
                            style={{
                              background: getTaskState(child)!.color + "22",
                              color: getTaskState(child)!.color,
                            }}
                          >
                            {getTaskState(child)!.label}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-gray-400 flex gap-1.5 mt-0.5">
                        <span>{child.status}</span>
                        <span>&bull;</span>
                        <span>{child.priority}</span>
                        {child.responsible && (
                          <>
                            <span>&bull;</span>
                            <span>{child.responsible.name || "Resp."}</span>
                          </>
                        )}
                        {child.sector && (
                          <>
                            <span>&bull;</span>
                            <span>
                              {child.sector && typeof child.sector === "object"
                                ? child.sector.name
                                : child.sector || ""}
                            </span>
                          </>
                        )}
                        {child.created_by && (
                          <>
                            <span>&bull;</span>
                            <span title="Criado por">
                              {typeof child.created_by === "object"
                                ? child.created_by.name
                                : child.created_by}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      title="Visualizar Tarefa"
                      className="bg-transparent border-none cursor-pointer"
                      onClick={() => {
                        // Switch selected task to subtask
                        const fullTask = tasks.find(
                          (tk: Task) => tk.id === child.id,
                        );
                        if (fullTask) {
                          setSelectedTask(fullTask);
                        } else {
                          // If not in main list (unlikely), use child as is
                          setSelectedTask(child as unknown as Task);
                        }
                      }}
                    >
                      <Eye
                        size={18}
                        className="text-slate-500 dark:text-gray-400"
                      />
                    </button>
                  </div>
                ))}
              </div>

              {user.role?.name !== "GM" && (
              <div className="bg-slate-100 dark:bg-gray-900 p-3 rounded-[10px] border border-slate-200 dark:border-gray-700">
                <div className="text-xs font-bold text-primary mb-2">
                  Nova Subtarefa
                </div>
                <div className="flex flex-col gap-2.5">
                  <input
                    value={newSubtask.title}
                    onChange={(e) =>
                      setNewSubtask({ ...newSubtask, title: e.target.value })
                    }
                    placeholder="Título *"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50 text-[13px]"
                  />
                  <textarea
                    value={newSubtask.description}
                    onChange={(e) =>
                      setNewSubtask({
                        ...newSubtask,
                        description: e.target.value,
                      })
                    }
                    placeholder="Descrição (opcional)"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50 text-[13px] resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <select
                      value={newSubtask.sector}
                      onChange={(e) =>
                        setNewSubtask({
                          ...newSubtask,
                          sector: e.target.value,
                          responsible_id: "",
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50 text-[13px]"
                    >
                      <option value="">Setor *</option>
                      {sectors.map((s: Sector | string) => {
                        const name = typeof s === "object" ? s.name : s;
                        return (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        );
                      })}
                    </select>
                    <select
                      value={newSubtask.responsible_id}
                      onChange={(e) =>
                        setNewSubtask({
                          ...newSubtask,
                          responsible_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50 text-[13px]"
                    >
                      <option value="">Responsável...</option>
                      {subFilteredUsers.map((u: User) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() =>
                        setNewSubtask({
                          title: "",
                          sector: "",
                          responsible_id: "",
                          description: "",
                        })
                      }
                      className="flex-1 p-2 bg-transparent text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-gray-700 rounded-lg text-[13px] font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddSubtask}
                      disabled={
                        creatingSubtask ||
                        !newSubtask.title ||
                        !newSubtask.sector
                      }
                      className="flex-2 p-2 bg-primary text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer disabled:opacity-60"
                    >
                      {creatingSubtask ? "Salvando..." : "Salvar Subtarefa"}
                    </button>
                  </div>
                </div>
              </div>
              )}
            </div>
          )}

          {tab === "comentarios" && (
            <div>
              <div className="flex flex-col gap-3 mb-5">
                {comments.map((c: CommentEntry) => (
                  <div
                    key={c.id}
                    className="bg-slate-100 dark:bg-gray-900 rounded-[10px] p-3"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-[9px] font-bold">
                        {c.user_avatar || "?"}
                      </div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-gray-50">
                        {c.user_name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 ml-auto">
                        {new Date(c.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="text-[13px] text-slate-900 dark:text-gray-50 leading-normal">
                      {c.content}
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center text-slate-500 dark:text-gray-400 text-[13px]">
                    Nenhum comentário.
                  </div>
                )}
              </div>

              {user.role?.name !== "GM" && (
              <div className="relative flex gap-2 items-end">
                <textarea
                  value={commentText}
                  onChange={(e) => handleCommentChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.shiftKey) {
                      e.preventDefault();
                      submitComment();
                    }
                  }}
                  placeholder="Escreva um comentário..."
                  rows={2}
                  className="w-full p-3 rounded-[10px] border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50 text-[13px] resize-none"
                />
                <button
                  type="button"
                  disabled={!commentText.trim() || sendingComment}
                  onClick={submitComment}
                  className="h-10 w-10 shrink-0 flex items-center justify-center bg-primary text-white rounded-lg border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mb-1"
                >
                  <Send size={16} />
                </button>
                {mentionSuggestions.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[10px] shadow-lg z-200 overflow-hidden">
                    {mentionSuggestions.map((s) => (
                      <button
                        key={s}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertMention(s);
                        }}
                        className="block w-full px-3 py-2 text-left bg-transparent border-none text-[13px] text-slate-900 dark:text-gray-50 cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              )}
            </div>
          )}

          {tab === "anexos" && (
            <div className="flex flex-col gap-3">
              {/* Upload button */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase">
                  Anexos ({attachments.length})
                </div>
                {user.role?.name !== "GM" && (
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity">
                  <Upload size={13} />
                  {uploadingFile ? "Enviando..." : "Enviar Arquivo"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                  />
                </label>
                )}
              </div>

              {loadingAttachments && (
                <div className="text-center text-slate-500 dark:text-gray-400 text-xs py-4">
                  Carregando...
                </div>
              )}

              {!loadingAttachments && attachments.length === 0 && (
                <div className="text-center text-slate-500 dark:text-gray-400 text-[13px] py-4">
                  Nenhum anexo encontrado.
                </div>
              )}

              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-gray-900 rounded-[10px] border border-slate-200 dark:border-gray-700"
                >
                  {/* Thumbnail or icon */}
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                    {att.mime_type.startsWith("image/") ? (
                      <img
                        src={att.url}
                        alt={att.original_name}
                        className="w-full h-full object-cover"
                      />
                    ) : att.mime_type === "application/pdf" ? (
                      <FileText size={18} className="text-red-500" />
                    ) : (
                      <FileText size={18} className="text-slate-400 dark:text-gray-500" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50 truncate">
                      {att.original_name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-gray-400 flex gap-1.5 flex-wrap">
                      <span>{formatFileSize(att.size)}</span>
                      {att.uploaded_by && (
                        <>
                          <span>&bull;</span>
                          <span>{att.uploaded_by.name}</span>
                        </>
                      )}
                      <span>&bull;</span>
                      <span>{new Date(att.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={att.url}
                      download={att.original_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                      title="Baixar"
                    >
                      <Download size={14} className="text-slate-500 dark:text-gray-400" />
                    </a>
                    {canDeleteAttachments && (
                      <button
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="p-1.5 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title="Remover anexo"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "historico" && (
            <div className="flex flex-col gap-3">
              {/* Gerenciar Pausas button */}
              {(perms.tasks.manage_pauses || perms.tasks.edit_retroactive_dates) && (
                <div className="flex justify-end mb-2">
                  <button
                    onClick={openTimingModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg text-[12px] font-semibold cursor-pointer hover:bg-amber-500/20 transition-colors"
                  >
                    <Clock size={13} />
                    Gerenciar Cronologia
                  </button>
                </div>
              )}

              <div className="mb-5 p-4 bg-slate-100 dark:bg-gray-900 rounded-xl flex items-center justify-between relative">
                <div className="absolute left-10 right-10 top-6 h-0.5 z-0 bg-slate-200 dark:bg-gray-700" />
                {[
                  { label: "Criação", date: t.created },
                  { label: "Início", date: t.started },
                  { label: "Prazo", date: t.deadline },
                  { label: "Conclusão", date: t.completed },
                ]
                  .filter((e) => e.date)
                  .map(
                    (
                      evt: { label: string; date: string | null | undefined },
                      idx: number,
                    ) => (
                      <div
                        key={idx}
                        className="z-1 flex flex-col items-center gap-1.5"
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-white dark:ring-gray-800" />
                        <div className="text-center">
                          <div className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">
                            {evt.label}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-900 dark:text-gray-50">
                            {evt.date}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
              </div>
              {loadingHistory && (
                <div className="text-center text-slate-500 dark:text-gray-400 text-xs">
                  Carregando...
                </div>
              )}
              {!loadingHistory && history.length === 0 && (
                <div className="text-center text-slate-500 dark:text-gray-400 text-[13px]">
                  Nenhum histórico registrado.
                </div>
              )}
              {history.map((h: HistoryEntry) => (
                <div
                  key={h.id}
                  className="flex gap-2.5 pb-3 border-b border-dashed border-slate-200 dark:border-gray-700"
                >
                  <div className="mt-0.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1">
                    <div className="text-[13px] text-slate-900 dark:text-gray-50">
                      <span className="font-semibold">
                        {h.user?.name || "Sistema"}
                      </span>{" "}
                      {h.field === "anexo" ? (
                        <>
                          {h.old_value && !h.new_value ? (
                            <>removeu anexo <b>{h.old_value}</b></>
                          ) : !h.old_value && h.new_value ? (
                            <>anexou documento <b>{h.new_value}</b></>
                          ) : (
                            <>alterou <b>anexo</b></>
                          )}
                        </>
                      ) : (
                        <>alterou <b>{h.field}</b></>
                      )}
                    </div>
                    {h.field !== "anexo" && (
                      <div className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                        <span className="line-through opacity-70">
                          {h.old_value || "(vazio)"}
                        </span>
                        {" \u279D "}
                        <span className="text-primary font-semibold">
                          {h.new_value || "(vazio)"}
                        </span>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-1">
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Bar Footer */}
        {tab === "dados" && ["Admin", "Gestor", "Liderado", "Gerente", "Coordenador", "Coordenador de Polo", "Coordenador de Setores"].includes(
          user.role?.name || "",
        ) && (
          <div className="px-8 py-6 border-t border-slate-100 dark:border-gray-800/50 flex gap-3 justify-end flex-wrap items-center shrink-0 bg-slate-50/30 dark:bg-gray-900/30">
            {(form.subtasks || []).length > 0 ? (
              <div className="flex-1 text-[13px] text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-900/20 px-5 py-3 rounded-2xl flex items-center gap-2.5 border border-amber-200/50 dark:border-amber-900/40">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                </div>
                <span>
                  O status desta tarefa é gerenciado automaticamente pelas suas subtarefas.
                </span>
              </div>
            ) : (
              <>
                {t.status === "A Fazer" && (
                  <button
                    onClick={() => {
                      onUpdate(t.id, "update_status", {
                        status: "Em Andamento",
                      });
                      onClose();
                    }}
                    className="flex-1 md:flex-none justify-center flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white border-none rounded-xl text-[13px] font-bold cursor-pointer transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-emerald-600/20"
                  >
                    <Play size={16} fill="currentColor" /> Iniciar
                  </button>
                )}
                {t.status === "Em Andamento" && (
                  <button
                    onClick={() => {
                      onUpdate(t.id, "update_status", { status: "Pausado" });
                      onClose();
                    }}
                    className="flex-1 md:flex-none justify-center flex items-center gap-2 px-6 py-3 bg-amber-500 text-white border-none rounded-xl text-[13px] font-bold cursor-pointer transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-amber-500/20"
                  >
                    <Pause size={16} fill="currentColor" /> Pausar
                  </button>
                )}
                {t.status === "Pausado" && (
                  <button
                    onClick={() => {
                      onUpdate(t.id, "update_status", {
                        status: "Em Andamento",
                      });
                      onClose();
                    }}
                    className="flex-1 md:flex-none justify-center flex items-center gap-2 px-6 py-3 bg-primary text-white border-none rounded-xl text-[13px] font-bold cursor-pointer transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20"
                  >
                    <Play size={16} fill="currentColor" /> Retomar
                  </button>
                )}
                {["Em Andamento", "Pausado"].includes(t.status) && (
                  <button
                    onClick={() => {
                      onUpdate(t.id, "update_status", { status: "Concluído" });
                      onClose();
                    }}
                    className="flex-1 md:flex-none justify-center flex items-center gap-2 px-6 py-3 bg-emerald-700 text-white border-none rounded-xl text-[13px] font-bold cursor-pointer transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-emerald-700/20"
                  >
                    <CheckCircle size={16} /> Concluir
                  </button>
                )}
                {["Admin", "Gerente"].includes(user.role?.name || "") && (
                  <button
                    onClick={() => setShowResetTaskModal(true)}
                    className="flex-1 md:flex-none justify-center flex items-center gap-2 px-6 py-3 bg-red-600 dark:bg-red-700 text-white border-none rounded-xl text-[13px] font-bold cursor-pointer transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-red-600/20"
                  >
                    <RotateCcw size={16} /> Reset
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
    
    {isTeamModalOpen && (
      <TeamSelectionModal
        T={T}
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onSave={(selectedIds) => setForm(prev => ({ ...prev, coworkers: selectedIds }))}
        users={users}
        sectors={sectors}
        initialSelectedIds={form.coworkers}
        mainResponsibleId={form.responsible_id ? Number(form.responsible_id) : undefined}
      />
    )}

    {/* Gerenciar Cronologia Modal */}
    {showTimingModal && (
      <div
        onClick={() => setShowTimingModal(false)}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[520px] bg-white dark:bg-gray-800 rounded-[16px] p-5 flex flex-col max-h-[85vh] border border-slate-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              <h3 className="text-[16px] font-bold text-slate-900 dark:text-gray-50 m-0">
                Gerenciar Cronologia
              </h3>
            </div>
            <button
              onClick={() => setShowTimingModal(false)}
              className="bg-slate-100 dark:bg-gray-700 border-none rounded-lg p-1.5 cursor-pointer"
            >
              <X size={16} className="text-slate-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-5 mb-5 pr-1">
            {/* Start/End Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                  Início Real
                </label>
                <input
                  type="datetime-local"
                  value={formatDatetimeLocal(editTiming.started_at)}
                  onChange={(e) => setEditTiming(prev => ({ ...prev, started_at: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 text-slate-900 dark:text-gray-50 text-[13px]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                  Conclusão Real
                </label>
                <input
                  type="datetime-local"
                  value={formatDatetimeLocal(editTiming.completed_at)}
                  onChange={(e) => setEditTiming(prev => ({ ...prev, completed_at: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 text-slate-900 dark:text-gray-50 text-[13px]"
                />
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-gray-700" />

            {/* Pauses Section */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Pausas Registradas ({editTiming.pauses.length})</span>
                <button
                  onClick={() => setEditTiming(prev => ({ ...prev, pauses: [...prev.pauses, { started_at: "", ended_at: "" }] }))}
                  className="text-[10px] font-bold text-primary hover:underline bg-transparent border-none cursor-pointer"
                >
                  + ADICIONAR PAUSA
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                {editTiming.pauses.length === 0 && (
                  <div className="text-center text-slate-400 dark:text-gray-500 text-[12px] py-4 bg-slate-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-slate-200 dark:border-gray-700">
                    Nenhuma pausa registrada.
                  </div>
                )}
                {editTiming.pauses.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-end gap-2 p-3 bg-slate-50 dark:bg-gray-900/80 rounded-[12px] border border-slate-200 dark:border-gray-700"
                  >
                    <div className="flex-1">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-gray-400 mb-1 uppercase">
                        Início
                      </div>
                      <input
                        type="datetime-local"
                        value={formatDatetimeLocal(p.started_at)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditTiming((prev) => ({
                            ...prev,
                            pauses: prev.pauses.map((pp, i) =>
                              i === idx
                                ? { ...pp, started_at: val ? new Date(val).toISOString() : "" }
                                : pp,
                            ),
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-gray-50 text-[12px]"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-gray-400 mb-1 uppercase">
                        Fim
                      </div>
                      <input
                        type="datetime-local"
                        value={formatDatetimeLocal(p.ended_at)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditTiming((prev) => ({
                            ...prev,
                            pauses: prev.pauses.map((pp, i) =>
                              i === idx
                                ? { ...pp, ended_at: val ? new Date(val).toISOString() : "" }
                                : pp,
                            ),
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-gray-50 text-[12px]"
                      />
                    </div>
                    <button
                      onClick={() =>
                        setEditTiming((prev) => ({
                          ...prev,
                          pauses: prev.pauses.filter((_, i) => i !== idx),
                        }))
                      }
                      className="p-1.5 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shrink-0 mb-0.5"
                    >
                      <X size={14} className="text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowTimingModal(false)}
              className="flex-1 p-2.5 bg-transparent text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-gray-700 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveTiming}
              disabled={savingTiming}
              className="flex-2 p-2.5 bg-amber-500 text-white border-none rounded-lg text-[13px] font-bold cursor-pointer disabled:opacity-60 shadow-lg shadow-amber-500/20"
            >
              {savingTiming ? "Salvando..." : "Salvar Cronologia"}
            </button>
          </div>
        </div>
      </div>
    )}

    {showResetTaskModal && (
      <div
        onClick={() => setShowResetTaskModal(false)}
        className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[400px] bg-white dark:bg-gray-800 rounded-[16px] p-5 flex flex-col border border-slate-200 dark:border-gray-700 shadow-2xl"
        >
          <div className="flex items-center gap-2 text-red-600 dark:text-red-500 mb-2">
            <RotateCcw size={20} />
            <h3 className="text-[16px] font-bold m-0">Resetar Status</h3>
          </div>
          <p className="text-[13px] text-slate-600 dark:text-gray-300 mb-4 leading-relaxed">
            Esta ação retornará a tarefa para <strong className="text-slate-900 dark:text-white">A Fazer</strong> e excluirá todos os registros de cronometria (Início, Fim e Pausas).
            <br/><br/>
            Digite sua senha para confirmar:
          </p>
          <input
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder="Sua senha"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 text-slate-900 dark:text-gray-50 text-[13px] mb-5 focus:border-red-500 outline-none"
          />
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowResetTaskModal(false);
                setResetPassword("");
              }}
              className="flex-1 p-2.5 bg-transparent text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-gray-700 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleResetTask}
              disabled={resettingTask || !resetPassword}
              className="flex-1 p-2.5 bg-red-600 hover:bg-red-700 text-white border-none rounded-lg text-[13px] font-bold cursor-pointer disabled:opacity-60 transition-colors"
            >
              {resettingTask ? "Resetando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
