import { create } from "zustand";

interface UIState {
  dark: boolean;
  page: string;
  sidebarOpen: boolean;
  settingsTab: string;
  showNewTask: boolean;
  showMustChangePassword: boolean;
  showNotifPopover: boolean;
  showTemplateModal: boolean;

  tasksTab: string;
  setDark: (dark: boolean) => void;
  toggleDark: () => void;
  setPage: (page: string) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSettingsTab: (tab: string) => void;
  setTasksTab: (tab: string) => void;
  setShowNewTask: (show: boolean) => void;
  setShowMustChangePassword: (show: boolean) => void;
  setShowNotifPopover: (show: boolean) => void;
  toggleNotifPopover: () => void;
  setShowTemplateModal: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  dark: false,
  page: "dashboard",
  sidebarOpen: true,
  settingsTab: "users",
  showNewTask: false,
  showMustChangePassword: false,
  showNotifPopover: false,
  showTemplateModal: false,

  tasksTab: "kanban",
  setDark: (dark) => set({ dark }),
  toggleDark: () => set((s) => ({ dark: !s.dark })),
  setPage: (page) => set({ page }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSettingsTab: (settingsTab) => set({ settingsTab }),
  setTasksTab: (tasksTab) => set({ tasksTab }),
  setShowNewTask: (showNewTask) => set({ showNewTask }),
  setShowMustChangePassword: (showMustChangePassword) =>
    set({ showMustChangePassword }),
  setShowNotifPopover: (showNotifPopover) => set({ showNotifPopover }),
  toggleNotifPopover: () =>
    set((s) => ({ showNotifPopover: !s.showNotifPopover })),
  setShowTemplateModal: (showTemplateModal) => set({ showTemplateModal }),
}));
