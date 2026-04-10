"use client";

import { PRIORITIES } from "@/lib/constants";
import type { CitiesNeighborhoods, ThemeColors, User } from "@/types";
import { Filter, Search, X } from "lucide-react";
import React, { useState } from "react";
import { DateRange } from "react-day-picker";
import { DateRangePicker, FilterSelect, MultiSelect } from "./FilterInputs";

interface TaskFiltersProps {
  T: ThemeColors;
  search: string;
  setSearch: (v: string) => void;
  status?: string;
  setStatus?: (v: string) => void;
  sector: string[];
  setSector: (v: string[]) => void;
  priority: string;
  setPriority: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  currentState?: string;
  setCurrentState?: (v: string) => void;
  contract: string;
  setContract: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  neighbor: string;
  setNeighbor: (v: string) => void;
  responsible?: string;
  setResponsible?: (v: string) => void;
  dateFrom: DateRange | undefined;
  setDateFrom: (v: DateRange | undefined) => void;
  dateTo: DateRange | undefined;
  setDateTo: (v: DateRange | undefined) => void;
  users?: User[];
  contracts?: string[];
  taskTypes?: { id: number; name: string; sector_id?: number | null }[];
  sectors?: { id?: number | string; name: string }[];
  citiesNeighborhoods?: CitiesNeighborhoods;
  onClear: () => void;
  totalTasks: number;
  filteredTasks: number;
  showSubtasks?: boolean;
  setShowSubtasks?: (v: boolean) => void;
  canViewAllSectors?: boolean;
  createdByMe?: boolean;
  setCreatedByMe?: (v: boolean) => void;
  team?: string;
  setTeam?: (v: string) => void;
  teams?: { id: number; name: string }[];
  sortField?: string;
  setSortField?: (v: string) => void;
  sortOrder?: string;
  setSortOrder?: (v: string) => void;
  displayedTasks?: any[];
}

export function TaskFilters({
  T,
  search,
  setSearch,
  status,
  setStatus,
  sector,
  setSector,
  priority,
  setPriority,
  type,
  setType,
  currentState,
  setCurrentState,
  contract,
  setContract,
  city,
  setCity,
  neighbor,
  setNeighbor,
  responsible,
  setResponsible,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  users = [],
  contracts = [],
  taskTypes = [],
  sectors = [],
  citiesNeighborhoods = {},
  onClear,
  totalTasks,
  filteredTasks,
  showSubtasks,
  setShowSubtasks,
  canViewAllSectors,
  createdByMe,
  setCreatedByMe,
  team,
  setTeam,
  teams,
  sortField,
  setSortField,
  sortOrder,
  setSortOrder,
  displayedTasks,
}: TaskFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const cityNeighborhoods = city ? citiesNeighborhoods[city] || [] : [];
  const sectorOptions = (sectors || []).map((s) => s.name);

  // Derive which task types to show based on selected sectors
  const visibleTaskTypes = React.useMemo(() => {
    if (!sector || sector.length === 0) return taskTypes.map((t) => t.name);

    return taskTypes
      .filter((t) => {
        if (!t.sector_id) return true; // General tasks are always visible
        const matchSector = sectors.find((s) => s.id === t.sector_id);
        if (!matchSector) return true; // If we can't find it, don't hide
        return sector.includes(matchSector.name);
      })
      .map((t) => t.name);
  }, [taskTypes, sector, sectors]);

  // Group Users by Sector
  const groupedUsers = React.useMemo(() => {
    if (!users || users.length === 0) return [];
    
    // Filter users dynamically
    let filteredUsers = users;
    if (sector && sector.length > 0) {
      filteredUsers = users.filter((u: any) => {
        const sName = u.sector?.name || u.Sector?.name || "Sem Setor";
        return sector.includes(sName);
      });
    } else if (displayedTasks) {
      const responsibleNames = new Set<string>();
      displayedTasks.forEach((t: any) => {
        const rName = t.responsible && typeof t.responsible === "object" ? t.responsible.name : t.responsible;
        if (rName) responsibleNames.add(rName);
        if (t.coworkers) {
          t.coworkers.forEach((cw: any) => {
            if (cw.name) responsibleNames.add(cw.name);
          });
        }
      });
      filteredUsers = users.filter((u: any) => responsibleNames.has(u.name));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userGroups: Record<string, any[]> = { "Sem Setor": [] };
    
    filteredUsers.forEach((u: any) => {
       const sectorName = u.sector?.name || u.Sector?.name || "Sem Setor";
       if (!userGroups[sectorName]) userGroups[sectorName] = [];
       userGroups[sectorName].push(u);
    });

    const groups = [];
    const sortedSectors = Object.keys(userGroups).sort((a, b) => {
        if (a === "Sem Setor") return 1;
        if (b === "Sem Setor") return -1;
        return a.localeCompare(b);
    });

    for (const s of sortedSectors) {
       if (userGroups[s].length > 0) {
          const sortedUsers = [...userGroups[s]].sort((a, b) => a.name.localeCompare(b.name));
          groups.push({
             label: s,
             options: sortedUsers.map(u => ({ id: u.name, name: u.name }))
          });
       }
    }
    return groups;
  }, [users]);

  // Group TaskTypes by Sector
  const groupedTaskTypes = React.useMemo(() => {
    if (!taskTypes || taskTypes.length === 0) return [];
    
    const ttGroups: Record<string, typeof taskTypes> = { "Geral": [] };
    
    visibleTaskTypes.forEach((vtName) => {
       const tt = taskTypes.find(t => t.name === vtName);
       if (!tt) return;
       let sectorName = "Geral";
       if (tt.sector_id) {
          const matchSector = sectors.find(s => s.id === tt.sector_id);
          if (matchSector) sectorName = matchSector.name;
       }
       if (!ttGroups[sectorName]) ttGroups[sectorName] = [];
       ttGroups[sectorName].push(tt);
    });

    const groups = [];
    const sortedSectors = Object.keys(ttGroups).sort((a, b) => {
        if (a === "Geral") return -1;
        if (b === "Geral") return 1;
        return a.localeCompare(b);
    });

    for (const s of sortedSectors) {
       if (ttGroups[s].length > 0) {
          const sortedTypes = [...ttGroups[s]].sort((a, b) => a.name.localeCompare(b.name));
          groups.push({
             label: s,
             options: sortedTypes.map(t => ({ id: t.name, name: t.name }))
          });
       }
    }
    return groups;
  }, [taskTypes, sectors, visibleTaskTypes]);

  const activeCount = [
    status,
    sector.length > 0,
    priority,
    type,
    contract,
    city,
    neighbor,
    responsible,
    dateFrom?.from || dateFrom?.to,
    dateTo?.from || dateTo?.to,
    createdByMe,
    team,
    currentState,
  ].filter(Boolean).length;

  return (
    <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl p-3.5 shadow-sm mb-6 transition-all">
      {/* Compact Main Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search Input */}
        <div className="flex-1 min-w-[280px] relative group">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite o Título da Tarefa..."
            className="h-10 w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl pl-10 pr-4 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-slate-900 dark:text-gray-100 placeholder:text-slate-400"
          />
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-6 px-1">
          {setCreatedByMe && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createdByMe"
                checked={!!createdByMe}
                onChange={(e) => setCreatedByMe(e.target.checked)}
                className="w-4 h-4 rounded-md border-slate-300 text-primary focus:ring-primary transition-all"
              />
              <label
                htmlFor="createdByMe"
                className="text-[13px] font-semibold text-slate-600 dark:text-gray-300 cursor-pointer select-none whitespace-nowrap"
              >
                Criadas por mim
              </label>
            </div>
          )}

          {setShowSubtasks && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showSubtasks"
                checked={showSubtasks}
                onChange={(e) => setShowSubtasks(e.target.checked)}
                className="w-4 h-4 rounded-md border-slate-300 text-primary focus:ring-primary transition-all"
              />
              <label
                htmlFor="showSubtasks"
                className="text-[13px] font-semibold text-slate-600 dark:text-gray-300 cursor-pointer select-none whitespace-nowrap"
              >
                Exibir subtarefas
              </label>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`h-10 px-4 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all border ${
              showAdvanced || activeCount > 0
                ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                : "bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-400 hover:border-slate-300 dark:hover:border-gray-600"
            }`}
          >
            <Filter size={15} />
            <span>Mais Filtros</span>
            {activeCount > 0 && (
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                  showAdvanced ? "bg-white text-primary" : "bg-primary text-white"
                }`}
              >
                {activeCount}
              </span>
            )}
          </button>

          {(search || activeCount > 0) && (
            <button
              onClick={onClear}
              className="h-10 px-4 rounded-xl text-[13px] font-bold flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all font-display"
            >
              <X size={15} />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters (Collapsible) */}
      {showAdvanced && (
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-gray-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-6 animate-in slide-in-from-top-3 duration-200">
          {setStatus && (
            <FilterSelect
              label="Status"
              val={status || ""}
              onChange={setStatus}
              opts={["A Fazer", "Em Andamento", "Pausado", "Concluído"]}
              placeholder="Todos"
            />
          )}

          {canViewAllSectors !== false && (
            <MultiSelect
              label="Setores"
              val={sector}
              onChange={setSector}
              opts={sectorOptions}
              placeholder="Todos"
            />
          )}

          <FilterSelect
            label="Prioridade"
            val={priority}
            onChange={setPriority}
            opts={PRIORITIES}
            placeholder="Todas"
          />

          {setCurrentState && (
            <FilterSelect
              label="Estado Atual"
              val={currentState || ""}
              onChange={setCurrentState}
              opts={[
                "Dentro do Prazo",
                "Próximo do Prazo",
                "Em Atraso",
                "Entregue no Prazo",
                "Atraso na Entrega",
              ]}
              placeholder="Todos"
            />
          )}

          <FilterSelect
            label="Contrato"
            val={contract}
            onChange={setContract}
            opts={contracts}
            placeholder="Todos"
          />

          <FilterSelect
            label="Cidade"
            val={city}
            onChange={(v) => {
              setCity(v);
              setNeighbor("");
            }}
            opts={Object.keys(citiesNeighborhoods).sort()}
            placeholder="Todas"
          />

          <FilterSelect
            label="Bairro"
            val={neighbor}
            onChange={setNeighbor}
            opts={cityNeighborhoods}
            placeholder={city ? "Todos" : "Selecione cidade"}
            disabled={!city}
          />

          <FilterSelect
            label="Tipo"
            val={type}
            onChange={setType}
            groups={groupedTaskTypes}
            placeholder="Todos"
          />

          {setResponsible && (
            <FilterSelect
              label="Responsável"
              val={responsible || ""}
              onChange={setResponsible}
              groups={groupedUsers}
              placeholder="Todos"
            />
          )}

          {teams && teams.length > 0 && setTeam && (
            <FilterSelect
              label="Time/Polo"
              val={team || ""}
              onChange={setTeam}
              opts={teams}
              placeholder="Todos"
            />
          )}

          <div className="lg:col-span-1">
            <DateRangePicker
              label="Vencimento"
              date={dateFrom}
              setDate={setDateFrom}
              T={T}
            />
          </div>

          <div className="lg:col-span-1">
            <DateRangePicker
              label="Criação"
              date={dateTo}
              setDate={setDateTo}
              T={T}
            />
          </div>

          {setSortField && setSortOrder && (
            <>
              <FilterSelect
                label="Ordenar por"
                val={sortField || ""}
                onChange={setSortField}
                opts={[
                  { value: "status_updated_at", label: "Atualização (status)" },
                  { value: "deadline", label: "Data de Entrega" },
                  { value: "title", label: "Título" },
                ]}
                placeholder="Padrão"
              />
              <FilterSelect
                label="Ordem"
                val={sortOrder || ""}
                onChange={setSortOrder}
                opts={[
                  { value: "asc", label: "Crescente" },
                  { value: "desc", label: "Decrescente" },
                ]}
                placeholder="Padrão"
              />
            </>
          )}
        </div>
      )}

      {/* Stats Summary */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-50 dark:border-gray-700/30 pt-3.5">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-gray-500">
          <span className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-gray-600" />
            Exibindo {filteredTasks} de {totalTasks} tarefas
          </span>
          {search && (
            <span className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-primary" />
              Busca: "{search}"
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
