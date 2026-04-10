"use client";

import React from "react";
import { Layers, List, Calendar, Map as MapIcon } from "lucide-react";
import { TaskFilters } from "@/components/shared/TaskFilters";
import { ThemeColors, Task, User, Sector, CitiesNeighborhoods } from "@/types";
import { DateRange } from "react-day-picker";
import dynamic from "next/dynamic";
import { PageLoader, TableSkeleton } from "@/components/skeletons";

const KanbanPage = dynamic(() => import("@/components/kanban/KanbanPage"), {
  loading: () => <PageLoader />,
});
const ListPage = dynamic(() => import("@/components/list/ListPage"), {
  loading: () => <TableSkeleton />,
});
const CronogramaPage = dynamic(
  () => import("@/components/cronograma/CronogramaPage"),
  { loading: () => <TableSkeleton /> },
);

interface TasksHubProps {
  T: ThemeColors;
  tasks: Task[];
  user: User;
  onSelect: (t: Task) => void;
  onUpdate?: (id: number, action: string, data?: any) => Promise<void>;
  users: User[];
  contracts: string[];
  sectors: Sector[];
  citiesNeighborhoods: CitiesNeighborhoods;
  taskTypes: any[];
  canViewAllSectors: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Filter States
  search: string;
  setSearch: (v: string) => void;
  sector: string[];
  setSector: (v: string[]) => void;
  contract: string;
  setContract: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  neighbor: string;
  setNeighbor: (v: string) => void;
  priority: string;
  setPriority: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  responsible: string;
  setResponsible: (v: string) => void;
  createdByMe: boolean;
  setCreatedByMe: (v: boolean) => void;
  team: string;
  setTeam: (v: string) => void;
  currentState: string;
  setCurrentState: (v: string) => void;
  dateFrom: DateRange | undefined;
  setDateFrom: (v: DateRange | undefined) => void;
  dateTo: DateRange | undefined;
  setDateTo: (v: DateRange | undefined) => void;
  onNewTask: () => void;
  onClearFilters: () => void;
  sortField?: string;
  setSortField?: (v: string) => void;
  sortOrder?: string;
  setSortOrder?: (v: string) => void;
  canCreate?: boolean;
  showSubtasks?: boolean;
  setShowSubtasks?: (v: boolean) => void;
}

const MindMapPage = dynamic(() => import("@/components/mindmap/MindMapPage"), {
  loading: () => <PageLoader />,
});

export default function TasksHub({
  T,
  tasks,
  user,
  onSelect: onSelectTask,
  onUpdate,
  users,
  contracts,
  sectors,
  citiesNeighborhoods,
  taskTypes,
  canViewAllSectors,
  activeTab,
  setActiveTab,
  search,
  setSearch,
  sector,
  setSector,
  contract,
  setContract,
  city,
  setCity,
  neighbor,
  setNeighbor,
  priority,
  setPriority,
  type,
  setType,
  responsible,
  setResponsible,
  createdByMe,
  setCreatedByMe,
  team,
  setTeam,
  currentState,
  setCurrentState,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  onNewTask,
  onClearFilters,
  sortField,
  setSortField,
  sortOrder,
  setSortOrder,
  canCreate,
  showSubtasks,
  setShowSubtasks,
}: TasksHubProps) {

  return (
    <div className="flex flex-col">
      {/* Filters Area */}
      <div className="flex-none p-2 md:p-3 pb-0">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-gray-800 mb-2">
          <TaskFilters
            T={T}
            search={search}
            setSearch={setSearch}
            sector={sector}
            setSector={setSector}
            contract={contract}
            setContract={setContract}
            city={city}
            setCity={setCity}
            neighbor={neighbor}
            setNeighbor={setNeighbor}
            priority={priority}
            setPriority={setPriority}
            type={type}
            setType={setType}
            responsible={responsible}
            setResponsible={setResponsible}
            currentState={currentState}
            setCurrentState={setCurrentState}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo} setActiveTab={setActiveTab}
            users={users}
            contracts={contracts}
            sectors={sectors}
            taskTypes={taskTypes}
            citiesNeighborhoods={citiesNeighborhoods}
            onClear={onClearFilters}
            totalTasks={tasks.length}
            filteredTasks={tasks.length} // Simplified for now, the children will filter further
            canViewAllSectors={canViewAllSectors}
            showSubtasks={showSubtasks}
            setShowSubtasks={setShowSubtasks}
            createdByMe={createdByMe}
            setCreatedByMe={setCreatedByMe}
            setTeam={setTeam}
            sortField={sortField}
            setSortField={setSortField}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />
        </div>
      </div>

      {/* Content Area - Natural height */}
      <div className="px-2 md:px-3 pb-4">
        <div>
          {activeTab === "kanban" && (
            <KanbanPage
              T={T}
              tasks={tasks}
              user={user}
              onSelect={onSelectTask}
              onUpdate={onUpdate}
              canCreate={true}
              onNew={onNewTask}
              users={users}
              contracts={contracts}
              citiesNeighborhoods={citiesNeighborhoods}
              sectors={sectors}
              taskTypes={taskTypes}
              canViewAllSectors={canViewAllSectors}
              createdByMe={createdByMe}
              setCreatedByMe={setCreatedByMe}
              team={team}
              setTeam={setTeam}
              currentState={currentState}
              setCurrentState={setCurrentState}
              externalFilters={true}
              externalQuery={{
                search, sector, contract, city, neighbor, priority, type, 
                responsible, 
                createdByMe, team, currentState, dateFrom, dateTo
              }}
              setSearch={setSearch}
              setSector={setSector}
              setPriority={setPriority}
              setType={setType}
              setContract={setContract}
              setCity={setCity}
              setDateFrom={setDateFrom}
              setDateTo={setDateTo} setActiveTab={setActiveTab}
            />
          )}
          {activeTab === "list" && (
            <ListPage
              T={T}
              tasks={tasks}
              onSelect={onSelectTask}
              users={users}
              contracts={contracts}
              citiesNeighborhoods={citiesNeighborhoods}
              sectors={sectors}
              taskTypes={taskTypes}
              canViewAllSectors={canViewAllSectors}
              createdByMe={createdByMe}
              setCreatedByMe={setCreatedByMe}
              team={team}
              setTeam={setTeam}
              currentState={currentState}
              setCurrentState={setCurrentState}
              externalFilters={true}
              externalQuery={{
                search, sector, contract, city, neighbor, priority, type, 
                responsible,
                createdByMe, team, currentState, dateFrom, dateTo
              }}
              setSearch={setSearch}
              setSector={setSector}
              setPriority={setPriority}
              setType={setType}
              setResponsible={setResponsible}
              setContract={setContract}
              setCity={setCity}
              setNeighbor={setNeighbor}
              setDateFrom={setDateFrom}
              setDateTo={setDateTo} setActiveTab={setActiveTab}
            />
          )}
          {activeTab === "cronograma" && (
            <CronogramaPage
              T={T}
              tasks={tasks}
              onSelect={onSelectTask}
              users={users}
              contracts={contracts}
              citiesNeighborhoods={citiesNeighborhoods}
              sectors={sectors}
              createdByMe={createdByMe}
              setCreatedByMe={setCreatedByMe}
              team={team}
              setTeam={setTeam}
              currentState={currentState}
              setCurrentState={setCurrentState}
              externalFilters={true}
              externalQuery={{
                search, sector, contract, city, neighbor, priority, type, 
                responsible,
                createdByMe, team, currentState, dateFrom, dateTo
              }}
              setSearch={setSearch}
              setSector={setSector}
              setPriority={setPriority}
              setType={setType}
              setResponsible={setResponsible}
              setContract={setContract}
              setCity={setCity}
              setNeighbor={setNeighbor}
              setDateFrom={setDateFrom}
              setDateTo={setDateTo} setActiveTab={setActiveTab}
            />
          )}
          {activeTab === "mindmap" && (
            <MindMapPage
              T={T}
              tasks={tasks}
              users={users}
              contracts={contracts}
              citiesNeighborhoods={citiesNeighborhoods}
              externalFilters={true}
              externalQuery={{
                search, sector, contract, city, neighbor, priority, type, 
                responsible,
                createdByMe, team, currentState, dateFrom, dateTo
              }}
            />
          )}
          {activeTab === "map" && (
            <div className="flex h-full items-center justify-center text-slate-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm">
              Interface do Mapa em desenvolvimento.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
