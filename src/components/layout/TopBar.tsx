"use client";

import {
  AlignLeft,
  Bell,
  Calendar,
  Layers,
  List,
  Moon,
  Share2,
  Sun,
} from "lucide-react";

interface TopBarProps {
  dark: boolean;
  toggleDark: () => void;
  toggleSidebar: () => void;
  notifications: any[];
  unreadCount: number;
  markRead: (id: number) => void;
  markAllRead: () => void;
  showNotifPopover: boolean;
  toggleNotifPopover: () => void;
  setShowNotifPopover: (v: boolean) => void;
  tasks: any[];
  setSelectedTask: (t: any) => void;
  setPage: (p: string) => void;
  activeTab?: string;
  setActiveTab?: (t: string) => void;
  isTasksPage?: boolean;
}

export function TopBar({
  dark,
  toggleDark,
  toggleSidebar,
  notifications,
  unreadCount,
  markRead,
  markAllRead,
  showNotifPopover,
  toggleNotifPopover,
  setShowNotifPopover,
  tasks,
  setSelectedTask,
  setPage,
  activeTab,
  setActiveTab,
  isTasksPage,
}: TopBarProps) {
  return (
    <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white/80 backdrop-blur-md px-5 dark:border-(--t-border) dark:bg-(--t-card)/80">
      <button
        onClick={toggleSidebar}
        className="flex cursor-pointer rounded-lg border-none bg-slate-100 p-1.5 dark:bg-white/5 transition-colors duration-150 hover:bg-slate-200 dark:hover:bg-white/10"
      >
        <AlignLeft size={16} className="text-slate-500 dark:text-gray-400" />
      </button>

      {isTasksPage && setActiveTab && activeTab && (
        <div className="ml-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: "kanban", label: "Quadro", icon: Layers },
            { id: "list", label: "Tabela", icon: List },
            { id: "cronograma", label: "Cronograma", icon: Calendar },
            { id: "mindmap", label: "Mapa de Tarefas", icon: Share2 },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3 h-9 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                    : "bg-transparent border-transparent text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <Icon
                  size={14}
                  className={isActive ? "text-primary" : "text-slate-400"}
                />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1" />
      <button
        onClick={toggleDark}
        className="flex cursor-pointer rounded-lg border-none bg-slate-100 p-1.5 dark:bg-white/5 transition-all duration-200 hover:bg-slate-200 dark:hover:bg-white/10 hover:scale-105"
      >
        {dark ? (
          <Sun size={16} className="text-amber-500" />
        ) : (
          <Moon size={16} className="text-slate-500" />
        )}
      </button>

      {/* Notification popover */}
      <div className="relative">
        <button
          onClick={toggleNotifPopover}
          className="relative flex cursor-pointer rounded-lg border-none bg-slate-100 p-1.5 dark:bg-white/5 transition-colors duration-150 hover:bg-slate-200 dark:hover:bg-white/10"
        >
          <Bell size={16} className="text-slate-500 dark:text-gray-400" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white animate-pulse-soft">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {showNotifPopover && (
          <div className="absolute top-10 right-0 z-[1000] w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:border-[var(--t-border)] dark:bg-[var(--t-card)] animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200 px-3.5 py-3 dark:border-[var(--t-border)]">
              <span className="text-[13px] font-bold text-slate-900 dark:text-gray-50 font-display">
                Notificações {unreadCount > 0 && `(${unreadCount} novas)`}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="cursor-pointer border-none bg-transparent text-[11px] font-semibold text-primary hover:text-primary-hover transition-colors"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-[13px] text-slate-500 dark:text-gray-400">
                  Nenhuma notificação
                </div>
              ) : (
                notifications.slice(0, 20).map((n: any, idx: number) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.read) markRead(n.id);
                      if (n.task_id) {
                        const t = tasks.find((tk: any) => tk.id === n.task_id);
                        if (t) setSelectedTask(t);
                      }
                      setShowNotifPopover(false);
                    }}
                    className={`flex cursor-pointer items-start gap-2.5 border-b border-slate-100 px-3.5 py-2.5 transition-colors duration-150 dark:border-[var(--t-border)]/50 animate-fade-in-up ${
                      n.read
                        ? "bg-transparent hover:bg-slate-50 dark:hover:bg-white/3"
                        : "bg-primary/5 dark:bg-primary/8 hover:bg-primary/8 dark:hover:bg-primary/12"
                    }`}
                    style={{ animationDelay: `${idx * 0.03}s` }}
                  >
                    <div
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full transition-colors ${
                        n.read ? "bg-slate-200 dark:bg-gray-700" : "bg-primary"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 dark:text-gray-50">
                        {n.title}
                      </div>
                      {n.message && (
                        <div className="truncate text-[11px] text-slate-500 dark:text-gray-400">
                          {n.message}
                        </div>
                      )}
                      <div className="mt-0.5 text-[10px] text-slate-400 dark:text-gray-500">
                        {new Date(n.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  setPage("notifications");
                  setShowNotifPopover(false);
                }}
                className="w-full cursor-pointer border-0 border-t border-solid border-slate-200 bg-slate-50 py-2.5 text-center text-xs font-semibold text-primary dark:border-[var(--t-border)] dark:bg-[var(--t-col)] transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Ver todas
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default TopBar;
