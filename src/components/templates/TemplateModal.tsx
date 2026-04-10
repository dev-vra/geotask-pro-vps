"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { getTaskState } from "@/lib/helpers";
import { FormField } from "@/components/ui/FormField";

function TemplateModal({
  template,
  onClose,
  onSave,
  sectors,
  users,
}: {
  template?: any;
  onClose: () => void;
  onSave: (t: any) => void;
  sectors: any[];
  users: any[];
}) {
  const [name, setName] = useState(template?.name || "");
  // tasks: [{ title, sector, subtasks: [{ title, sector }] }]
  const [tasks, setTasks] = useState<any[]>(
    template?.tasks?.length
      ? template.tasks.map((t: any) => ({
          title: t.title || "",
          sector: t.sector?.name || t.sector || "",
          subtasks: (t.subtasks || []).map((s: any) => ({
            title: typeof s === "string" ? s : s.title || "",
            sector: s.sector?.id || s.sector?.name || s.sector || "",
            responsible: s.responsible?.id || s.responsible?.name || s.responsible || "",
          })),
        }))
      : [{ title: "", sector: "", subtasks: [] }],
  );

  const handleAddTask = () =>
    setTasks([...tasks, { title: "", sector: "", subtasks: [] }]);

  const handleRemoveTask = (idx: number) =>
    setTasks(tasks.filter((_, i) => i !== idx));

  const handleTaskField = (idx: number, field: string, val: string) => {
    const next = [...tasks];
    next[idx] = { ...next[idx], [field]: val };
    setTasks(next);
  };

  const handleAddSubtask = (tIdx: number) => {
    const next = [...tasks];
    next[tIdx].subtasks = [
      ...(next[tIdx].subtasks || []),
      { title: "", sector: "", responsible: "" },
    ];
    setTasks(next);
  };

  const handleSubtaskField = (
    tIdx: number,
    sIdx: number,
    field: string,
    val: string,
  ) => {
    const next = [...tasks];
    const subs = [...next[tIdx].subtasks];
    subs[sIdx] = { ...subs[sIdx], [field]: val };
    next[tIdx].subtasks = subs;
    setTasks(next);
  };

  const handleRemoveSubtask = (tIdx: number, sIdx: number) => {
    const next = [...tasks];
    next[tIdx].subtasks = next[tIdx].subtasks.filter(
      (_: any, i: number) => i !== sIdx,
    );
    setTasks(next);
  };

  const handleSave = () => {
    if (!name.trim()) return alert("Nome do modelo é obrigatório");
    onSave({
      id: template?.id,
      name,
      sector:
        tasks[0]?.sector?.name ||
        tasks[0]?.sector ||
        (sectors && sectors.length > 0
          ? typeof (sectors[0] as any) === "object"
            ? (sectors[0] as any).name
            : sectors[0]
          : ""),
      tasks: tasks.filter((t) => t.title.trim()),
    });
  };

  const SectorSelect = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-2 py-1 rounded-md border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 text-[11px] outline-none min-w-[130px] cursor-pointer ${
        value
          ? "text-slate-900 dark:text-gray-50"
          : "text-slate-500 dark:text-gray-400"
      }`}
    >
      <option value="">Setor...</option>
      {sectors.map((s: any, i: number) => {
        const label = typeof s === "object" ? s.name || s.label : s;
        const value = typeof s === "object" ? s.id || s.value : s;
        const key =
          typeof s === "object"
            ? s.id || s.name || `sec-${i}`
            : `sec-${s}-${i}`;
        return (
          <option key={key} value={value}>
            {label}
          </option>
        );
      })}
    </select>
  );

  const UserSelect = ({
    value,
    onChange,
    sectorId,
  }: {
    value: string;
    onChange: (v: string) => void;
    sectorId?: string;
  }) => {
    const filteredUsers = users.filter((u: any) => {
      if (!sectorId) return true;
      const uSid = String(u.sector_id || u.sector?.id || "");
      const targetSid = String(sectorId);
      return uSid === targetSid;
    });

    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`px-2 py-1 rounded-md border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 text-[11px] outline-none min-w-[130px] cursor-pointer ${
          value
            ? "text-slate-900 dark:text-gray-50"
            : "text-slate-500 dark:text-gray-400"
        }`}
      >
        <option value="">Responsável...</option>
        {filteredUsers.map((u: any) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 font-[system-ui,sans-serif]">
      <div className="w-full max-w-[620px] bg-white dark:bg-gray-800 rounded-[20px] p-6 border border-slate-200 dark:border-gray-700 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between mb-5">
          <h2 className="m-0 text-lg font-bold text-slate-900 dark:text-gray-50">
            {template ? "Editar Template" : "Novo Template"}
          </h2>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer"
          >
            <X size={20} className="text-slate-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-1">
          {/* Nome */}
          <FormField label="NOME DO MODELO" req>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vistoria Padrão"
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50 text-sm box-border"
            />
          </FormField>

          {/* Estrutura de Tarefas */}
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-gray-400 mb-2.5 flex justify-between items-center">
              ESTRUTURA DE TAREFAS
              <button
                onClick={handleAddTask}
                className="text-[11px] text-primary bg-transparent border-none cursor-pointer font-semibold"
              >
                + Adicionar Tarefa
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {tasks.map((t: any, i: number) => (
                <div
                  key={i}
                  className="p-3.5 border border-slate-200 dark:border-gray-700 rounded-xl bg-slate-100 dark:bg-gray-900"
                >
                  {/* Task row */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-[22px] h-[22px] bg-primary text-white rounded-full text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <input
                      value={t.title}
                      onChange={(e) =>
                        handleTaskField(i, "title", e.target.value)
                      }
                      placeholder="Título da tarefa..."
                      className="flex-1 bg-transparent border-none text-[13px] font-semibold text-slate-900 dark:text-gray-50 outline-none"
                    />
                    {getTaskState(t) && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded ml-2"
                        style={{
                          background: getTaskState(t)!.color + "22",
                          color: getTaskState(t)!.color,
                        }}
                      >
                        {getTaskState(t)!.label}
                      </span>
                    )}
                    <SectorSelect
                      value={t.sector}
                      onChange={(v) => handleTaskField(i, "sector", v)}
                    />
                    <button
                      onClick={() => handleRemoveTask(i)}
                      className="bg-transparent border-none cursor-pointer p-0.5 shrink-0"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>

                  {/* Subtasks */}
                  <div className="pl-[30px]">
                    {t.subtasks?.map((st: any, k: number) => (
                      <div
                        key={k}
                        className="flex items-center gap-1.5 mb-1.5"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-gray-700 shrink-0" />
                        <input
                          value={st.title}
                          onChange={(e) =>
                            handleSubtaskField(i, k, "title", e.target.value)
                          }
                          placeholder="Título da subtarefa..."
                          className="flex-1 bg-transparent border-0 border-b border-slate-200 dark:border-gray-700 text-xs text-slate-500 dark:text-gray-400 outline-none py-0.5 px-0"
                        />
                        <SectorSelect
                          value={st.sector}
                          onChange={(v) =>
                            handleSubtaskField(i, k, "sector", v)
                          }
                        />
                        <UserSelect
                          value={st.responsible}
                          onChange={(v) =>
                            handleSubtaskField(i, k, "responsible", v)
                          }
                          sectorId={st.sector}
                        />
                        <button
                          onClick={() => handleRemoveSubtask(i, k)}
                          className="bg-transparent border-none cursor-pointer opacity-50 shrink-0"
                        >
                          <X size={12} className="text-slate-500 dark:text-gray-400" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddSubtask(i)}
                      className="text-[11px] text-slate-500 dark:text-gray-400 bg-transparent border-none cursor-pointer mt-1 flex items-center gap-1"
                    >
                      <Plus size={10} /> Adicionar Subtarefa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-transparent text-slate-500 dark:text-gray-400 border-none cursor-pointer font-semibold text-[13px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-primary text-white border-none rounded-lg cursor-pointer font-semibold text-[13px]"
          >
            Salvar Template
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplateModal;
