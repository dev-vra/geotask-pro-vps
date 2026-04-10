"use client";

import { DatePicker } from "@/app/components/DatePicker";
import { PRIO_COLOR, STATUS_COLOR } from "@/lib/constants";
import { exportToExcel, getKpiData } from "@/lib/exportUtils";
import { fmtTime, getTaskState, parseDate, sectorDisplay } from "@/lib/helpers";
import type {
  CitiesNeighborhoods,
  Sector,
  Subtask,
  Task,
  ThemeColors,
  User as UserType,
} from "@/types";
import {
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  FileText,
  MapPin,
  Plus,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DateRange } from "react-day-picker";
import { TaskFilters } from "../shared/TaskFilters";
import { PageHeader } from "../shared/PageHeader";
import { Tooltip } from "../shared/Tooltip";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";

// ── KanbanTask: extends shared Task with runtime alias ──
interface KanbanTask extends Task {
  /** Alias – API sometimes returns pre-computed time instead of time_spent */
  time?: number;
  isLegacy?: boolean;
}

// ── Inline helper component props ──────────────────────────────────

interface FilterSelectProps {
  val: string;
  onChange: (v: string) => void;
  opts: FilterOption[];
  placeholder?: string;
  label?: string;
}

interface DateRangePickerProps {
  date: DateRange | undefined;
  setDate: (d: DateRange | undefined) => void;
  label: string;
  T: ThemeColors;
}

interface ExportButtonsProps {
  filtered: KanbanTask[];
  kpi: ReturnType<typeof getKpiData>;
  users: UserType[];
  user?: UserType | null;
  filterLabel?: string;
}

interface KanbanPageProps {
  T: ThemeColors;
  tasks: KanbanTask[];
  user: UserType | null;
  onSelect: (task: KanbanTask) => void;
  onUpdate?: (id: number, action: string, data?: any) => Promise<void>;
  canCreate: boolean;
  onNew: () => void;
  users: UserType[];
  contracts?: string[];
  citiesNeighborhoods?: CitiesNeighborhoods;
  sectors?: Sector[];
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

// ── Inline helper components ────────────────────────────────────

type FilterOption =
  | string
  | {
      id?: string | number;
      name?: string;
      label?: string;
      value?: string | number;
    };

function MultiSelect({
  val = [],
  onChange,
  opts,
  placeholder = "",
}: {
  val: string[];
  onChange: (v: string[]) => void;
  opts: FilterOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (opt: string) => {
    if (val.includes(opt)) {
      onChange(val.filter((x) => x !== opt));
    } else {
      onChange([...val, opt]);
    }
  };

  const hasValue = val.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className={`px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer min-w-[140px] max-w-[200px] flex justify-between items-center bg-white dark:bg-gray-800 ${
          hasValue
            ? "border-primary text-primary"
            : "border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400"
        }`}
      >
        <span className="whitespace-nowrap overflow-hidden text-ellipsis">
          {val.length === 0
            ? placeholder
            : val.length === 1
              ? val[0]
              : `${val.length} selecionados`}
        </span>
        <ChevronDown size={14} />
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.15)] z-9999 p-1.5 min-w-[180px] max-h-[300px] overflow-y-auto">
          {opts.map((o: FilterOption, i: number) => {
            const label = typeof o === "object" ? o.name || o.label : o;
            const value = String(
              typeof o === "object" ? o.id || o.value || "" : o,
            );
            const selected = val.includes(value);
            const key =
              typeof o === "object"
                ? String(o.id || o.name || `mopt-${i}`)
                : `mopt-${o}-${i}`;

            return (
              <div
                key={key}
                onClick={() => toggle(value)}
                className={`px-2.5 py-1.5 rounded-md text-xs text-slate-900 dark:text-gray-50 cursor-pointer flex items-center gap-2 ${
                  selected ? "bg-primary/[0.07]" : "bg-transparent"
                } hover:bg-white dark:hover:bg-gray-900`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                    selected
                      ? "border-primary bg-primary"
                      : "border-slate-500 dark:border-gray-400 bg-transparent"
                  }`}
                >
                  {selected && <Check size={10} color="white" />}
                </div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  val,
  onChange,
  opts,
  placeholder = "",
  label = "",
}: FilterSelectProps) {
  return (
    <select
      value={val}
      onChange={(e) => onChange(e.target.value)}
      className={`px-2.5 py-1.5 rounded-lg border text-xs outline-none cursor-pointer max-w-[170px] bg-white dark:bg-gray-800 ${
        val
          ? "border-primary text-primary"
          : "border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400"
      }`}
    >
      <option value="">{placeholder || label}</option>
      {opts.map((o: FilterOption, i: number) => {
        const label = typeof o === "object" ? o.name || o.label : o;
        const value = String(typeof o === "object" ? o.id || o.value || "" : o);
        const key =
          typeof o === "object"
            ? String(o.id || o.name || `fopt-${i}`)
            : `fopt-${o}-${i}`;
        return (
          <option key={key} value={value}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

function DateRangePicker({ date, setDate, label, T }: DateRangePickerProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="flex-1">
          <DatePicker
            T={T}
            date={date?.from}
            setDate={(d) => setDate({ ...date, from: d })}
            label=""
          />
        </div>
        <div className="flex-1">
          <DatePicker
            T={T}
            date={date?.to}
            setDate={(d) => setDate({ from: date?.from, to: d })}
            label=""
          />
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  col,
  colIdx,
  colTasks,
  onSelect,
  tasks,
  handleSetSearch,
}: {
  col: string;
  colIdx: number;
  colTasks: KanbanTask[];
  onSelect: (t: KanbanTask) => void;
  tasks: KanbanTask[];
  handleSetSearch: (v: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: col,
  });

  return (
    <div
      ref={setNodeRef}
      className={`shrink-0 w-[272px] animate-fade-in-up transition-all duration-200 rounded-2xl ${isOver ? "bg-primary/5 ring-2 ring-primary/20 scale-[1.01]" : ""}`}
      style={{ animationDelay: `${colIdx * 0.08}s` }}
    >
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <div
          className={`w-2.5 h-2.5 rounded-full ${isOver ? "animate-pulse scale-125" : ""}`}
          style={{ background: STATUS_COLOR[col] }}
        />
        <span className="text-[13px] font-semibold text-slate-900 dark:text-gray-50 font-display">
          {col}
        </span>
        <span className="ml-auto text-[11px] px-2 py-px rounded-[20px] bg-slate-200 dark:bg-(--t-tag) text-gray-700 dark:text-gray-300 font-semibold font-kpi">
          {colTasks.length}
        </span>
      </div>
      <SortableContext
        id={col}
        items={colTasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className={`bg-slate-50 dark:bg-(--t-col) rounded-xl p-2 min-h-[200px] flex flex-col gap-2 transition-colors duration-200 ${isOver ? "bg-primary/10 dark:bg-primary/5" : ""}`}
        >
          {colTasks.map((t: KanbanTask, cardIdx: number) => (
            <KanbanCard
              key={t.id}
              t={t}
              colIdx={colIdx}
              cardIdx={cardIdx}
              onSelect={onSelect}
              tasks={tasks}
              handleSetSearch={handleSetSearch}
            />
          ))}
          {colTasks.length === 0 && (
            <div className="text-center py-[30px] text-xs text-slate-400 dark:text-gray-50">
              Sem tarefas
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

const ExportButtons = ({
  filtered,
  kpi,
  users,
  user,
  filterLabel,
}: ExportButtonsProps) => (
  <div className="flex gap-2 items-center">
    <button
      onClick={() => exportToExcel(filtered, kpi, user, filterLabel, "kanban")}
      className="bg-emerald-600 text-white border-none h-9 px-4 rounded-lg text-[13px] font-semibold cursor-pointer flex items-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-95 shadow-sm shadow-emerald-500/20"
    >
      <FileText size={15} /> EXCEL
    </button>
  </div>
);

interface KanbanCardProps {
  t: KanbanTask;
  colIdx: number;
  cardIdx: number;
  onSelect: (t: KanbanTask) => void;
  tasks: KanbanTask[];
  handleSetSearch: (v: string) => void;
  isOverlay?: boolean;
}

function KanbanCard({
  t,
  colIdx,
  cardIdx,
  onSelect,
  tasks,
  handleSetSearch,
  isOverlay = false,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: t.id,
    data: {
      type: "Task",
      task: t,
    },
  });

  const taskState = getTaskState(t);
  const stateColor = taskState?.color || "#cbd5e1";
  const prog = t.subtasks?.length
    ? (t.subtasks.filter((s: Subtask) => s.done).length / t.subtasks.length) *
      100
    : 0;
  const respName =
    t.responsible && typeof t.responsible === "object"
      ? (t.responsible as any).name
      : String(t.responsible || "") || "";
  const respInitials = respName
    ? respName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    borderLeftColor: stateColor,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onSelect(t)}
      className={`bg-white dark:bg-(--t-card) rounded-xl p-3 card-hover cursor-pointer border-l-4 shadow-sm h-full ${isDragging ? "z-50 ring-2 ring-primary" : ""} ${isOverlay ? "rotate-3 shadow-xl" : ""}`}
    >
      <Tooltip content={t.description} subtasks={t.subtasks} key={t.id}>
        <div>
          {t.parent_id && (
            <div
              className="text-[10px] text-primary/70 dark:text-primary-light font-medium mb-2 flex items-center gap-1 hover:text-primary transition-colors group/parent"
              onClick={(e) => {
                e.stopPropagation();
                const pTitle =
                  t.parent?.title ||
                  tasks.find((p: KanbanTask) => p.id === t.parent_id)?.title;
                if (pTitle) handleSetSearch(pTitle);
              }}
            >
              <span className="text-xs">↳</span>
              <span>
                Tarefa Principal:{" "}
                <b className="underline decoration-primary/20 group-hover/parent:decoration-primary/50 underline-offset-2">
                  {t.parent?.title ||
                    tasks.find((p: KanbanTask) => p.id === t.parent_id)?.title ||
                    "..."}
                </b>
              </span>
            </div>
          )}
          <div className="flex justify-between mb-[7px]">
            <span className="text-[10px] px-[7px] py-0.5 rounded-md bg-slate-100 dark:bg-(--t-tag) text-gray-600 dark:text-gray-300 font-semibold flex items-center gap-1">
              {t.type}
              {taskState && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: taskState.color,
                  }}
                />
              )}
            </span>
            <span
              className="text-[10px] px-[7px] py-0.5 rounded-md font-bold"
              style={{
                background: PRIO_COLOR[t.priority || ""] + "18",
                color: PRIO_COLOR[t.priority || ""],
              }}
            >
              {t.priority}
            </span>
          </div>
          <div className="text-[13px] font-semibold text-slate-900 dark:text-(--t-text) mb-[7px] leading-[1.3]">
            {t.title}
          </div>
          {taskState && (
            <div className="mb-[7px]">
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: taskState.color + "18",
                  color: taskState.color,
                }}
              >
                {taskState.label}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-[3px] mb-[7px]">
            <span className="text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-1">
              <Building2 size={9} />
              {sectorDisplay(t.sector)}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary-hover text-[7px] font-bold text-white shrink-0">
                {respInitials}
              </span>
              {respName || "Não atribuído"}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-1">
              <MapPin size={9} />
              {t.contract && typeof t.contract === "object"
                ? (t.contract as any).name
                : t.contract}
            </span>
            {t.city && (
              <span className="text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-1 pl-[13px]">
                {typeof t.city === "object" ? (t.city as any).name : t.city}
                {t.nucleus ? ` · ${t.nucleus}` : ""}
              </span>
            )}
            {(t.quadra || t.lote) && (
              <span className="text-[10px] text-slate-400 dark:text-gray-500 pl-[13px]">
                {t.quadra ? `Q: ${t.quadra} ` : ""}
                {t.lote ? `L: ${t.lote}` : ""}
              </span>
            )}
          </div>
          {t.deadline && (
            <div className="text-[10px] text-slate-500 dark:text-gray-400 flex items-center gap-[3px] mb-1.5">
              <Calendar size={9} />
              Prazo:{" "}
              <b className="text-slate-800 dark:text-(--t-text)">
                {(() => {
                  const d = new Date(t.deadline);
                  return !isNaN(d.getTime())
                    ? d.toLocaleDateString("pt-BR", { timeZone: "UTC" })
                    : t.deadline;
                })()}
              </b>
            </div>
          )}
          {(t.subtasks?.length ?? 0) > 0 && (
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-gray-400 mb-[3px]">
                <span>Subtarefas</span>
                <span className="font-kpi">
                  {t.subtasks!.filter((s: Subtask) => s.done).length}/
                  {t.subtasks!.length}
                </span>
              </div>
              <div className="h-[3px] bg-slate-200 dark:bg-(--t-border) rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${prog}%`,
                    background: "linear-gradient(90deg, #98af3b, #7a9e2e)",
                  }}
                />
              </div>
            </div>
          )}
          {(t.time ?? 0) > 0 && (
            <div className="text-[10px] text-slate-500 dark:text-gray-400 flex items-center gap-[3px] mt-1.5">
              <Clock size={9} />
              <span className="font-kpi">{fmtTime(t.time ?? 0)}</span>
            </div>
          )}
        </div>
      </Tooltip>
    </div>
  );
}

// ── KANBAN ─────────────────────────────────────────────────────
export default function KanbanPage({
  T,
  tasks,
  user,
  onSelect,
  onUpdate,
  canCreate,
  onNew,
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
}: KanbanPageProps) {
  // ── INTERNAL FILTER STATES (Used if not external) ──────────────────
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
  const [internalShowSubtasks, setInternalShowSubtasks] = useState(true);

  // ── RESOLVE FILTER VALUES ──────────────────────────────────────────
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
  const fCurrentState = externalFilters ? (externalQuery?.currentState || "") : (currentState || "");
  const showSubtasks = internalShowSubtasks; 

  const handleSetSearch = (v: string) => {
    if (externalFilters && setSearchProp) setSearchProp(v);
    else setInternalSearch(v);
  };
  const [sortField, setSortField] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("asc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  );

  const cityNeighborhoods = fCity ? citiesNeighborhoods[fCity] || [] : [];

  useEffect(() => {
    if (currentState !== undefined && !externalFilters) {
        // If external, the hub handles this
    }
  }, [currentState, externalFilters]);

  const cols = ["A Fazer", "Em Andamento", "Pausado", "Concluído"];

  const filtered = tasks.filter((t: KanbanTask) => {
    if (!showSubtasks && (t.parent_id || t.isLegacy)) return false;
    if (search) {
      const s = search.toLowerCase();
      const titleMatch = t.title.toLowerCase().includes(s);
      const parentTitle = t.parent?.title || tasks.find((p: KanbanTask) => p.id === t.parent_id)?.title || "";
      const parentMatch = parentTitle.toLowerCase().includes(s);
      if (!titleMatch && !parentMatch) return false;
    }
    const sectorVal =
      t.sector && typeof t.sector === "object"
        ? t.sector?.name
        : t.sector || "";
    if (fSector.length > 0 && !fSector.includes(sectorVal)) return false;
    const contractVal =
      t.contract && typeof t.contract === "object"
        ? t.contract.name
        : t.contract || "";
    if (fContract && contractVal !== fContract) return false;
    const cityVal =
      t.city && typeof t.city === "object" ? t.city.name : t.city || "";
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
    const aVal = sortField === "deadline" ? (a.deadline ? new Date(a.deadline).getTime() : (sortOrder === "desc" ? -Infinity : Infinity)) : a.title.toLowerCase();
    const bVal = sortField === "deadline" ? (b.deadline ? new Date(b.deadline).getTime() : (sortOrder === "desc" ? -Infinity : Infinity)) : b.title.toLowerCase();
    if (aVal < bVal) return sortOrder === "desc" ? 1 : -1;
    if (aVal > bVal) return sortOrder === "desc" ? -1 : 1;
    return 0;
  });

  const clearAll = () => {
    if (externalFilters) return;
    setInternalSearch("");
    setInternalSector([]);
    setInternalContract("");
    setInternalCity("");
    setInternalNeighbor("");
    setInternalPriority("");
    setInternalType("");
    setInternalResponsible("");
    setInternalDateFrom(undefined);
    setInternalDateTo(undefined);
    if (setCurrentState) setCurrentState("");
    setSortField("");
    setSortOrder("asc");
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as number;
    const overId = String(over.id);

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine destination column
    let destCol = "";
    if (cols.includes(overId)) {
      destCol = overId;
    } else {
      const overTask = tasks.find((t) => t.id === Number(overId));
      if (overTask) destCol = overTask.status;
    }

    if (destCol && destCol !== task.status) {
      if ((task.subtasks?.length ?? 0) > 0) {
        alert(
          "O status desta tarefa é gerenciado automaticamente através das suas subtarefas.",
        );
        return;
      }
      if (onUpdate) {
        await onUpdate(taskId, "update_status", { status: destCol });
      }
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div>
        {/* Header */}
        <PageHeader
          title="Quadro de Tarefas"
          subtitle={`${filtered.length} de ${tasks.length} tarefas`}
          actionButtons={
            <>
              <ExportButtons
                filtered={filtered}
                kpi={getKpiData(filtered, users)}
                users={users}
              />
              {canCreate && (
                <button
                  id="kanban-nova-tarefa-btn"
                  onClick={onNew}
                  className="flex items-center h-9 gap-2 px-4 text-white border-none rounded-lg text-[13px] font-bold cursor-pointer btn-primary active:scale-95 shadow-sm"
                >
                  <Plus size={16} />
                  NOVA TAREFA
                </button>
              )}
            </>
          }
        />

        {!externalFilters && (
          <TaskFilters
            T={T}
            search={search}
            setSearch={externalFilters ? () => {} : setInternalSearch}
            sector={fSector}
            setSector={externalFilters ? () => {} : setInternalSector}
            priority={fPriority}
            setPriority={externalFilters ? () => {} : setInternalPriority}
            type={fType}
            setType={externalFilters ? () => {} : setInternalType}
            responsible={fResponsible}
            setResponsible={externalFilters ? () => {} : setInternalResponsible}
            contract={fContract}
            setContract={externalFilters ? () => {} : setInternalContract}
            city={fCity}
            setCity={externalFilters ? () => {} : setInternalCity}
            neighbor={fNeighbor}
            setNeighbor={externalFilters && setNeighborProp ? setNeighborProp : setInternalNeighbor}
            dateFrom={fDateFrom}
            setDateFrom={externalFilters && setDateFromProp ? setDateFromProp : setInternalDateFrom}
            dateTo={fDateTo}
            setDateTo={externalFilters && setDateToProp ? setDateToProp : setInternalDateTo}
            showSubtasks={showSubtasks}
            setShowSubtasks={setInternalShowSubtasks}
            sortField={sortField}
            setSortField={setSortField}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            contracts={contracts}
            taskTypes={taskTypes}
            sectors={sectors}
            citiesNeighborhoods={citiesNeighborhoods}
            onClear={clearAll}
            totalTasks={tasks.length}
            filteredTasks={filtered.length}
            createdByMe={createdByMe}
            setCreatedByMe={setCreatedByMe}
            team={team}
            setTeam={setTeam}
            teams={teams}
            currentState={fCurrentState}
            setCurrentState={setCurrentState}
            users={users}
            canViewAllSectors={canViewAllSectors}
            displayedTasks={filtered}
          />
        )}

        {/* Colunas */}
        <div className="flex gap-3.5 overflow-x-auto pb-2">
          {cols.map((col, colIdx) => (
            <KanbanColumn
              key={col}
              col={col}
              colIdx={colIdx}
              colTasks={filtered.filter((t: KanbanTask) => t.status === col)}
              onSelect={onSelect}
              tasks={tasks}
              handleSetSearch={handleSetSearch}
            />
          ))}
        </div>

        {createPortal(
          <DragOverlay>
            {activeTask ? (
              <KanbanCard
                t={activeTask}
                colIdx={0}
                cardIdx={0}
                onSelect={() => {}}
                tasks={[]}
                handleSetSearch={() => {}}
                isOverlay
              />
            ) : null}
          </DragOverlay>,
          document.body,
        )}
      </div>
    </DndContext>
  );
}
