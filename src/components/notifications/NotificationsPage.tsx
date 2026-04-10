"use client";

import {
  Bell, Briefcase, CheckCircle, Clock, Eye, MessageSquare,
} from "lucide-react";

interface NotificationsPageProps {
  dark: boolean;
  notifications: any[];
  tasks: any[];
  unreadCount: number;
  markRead: (id: number) => void;
  markAllRead: () => void;
  setSelectedTask: (t: any) => void;
}

const ICON_MAP: Record<string, { icon: typeof Bell; colorClass: string }> = {
  mention: { icon: MessageSquare, colorClass: "text-blue-500" },
  task_assigned: { icon: Briefcase, colorClass: "text-amber-500" },
  task_completed: { icon: CheckCircle, colorClass: "text-emerald-500" },
  task_late: { icon: Clock, colorClass: "text-red-500" },
};

export function NotificationsPage({
  dark, notifications, tasks,
  markRead, markAllRead, setSelectedTask,
}: NotificationsPageProps) {
  return (
    <div className="flex-1 overflow-y-auto p-7">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900 dark:text-gray-50">
            <Bell size={24} className="text-primary" /> Central de Notificações
          </h2>
          <button
            onClick={markAllRead}
            className="cursor-pointer border-none bg-transparent text-[13px] font-semibold text-primary"
          >
            Marcar todas como lidas
          </button>
        </div>

        {/* Empty state */}
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-slate-500 dark:text-gray-400">
            Nenhuma notificação encontrada.
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((n: any) => {
              const iconDef = ICON_MAP[n.type];
              const IconComp = iconDef?.icon || Bell;
              const iconColorClass = iconDef?.colorClass || "text-slate-500 dark:text-gray-400";
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 border-b border-slate-200 p-4 dark:border-gray-700 ${
                    n.read
                      ? "bg-transparent"
                      : dark ? "bg-indigo-500/10" : "bg-blue-50"
                  }`}
                >
                  {/* Icon */}
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-gray-700">
                    <IconComp size={16} className={iconColorClass} />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className={`text-sm text-slate-900 dark:text-gray-50 ${n.read ? "font-normal" : "font-bold"}`}>
                      {n.title}
                    </div>
                    <div className="mb-1.5 text-[13px] text-slate-500 dark:text-gray-400">
                      {n.message}
                    </div>
                    <div className="text-[11px] text-slate-500/80 dark:text-gray-400/80">
                      {new Date(n.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>

                  {/* View button */}
                  {n.task_id && (
                    <button
                      onClick={() => {
                        markRead(n.id);
                        setSelectedTask({ id: n.task_id });
                      }}
                      className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-900 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-50"
                    >
                      <Eye size={14} /> Ver
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
