"use client";

import { AppPermissions, getPermissions, getRoleDisplayName } from "@/lib/permissions";
import {
  Bell,
  Calendar,
  ClipboardList,
  FileText,
  Layers,
  LayoutDashboard,
  Settings,
  List,
  Trophy,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { DateRange } from "react-day-picker";


import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import {
  DashboardSkeleton,
  KanbanSkeleton,
  PageLoader,
  TableSkeleton,
} from "@/components/skeletons";
import { useLookups } from "@/hooks/useLookups";
import { useNotifications } from "@/hooks/useNotifications";
import { useTasks } from "@/hooks/useTasks";
import { useTeams } from "@/hooks/useTeams";
import { useTemplates } from "@/hooks/useTemplates";
import { useUsers } from "@/hooks/useUsers";
import { getTheme } from "@/lib/helpers";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { authFetch } from "@/lib/authFetch";

import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { SettingsPage } from "./components/SettingsPage";
import TasksHub from "@/components/tasks/TasksHub";

// ── Dynamic imports with contextual skeletons ────────────────────────
const DashboardPage = dynamic(
  () => import("@/components/dashboard/DashboardPage"),
  { loading: () => <DashboardSkeleton /> },
);
const KanbanPage = dynamic(() => import("@/components/kanban/KanbanPage"), {
  loading: () => <KanbanSkeleton />,
});
const ListPage = dynamic(() => import("@/components/list/ListPage"), {
  loading: () => <TableSkeleton />,
});
const MindMapPage = dynamic(() => import("@/components/mindmap/MindMapPage"), {
  loading: () => <PageLoader />,
});
const CronogramaPage = dynamic(
  () => import("@/components/cronograma/CronogramaPage"),
  { loading: () => <TableSkeleton /> },
);
const TemplatesPage = dynamic(
  () => import("@/components/templates/TemplatesPage"),
  { loading: () => <TableSkeleton rows={4} cols={3} /> },
);
const NotificationsPage = dynamic(
  () => import("@/components/notifications/NotificationsPage"),
  { loading: () => <PageLoader /> },
);
const ActivityLogPage = dynamic(
  () => import("@/components/activitylog/ActivityLogPage"),
  { loading: () => <TableSkeleton rows={6} cols={4} /> },
);
const TemplateModal = dynamic(
  () => import("@/components/templates/TemplateModal"),
);
const TaskDetailModal = dynamic(
  () => import("@/components/tasks/TaskDetailModal"),
);
const NewTaskModal = dynamic(() => import("@/components/tasks/NewTaskModal"));
const GamingPage = dynamic(() => import("@/components/gaming/GamingPage"), {
  loading: () => <PageLoader />,
});

// ── MAIN APP ──────────────────────────────────────────────────────────
export default function GeoTask() {
  const router = useRouter();

  // ── Zustand stores ──────────────────────────────────────────────────
  const {
    user,
    loading: authLoading,
    setUser,
    setLoading,
    logout,
    clearMustChangePassword,
  } = useAuthStore();
  const {
    dark,
    page,
    sidebarOpen,
    settingsTab,
    showNewTask,
    showMustChangePassword,
    showNotifPopover,
    showTemplateModal,
    toggleDark,
    setPage,
    toggleSidebar,
    setSettingsTab,
    setShowNewTask,
    setShowMustChangePassword,
    setShowNotifPopover,
    toggleNotifPopover,
    setShowTemplateModal,
    tasksTab,
    setTasksTab,
  } = useUIStore();
  
  // ── Local state ─────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [fCurrentState, setFCurrentState] = useState("");
  
  // ── Unified Filter States (Persistent across Hub Tabs) ─────────────
  const [fSearch, setFSearch] = useState("");
  const [fSector, setFSector] = useState<string[]>([]);
  const [fContract, setFContract] = useState("");
  const [fCity, setFCity] = useState("");
  const [fNeighbor, setFNeighbor] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fType, setFType] = useState("");
  const [fResponsible, setFResponsible] = useState("");
  const [fCreatedByMe, setFCreatedByMe] = useState(false);
  const [fTeam, setFTeam] = useState("");
  const [fDateFrom, setFDateFrom] = useState<DateRange | undefined>(undefined);
  const [fDateTo, setFDateTo] = useState<DateRange | undefined>(undefined);
  const [fShowSubtasks, setFShowSubtasks] = useState(true);
  const [fSortField, setFSortField] = useState("");
  const [fSortOrder, setFSortOrder] = useState("");

  // ── Dashboard Filter states (Isolated from TasksHub) ──
  const [dCreatedByMe, setDCreatedByMe] = useState(false);
  const [dTeam, setDTeam] = useState("");
  const [dCurrentState, setDCurrentState] = useState("");
  const [dDateFrom, setDDateFrom] = useState<DateRange | undefined>(undefined);
  const [dDateTo, setDDateTo] = useState<DateRange | undefined>(undefined);
  const [dSortField, setDSortField] = useState("");
  const [dSortOrder, setDSortOrder] = useState("");

  // ── SWR hooks (cached data fetching) ────────────────────────────────
  const { mutate: globalMutate } = useSWRConfig();
  const { 
    tasks: dashboardTasksRaw, 
    mutate: mutateDashboardTasks,
    optimisticUpdateTask: optimisticUpdateDashboard,
    data: dashboardDataRaw,
  } = useTasks({
    teamId: dTeam ? Number(dTeam) : undefined,
    createdById: dCreatedByMe ? user?.id : undefined,
    summary: true,
    sortField: dSortField || undefined,
    sortOrder: dSortOrder || undefined,
  });

  const { 
    tasks: tasksHubTasksRaw, 
    mutate: mutateTasksHub,
    optimisticUpdateTask: optimisticUpdateTasksHub,
    data: tasksHubDataRaw,
  } = useTasks({
    teamId: fTeam ? Number(fTeam) : undefined,
    createdById: fCreatedByMe ? user?.id : undefined,
    search: fSearch,
    sortField: fSortField || undefined,
    sortOrder: fSortOrder || undefined,
  });
  const { users: dbUsers } = useUsers();
  const {
    contracts,
    sectors: dbSectors,
    citiesNeighborhoods,
    contractCitiesNeighborhoods,
    taskTypes,
  } = useLookups();
  const { templates, saveTemplate, deleteTemplate } = useTemplates(user?.id);
  const { teams } = useTeams();
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications(user?.id ?? null);

  // T is still needed by legacy components (Dashboard, Kanban, etc.)
  const T = getTheme(dark);


  // ── Sync dark class on <html> for Tailwind dark: variants ──────────
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // ── Session restore ─────────────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const saved = localStorage.getItem("geotask_user");
      if (!saved) {
        setLoading(false);
        router.push("/login");
        return;
      }
      try {
        const parsed = JSON.parse(saved);
        if (!parsed?.id) throw new Error("invalid");
        const res = await authFetch(`/api/users?id=${parsed.id}`);
        if (!res.ok) throw new Error("failed");
        const refreshedUser = await res.json();
        setUser(refreshedUser);
        localStorage.setItem("geotask_user", JSON.stringify(refreshedUser));
        if (refreshedUser?.role?.name === "Liderado") setPage("tasks");
        setLoading(false);
      } catch {
        localStorage.removeItem("geotask_user");
        setUser(null);
        router.push("/login");
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (user?.must_change_password) setShowMustChangePassword(true);
  }, [user]);

  // ── Real-time Sync (SSE) ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const eventSource = new EventSource(`/api/events?userId=${user.id}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Real-time event received:", data);

        if (data.type === "TASK_CREATED" || data.type === "TASK_UPDATED" || data.type === "TASK_DELETED") {
          mutateDashboardTasks();
          mutateTasksHub();
          globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/dashboard/stats'));
        }

        if (data.type === "NOTIFICATIONS_UPDATED" || data.type === "TASK_CREATED") {
          globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/notifications'));
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error (reconnecting...)", eventSource.readyState, err);
    };

    return () => eventSource.close();
  }, [user, mutateDashboardTasks, mutateTasksHub, globalMutate]);

  // ── Task actions ────────────────────────────────────────────────────
  const handleCreateTask = async (newTask: any) => {
    // Optimistic UI for creation
    const tempId = Date.now() * -1; // Temporary negative ID
    const optimisticTask = { 
      ...newTask, 
      id: tempId, 
      created_at: new Date().toISOString(),
      status: newTask.status || "A Fazer",
      created_by_id: user?.id,
      created_by: user,
    };

    try {
      setShowNewTask(false);

      const updateFn = async () => {
        const resp = await authFetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...newTask, created_by: user?.id }),
        });
        if (!resp.ok) throw new Error("Erro ao criar tarefa");
        return resp.json();
      };

      // We can't use optimisticUpdateTask easily for NEW items since they don't exist yet, 
      // but we can manually mutate the cache
      mutateTasksHub(updateFn(), {
        optimisticData: Array.isArray(tasksHubDataRaw) 
          ? [optimisticTask, ...(tasksHubDataRaw as any[])] 
          : { ...tasksHubDataRaw, data: [optimisticTask, ...((tasksHubDataRaw as any)?.data || [])] },
        rollbackOnError: true,
        populateCache: false, // Don't let the API response override the lists
        revalidate: true,
      });
      
      mutateDashboardTasks(); // Soft refresh for dashboard
    } catch (err) {
      console.error(err);
      alert("Erro ao criar tarefa");
    }
  };

  const handleUpdateTask = async (
    id: number,
    action: string,
    data: any = {},
  ) => {
    try {
      if (action === "refresh") {
        await Promise.all([mutateDashboardTasks(), mutateTasksHub()]);
        return;
      }

      const updateFn = async () => {
        const resp = await authFetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action, user_id: user?.id, ...data }),
        });
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || "Erro ao atualizar");
        }
        return resp.json();
      };

      if (action === "update_status" || action === "update_fields") {
        const partial = action === "update_status" ? { status: data.status } : data;
        
        // Apply to both hooks
        optimisticUpdateTasksHub(id, partial, updateFn);
        optimisticUpdateDashboard(id, partial, () => Promise.resolve());
        
        if (action === "update_status") {
          setSelectedTask(null);
        }
      } else {
        const resp = await updateFn();
        if (resp) {
          await Promise.all([mutateDashboardTasks(), mutateTasksHub()]);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao atualizar tarefa");
    }
  };

  const handleSaveTemplate = async (templateData: any) => {
    const success = await saveTemplate(templateData, user?.id);
    if (success) {
      setShowTemplateModal(false);
      setEditingTemplate(null);
      if (templateData.id && activeTemplate?.id === templateData.id)
        setActiveTemplate(null);
    } else alert("Erro ao salvar template");
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este template?")) return;
    await deleteTemplate(id);
    if (activeTemplate?.id === id) setActiveTemplate(null);
  };

  // ── Permissions ─────────────────────────────────────────────────────
  const appPerms = getPermissions(user);

  const canAccess = (p: keyof AppPermissions["pages"] | "notifications") => {
    if (!user) return false;
    if (p === "notifications") return true;
    return appPerms.pages[p as keyof AppPermissions["pages"]];
  };

  const canCreate = appPerms.tasks.create;

  // ── Task visibility (role-based filtering) ──────────────────────────
  const userSectorId = user?.sector?.id || user?.sector_id;

  const filterTasksByRole = useCallback((tasksToFilter: any[]) => {
    if (!user) return [];

    const roleName = user?.role?.name || "";
    const uId = Number(user.id);
    const uSectorId = user?.sector?.id || user?.sector_id;

    // Roles that see ALL tasks
    const fullAccessRoles = ["Admin", "Gerente", "Socio", "Diretor", "GM"];
    if (fullAccessRoles.includes(roleName)) return tasksToFilter;

    let filtered = tasksToFilter.filter((t: any) => {
      const isCreator = Number(t.created_by_id) === uId;
      const isResponsible = Number(t.responsible_id) === uId || Number(t.responsible?.id) === uId;
      const isInCoworkers = (t.coworkers || []).some((cw: any) => Number(cw.id) === uId);

      if (roleName === "Coordenador de Polo") {
        if (isCreator || isResponsible || isInCoworkers) return true;
        // Inclusive team check: task belongs to team OR responsible belongs to team
        if (user.team_id && (
          (t.team_id && Number(t.team_id) === Number(user.team_id)) ||
          (t.responsible?.team_id && Number(t.responsible.team_id) === Number(user.team_id))
        )) return true;
        return false;
      }

      if (roleName === "Coordenador de Setores") {
        if (isCreator || isResponsible || isInCoworkers) return true;
        // Check primary sector + user_sectors
        const userSectorIds: number[] = [];
        if (uSectorId) userSectorIds.push(Number(uSectorId));
        const extraSectors = (user as any).user_sectors?.map((us: any) => Number(us.sector_id)) || [];
        userSectorIds.push(...extraSectors);
        const tSectorId = t.sector_id || t.sector?.id;
        if (tSectorId && userSectorIds.includes(Number(tSectorId))) return true;
        return false;
      }

      if (roleName === "Gestor") {
        if (isResponsible || isInCoworkers) return true;
        const tSectorId = t.sector_id || t.sector?.id;
        if (uSectorId && tSectorId && Number(tSectorId) === Number(uSectorId)) return true;
        return false;
      }

      // Liderado (default)
      return isResponsible || isInCoworkers;
    });

    return filtered;
  }, [user]);

  // ── Additional filters (createdByMe, team) applied on top of visibleTasks
  // ── Dashboard focused tasks
  const dashboardTasks = useMemo(() => {
    let result = filterTasksByRole(dashboardTasksRaw);
    if (dCurrentState) {
      result = result.filter((t: any) => t.latest_history?.state === dCurrentState);
    }
    return result;
  }, [dashboardTasksRaw, dCurrentState, filterTasksByRole]);

  // ── TasksHub focused tasks (Minhas Tarefas)
  const tasksHubTasks = useMemo(() => {
    let result = filterTasksByRole(tasksHubTasksRaw);
    // Additional filters for TasksHub (fSearch, fSector, fContract, etc.)
    // These are already applied in the useTasks hook for tasksHubTasksRaw
    // No need to re-filter here unless there are client-side only filters
    return result;
  }, [tasksHubTasksRaw, filterTasksByRole]);

  const visibleTaskTypes = useMemo(() => {
    if (appPerms.tasks.view_all_sectors) return taskTypes;
    return taskTypes.filter((t: any) => !t.sector_id || t.sector_id === userSectorId);
  }, [taskTypes, userSectorId, appPerms.tasks.view_all_sectors]);

  // ── Auth guard ──────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-900 dark:bg-gray-950 dark:text-gray-50">
        Carregando...
      </div>
    );
  }

  if (!user) return null;

  // ── Nav items (role-filtered) ───────────────────────────────────────
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "tasks", label: "Minhas Tarefas", icon: Layers },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "gaming", label: "Gaming e Metas", icon: Trophy },
    { id: "activity_log", label: "Log de Atividades", icon: ClipboardList },
    { id: "settings", label: "Configurações", icon: Settings },
  ].filter(({ id }) => {
    if (id === "tasks") return canAccess("kanban") || canAccess("list") || canAccess("cronograma") || canAccess("mindmap");
    return canAccess(id as any);
  });

  // ── RENDER ──────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans dark:bg-gray-950">
      <Sidebar
        user={user}
        sidebarOpen={sidebarOpen}
        page={page}
        navItems={navItems}
        unreadCount={unreadCount}
        setPage={setPage}
        toggleSidebar={toggleSidebar}
        onLogout={() => {
          logout();
          router.push("/login");
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-40 bg-slate-50/80 dark:bg-gray-950/80 backdrop-blur-md">
          <TopBar
            dark={dark}
            toggleDark={toggleDark}
            toggleSidebar={toggleSidebar}
            notifications={notifications}
            unreadCount={unreadCount}
            markRead={markRead}
            markAllRead={markAllRead}
            showNotifPopover={showNotifPopover}
            toggleNotifPopover={toggleNotifPopover}
            setShowNotifPopover={setShowNotifPopover}
            tasks={tasksHubTasksRaw} // Use the raw tasks for notifications popover
            setSelectedTask={async (t: any) => {
              if (t.id && (!t.description || t.description === "")) {
                const res = await authFetch(`/api/tasks?id=${t.id}`);
                if (res.ok) {
                  const data = await res.json();
                  const full = Array.isArray(data) ? data[0] : (data.data ? data.data[0] : data);
                  if (full) setSelectedTask(full);
                  else setSelectedTask(t);
                } else {
                  setSelectedTask(t);
                }
              } else {
                setSelectedTask(t);
              }
            }}
            setPage={setPage}
            activeTab={tasksTab}
            setActiveTab={setTasksTab}
            isTasksPage={page === "tasks"}
          />
        </div>

        {/* ── PAGE CONTENT ──────────────────────────────────────────── */}
        <div className="p-2 md:p-3 pb-10">
          {page === "dashboard" && (
            <DashboardPage
              T={T}
              tasks={dashboardTasks}
              user={user}
              onSelect={setSelectedTask}
              users={dbUsers}
              contracts={contracts}
              citiesNeighborhoods={citiesNeighborhoods}
              sectors={dbSectors}
              taskTypes={visibleTaskTypes}
              canViewAllSectors={appPerms.tasks.view_all_sectors}
              createdByMe={dCreatedByMe}
              setCreatedByMe={setDCreatedByMe}
              team={dTeam}
              setTeam={setDTeam}
              teams={teams}
              currentState={dCurrentState}
              setCurrentState={setDCurrentState}
              sortField={dSortField}
              setSortField={setDSortField}
              sortOrder={dSortOrder}
              setSortOrder={setDSortOrder}
              onClearFilters={() => {
                setDCreatedByMe(false);
                setDTeam("");
                setDCurrentState("");
                setDDateFrom(undefined);
                setDDateTo(undefined);
                setDSortField("");
                setDSortOrder("");
              }}
            />
          )}

          {page === "tasks" && (
            <TasksHub
              T={T}
              activeTab={tasksTab}
              setActiveTab={setTasksTab}
              tasks={tasksHubTasks}
              user={user}
              onSelect={setSelectedTask}
              canCreate={canCreate}
              users={dbUsers}
              contracts={contracts}
              citiesNeighborhoods={citiesNeighborhoods}
              sectors={dbSectors}
              taskTypes={visibleTaskTypes}
              canViewAllSectors={appPerms.tasks.view_all_sectors}
              search={fSearch}
              setSearch={setFSearch}
              sector={fSector}
              setSector={setFSector}
              contract={fContract}
              setContract={setFContract}
              city={fCity}
              setCity={setFCity}
              neighbor={fNeighbor}
              setNeighbor={setFNeighbor}
              priority={fPriority}
              setPriority={setFPriority}
              type={fType}
              setType={setFType}
              responsible={fResponsible}
              setResponsible={setFResponsible}
              createdByMe={fCreatedByMe}
              setCreatedByMe={setFCreatedByMe}
              team={fTeam}
              setTeam={setFTeam}
              currentState={fCurrentState}
              setCurrentState={setFCurrentState}
              dateFrom={fDateFrom}
              setDateFrom={setFDateFrom}
              dateTo={fDateTo}
              setDateTo={setFDateTo}
              showSubtasks={fShowSubtasks}
              setShowSubtasks={setFShowSubtasks}
              sortField={fSortField}
              setSortField={setFSortField}
              sortOrder={fSortOrder}
              setSortOrder={setFSortOrder}
              onNewTask={() => setShowNewTask(true)}
              onUpdate={handleUpdateTask}
              onClearFilters={() => {
                setFSearch("");
                setFSector([]);
                setFContract("");
                setFCity("");
                setFNeighbor("");
                setFPriority("");
                setFType("");
                setFResponsible("");
                setFCreatedByMe(false);
                setFShowSubtasks(true);
                setFTeam("");
                setFDateFrom(undefined);
                setFDateTo(undefined);
                setFCurrentState("");
                setFSortField("");
                setFSortOrder("");
              }}
            />
          )}

          {page === "templates" && canAccess("templates") && (
            <TemplatesPage
              active={activeTemplate}
              setActive={setActiveTemplate}
              templates={templates}
              onCreate={() => {
                setEditingTemplate(null);
                setShowTemplateModal(true);
              }}
              onEdit={(tpl: any) => {
                setEditingTemplate(tpl);
                setShowTemplateModal(true);
              }}
              onDelete={handleDeleteTemplate}
            />
          )}

          {page === "settings" && canAccess("settings") && (
            <SettingsPage
              T={T}
              tab={settingsTab}
              setTab={setSettingsTab}
              currentUser={user as any}
            />
          )}

          {page === "notifications" && (
            <NotificationsPage
              dark={dark}
              notifications={notifications}
              tasks={dashboardTasks}
              unreadCount={unreadCount}
              markRead={markRead}
              markAllRead={markAllRead}
              setSelectedTask={async (t: any) => {
                if (t.id && (!t.description || t.description === "")) {
                  const res = await authFetch(`/api/tasks?id=${t.id}`);
                  if (res.ok) {
                    const data = await res.json();
                    const full = Array.isArray(data) ? data[0] : (data.data ? data.data[0] : data);
                    if (full) setSelectedTask(full);
                    else setSelectedTask(t);
                  } else {
                    setSelectedTask(t);
                  }
                } else {
                  setSelectedTask(t);
                }
              }}
            />
          )}

          {page === "activity_log" && canAccess("activity_log") && (
            <ActivityLogPage T={T} user={user} users={dbUsers} />
          )}

          {page === "gaming" && canAccess("gaming") && (
            <GamingPage T={T} user={user} users={dbUsers} sectors={dbSectors} />
          )}
        </div>
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────── */}
      {selectedTask && (
        <TaskDetailModal
          T={T}
          task={selectedTask}
          user={user}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          users={dbUsers}
          contracts={contracts}
          citiesNeighborhoods={citiesNeighborhoods}
          contractCitiesNeighborhoods={contractCitiesNeighborhoods}
          tasks={tasksHubTasks}
          setSelectedTask={setSelectedTask}
          sectors={dbSectors}
          taskTypes={visibleTaskTypes}
          canViewAllSectors={appPerms.tasks.view_all_sectors}
        />
      )}

      {showNewTask && (
        <NewTaskModal
          T={T}
          onClose={() => setShowNewTask(false)}
          onSave={handleCreateTask}
          user={user}
          users={dbUsers}
          contracts={contracts}
          citiesNeighborhoods={citiesNeighborhoods}
          contractCitiesNeighborhoods={contractCitiesNeighborhoods}
          templates={templates}
          sectors={dbSectors}
          taskTypes={visibleTaskTypes}
        />
      )}

      {showMustChangePassword && user && (
        <ChangePasswordModal
          isOpen={showMustChangePassword}
          onClose={() => {
            setShowMustChangePassword(false);
            clearMustChangePassword();
          }}
          userId={user.id}
          userName={user.name}
          T={T}
          isAdmin={false}
          isMandatory={true}
        />
      )}

      {showTemplateModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
          onSave={handleSaveTemplate}
          sectors={dbSectors}
          users={dbUsers}
        />
      )}
    </div>
  );
}
