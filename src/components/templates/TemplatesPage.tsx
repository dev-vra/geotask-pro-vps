"use client";

import { Plus, ChevronRight, Edit, Trash2, FileText } from "lucide-react";
import { getTaskState } from "@/lib/helpers";

function TemplatesPage({
  active,
  setActive,
  templates = [],
  onCreate,
  onEdit,
  onDelete,
}: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="m-0 text-[22px] font-bold text-slate-900 dark:text-gray-50">
            Templates de Tarefas
          </h1>
          <p className="mt-1 mb-0 text-[13px] text-slate-500 dark:text-gray-400">
            Modelos prontos para criação rápida
          </p>
        </div>
      </div>
      <div className="grid grid-cols-[280px_1fr] gap-4">
        <div className="flex flex-col gap-2">
          <button
            onClick={onCreate}
            className="p-2.5 bg-primary text-white border-none rounded-[10px] text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 mb-2"
          >
            <Plus size={16} /> Novo Template
          </button>
          {templates.map((tpl: any) => (
            <button
              key={tpl.id}
              onClick={() => setActive(active?.id === tpl.id ? null : tpl)}
              className={`bg-white dark:bg-gray-800 rounded-xl p-3.5 text-left cursor-pointer border ${
                active?.id === tpl.id
                  ? "border-primary"
                  : "border-slate-200 dark:border-gray-700"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50 mb-1">
                    {tpl.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-gray-400">
                    {typeof tpl.sector === "object"
                      ? tpl.sector?.name
                      : tpl.sector}{" "}
                    · {tpl.tasks?.length || 0} tarefas
                  </div>
                </div>
                <ChevronRight
                  size={14}
                  className={
                    active?.id === tpl.id
                      ? "text-primary"
                      : "text-slate-500 dark:text-gray-400"
                  }
                />
              </div>
            </button>
          ))}
        </div>
        {active ? (
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[14px] p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 text-base font-bold text-slate-900 dark:text-gray-50">
                {active.name}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(active)}
                  className="bg-slate-100 dark:bg-gray-700 border-none rounded-md p-1.5 cursor-pointer flex items-center gap-1"
                >
                  <Edit size={14} className="text-slate-500 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => onDelete(active.id)}
                  className="bg-red-50 border-none rounded-md p-1.5 cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            </div>
            <div className="mb-4">
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
                {typeof active.sector === "object"
                  ? active.sector.name
                  : active.sector}
              </span>
            </div>
            {active.tasks.map((task: any, ti: number) => (
              <div
                key={task.id}
                className="bg-slate-100 dark:bg-gray-900 rounded-[10px] p-3.5 mb-2.5"
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">
                    {ti + 1}
                  </div>
                  <span className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                    {task.title}
                  </span>
                  {getTaskState(task) && (
                    <div
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded ml-auto whitespace-nowrap"
                      style={{
                        background: getTaskState(task)!.color + "22",
                        color: getTaskState(task)!.color,
                      }}
                    >
                      {getTaskState(task)!.label}
                    </div>
                  )}
                </div>
                {task.subtasks.map((st: any, si: number) => (
                  <div
                    key={si}
                    className="flex items-center gap-[7px] text-xs text-slate-500 dark:text-gray-400 ml-8 mb-1"
                  >
                    <div className="w-3.5 h-3.5 rounded-[3px] border border-slate-200 dark:border-gray-700 shrink-0" />
                    {st.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[14px] flex flex-col items-center justify-center p-10">
            <FileText size={40} className="text-slate-500 dark:text-gray-400 mb-3" />
            <div className="text-sm font-semibold text-slate-900 dark:text-gray-50 mb-1">
              Selecione um template
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TemplatesPage;
