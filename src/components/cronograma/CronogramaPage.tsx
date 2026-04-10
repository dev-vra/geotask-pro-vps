"use client";

import { TaskFilters } from "@/components/shared/TaskFilters";
import { exportToExcel, getKpiData, type ExportKPIs } from "@/lib/exportUtils";
import { getTaskState, parseDateStr, sectorDisplay } from "@/lib/helpers";
import type {
  CitiesNeighborhoods,
  Sector,
  Task,
  ThemeColors,
  User,
} from "@/types";
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Maximize2,
  Users,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  MapPin,
  Building2,
  Clock,
  Info,
  MessageSquare,
} from "lucide-react";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { DateRange } from "react-day-picker";
import { PageHeader } from "../shared/PageHeader";
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  addWeeks, 
  subWeeks, 
  isSameDay, 
  isWithinInterval,
  startOfDay,
  addDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// ── ExportButtons ───────────────────────────────────────────────
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
      onClick={() =>
        exportToExcel(filtered, kpi, user, filterLabel, "cronograma")
      }
      className="bg-emerald-600 text-white border-none h-9 px-4 rounded-xl text-[13px] font-bold cursor-pointer flex items-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-95 shadow-lg shadow-emerald-500/20"
    >
      <FileText size={15} /> EXCEL
    </button>
  </div>
);

// ── Timeline Types ─────────────────────────────────────────────
interface CronogramaPageProps {
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
  setActiveTab?: (tab: string) => void;
}

// ── Main Page ───────────────────────────────────────────────────
export default function CronogramaPage({
  T,
  tasks: allTasks,
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
  setActiveTab
}: CronogramaPageProps) {
  // ── States ─────────────────────────────────────────────────────
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [hideCompleted, setHideCompleted] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [popoverTask, setPopoverTask] = useState<Task | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{top: number, left: number} | null>(null);
  const popoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Local Filter States
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

  // ── Helpers ────────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
    });
  }, [currentWeekStart]);

  // Week Windows (7 weeks: -3, -2, -1, Current, +1, +2, +3)
  const weekWindows = useMemo(() => {
    const windows = [];
    const base = currentWeekStart;
    for (let i = -3; i <= 3; i++) {
      windows.push(addWeeks(base, i));
    }
    return windows;
  }, [currentWeekStart]);

  const resolveFilter = (ext: any, int: any) => externalFilters ? ext : int;

  const search = resolveFilter(externalQuery?.search, internalSearch) || "";
  const fSector = resolveFilter(externalQuery?.sector, internalSector) || [];
  const fContract = resolveFilter(externalQuery?.contract, internalContract) || "";
  const fCity = resolveFilter(externalQuery?.city, internalCity) || "";
  const fNeighbor = resolveFilter(externalQuery?.neighbor, internalNeighbor) || "";
  const fPriority = resolveFilter(externalQuery?.priority, internalPriority) || "";
  const fType = resolveFilter(externalQuery?.type, internalType) || "";
  const fResponsible = resolveFilter(externalQuery?.responsible, internalResponsible) || "";
  const fDateFrom = resolveFilter(externalQuery?.dateFrom, internalDateFrom);
  const fDateTo = resolveFilter(externalQuery?.dateTo, internalDateTo);
  const fCurrentState = resolveFilter(externalQuery?.currentState, internalCurrentState) || "";

  const toggleExpand = (taskId: number) => {
    const next = new Set(expandedTasks);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setExpandedTasks(next);
  };

  const clearPopover = () => {
    if (popoverTimerRef.current) clearTimeout(popoverTimerRef.current);
    setPopoverTask(null);
    setPopoverAnchor(null);
  };

  const handleBarMouseEnter = (task: Task, e: React.MouseEvent) => {
    if (popoverTimerRef.current) clearTimeout(popoverTimerRef.current);
    setPopoverTask(task);
    setPopoverAnchor({ top: e.clientY - 10, left: e.clientX + 10 });
  };

  const handleBarMouseLeave = () => {
    popoverTimerRef.current = setTimeout(() => {
      setPopoverTask(null);
      setPopoverAnchor(null);
    }, 200);
  };

  // ── Filtering Logic ───────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return allTasks.filter((t: Task) => {
      if (hideCompleted && (t.status === "Concluído" || t.completed_at)) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      
      const sectorVal = typeof t.sector === "object" ? t.sector?.name : t.sector || "";
      if (fSector.length > 0 && !fSector.includes(sectorVal as string)) return false;
      
      const contractVal = typeof t.contract === "object" ? t.contract?.name : t.contract || "";
      if (fContract && contractVal !== fContract) return false;
      
      const cityVal = typeof t.city === "object" ? t.city?.name : t.city || "";
      if (fCity && cityVal !== fCity) return false;
      
      if (fNeighbor && t.nucleus !== fNeighbor) return false;
      if (fPriority && t.priority !== fPriority) return false;
      if (fType && t.type !== fType) return false;
      
      if (fResponsible) {
        const respName = typeof t.responsible === "object" ? t.responsible?.name : t.responsible || "";
        const isCoworker = (t.coworkers || []).some(cw => cw.name === fResponsible);
        if (respName !== fResponsible && !isCoworker) return false;
      }

      if (fDateFrom?.from || fDateFrom?.to) {
        const td = parseDateStr(t.deadline);
        if (!td) return false;
        if (fDateFrom.from && td < fDateFrom.from) return false;
        if (fDateFrom.to && td > fDateFrom.to) return false;
      }
      
      if (fCurrentState) {
        if (getTaskState(t)?.label !== fCurrentState) return false;
      }

      return true;
    });
  }, [allTasks, hideCompleted, search, fSector, fContract, fCity, fNeighbor, fPriority, fType, fResponsible, fDateFrom, fCurrentState]);

  const rootTasks = useMemo(() => {
    return filteredTasks.filter(t => !t.parent_id);
  }, [filteredTasks]);

  // ── Render Timeline ──────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500">
      <PageHeader
        title="Cronograma de Entrega"
        subtitle={`Visualização semanal de ${filteredTasks.length} tarefas`}
        actionButtons={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 h-9 px-3 rounded-xl shadow-sm">
              <input
                type="checkbox"
                id="hideCompleted"
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="hideCompleted" className="text-[12px] font-semibold text-slate-600 dark:text-gray-300 cursor-pointer whitespace-nowrap">
                Ocultar Concluídas
              </label>
            </div>
            <ExportButtons
              filtered={filteredTasks}
              kpi={getKpiData(filteredTasks, users)}
              users={users}
            />
          </div>
        }
      />

      {/* Modern Multi-Week Navigation */}
      <div className="flex items-center gap-2 bg-white dark:bg-gray-950 border border-slate-100 dark:border-gray-800 p-1.5 rounded-2xl shadow-sm overflow-x-auto no-scrollbar">
        <button
          onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
          className="flex-none p-2.5 bg-slate-50 dark:bg-gray-900 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all text-slate-400 border border-slate-100 dark:border-gray-800"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex-1 flex items-center gap-1.5 justify-center">
          {weekWindows.map((wk, idx) => {
            const isCurrent = isSameDay(wk, currentWeekStart);
            const isActualTodayWeek = isWithinInterval(new Date(), { start: wk, end: endOfWeek(wk, { weekStartsOn: 1 }) });
            
            return (
              <button
                key={wk.toISOString()}
                onClick={() => setCurrentWeekStart(wk)}
                className={`flex flex-col items-center justify-center h-12 min-w-[140px] rounded-xl transition-all border ${
                  isCurrent 
                    ? "bg-primary/[0.03] border-yellow-400 text-primary shadow-xs ring-1 ring-yellow-400/20" 
                    : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-gray-900 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200"
                } ${isActualTodayWeek && !isCurrent ? "font-bold text-primary/60 outline-dashed outline-1 outline-primary/30" : ""}`}
              >
                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
                  {format(wk, "MMM", { locale: ptBR })}
                </span>
                <span className="text-[13px] font-black">
                  {format(wk, "dd")} — {format(endOfWeek(wk, { weekStartsOn: 1 }), "dd")}
                </span>
                {isActualTodayWeek && (
                  <div className="mt-0.5 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
          className="flex-none p-2.5 bg-slate-50 dark:bg-gray-900 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all text-slate-400 border border-slate-100 dark:border-gray-800"
        >
          <ChevronRight size={20} />
        </button>
        
        <button
          onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          className="flex-none ml-2 px-4 h-12 bg-primary/5 text-primary text-[11px] font-black rounded-xl hover:bg-primary/10 transition-all uppercase tracking-widest"
        >
          Hoje
        </button>
      </div>

      {/* Main Gantt Grid */}
      <div className="relative overflow-hidden bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-900 rounded-3xl shadow-sm border-separate">
        <div className="overflow-auto max-h-[calc(100vh-320px)] custom-scrollbar">
          <div className="min-w-[1240px] flex flex-col">
            
            {/* Header Sticky */}
            <div className="sticky top-0 z-30 flex bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-slate-100 dark:border-gray-800/50">
              <div className="w-[420px] shrink-0 p-4 font-black text-[10px] text-slate-400 uppercase tracking-widest border-r border-slate-50 dark:border-gray-900">
                Tarefa / Localidade / Equipe
              </div>
              
              <div className="flex-1 flex">
                {weekDays.map((day) => (
                  <div 
                    key={day.toISOString()} 
                    className={`flex-1 flex flex-col items-center justify-center py-4 border-r border-slate-50 dark:border-gray-900 last:border-r-0 ${
                      isSameDay(day, new Date()) ? "bg-primary/[0.02]" : ""
                    }`}
                  >
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                      {format(day, "eeee", { locale: ptBR })}
                    </span>
                    <span className={`text-[17px] font-black ${isSameDay(day, new Date()) ? "text-primary" : "text-slate-700 dark:text-gray-300"}`}>
                      {format(day, "dd")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rows Container */}
            <div className="flex flex-col">
              {rootTasks.length > 0 ? (
                rootTasks.map((task) => (
                  <TimelineRow 
                    key={task.id} 
                    task={task} 
                    allTasks={filteredTasks}
                    onSelect={onSelect}
                    weekDays={weekDays}
                    expandedTasks={expandedTasks}
                    toggleExpand={toggleExpand}
                    level={0}
                    onMouseEnter={handleBarMouseEnter}
                    onMouseLeave={handleBarMouseLeave}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-30">
                  <Maximize2 size={60} className="mb-4" />
                  <p className="text-lg font-black uppercase tracking-widest">Vazio</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Popover Portal (Hover Only) */}
      {popoverTask && popoverAnchor && (
        <TaskPopover 
          task={popoverTask} 
          anchor={popoverAnchor} 
          onMouseEnter={() => { if (popoverTimerRef.current) clearTimeout(popoverTimerRef.current); }}
          onMouseLeave={handleBarMouseLeave}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-6 bg-white dark:bg-gray-950 p-4 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-xs">
        {[
          { color: "#6366f1", label: "Criada" },
          { color: "#8b5cf6", label: "Atribuída" },
          { color: "#f59e0b", label: "Iniciada" },
          { color: "#ef4444", label: "Pausa" },
          { color: "#10b981", label: "Retomada / Concluded" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
            <span className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Timeline Row Component ─────────────────────────────────────
function TimelineRow({ 
  task, 
  allTasks, 
  onSelect, 
  weekDays, 
  expandedTasks, 
  toggleExpand,
  level = 0,
  onMouseEnter,
  onMouseLeave
}: { 
  task: Task; 
  allTasks: Task[];
  onSelect: (t: Task) => void; 
  weekDays: Date[];
  expandedTasks: Set<number>;
  toggleExpand: (id: number) => void;
  level: number;
  onMouseEnter: (t: Task, e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}) {
  const isExpanded = expandedTasks.has(task.id);
  const children = allTasks.filter(t => t.parent_id === task.id);
  const hasSubtasks = children.length > 0 || (task.subtasks && task.subtasks.length > 0);
  
  const state = getTaskState(task);
  const borderColor = state?.color || "#e2e8f0";

  // Slate-800 for gray status colors for better readability
  const displayColor = borderColor === "#e2e8f0" || borderColor === "#94a3b8" || borderColor === "#f1f5f9" 
    ? "#334155" // Slate-700
    : borderColor;

  const localidade = useMemo(() => {
    const parts = [
      typeof task.contract === "object" ? task.contract?.name : task.contract,
      typeof task.city === "object" ? task.city?.name : task.city,
      task.nucleus,
      task.quadra ? `Q: ${task.quadra}` : null,
      task.lote ? `L: ${task.lote}` : null,
    ].filter(Boolean);
    return parts.join(" · ");
  }, [task]);

  const hasTeam = task.coworkers && task.coworkers.length > 0;

  return (
    <>
      <div 
        className={`group flex border-b border-slate-50 dark:border-gray-900/50 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors relative ${level > 0 ? "bg-slate-50/10 dark:bg-white/[0.01]" : ""}`}
      >
        {/* Cascade Connection Line (Orange) */}
        {level > 0 && (
          <div className="absolute left-[20px] top-0 bottom-0 w-px bg-orange-400 opacity-40 z-10" />
        )}

        <div 
          className="w-[420px] shrink-0 pt-3 pb-3 px-4 border-r border-slate-50 dark:border-gray-900 flex flex-col gap-1 cursor-pointer relative"
          onClick={() => onSelect(task)}
          style={{ 
            borderLeft: `6px solid ${displayColor}`,
            paddingLeft: `${level * 20 + 16}px`
          }}
        >
          {/* Level indicator for depth */}
          {level > 0 && (
            <div 
              className="absolute top-[20px] left-[20px] w-[14px] h-px bg-orange-400 opacity-40" 
            />
          )}

          <div className="flex items-center gap-2">
            {hasSubtasks && (
              <button 
                onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}
                className="p-1 hover:bg-slate-200 dark:hover:bg-gray-800 rounded transition-colors"
                style={{ marginLeft: level > 0 ? "8px" : "0px" }}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
              </button>
            )}
            
            <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ background: displayColor }} />
            
            <span className="flex-1 font-black text-[14px] text-slate-800 dark:text-gray-100 truncate pr-2 uppercase tracking-tight">
              {task.title}
            </span>
          </div>
          
          <div className="flex flex-col gap-1.5 ml-8">
            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
              <MapPin size={10} className="shrink-0 text-slate-300 dark:text-slate-700" />
              <span className="truncate opacity-70 tracking-tight">{localidade || "Localidade não informada"}</span>
            </span>
            <div className="flex items-center gap-2.5">
              <span className="text-[9px] font-black text-primary/80 flex items-center gap-1 px-2 py-0.5 bg-primary/5 dark:bg-primary/10 rounded-md border border-primary/10">
                <Building2 size={10} />
                {sectorDisplay(task.sector)}
              </span>
              
              <span className="text-[9px] font-black text-slate-500 dark:text-gray-400 flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-gray-800 rounded-md border border-slate-100 dark:border-gray-700">
                <Users size={10} />
                {typeof task.responsible === "object" ? task.responsible?.name : task.responsible || "Pendente"}
              </span>

              {hasTeam && (
                <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded shadow-sm shadow-emerald-500/20 uppercase tracking-widest animate-in slide-in-from-left-2 duration-300">
                  Equipe
                </span>
              )}
            </div>

            {/* Status with Darker Blue-Grey for readability */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span 
                className="text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest"
                style={{ 
                  color: displayColor, 
                  borderColor: `${displayColor}30`, 
                  backgroundColor: `${displayColor}08` 
                }}
              >
                {task.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex relative items-center py-2.5 bg-slate-50/20 dark:bg-transparent">
          <div className="absolute inset-0 flex pointer-events-none">
            {weekDays.map((_, i) => (
              <div key={i} className="flex-1 border-r border-slate-100/50 dark:border-gray-900 last:border-r-0" />
            ))}
          </div>

          <TimelineBar 
            task={task} 
            weekDays={weekDays} 
            color={displayColor}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          />
        </div>
      </div>

      {isExpanded && children.map(child => (
        <TimelineRow 
          key={child.id} 
          task={child} 
          allTasks={allTasks}
          onSelect={onSelect}
          weekDays={weekDays}
          expandedTasks={expandedTasks}
          toggleExpand={toggleExpand}
          level={level + 1}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      ))}
    </>
  );
}

// ── Timeline Bar Component ─────────────────────────────────────
function TimelineBar({ task, weekDays, color, onMouseEnter, onMouseLeave }: { task: Task; weekDays: Date[]; color: string; onMouseEnter: (t: Task, e: React.MouseEvent) => void; onMouseLeave: () => void }) {
  const weekStart = startOfDay(weekDays[0]).getTime();
  const weekEnd = startOfDay(addDays(weekDays[6], 1)).getTime();
  const weekDuration = weekEnd - weekStart;

  const parsedStart = task.created_at ? parseDateStr(task.created_at) : null;
  const startDate = parsedStart && !isNaN(parsedStart.getTime()) ? startOfDay(parsedStart).getTime() : weekStart;
  
  const parsedDeadline = task.deadline ? parseDateStr(task.deadline) : null;
  const deadlineDate = parsedDeadline && !isNaN(parsedDeadline.getTime()) ? startOfDay(parsedDeadline).getTime() : null;
  const isInfinite = !deadlineDate;

  const barStart = Math.max(startDate, weekStart);
  const barEndBound = deadlineDate ? Math.min(deadlineDate, weekEnd) : weekEnd;
  
  const left = ((barStart - weekStart) / weekDuration) * 100;
  const width = ((barEndBound - barStart) / weekDuration) * 100;

  if (barStart >= weekEnd || (deadlineDate && barEndBound <= weekStart)) return null;

  const isClippedLeft = startDate < weekStart;
  const isClippedRight = deadlineDate ? deadlineDate > weekEnd : true;

  return (
    <div 
      className="absolute h-12 flex items-center px-1 group/container"
      style={{ 
        left: `${left}%`, 
        width: `${width}%`,
        minWidth: '24px'
      }}
      onMouseEnter={(e) => onMouseEnter(task, e)}
      onMouseLeave={onMouseLeave}
    >
      <div 
        className="h-8 w-full rounded-2xl shadow-xl transition-all relative overflow-hidden flex items-center px-1 border-2 border-white dark:border-gray-900 cursor-help"
        style={{ 
          backgroundColor: `${color}25`,
          borderColor: color,
          borderRightWidth: isInfinite ? 0 : 2,
          borderLeftWidth: isClippedLeft ? 0 : 2,
          borderTopLeftRadius: isClippedLeft ? 0 : 16,
          borderBottomLeftRadius: isClippedLeft ? 0 : 16,
          borderTopRightRadius: isClippedRight && isInfinite ? 0 : 16,
          borderBottomRightRadius: isClippedRight && isInfinite ? 0 : 16,
          maskImage: isInfinite ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none',
          boxShadow: `0 4px 15px ${color}15`
        }}
      >
        {(task.status === "Concluído" || task.completed_at) && (
          <div className="absolute inset-0 bg-emerald-500 opacity-20" />
        )}
      </div>

      <div className="absolute inset-0 flex items-center pointer-events-none px-2 justify-between">
        <Milestone date={task.created_at} weekStart={weekStart} weekEnd={weekEnd} color="#6366f1" label="Criação" duration={weekDuration} />
        <Milestone date={task.assigned} weekStart={weekStart} weekEnd={weekEnd} color="#8b5cf6" label="Atribuição" duration={weekDuration} />
        <Milestone date={task.started_at} weekStart={weekStart} weekEnd={weekEnd} color="#f59e0b" label="Início" duration={weekDuration} />
        
        {task.pauses?.map((p, i) => (
          <React.Fragment key={i}>
            <Milestone date={p.started_at} weekStart={weekStart} weekEnd={weekEnd} color="#ef4444" label="Pausa" duration={weekDuration} />
            {p.ended_at && <Milestone date={p.ended_at} weekStart={weekStart} weekEnd={weekEnd} color="#10b981" label="Retomada" duration={weekDuration} />}
          </React.Fragment>
        ))}

        <Milestone date={task.completed_at} weekStart={weekStart} weekEnd={weekEnd} color="#10b981" label="Conclusão" duration={weekDuration} />
      </div>
    </div>
  );
}

function Milestone({ date, weekStart, weekEnd, color, label, duration }: { date?: string | null; weekStart: number; weekEnd: number; color: string; label: string; duration: number }) {
  if (!date) return null;
  const parsedDate = parseDateStr(date);
  if (!parsedDate || isNaN(parsedDate.getTime())) return null;
  
  const d = startOfDay(parsedDate).getTime();
  if (d < weekStart || d >= weekEnd) return null;
  const relPos = ((d - weekStart) / duration) * 100;
  
  return (
    <div 
      className="absolute w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 shadow-md z-20 group/ms pointer-events-auto"
      style={{ left: `${relPos}%`, background: color }}
    >
      <div className="invisible group-hover/ms:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-slate-900 text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl whitespace-nowrap z-50 shadow-2xl pointer-events-none transition-all duration-300 scale-0 group-hover/ms:scale-100 origin-bottom flex flex-col items-center">
        <span className="text-[8px] uppercase tracking-tighter opacity-70 leading-none mb-0.5">{label}</span>
        <span>{format(parsedDate, "dd 'de' MMM", { locale: ptBR })}</span>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}

// ── Hover Task Detail Card Component ──────────────────────────
function TaskPopover({ task, anchor, onMouseEnter, onMouseLeave }: { 
  task: Task; 
  anchor: {top: number, left: number}; 
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const portalNode = typeof document !== 'undefined' ? document.getElementById("tooltip-root") : null;

  if (!portalNode) return null;

  const state = getTaskState(task);
  const statusColor = state?.color || "#64748b";
  const lastComment = task.comments && task.comments.length > 0 
    ? [...task.comments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null;

  return createPortal(
    <div 
      ref={containerRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-[9999] w-[360px] bg-white dark:bg-gray-900 border border-slate-100 dark:border-white/5 rounded-[2.5rem] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.4)] animate-scale-in p-7 overflow-hidden pointer-events-auto"
      style={{ 
        top: Math.min(anchor.top, window.innerHeight - 450), 
        left: Math.min(anchor.left, window.innerWidth - 380) 
      }}
    >
      {/* Decorative top shape */}
      <div 
        className="absolute top-0 left-0 right-0 h-2 opacity-80"
        style={{ background: statusColor }}
      />

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span 
              className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl border"
              style={{ color: statusColor, borderColor: `${statusColor}30`, backgroundColor: `${statusColor}05` }}
            >
              {task.status}
            </span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest grayscale opacity-60">
              {task.type}
            </span>
          </div>
          <h3 className="text-[18px] font-black text-slate-900 dark:text-gray-50 leading-tight pr-4">
            {task.title}
          </h3>
          {task.created_by && (
            <span className="text-[10px] font-bold text-slate-400 mt-0.5">
              Tarefa criada por <span className="text-primary/70">{typeof task.created_by === "object" ? task.created_by?.name : task.created_by}</span> {task.created_at && `em ${format(new Date(task.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3.5 py-5 border-y border-slate-50 dark:border-white/5">
          <div className="flex items-start gap-3 text-[12px] text-slate-600 dark:text-gray-300">
            <div className="p-2 bg-slate-50 dark:bg-gray-800 rounded-xl shrink-0">
              <MapPin size={14} className="text-primary" />
            </div>
            <span className="leading-snug font-bold">
              {typeof task.contract === "object" ? task.contract?.name : task.contract}<br/>
              <span className="text-[11px] opacity-70 font-medium">{typeof task.city === "object" ? task.city?.name : task.city} • {task.nucleus}</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[12px] text-slate-600 dark:text-gray-300">
            <div className="p-2 bg-slate-50 dark:bg-gray-800 rounded-xl shrink-0">
              <Users size={14} className="text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold">Resp: {typeof task.responsible === "object" ? task.responsible?.name : task.responsible}</span>
              {task.coworkers && task.coworkers.length > 0 && (
                <span className="text-[10px] opacity-60 font-medium">Equipe: {task.coworkers.length} colaboradores</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-[12px] text-slate-600 dark:text-gray-300">
            <div className="p-2 bg-slate-50 dark:bg-gray-800 rounded-xl shrink-0">
              <Clock size={14} className="text-primary" />
            </div>
            <span className="font-bold">Prazo: {task.deadline || "Não definido"}</span>
          </div>
        </div>

        {task.description && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Descrição</span>
            <p className="text-[12px] text-slate-500 dark:text-gray-400 leading-relaxed max-h-24 overflow-y-auto pr-2 custom-scrollbar">
              {task.description}
            </p>
          </div>
        )}

        {lastComment && (
          <div className="mt-2 p-4 bg-slate-50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-white/5 relative">
            <MessageSquare size={14} className="absolute -top-2 -right-2 text-primary bg-white dark:bg-gray-900 rounded-full p-0.5 border border-primary/20" />
            <span className="text-[9px] font-black uppercase text-primary/60 tracking-widest block mb-1">Último Comentário</span>
            <p className="text-[11px] text-slate-600 dark:text-gray-300 italic line-clamp-3">
              "{lastComment.content}"
            </p>
            <span className="text-[9px] mt-2 block opacity-50 font-bold">
              — {lastComment.user?.name || "Usuário"} em {format(new Date(lastComment.created_at), "dd/MM")}
            </span>
          </div>
        )}
      </div>
    </div>,
    portalNode
  );
}
