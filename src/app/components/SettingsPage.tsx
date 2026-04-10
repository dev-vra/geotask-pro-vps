"use client";

import {
  Briefcase,
  Building2,
  Edit,
  Lock,
  MapPin,
  Plus,
  Settings,
  Trash2,
  UserCheck,
  User as UserIcon,
  Users,
  Upload,
  Save,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { RoleModal } from "./RoleModal";
import { SectorModal } from "./SectorModal";
import { UserModal } from "./UserModal";
import { ImportUsersModal } from "./ImportUsersModal";
import { TeamModal } from "./TeamModal";
import { ManageTeamMembersModal } from "./ManageTeamMembersModal";
import { Search, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import ConfirmPasswordModal from "../../components/shared/ConfirmPasswordModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type PermissionLevel = "full" | "sector" | "view" | "none";

interface RolePermissions {
  [category: string]: {
    [item: string]: boolean;
  };
}

interface Role {
  id: number;
  name: string;
  permissions?: RolePermissions;
}

interface Sector {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  sector_id: number;
  role?: Role;
  sector?: Sector;
  active: boolean;
  avatar?: string;
  must_change_password?: boolean;
}

interface Contract {
  id: number;
  name: string;
}

interface TaskType {
  id: number;
  name: string;
  sector_id: number | null;
  Sector?: Sector;
}

interface City {
  id: number;
  name: string;
  _count?: {
    neighborhoods: number;
  };
}

interface Neighborhood {
  id: number;
  name: string;
  city_id: number;
  city?: City;
}

interface SettingsPageProps {
  T: any;
  tab: string;
  setTab: (t: string) => void;
  currentUser?: User;
}

import { getPermissions } from "@/lib/permissions";

// ─── Permission Groups ───────────────────────────────────────────────────────

const PERMISSION_GROUPS = [
  {
    category: "Acesso de Páginas",
    key: "pages",
    items: [
      { id: "dashboard", label: "Dashboard" },
      { id: "kanban", label: "Quadro de Tarefas" },
      { id: "cronograma", label: "Cronograma" },
      { id: "mindmap", label: "Mapa de Tarefas" },
      { id: "templates", label: "Templates" },
      { id: "settings", label: "Configurações" },
    ],
  },
  {
    category: "Ações de Tarefas",
    key: "tasks",
    items: [
      { id: "create", label: "Criar Nova Tarefa" },
      { id: "edit_all", label: "Editar Qualquer Campo" },
      { id: "edit_retroactive_dates", label: "Editar Datas Retroativas" },
      { id: "view_all_sectors", label: "Visualizar Todos os Setores" },
    ],
  },
  {
    category: "Administração",
    key: "settings",
    items: [
      { id: "manage_users", label: "Gerenciar Usuários" },
      { id: "manage_roles", label: "Gerenciar Cargos" },
      { id: "manage_locations", label: "Gerenciar Localidades" },
      { id: "manage_task_types", label: "Gerenciar Tipos de Tarefas" },
      { id: "manage_teams", label: "Gerenciar Equipes" },
      { id: "manage_user_sectors", label: "Gerenciar Setores de Usuários" },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsPage({
  T,
  tab,
  setTab,
  currentUser,
}: SettingsPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(false);
  const { mutate } = useSWRConfig();

  // Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
  const [passwordUserName, setPasswordUserName] = useState("");
  const [isAdminPasswordReset, setIsAdminPasswordReset] = useState(false);

  const [showUserModal, setShowUserModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);

  const [showSectorModal, setShowSectorModal] = useState(false);
  const [editingSector, setEditingSector] = useState<any | null>(null);

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any | null>(null);

  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [permanentDeleteUserId, setPermanentDeleteUserId] = useState<number | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [pendingPermissions, setPendingPermissions] = useState<{
    [roleId: number]: RolePermissions;
  }>({});
  const [searchPerms, setSearchPerms] = useState("");
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [managingTeam, setManagingTeam] = useState<Team | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  const isAdmin = currentUser?.role?.name === "Admin";
  const isManager = currentUser?.role?.name === "Gerente";
  const isCoordinator = currentUser?.role?.name === "Coordenador" || currentUser?.role?.name === "Coordenador de Polo" || currentUser?.role?.name === "Coordenador de Setores";
  const canManageLocations = isAdmin || isManager || isCoordinator;

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAdmin || canManageLocations) fetchData();
  }, [isAdmin, canManageLocations]);

  useEffect(() => {
    if (!isAdmin && !canManageLocations && tab !== "account") setTab("account");
  }, [isAdmin, canManageLocations, tab, setTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const proms: Promise<any>[] = [];
      if (isAdmin) {
        proms.push(authFetch("/api/users").then((r) => r.json()));
        proms.push(authFetch("/api/roles").then((r) => r.json()));
      }
      if (isAdmin || canManageLocations) {
        proms.push(authFetch("/api/sectors").then((r) => r.json()));
        proms.push(authFetch("/api/task-types").then((r) => r.json()));
        proms.push(authFetch("/api/contracts").then((r) => r.json()));
        proms.push(authFetch("/api/cities").then((r) => r.json()));
        proms.push(authFetch("/api/neighborhoods").then((r) => r.json()));
        proms.push(authFetch("/api/teams").then((r) => r.json()));
      }

      const results = await Promise.all(proms);
      let idx = 0;
      if (isAdmin) {
        setUsers(results[idx++]);
        setRoles(results[idx++]);
      }
      if (isAdmin || canManageLocations) {
        setSectors(results[idx++]);
        setTaskTypes(results[idx++]);
        setContracts(results[idx++]);
        setCities(results[idx++]);
        setNeighborhoods(results[idx++]);
        setTeams(results[idx++]);
      }
    } catch (error) {
      console.error("Failed to fetch settings data", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleReactivateUser = async (id: number) => {
    if (!confirm("Reativar este usuário? Ele voltará a acessar o sistema."))
      return;
    try {
      const res = await authFetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: true }),
      });
      if (res.ok) fetchData();
      else alert("Erro ao reativar usuário");
    } catch {
      alert("Erro ao reativar usuário");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (
      !confirm(
        "Tem certeza que deseja desativar este usuário? Ele não conseguirá mais acessar o sistema.",
      )
    )
      return;
    try {
      const res = await authFetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
      else alert("Erro ao desativar usuário");
    } catch {
      alert("Erro ao desativar usuário");
    }
  };

  const handlePermanentDeleteUser = async (password: string) => {
    if (!permanentDeleteUserId) return;
    setIsDeletingUser(true);
    try {
      const res = await authFetch(
        `/api/users?id=${permanentDeleteUserId}&admin_id=${currentUser?.id}&password=${encodeURIComponent(password)}&permanent=true`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setShowPermanentDeleteModal(false);
        setPermanentDeleteUserId(null);
        fetchData();
        mutate("/api/lookups");
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir usuário definitivamente.");
      }
    } catch {
      alert("Erro ao conectar ao servidor.");
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este cargo?")) return;
    try {
      const res = await authFetch(`/api/roles?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
      else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir cargo");
      }
    } catch {
      alert("Erro ao excluir cargo");
    }
  };

  const handleDeleteSector = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este setor?")) return;
    try {
      const res = await authFetch(`/api/sectors?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
      else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir setor");
      }
    } catch {
      alert("Erro ao excluir setor");
    }
  };

  const handleDeleteTeam = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este time?")) return;
    try {
      const res = await authFetch(`/api/teams?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
      else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir time");
      }
    } catch {
      alert("Erro ao excluir time");
    }
  };

  const handleAddContract = async () => {
    const name = prompt("Nome do novo contrato:");
    if (!name) return;
    try {
      const res = await authFetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        fetchData();
        mutate("/api/lookups");
      } else alert("Erro ao criar contrato");
    } catch {
      alert("Erro ao criar contrato");
    }
  };

  const handleEditContract = async (id: number, currentName: string) => {
    const newName = prompt("Editar nome do contrato:", currentName);
    if (!newName || newName === currentName) return;
    try {
      const res = await authFetch("/api/contracts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: newName }),
      });
      if (res.ok) {
        fetchData();
        mutate("/api/lookups");
      } else alert((await res.json()).error || "Erro ao editar contrato");
    } catch {
      alert("Erro ao editar contrato");
    }
  };

  const handleDeleteContract = async (id: number) => {
    if (!confirm("Excluir este contrato?")) return;
    try {
      const res = await authFetch(`/api/contracts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        mutate("/api/lookups");
      } else alert((await res.json()).error || "Erro ao excluir");
    } catch {
      alert("Erro ao excluir");
    }
  };

  const handleAddCity = async () => {
    const name = prompt("Nome da nova cidade:");
    if (!name) return;
    try {
      const res = await authFetch("/api/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        fetchData();
        mutate("/api/lookups");
      } else alert("Erro ao criar cidade");
    } catch {
      alert("Erro ao criar cidade");
    }
  };

  const handleEditCity = async (id: number, currentName: string) => {
    const newName = prompt("Editar nome da cidade:", currentName);
    if (!newName || newName === currentName) return;
    try {
      const res = await authFetch("/api/cities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: newName }),
      });
      if (res.ok) {
        fetchData();
        mutate("/api/lookups");
      } else alert((await res.json()).error || "Erro ao editar cidade");
    } catch {
      alert("Erro ao editar cidade");
    }
  };

  const handleDeleteCity = async (id: number) => {
    if (!confirm("Excluir esta cidade?")) return;
    try {
      const res = await authFetch(`/api/cities?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        mutate("/api/lookups");
      } else alert((await res.json()).error || "Erro ao excluir");
    } catch {
      alert("Erro ao excluir");
    }
  };

  const handleAddNeighborhood = async () => {
    if (cities.length === 0) return alert("Crie uma cidade primeiro");
    const name = prompt("Nome do novo bairro:");
    if (!name) return;
    const cityNames = cities.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
    const cityIdx = prompt(`Selecione a cidade (número):\n${cityNames}`);
    if (!cityIdx) return;
    const city = cities[Number(cityIdx) - 1];
    if (!city) return alert("Cidade inválida");

    try {
      const res = await authFetch("/api/neighborhoods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cityId: city.id }),
      });
      if (res.ok) {
        fetchData();
        mutate("/api/lookups");
      } else alert((await res.json()).error || "Erro ao criar bairro");
    } catch {
      alert("Erro ao criar bairro");
    }
  };

  const handleEditNeighborhood = async (id: number, currentName: string) => {
    const newName = prompt("Editar nome do bairro:", currentName);
    if (!newName || newName === currentName) return;
    try {
      const res = await authFetch("/api/neighborhoods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: newName }),
      });
      if (res.ok) {
        fetchData();
        mutate("/api/lookups");
      } else alert((await res.json()).error || "Erro ao editar bairro");
    } catch {
      alert("Erro ao editar bairro");
    }
  };

  const handleDeleteNeighborhood = async (id: number) => {
    if (!confirm("Excluir este bairro?")) return;
    try {
      const res = await authFetch(`/api/neighborhoods?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
        mutate("/api/lookups");
      } else alert((await res.json()).error || "Erro ao excluir");
    } catch {
      alert("Erro ao excluir");
    }
  };

  const handleAddTaskType = async () => {
    const name = prompt("Nome do novo tipo de tarefa:");
    if (!name) return;

    const sectorNames = [
      "0. Geral (Todos os Setores)",
      ...sectors.map((s, i) => `${i + 1}. ${s.name}`),
    ].join("\n");

    let sectorInput = prompt(
      `Para qual setor será este tipo de tarefa? (Digite o número)\n${sectorNames}`,
    );

    let sectorId: number | null = null;
    if (sectorInput && sectorInput !== "0") {
      const selectedIndex = parseInt(sectorInput, 10) - 1;
      if (
        !isNaN(selectedIndex) &&
        selectedIndex >= 0 &&
        selectedIndex < sectors.length
      ) {
        sectorId = sectors[selectedIndex].id;
      } else {
        return alert("Opção de setor inválida");
      }
    }

    try {
      const res = await authFetch("/api/task-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sector_id: sectorId }),
      });
      if (res.ok) {
        fetchData();
        mutate("/api/lookups");
      } else alert((await res.json()).error || "Erro ao criar tipo de tarefa");
    } catch {
      alert("Erro ao criar tipo de tarefa");
    }
  };

  const handleDeleteTaskType = async (id: number) => {
    if (!confirm("Excluir este Tipo de Tarefa?")) return;
    try {
      const res = await authFetch(`/api/task-types?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
        mutate("/api/lookups");
      } else alert((await res.json()).error || "Erro ao excluir");
    } catch {
      alert("Erro ao excluir");
    }
  };

  const handleTogglePermission = (
    roleId: number,
    groupKey: string,
    itemId: string,
  ) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    const currentPerms: any =
      pendingPermissions[roleId] || getPermissions({ role } as any);
    const newValue = !currentPerms[groupKey][itemId];

    const newRolePerms = {
      ...currentPerms,
      [groupKey]: {
        ...currentPerms[groupKey],
        [itemId]: newValue,
      },
    };

    setPendingPermissions((prev) => ({
      ...prev,
      [roleId]: newRolePerms,
    }));
  };

  const handleSavePermissions = async () => {
    const changedRoleIds = Object.keys(pendingPermissions).map(Number);
    if (changedRoleIds.length === 0) return;

    if (
      !confirm(
        `Deseja salvar as alterações de permissão para ${changedRoleIds.length} cargo(s)?`,
      )
    )
      return;

    setLoading(true);
    try {
      for (const roleId of changedRoleIds) {
        const res = await authFetch("/api/roles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: roleId, permissions: pendingPermissions[roleId] }),
        });
        if (!res.ok) throw new Error(`Falha ao salvar permissão para cargo ${roleId}`);
      }
      setPendingPermissions({});
      fetchData();
      alert("Permissões salvas com sucesso!");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Erro ao salvar permissões");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPermissions = (fromRoleId: number, toRoleId: number) => {
    const fromRole = roles.find((r) => r.id === fromRoleId);
    if (!fromRole) return;

    const fromPerms: any =
      pendingPermissions[fromRoleId] || getPermissions({ role: fromRole } as any);

    setPendingPermissions((prev) => ({
      ...prev,
      [toRoleId]: { ...fromPerms },
    }));
  };

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) =>
      prev.includes(groupKey)
        ? prev.filter((k) => k !== groupKey)
        : [...prev, groupKey]
    );
  };

  const filteredGroups = React.useMemo(() => {
    if (!searchPerms) return PERMISSION_GROUPS;
    return PERMISSION_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(searchPerms.toLowerCase())
      ),
    })).filter((group) => group.items.length > 0);
  }, [searchPerms]);

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const allTabs = [
    { id: "account", l: "Minha Conta", icon: UserIcon },
    { id: "users", l: "Usuários", icon: Users },
    { id: "roles", l: "Cargos", icon: Briefcase },
    { id: "sectors", l: "Setores", icon: Building2 },
    { id: "teams", l: "Times", icon: Users },
    { id: "task-types", l: "Tipos de Tarefa", icon: Settings },
    { id: "locations", l: "Localidades", icon: MapPin },
    { id: "permissions", l: "Permissões", icon: Settings },
  ];

  const tabs = allTabs.filter((t) => {
    if (t.id === "account") return true;
    if (t.id === "locations" || t.id === "task-types") return canManageLocations;
    return isAdmin;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="mb-5">
        <h1 className="m-0 text-[22px] font-bold text-slate-900 dark:text-gray-50">
          Configurações
        </h1>
        <p className="mt-1 mb-0 text-[13px] text-slate-500 dark:text-gray-400">
          {isAdmin
            ? "Gerencie suas preferências e o sistema"
            : "Gerencie suas preferências"}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 dark:bg-gray-900 rounded-[10px] p-1 w-fit mb-5 flex-wrap">
        {tabs.map(({ id, l, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 py-[7px] px-3.5 rounded-[7px] border-none text-xs font-semibold cursor-pointer ${
              tab === id
                ? "bg-primary text-white"
                : "bg-transparent text-slate-500 dark:text-gray-400"
            }`}
          >
            <Icon size={13} />
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-5 text-slate-500 dark:text-gray-400">
          Carregando...
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════════
              ACCOUNT TAB — all users
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "account" && (
            <div className="flex flex-col gap-4 max-w-[520px]">
              {/* User info card */}
              <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[14px] p-6">
                <h3 className="mb-4 mt-0 text-[15px] font-semibold text-slate-900 dark:text-gray-50">
                  Informações da Conta
                </h3>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-white text-base font-bold flex items-center justify-center">
                    {currentUser?.avatar || currentUser?.name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-slate-900 dark:text-gray-50">
                      {currentUser?.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-gray-400">
                      {currentUser?.email}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-100 dark:bg-gray-700 rounded-lg py-2.5 px-3.5 border border-slate-200 dark:border-gray-700">
                    <div className="text-[10px] text-slate-500 dark:text-gray-400 mb-0.5">
                      CARGO
                    </div>
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                      {currentUser?.role?.name || "—"}
                    </div>
                  </div>
                  <div className="bg-slate-100 dark:bg-gray-700 rounded-lg py-2.5 px-3.5 border border-slate-200 dark:border-gray-700">
                    <div className="text-[10px] text-slate-500 dark:text-gray-400 mb-0.5">
                      SETOR
                    </div>
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                      {currentUser?.sector?.name || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Security card */}
              <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[14px] p-6">
                <h3 className="mb-4 mt-0 text-[15px] font-semibold text-slate-900 dark:text-gray-50">
                  Segurança
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-gray-50">
                      Senha
                    </div>
                    <div className="text-xs text-slate-500 dark:text-gray-400">
                      Recomendamos alterar sua senha periodicamente.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (currentUser) {
                        setPasswordUserId(currentUser.id);
                        setPasswordUserName(currentUser.name);
                        setIsAdminPasswordReset(false);
                        setShowPasswordModal(true);
                      }
                    }}
                    className="flex items-center gap-2 py-2 px-4 bg-slate-100 dark:bg-gray-700 text-slate-900 dark:text-gray-50 border border-slate-200 dark:border-gray-700 rounded-lg text-[13px] font-semibold cursor-pointer"
                  >
                    <Lock size={14} />
                    Alterar senha
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              USERS TAB — Admin only
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "users" && isAdmin && (
            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[14px] overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-center py-3.5 px-4 border-b border-slate-200 dark:border-gray-700">
                <span className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                  Usuários ({users.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-[5px] py-1.5 px-3 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-600 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Upload size={12} />
                    Importar Usuários
                  </button>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setShowUserModal(true);
                    }}
                    className="flex items-center gap-[5px] py-1.5 px-3 bg-primary text-white border-none rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <Plus size={12} />
                    Novo usuário
                  </button>
                </div>
              </div>

              {/* Table header */}
              <div
                className="grid py-2 px-4 border-b border-slate-200 dark:border-gray-700"
                style={{ gridTemplateColumns: "2fr 2fr 1.5fr 1.2fr 130px" }}
              >
                {["Nome", "E-mail", "Cargo", "Setor", "Ações"].map((h) => (
                  <span
                    key={h}
                    className="text-[10px] font-bold text-slate-500 dark:text-gray-400"
                  >
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              {users.map((u, i) => (
                <div
                  key={u.id}
                  className={`grid items-center py-2.5 px-4 transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-white/5 ${
                    i < users.length - 1
                      ? "border-b border-slate-200 dark:border-gray-700"
                      : ""
                  } ${!u.active ? "opacity-50" : ""}`}
                  style={{ gridTemplateColumns: "2fr 2fr 1.5fr 1.2fr 130px" }}
                >
                  {/* Name & avatar */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-[30px] h-[30px] rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0 ${
                        u.active ? "bg-primary" : "bg-gray-400"
                      }`}
                    >
                      {u.avatar || u.name.charAt(0)}
                    </div>
                    <div>
                      <span className="text-[13px] font-medium text-slate-900 dark:text-gray-50 block">
                        {u.name}
                      </span>
                      {!u.active && (
                        <span className="text-[10px] text-red-500">
                          Desativado
                        </span>
                      )}
                      {u.must_change_password && u.active && (
                        <span className="text-[10px] text-amber-500">
                          ⚠ Deve trocar senha
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <span className="text-xs text-slate-500 dark:text-gray-400">
                    {u.email}
                  </span>

                  {/* Role badge */}
                  <span className="text-[11px] py-0.5 px-2 rounded-full bg-slate-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 w-fit font-semibold">
                    {u.role?.name || "Sem cargo"}
                  </span>

                  {/* Sector */}
                  <span className="text-xs text-slate-500 dark:text-gray-400">
                    {u.sector?.name || "Sem setor"}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-1">
                    {/* Reset password */}
                    <button
                      title="Resetar Senha"
                      onClick={() => {
                        setPasswordUserId(u.id);
                        setPasswordUserName(u.name);
                        setIsAdminPasswordReset(true);
                        setShowPasswordModal(true);
                      }}
                      className="bg-slate-100 dark:bg-gray-700 border-none rounded-md p-[5px] cursor-pointer text-slate-500 dark:text-gray-400"
                    >
                      <Lock size={12} />
                    </button>

                    {/* Edit */}
                    <button
                      title="Editar"
                      onClick={() => {
                        setEditingUser(u);
                        setShowUserModal(true);
                      }}
                      className="bg-slate-100 dark:bg-gray-700 border-none rounded-md p-[5px] cursor-pointer text-slate-500 dark:text-gray-400"
                    >
                      <Edit size={12} />
                    </button>

                    {/* Deactivate / Reactivate */}
                    {u.active ? (
                      <button
                        title="Desativar usuário"
                        onClick={() => handleDeleteUser(u.id)}
                        className="bg-red-50 border-none rounded-md p-[5px] cursor-pointer"
                      >
                        <Trash2 size={12} color="#ef4444" />
                      </button>
                    ) : (
                      <button
                        title="Reativar usuário"
                        onClick={() => handleReactivateUser(u.id)}
                        className="bg-slate-100 dark:bg-gray-700 border-none rounded-md p-[5px] cursor-pointer"
                      >
                        <UserCheck size={12} color="#10b981" />
                      </button>
                    )}

                    {/* Permanent Delete */}
                    {isAdmin && (
                      <button
                        title="Excluir DEFINITIVAMENTE"
                        onClick={() => {
                          setPermanentDeleteUserId(u.id);
                          setShowPermanentDeleteModal(true);
                        }}
                        className="bg-red-600 border-none rounded-md p-[5px] cursor-pointer hover:bg-red-700 transition-colors"
                      >
                        <X size={12} color="#ffffff" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <div className="py-6 px-4 text-center text-slate-500 dark:text-gray-400 text-[13px]">
                  Nenhum usuário encontrado.
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              ROLES TAB — Admin only
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "roles" && isAdmin && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              {/* Add new role card */}
              <button
                onClick={() => {
                  setEditingRole(null);
                  setShowRoleModal(true);
                }}
                className="bg-transparent border-[1.5px] border-dashed border-slate-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-[13px] text-slate-500 dark:text-gray-400 cursor-pointer min-h-[100px]"
              >
                <Plus size={20} />
                Novo Cargo
              </button>

              {roles.map((r) => (
                <div
                  key={r.id}
                  className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-4"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-gray-50">
                      {r.name}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setEditingRole(r);
                          setShowRoleModal(true);
                        }}
                        className="bg-slate-100 dark:bg-gray-700 border-none rounded-md p-[5px] cursor-pointer text-slate-500 dark:text-gray-400"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(r.id)}
                        className="bg-red-50 border-none rounded-md p-[5px] cursor-pointer"
                      >
                        <Trash2 size={12} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-gray-400">
                    {users.filter((u) => u.role_id === r.id).length} usuário(s)
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SECTORS TAB — Admin only
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "sectors" && isAdmin && (
            <div className="flex flex-col gap-2">
              {sectors.map((s) => (
                <div
                  key={s.id}
                  className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl py-3 px-4 flex justify-between items-center"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-[34px] h-[34px] bg-violet-100 rounded-lg flex items-center justify-center">
                      <Building2 size={16} color="#98af3b" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-gray-400">
                        {users.filter((u) => u.sector_id === s.id).length}{" "}
                        colaborador(es)
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setEditingSector(s);
                        setShowSectorModal(true);
                      }}
                      className="bg-slate-100 dark:bg-gray-700 border-none rounded-md p-[5px] cursor-pointer text-slate-500 dark:text-gray-400"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteSector(s.id)}
                      className="bg-red-50 border-none rounded-md p-[5px] cursor-pointer"
                    >
                      <Trash2 size={13} color="#ef4444" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => {
                  setEditingSector(null);
                  setShowSectorModal(true);
                }}
                className="bg-transparent border-[1.5px] border-dashed border-slate-200 dark:border-gray-700 rounded-xl p-3.5 flex items-center justify-center gap-1.5 text-[13px] text-slate-500 dark:text-gray-400 cursor-pointer"
              >
                <Plus size={14} />
                Novo setor
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TEAMS TAB — Admin only
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "teams" && isAdmin && (
            <div className="flex flex-col gap-2">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl py-3 px-4 flex justify-between items-center"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-[34px] h-[34px] bg-amber-100 rounded-lg flex items-center justify-center">
                      <Users size={16} color="#d97706" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                        {t.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-gray-400">
                        {users.filter((u: any) => u.team_id === t.id).length}{" "}
                        membro(s)
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setEditingTeam(t);
                        setShowTeamModal(true);
                      }}
                      className="bg-slate-100 dark:bg-gray-700 border-none rounded-md p-[5px] cursor-pointer text-slate-500 dark:text-gray-400"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      title="Gerenciar Membros"
                      onClick={() => {
                        setManagingTeam(t);
                        setShowManageMembersModal(true);
                      }}
                      className="bg-slate-100 dark:bg-gray-700 border-none rounded-md p-[5px] cursor-pointer text-slate-500 dark:text-gray-400"
                    >
                      <Users size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(t.id)}
                      className="bg-red-50 border-none rounded-md p-[5px] cursor-pointer"
                    >
                      <Trash2 size={13} color="#ef4444" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => {
                  setEditingTeam(null);
                  setShowTeamModal(true);
                }}
                className="bg-transparent border-[1.5px] border-dashed border-slate-200 dark:border-gray-700 rounded-xl p-3.5 flex items-center justify-center gap-1.5 text-[13px] text-slate-500 dark:text-gray-400 cursor-pointer"
              >
                <Plus size={14} />
                Novo time
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TASK TYPES TAB — Admin only
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "task-types" && isAdmin && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                  Tipos de Tarefa Dinâmicos
                </span>
                <button
                  onClick={handleAddTaskType}
                  className="flex items-center gap-[5px] py-1.5 px-3 bg-primary text-white border-none rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Plus size={12} />
                  Novo Tipo
                </button>
              </div>

              {taskTypes.map((tt) => (
                <div
                  key={tt.id}
                  className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl py-3 px-4 flex justify-between items-center"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-[34px] h-[34px] bg-sky-100 rounded-lg flex items-center justify-center">
                      <Settings size={16} color="#0284c7" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                        {tt.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-gray-400">
                        {tt.Sector
                          ? `Setor: ${tt.Sector.name}`
                          : "Geral (Todos os Setores)"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleDeleteTaskType(tt.id)}
                      className="bg-red-50 border-none rounded-md p-[5px] cursor-pointer"
                    >
                      <Trash2 size={13} color="#ef4444" />
                    </button>
                  </div>
                </div>
              ))}

              {taskTypes.length === 0 && (
                <div className="py-6 px-4 text-center text-slate-500 dark:text-gray-400 text-[13px]">
                  Nenhum tipo de tarefa cadastrado.
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              PERMISSIONS TAB — Admin only
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "permissions" && isAdmin && (
            <div className="flex flex-col gap-4">
              <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[14px] overflow-auto">
                <div className="py-3.5 px-4 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                      Permissões Avançadas por Cargo (RBAC)
                    </div>
                    <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                      Altere as permissões e clique em salvar para aplicar.
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Buscar permissão..."
                        value={searchPerms}
                        onChange={(e) => setSearchPerms(e.target.value)}
                        className="pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg text-xs outline-none w-48 transition-all focus:w-64"
                      />
                    </div>
                    {Object.keys(pendingPermissions).length > 0 && (
                      <button
                        onClick={handleSavePermissions}
                        className="flex items-center gap-1.5 py-1.5 px-4 bg-primary text-white border-none rounded-lg text-xs font-semibold cursor-pointer shadow-md hover:opacity-90 transition-opacity"
                      >
                        <Save size={14} /> Salvar Alterações
                      </button>
                    )}
                  </div>
                </div>

                <table className="w-full border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-gray-700">
                      <th className="py-2.5 px-4 text-left text-[11px] font-bold text-slate-500 dark:text-gray-400 sticky left-0 bg-white dark:bg-gray-800 z-10 uppercase tracking-tighter">
                        Capacidade / Recurso
                      </th>
                      {roles.map((r) => (
                        <th
                          key={r.id}
                          className="py-2.5 px-3.5 text-center text-[11px] font-bold text-slate-500 dark:text-gray-400 whitespace-nowrap"
                        >
                          <div className="flex flex-col items-center gap-1">
                            {r.name}
                            <button
                              title={`Copiar de outro cargo para ${r.name}`}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors text-slate-400 hover:text-primary border-none bg-transparent"
                              onClick={() => {
                                const fromIdStr = prompt(`Copiar permissões de qual cargo para ${r.name}?\n${roles.filter(x => x.id !== r.id).map(x => `${x.id}: ${x.name}`).join('\n')}`);
                                if (fromIdStr) {
                                  handleCopyPermissions(Number(fromIdStr), r.id);
                                }
                              }}
                            >
                              <Copy size={10} />
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.map((group) => {
                      const isCollapsed = collapsedGroups.includes(group.key);
                      return (
                        <React.Fragment key={group.key}>
                          {/* Group Header */}
                          <tr 
                            className="bg-slate-50 dark:bg-gray-900/50 cursor-pointer"
                            onClick={() => toggleGroupCollapse(group.key)}
                          >
                            <td
                              className="py-2 px-4 text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider sticky left-0 z-10 flex items-center gap-2"
                              style={{ background: 'inherit' }}
                              colSpan={roles.length + 1}
                            >
                              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                              {group.category}
                              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-gray-700 text-[9px] text-slate-500">
                                {group.items.length} itens
                              </span>
                            </td>
                          </tr>
                          {/* Items */}
                          {!isCollapsed && group.items.map((item, i) => (
                            <tr
                              key={item.id}
                              className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${
                                i < group.items.length - 1
                                  ? "border-b border-slate-100 dark:border-gray-800"
                                  : ""
                              }`}
                            >
                              <td className="py-2 px-4 text-[12px] font-medium text-slate-900 dark:text-gray-50 sticky left-0 bg-white dark:bg-gray-800 z-10 pl-8">
                                {item.label}
                              </td>
                              {roles.map((r) => {
                                const p: any =
                                  pendingPermissions[r.id] ||
                                  getPermissions({ role: r } as any);
                                const isChecked = !!p[group.key]?.[item.id];
                                const isModified = pendingPermissions[r.id] !== undefined && pendingPermissions[r.id][group.key] !== undefined && pendingPermissions[r.id][group.key][item.id] !== undefined;

                                return (
                                  <td
                                    key={r.id}
                                    className={`py-2 px-3.5 text-center transition-colors ${isModified ? 'bg-primary/5' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        handleTogglePermission(
                                          r.id,
                                          group.key,
                                          item.id,
                                        )
                                      }
                                      style={{
                                        width: 16,
                                        height: 16,
                                        cursor: "pointer",
                                        accentColor: "#98af3b",
                                        borderRadius: 4
                                      }}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Business rules note */}
              <div className="bg-slate-100 dark:bg-gray-700 border border-slate-200 dark:border-gray-700 rounded-[10px] py-3 px-4 text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                <strong className="text-slate-900 dark:text-gray-50 block mb-1.5">
                  📋 Regras de negócio:
                </strong>
                <ul className="m-0 pl-[18px]">
                  <li>
                    <strong className="text-slate-900 dark:text-gray-50">
                      Controle de tarefas
                    </strong>{" "}
                    (iniciar/pausar/concluir): restrito ao responsável da tarefa
                    OU ao Gestor do setor atribuído.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-gray-50">
                      Criação de tarefas
                    </strong>
                    : Admin, Gerente e Coordenador → qualquer setor. Gestor →
                    apenas seu setor. Liderado → sem acesso.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-gray-50">
                      Atribuição
                    </strong>
                    : Admin/Gerente/Coordenador → qualquer usuário. Gestor →
                    apenas usuários do seu setor.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-gray-50">
                      Menções
                    </strong>
                    : qualquer cargo pode mencionar qualquer usuário ou setor. O
                    mencionado recebe notificação e pode visualizar a tarefa.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              LOCATIONS TAB — Admin/Manager/Coordinator
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "locations" && canManageLocations && (
            <div className="flex flex-col gap-6 max-w-[800px]">
              {/* Contracts Section */}
              <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[14px] overflow-hidden">
                <div className="flex justify-between items-center py-3 px-4 border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-white/5">
                  <span className="text-[13px] font-bold text-slate-900 dark:text-gray-50 flex items-center gap-2">
                    <Briefcase size={14} className="text-primary" /> Contratos
                  </span>
                  <button
                    onClick={handleAddContract}
                    className="flex items-center gap-1.5 py-1 px-2.5 bg-primary text-white border-none rounded-md text-[11px] font-semibold cursor-pointer"
                  >
                    <Plus size={12} /> Novo
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-gray-700 max-h-[300px] overflow-auto">
                  {contracts.map((c) => (
                    <div
                      key={c.id}
                      className="flex justify-between items-center py-2.5 px-4 hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <span className="text-xs text-slate-700 dark:text-gray-300 font-medium">
                        {c.name}
                      </span>
                      <div className="flex gap-1.5 align-center">
                        <button
                          onClick={() => handleEditContract(c.id, c.name)}
                          className="p-1.5 text-slate-400 hover:text-primary bg-transparent border-none cursor-pointer"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteContract(c.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 bg-transparent border-none cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {contracts.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Nenhum contrato.
                    </div>
                  )}
                </div>
              </div>

              {/* Cities & Neighborhoods Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cities */}
                <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[14px] overflow-hidden">
                  <div className="flex justify-between items-center py-3 px-4 border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-white/5">
                    <span className="text-[13px] font-bold text-slate-900 dark:text-gray-50 flex items-center gap-2">
                      <Building2 size={14} className="text-primary" /> Cidades
                    </span>
                    <button
                      onClick={handleAddCity}
                      className="flex items-center gap-1.5 py-1 px-2.5 bg-primary text-white border-none rounded-md text-[11px] font-semibold cursor-pointer"
                    >
                      <Plus size={12} /> Nova
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-gray-700 max-h-[300px] overflow-auto">
                    {cities.map((city) => (
                      <div
                        key={city.id}
                        className="flex justify-between items-center py-2.5 px-4 hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-700 dark:text-gray-300 font-medium">
                            {city.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {city._count?.neighborhoods || 0} bairros
                          </span>
                        </div>
                        <div className="flex gap-1.5 align-center">
                          <button
                            onClick={() => handleEditCity(city.id, city.name)}
                            className="p-1.5 text-slate-400 hover:text-primary bg-transparent border-none cursor-pointer"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteCity(city.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 bg-transparent border-none cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {cities.length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Nenhuma cidade.
                      </div>
                    )}
                  </div>
                </div>

                {/* Neighborhoods */}
                <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-[14px] overflow-hidden">
                  <div className="flex justify-between items-center py-3 px-4 border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-white/5">
                    <span className="text-[13px] font-bold text-slate-900 dark:text-gray-50 flex items-center gap-2">
                      <MapPin size={14} className="text-primary" /> Bairros
                    </span>
                    <button
                      onClick={handleAddNeighborhood}
                      className="flex items-center gap-1.5 py-1 px-2.5 bg-primary text-white border-none rounded-md text-[11px] font-semibold cursor-pointer"
                    >
                      <Plus size={12} /> Novo
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-gray-700 max-h-[300px] overflow-auto">
                    {neighborhoods.map((n) => (
                      <div
                        key={n.id}
                        className="flex justify-between items-center py-2.5 px-4 hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-700 dark:text-gray-300 font-medium">
                            {n.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {n.city?.name}
                          </span>
                        </div>
                        <div className="flex gap-1.5 align-center">
                          <button
                            onClick={() => handleEditNeighborhood(n.id, n.name)}
                            className="p-1.5 text-slate-400 hover:text-primary bg-transparent border-none cursor-pointer"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteNeighborhood(n.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 bg-transparent border-none cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {neighborhoods.length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Nenhum bairro.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {showPasswordModal && passwordUserId !== null && (
        <ChangePasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          userId={passwordUserId}
          userName={passwordUserName}
          T={T}
          isAdmin={isAdminPasswordReset}
        />
      )}

      <UserModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSuccess={fetchData}
        user={editingUser}
        roles={roles}
        sectors={sectors}
        teams={teams}
        users={users}
        T={T}
      />

      <RoleModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onSuccess={fetchData}
        role={editingRole}
        T={T}
      />

      <SectorModal
        isOpen={showSectorModal}
        onClose={() => setShowSectorModal(false)}
        onSuccess={fetchData}
        sector={editingSector}
        T={T}
      />

      <TeamModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        onSuccess={fetchData}
        team={editingTeam}
        T={T}
      />

      <ImportUsersModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchData}
        T={T}
      />

      {managingTeam && (
        <ManageTeamMembersModal
          isOpen={showManageMembersModal}
          onClose={() => {
            setShowManageMembersModal(false);
            setManagingTeam(null);
            fetchData();
          }}
          team={managingTeam}
          T={T}
        />
      )}
      {/* Permanent User Delete Modal */}
      {showPermanentDeleteModal && (
        <ConfirmPasswordModal
          isOpen={showPermanentDeleteModal}
          onClose={() => {
            setShowPermanentDeleteModal(false);
            setPermanentDeleteUserId(null);
          }}
          onConfirm={handlePermanentDeleteUser}
          isLoading={isDeletingUser}
          title="Excluir Usuário Definitivamente"
          description={`Atenção: Você está prestes a excluir permanentemente este usuário e todas as suas associações. Esta ação NÃO pode ser desfeita.`}
        />
      )}
    </div>
  );
}
