"use client";

import { LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getRoleDisplayName } from "@/lib/permissions";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  user: any;
  sidebarOpen: boolean;
  page: string;
  navItems: NavItem[];
  unreadCount: number;
  setPage: (page: string) => void;
  onLogout: () => void;
  toggleSidebar?: () => void;
}

export function Sidebar({
  user, sidebarOpen, page, navItems, unreadCount, setPage, onLogout, toggleSidebar
}: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden modal-overlay" 
          onClick={toggleSidebar}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:sticky md:top-0 md:h-screen flex flex-col shrink-0 border-r border-slate-200 bg-white dark:border-[var(--t-border)] dark:bg-[var(--t-card)] transition-all duration-300 ${
          sidebarOpen ? "translate-x-0 w-[240px] md:w-[220px]" : "-translate-x-full md:translate-x-0 md:w-[60px]"
        }`}
      >
      {/* Logo */}
      <div className={`flex h-[60px] items-center justify-center border-b border-slate-200 dark:border-[var(--t-border)] ${sidebarOpen ? "px-4" : "px-0"}`}>
        {sidebarOpen ? (
          <img src="/logo.png" alt="GeoTask" className="max-h-8 max-w-[160px] object-contain" />
        ) : (
          <img src="/logoicone.png" alt="G" className="h-8 w-8 object-contain" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {navItems.map(({ id, label, icon: Icon }, index) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => {
                setPage(id);
                if (window.innerWidth < 768 && toggleSidebar) {
                  toggleSidebar();
                }
              }}
              title={label}
              className={`relative flex w-full items-center gap-2.5 rounded-[10px] border-none text-[13px] transition-all duration-200 cursor-pointer animate-fade-in-up ${
                sidebarOpen ? "justify-start px-3 py-3 md:py-2.5" : "justify-center p-2.5"
              } ${
                active
                  ? "bg-primary/10 font-semibold text-primary dark:bg-primary/15 dark:text-primary-light"
                  : "bg-transparent font-medium text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              {/* Active indicator bar */}
              {active && (
                <span className="sidebar-active-indicator" />
              )}
              <div className="relative flex items-center justify-center">
                <Icon size={17} className={active ? "text-primary" : ""} />
                {id === "notifications" && unreadCount > 0 && (
                  <div
                    className={`absolute -top-2 -right-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold text-white animate-pulse-soft ${
                      active ? "border-2 border-primary/10" : "border-2 border-white dark:border-[var(--t-card)]"
                    }`}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </div>
                )}
              </div>
              {sidebarOpen && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-200 p-2.5 dark:border-[var(--t-border)]">
        {sidebarOpen ? (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary-hover text-xs font-bold text-white shadow-sm">
              {user.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-slate-900 dark:text-gray-50">
                {user.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-gray-400">
                {user.role?.name ? getRoleDisplayName(user.role.name) : "Sem cargo"}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="cursor-pointer border-none bg-transparent p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-colors duration-150"
              title="Sair"
            >
              <LogOut size={14} className="text-slate-500 dark:text-gray-400" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary-hover text-[11px] font-bold text-white shadow-sm">
              {user.avatar}
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}

export default Sidebar;
