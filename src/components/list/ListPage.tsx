"use client";

import { TaskFilters } from "@/components/shared/TaskFilters";
import { PageHeader } from "../shared/PageHeader";
import { PRIO_COLOR, STATUS_COLOR } from "@/lib/constants";
import { exportToExcel, getKpiData, type ExportKPIs } from "@/lib/exportUtils";
import { getTaskState, parseDate } from "@/lib/helpers";
import type {
  CitiesNeighborhoods,
  Sector,
  Task,
  ThemeColors,
  User,
} from "@/types";
import { ChevronDown, ChevronRight, Eye, FileText, Plus, Users, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { Tooltip } from "../shared/Tooltip";

const ExportButtons = ({
  filtered,
  kpi,
  users,
  user,
  filterLabel,
}: {
  filtered: Task[];
  kpi: ExportKPIs;
  users: User[];
  user?: User;
  filterLabel?: string;
}) => (
  <div className="flex items-center gap-2">
    <button
      onClick={() => exportToExcel(filtered, kpi, user, filterLabel, "lista")}
      className="bg-emerald-600 text-white border-none h-9 px-4 rounded-lg text-[13px] font-semibold cursor-pointer flex items-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-95 shadow-sm shadow-emerald-500/20"
    >
      <FileText size={15} /> EXCEL
    </button>
  </div>
);

interface ListPageProps {
  T: ThemeColors;
  tasks: Task[];
  onSelect: (t: Task) => void;
  users?: User[];
  contracts?: string[];
  citiesNeighborhoods?: CitiesNeighborhoods;
  sectors?: (Sector | string)[];
  taskTypes?: any[];
  canViewAllSectors?: boolean;
  createdByMe?: boolean;
  setCreatedByMe?: (v: boolean) => void;
  team?: string;
  setTeam?: (v: string) => void;
  teams?: { id: number; name: string }[];
  currentState?: string;
  setCurrentState?: (v: string) => void;
  externalFilters?: boolean;
  externalQuery?: {
    search: string;
    sector: string[];
    contract: string;
    city: string;
    neighbor: string;
    priority: string;
    type: string;
    responsible: string;
    createdByMe: boolean;
    team: string;
    currentState: string;
    dateFrom: DateRange | undefined;
    dateTo: DateRange | undefined;
  };
  setSearch?: (v: string) => void;
  setSector?: (v: string[]) => void;
  setPriority?: (v: string) => void;
  setType?: (v: string) => void;
  setResponsible?: (v: string) => void;
  setContract?: (v: string) => void;
  setCity?: (v: string) => void;
  setNeighbor?: (v: string) => void;
  setDateFrom?: (v: DateRange | undefined) => void;
  setDateTo?: (v: DateRange | undefined) => void;
}

export default function ListPage({
  T,
  tasks,
  onSelect,
  users = [],
  contracts = [],
  citiesNeighborhoods = {},
  sectors = [],
  taskTypes = [],
  canViewAllSectors,
  createdByMe,
  setCreatedByMe,
  team,
  setTeam,
  teams,
  currentState,
  setCurrentState,
  setSearch: setSearchProp,
  setSector: setSectorProp,
  setPriority: setPriorityProp,
  setType: setTypeProp,
  setResponsible: setResponsibleProp,
  setContract: setContractProp,
  setCity: setCityProp,
  setNeighbor: setNeighborProp,
  setDateFrom: setDateFromProp,
  setDateTo: setDateToProp,
  externalFilters = false,
  externalQuery,
}: ListPageProps) {
  const [internalSearch, setInternalSearch] = useState("");
  const [internalSector, setInternalSector] = useState<string[]>([]);
  const [internalContract, setInternalContract] = useState("");
  const [internalCity, setInternalCity] = useState("");
  const [internalNeighbor, setInternalNeighbor] = useState("");
  const [internalPriority, setInternalPriority] = useState("");
  const [internalType, setInternalType] = useState("");
  const [internalResponsible, setInternalResponsible] = useState("");
  const [internalDateFrom, setInternalDateFrom] = useState<DateRange | undefined>(undefined);
  const [internalDateTo, setInternalDateTo] = useState<DateRange | undefined>(undefined);
  const [internalCurrentState, setInternalCurrentState] = useState(currentState || "");

  const search = externalFilters ? (externalQuery?.search || "") : internalSearch;
  const fSector = externalFilters ? (externalQuery?.sector || []) : internalSector;
  const fContract = externalFilters ? (externalQuery?.contract || "") : internalContract;
  const fCity = externalFilters ? (externalQuery?.city || "") : internalCity;
  const fNeighbor = externalFilters ? (externalQuery?.neighbor || "") : internalNeighbor;
  const fPriority = externalFilters ? (externalQuery?.priority || "") : internalPriority;
  const fType = externalFilters ? (externalQuery?.type || "") : internalType;
  const fResponsible = externalFilters ? (externalQuery?.responsible || "") : internalResponsible;
  const fDateFrom = externalFilters ? externalQuery?.dateFrom : internalDateFrom;
  const fDateTo = externalFilters ? externalQuery?.dateTo : internalDateTo;
  const fCurrentState = externalFilters ? (externalQuery?.currentState || "") : (internalCurrentState || "");

  const handleSetSearch = (v: string) => {
    if (externalFilters && setSearchProp) setSearchProp(v);
    else setInternalSearch(v);
  };
  const [sortField, setSortField] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("asc");

  useEffect(() => {
    if (currentState !== undefined && !externalFilters) setInternalCurrentState(currentState);
  }, [currentState, externalFilters]);

  useEffect(() => {
    if (setCurrentState && !externalFilters) setCurrentState(internalCurrentState);
  }, [internalCurrentState, setCurrentState, externalFilters]);
  
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
  const [teamModalOpen, setTeamModalOpen] = useState<{ open: boolean; task?: Task } | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = tasks.filter((t: Task) => {
    if (t.parent_id) return false; // Hide subtasks in top level

    if (search) {
      const s = search.toLowerCase();
      const titleMatch = t.title.toLowerCase().includes(s);
      const childMatch = (t.subtasks || []).some((st: any) => st.title.toLowerCase().includes(s));
      if (!titleMatch && !childMatch) return false;
    }
    const sectorVal = t.sector && typeof t.sector === "object" ? t.sector.name : t.sector || "";
    if (fSector.length > 0 && !fSector.includes(sectorVal)) return false;
    const contractVal = t.contract && typeof t.contract === "object" ? t.contract.name : t.contract || "";
    if (fContract && contractVal !== fContract) return false;
    const cityVal = t.city && typeof t.city === "object" ? t.city.name : t.city || "";
    if (fCity && cityVal !== fCity) return false;
    if (fNeighbor && t.nucleus !== fNeighbor) return false;
    if (fPriority && t.priority !== fPriority) return false;
    if (fType && t.type !== fType) return false;
    if (fResponsible) {
      const respName = (t.responsible && typeof t.responsible === "object") ? t.responsible.name : t.responsible || "";
      const isCoworker = (t.coworkers || []).some((cw: any) => cw.name === fResponsible);
      if (respName !== fResponsible && !isCoworker) return false;
    }
    if (fDateFrom?.from || fDateFrom?.to) {
      const td = parseDate(t.deadline);
      if (!td) return false;
      if (fDateFrom.from && td < fDateFrom.from) return false;
      if (fDateFrom.to && td > fDateFrom.to) return false;
    }
    if (fDateTo?.from || fDateTo?.to) {
      const tc = new Date(t.created_at || "");
      if (fDateTo.from && tc < fDateTo.from) return false;
      if (fDateTo.to && tc > fDateTo.to) return false;
    }
    if (fCurrentState) {
      if (getTaskState(t)?.label !== fCurrentState) return false;
    }
    return true;
  }).sort((a, b) => {
    if (!sortField) return 0;
    let aVal: any, bVal: any;
    
    if (sortField === "deadline") {
      aVal = a.deadline ? new Date(a.deadline).getTime() : (sortOrder === "desc" ? -Infinity : Infinity);
      bVal = b.deadline ? new Date(b.deadline).getTime() : (sortOrder === "desc" ? -Infinity : Infinity);
    } else if (sortField === "status_updated_at") {
      aVal = a.status_updated_at ? new Date(a.status_updated_at).getTime() : (sortOrder === "desc" ? -Infinity : Infinity);
      bVal = b.status_updated_at ? new Date(b.status_updated_at).getTime() : (sortOrder === "desc" ? -Infinity : Infinity);
    } else {
      aVal = (a[sortField as keyof Task] || "").toString().toLowerCase();
      bVal = (b[sortField as keyof Task] || "").toString().toLowerCase();
    }

    if (aVal < bVal) return sortOrder === "desc" ? 1 : -1;
    if (aVal > bVal) return sortOrder === "desc" ? -1 : 1;
    return 0;
  });

  const clearAll = () => {
    if (externalFilters) return;
    setInternalSearch(""); setInternalSector([]); setInternalContract(""); setInternalCity(""); setInternalNeighbor("");
    setInternalPriority(""); setInternalType(""); setInternalResponsible(""); setInternalDateFrom(undefined); setInternalDateTo(undefined);
    setInternalCurrentState(""); setSortField(""); setSortOrder("asc");
  };

  const TeamModal = ({ task, onClose }: { task: Task; onClose: () => void }) => {
    const members = [
      task.responsible ? { ...(typeof task.responsible === 'object' ? task.responsible : { name: task.responsible }), isResponsible: true } : null,
      ...(task.coworkers || [])
    ].filter(Boolean);

    // Agrupar por setor
    const grouped: Record<string, any[]> = {};
    members.forEach((m: any) => {
      const sector = m.sector ? (typeof m.sector === 'object' ? m.sector.name : m.sector) : "Sem Setor";
      if (!grouped[sector]) grouped[sector] = [];
      grouped[sector].push(m);
    });

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full p-4 mx-4 shadow-xl border border-slate-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-gray-50 m-0 mb-4">Equipe da Tarefa</h3>
          <div className="max-h-[60vh] overflow-y-auto pr-2 flex flex-col gap-4">
             {Object.keys(grouped).length === 0 ? (
                <div className="text-sm text-slate-500">Nenhum membro vinculado.</div>
             ) : (
                Object.entries(grouped).map(([sector, users]) => (
                  <div key={sector}>
                    <div className="text-xs font-bold uppercase text-slate-400 mb-2">{sector}</div>
                    <div className="flex flex-col gap-2">
                      {users.map((u: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-gray-700/50 p-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                              {(u.avatar || (typeof u.name === 'object' ? u.name.name : u.name)?.substring(0,2))?.toUpperCase() || "?"}
                            </div>
                            <div>
                               <div className="text-sm font-semibold text-slate-900 dark:text-gray-50">{typeof u.name === 'object' ? u.name.name : u.name}</div>
                               <div className="text-[10px] text-slate-500 dark:text-gray-400">{u.role ? (typeof u.role === 'object' ? u.role.name : u.role) : "Membro"}</div>
                            </div>
                          </div>
                          {u.isResponsible && <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase">Resp</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
             )}
          </div>
          <button onClick={onClose} className="mt-4 w-full h-10 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-lg text-sm font-bold text-slate-700 dark:text-gray-200 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    );
  };

  const TableRow = ({ t, isSubtask = false }: { t: any; isSubtask?: boolean }) => {
    const hasSubs = t.subtasks?.length > 0;
    const isExpanded = expandedTasks[t.id];
    
    const prog = hasSubs ? (t.subtasks.filter((s: any) => s.done || s.status === 'Concluído').length / t.subtasks.length) * 100 : 0;
    
    const membersCount = (t.responsible ? 1 : 0) + (t.coworkers?.length || 0);

    return (
      <>
      <div className={`grid items-center px-4 py-3 border-b border-slate-200 dark:border-gray-700 last:border-0 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors ${isSubtask ? "bg-slate-50/50 dark:bg-gray-800/50 pl-8" : ""}`}
           style={{ gridTemplateColumns: "minmax(250px, 1.5fr) minmax(130px, 1fr) 70px 100px 120px 100px 120px 100px 60px" }}>
          
          <div className="pr-3 flex items-center gap-2 min-w-0">
            {!isSubtask && (
              <button 
                onClick={() => toggleExpand(t.id)} 
                className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer border-none bg-transparent hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-500 ${!hasSubs ? "opacity-30 cursor-default" : ""}`}
                disabled={!hasSubs}
              >
                {hasSubs ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>}
              </button>
            )}
            {isSubtask && <div className="text-slate-300 dark:text-gray-600 mr-1 shrink-0">↳</div>}
            
            <Tooltip content={t.description} subtasks={t.subtasks}>
              <div className="truncate text-[13px] font-semibold text-slate-900 dark:text-gray-50 cursor-help" title={t.title}>
                {t.title}
              </div>
            </Tooltip>
          </div>

          <div className="text-[12px] truncate text-slate-600 dark:text-gray-300 pr-2">
            {t.responsible && typeof t.responsible === "object" ? t.responsible.name : t.responsible || "—"}
          </div>

          <div className="pr-2">
            {membersCount > 0 ? (
               <button onClick={() => setTeamModalOpen({ open: true, task: t })} className="flex items-center gap-1 w-fit px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-600 dark:text-gray-300 text-[11px] font-semibold cursor-pointer border-none transition-colors">
                  <Users size={12} /> {membersCount}
               </button>
            ) : <span className="text-[11px] text-slate-400">—</span>}
          </div>

          <div className="flex flex-col items-start gap-1">
             <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: STATUS_COLOR[t.status] + "22", color: STATUS_COLOR[t.status] }}>
               {t.status}
             </span>
             {t.status === "Concluído" && (t.completed || t.completed_at) && (
               <span className="text-[9px] text-slate-400 font-medium ml-1">
                 {typeof t.completed === "string" ? t.completed : new Date(t.completed_at || t.done_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
               </span>
             )}
          </div>

          <div className="pr-4">
            {hasSubs ? (
               <div className="flex flex-col gap-1 w-full max-w-[100px]">
                 <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                   <span>{t.subtasks.filter((s:any) => s.done || s.status === 'Concluído').length}/{t.subtasks.length}</span>
                   <span>{Math.round(prog)}%</span>
                 </div>
                 <div className="h-1.5 w-full bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
                   <div className="h-full bg-primary rounded-full" style={{ width: `${prog}%` }}></div>
                 </div>
               </div>
            ) : <span className="text-[11px] text-slate-400">—</span>}
          </div>

          <div className="text-[12px] text-slate-600 dark:text-gray-300 font-medium">
            {t.deadline ? (() => {
              const d = new Date(t.deadline);
              return !isNaN(d.getTime()) ? d.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : t.deadline;
            })() : "—"}
          </div>

          <div className="text-[11px] truncate pr-2 text-slate-500 dark:text-gray-400">
            {t.type || "—"}
          </div>

          <div>
            {t.priority && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: PRIO_COLOR[t.priority as string] + "22", color: PRIO_COLOR[t.priority as string] }}>
                {t.priority}
              </span>
            )}
          </div>

          <div className="flex justify-end">
            <button
               onClick={() => onSelect(t)}
               className="w-7 h-7 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-md cursor-pointer flex items-center justify-center transition-colors"
               title="Visualizar Tarefa"
            >
               <Eye size={13} className="text-primary" />
            </button>
          </div>
        </div>

        {/* Render Subtasks if expanded */}
        {isExpanded && hasSubs && t.subtasks.map((st: any) => (
           <TableRow key={`sub-${st.id}`} t={st} isSubtask={true} />
        ))}
      </>
    );
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Lista de Tarefas"
        subtitle={`Listagem detalhada de ${filtered.length} tarefa${filtered.length !== 1 ? "s" : ""} principais`}
        actionButtons={
          <ExportButtons
            filtered={filtered}
            kpi={getKpiData(filtered, users)}
            users={users}
          />
        }
      />

      {!externalFilters && (
        <TaskFilters
          T={T}
          search={search}
          setSearch={handleSetSearch}
          sector={fSector}
          setSector={externalFilters && setSectorProp ? setSectorProp : setInternalSector}
          priority={fPriority}
          setPriority={externalFilters && setPriorityProp ? setPriorityProp : setInternalPriority}
          type={fType}
          setType={externalFilters && setTypeProp ? setTypeProp : setInternalType}
          responsible={fResponsible}
          setResponsible={externalFilters && setResponsibleProp ? setResponsibleProp : setInternalResponsible}
          contract={fContract}
          setContract={externalFilters && setContractProp ? setContractProp : setInternalContract}
          city={fCity}
          setCity={externalFilters && setCityProp ? setCityProp : setInternalCity}
          neighbor={fNeighbor}
          setNeighbor={externalFilters && setNeighborProp ? setNeighborProp : setInternalNeighbor}
          dateFrom={fDateFrom}
          setDateFrom={externalFilters && setDateFromProp ? setDateFromProp : setInternalDateFrom}
          dateTo={fDateTo}
          setDateTo={externalFilters && setDateToProp ? setDateToProp : setInternalDateTo}
          currentState={fCurrentState}
          setCurrentState={externalFilters && setCurrentState ? setCurrentState : setInternalCurrentState}
          sortField={sortField}
          setSortField={setSortField}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          contracts={contracts}
          taskTypes={taskTypes}
          sectors={sectors as any}
          citiesNeighborhoods={citiesNeighborhoods}
          onClear={clearAll}
          totalTasks={tasks.length}
          filteredTasks={filtered.length}
          canViewAllSectors={canViewAllSectors}
          createdByMe={createdByMe}
          setCreatedByMe={setCreatedByMe}
          team={team}
          setTeam={setTeam}
          teams={teams}
          users={users}
          displayedTasks={filtered}
        />
      )}

      <div className="flex-1 min-h-0 overflow-hidden rounded-[14px] bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex flex-col shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1100px]">
            {/* Header */}
            <div
              className="grid px-4 py-3 border-b border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/50"
              style={{ gridTemplateColumns: "minmax(250px, 1.5fr) minmax(130px, 1fr) 70px 100px 120px 100px 120px 100px 60px" }}
            >
              {[
                "TITULO",
                "RESPONSÁVEL",
                "EQUIPE",
                "STATUS",
                "PROGRESSO B.",
                "PRAZO",
                "TIPO",
                "PRIORIDADE",
                "",
              ].map((h, i) => (
                <span
                  key={i}
                  className={`text-[10px] font-bold text-slate-500 dark:text-gray-400 tracking-wider ${i === 8 ? "text-right" : ""}`}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Body */}
            <div className="flex flex-col">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-500 dark:text-gray-400">Nenhuma tarefa encontrada.</div>
              ) : (
                filtered.map((t: Task) => <TableRow key={t.id} t={t} />)
              )}
            </div>
          </div>
        </div>
      </div>

      {teamModalOpen?.open && teamModalOpen.task && (
        <TeamModal task={teamModalOpen.task} onClose={() => setTeamModalOpen(null)} />
      )}
    </div>
  );
}
