"use client";

import { TaskFilters } from "@/components/shared/TaskFilters";
import { PageHeader } from "../shared/PageHeader";
import { exportToExcel, getKpiData, type ExportKPIs } from "@/lib/exportUtils";
import type {
  CitiesNeighborhoods,
  Subtask,
  Task,
  ThemeColors,
  User,
} from "@/types";
import { ArrowLeft, Calendar, Check, Eye, FileText, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DateRange } from "react-day-picker";

// ── Local mind-map hierarchy types ────────────────────────────────────

interface MindMapNeighborhood {
  id: number;
  name: string;
  tasks: Task[];
}

interface MindMapCity {
  id: number;
  name: string;
  neighborhoods: MindMapNeighborhood[];
}

interface MindMapContract {
  id: number;
  name: string;
  cities: MindMapCity[];
}

interface MindMapSelection {
  contractId: number | null;
  cityId: number | null;
  neighborhoodId: number | null;
  taskId: number | null;
}

// ── Component prop interfaces ─────────────────────────────────────────

interface ExportButtonsProps {
  filtered: Task[];
  kpi: ExportKPIs;
  users: User[];
  user?: User | null;
  filterLabel?: string;
}

interface NodeProps {
  id: string;
  label: string;
  sub?: string;
  color: string;
  selected: boolean;
  onClick: () => void;
}

interface MindMapPageProps {
  T: ThemeColors;
  tasks?: Task[];
  users?: User[];
  contracts?: string[];
  citiesNeighborhoods?: CitiesNeighborhoods;
  externalFilters?: boolean;
  externalQuery?: any;
}

const STATUS_COLOR: Record<string, string> = {
  "A Fazer": "#6366f1",
  "Em Andamento": "#f59e0b",
  Pausado: "#ef4444",
  Concluído: "#10b981",
};

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

export default function MindMapPage({
  T,
  tasks = [],
  users = [],
  contracts = [],
  citiesNeighborhoods = {},
  externalFilters = false,
  externalQuery,
}: MindMapPageProps) {
  // ── Filter States ──
  const [fSearch, setFSearch] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fSector, setFSector] = useState<string[]>([]);
  const [fPriority, setFPriority] = useState("");
  const [fType, setFType] = useState("");
  const [fContract, setFContract] = useState("");
  const [fCity, setFCity] = useState("");
  const [fNeighbor, setFNeighbor] = useState("");
  const [fUser, setFUser] = useState("");
  const [fDateFrom, setFDateFrom] = useState<DateRange | undefined>(undefined);
  const [fDateTo, setFDateTo] = useState<DateRange | undefined>(undefined);

  const [sel, setSel] = useState<MindMapSelection>({
    contractId: null,
    cityId: null,
    neighborhoodId: null,
    taskId: null,
  });

  const clearAll = () => {
    setFSearch("");
    setFStatus("");
    setFSector([]);
    setFPriority("");
    setFType("");
    setFContract("");
    setFCity("");
    setFNeighbor("");
    setFUser("");
    setFDateFrom(undefined);
    setFDateTo(undefined);
  };

  const [detail, setDetail] = useState<Task | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLElement>>({});
  const [lines, setLines] = useState<
    { x1: number; y1: number; x2: number; y2: number; active: boolean }[]
  >([]);
  const [svgDim, setSvgDim] = useState({ w: 800, h: 600 });

  // ── Filtering Logic ──
  const parseDateLocal = (d: string | null | undefined) => {
    if (!d) return null;
    const [day, month, year] = d.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  const filteredTasks = externalFilters ? tasks : tasks.filter((t) => {
    if (fSearch && !t.title.toLowerCase().includes(fSearch.toLowerCase()))
      return false;
    if (fStatus && t.status !== fStatus) return false;

    const sectorVal =
      t.sector && typeof t.sector === "object"
        ? (t.sector as any).name
        : t.sector || "";
    if (fSector.length > 0 && !fSector.includes(sectorVal)) return false;

    if (fPriority && t.priority !== fPriority) return false;
    if (fType && t.type !== fType) return false;

    const contractVal =
      t.contract && typeof t.contract === "object"
        ? (t.contract as any).name
        : t.contract || "";
    if (fContract && contractVal !== fContract) return false;

    const cityVal =
      t.city && typeof t.city === "object"
        ? (t.city as any).name
        : t.city || "";
    if (fCity && cityVal !== fCity) return false;

    if (fNeighbor && t.nucleus !== fNeighbor) return false;

    const respName =
      t.responsible && typeof t.responsible === "object"
        ? (t.responsible as any).name
        : t.responsible || "";
    if (fUser && respName !== fUser) return false;

    if (fDateFrom?.from || fDateFrom?.to) {
      const td = parseDateLocal(t.deadline);
      if (!td) return false;
      if (fDateFrom.from && td < fDateFrom.from) return false;
      if (fDateFrom.to && td > fDateFrom.to) return false;
    }
    if (fDateTo?.from || fDateTo?.to) {
      const td = parseDateLocal(t.created_at);
      if (!td) return false;
      if (fDateTo.from && td < fDateTo.from) return false;
      if (fDateTo.to && td > fDateTo.to) return false;
    }

    return true;
  });

  // Build hierarchy from filtered tasks
  const CONTRACTS_MM = (() => {
    const contractMap: Record<string, MindMapContract> = {};
    let cid = 0,
      cityId = 0,
      neighId = 0;
    filteredTasks.forEach((t: Task) => {
      if (!t.contract) return;
      if (t.parent_id) return; // skip subtasks — they show under their parent
      const contractName =
        t.contract && typeof t.contract === "object"
          ? (t.contract as any)?.name || ""
          : String(t.contract);
      const cityName =
        t.city && typeof t.city === "object"
          ? (t.city as any)?.name || "Sem cidade"
          : String(t.city || "Sem cidade");
      if (!contractMap[contractName]) {
        contractMap[contractName] = {
          id: ++cid,
          name: contractName,
          cities: [],
        };
      }
      const cObj = contractMap[contractName];
      let cityObj = cObj.cities.find((c: MindMapCity) => c.name === cityName);
      if (!cityObj) {
        cityObj = {
          id: ++cityId,
          name: cityName,
          neighborhoods: [],
        };
        cObj.cities.push(cityObj);
      }
      const neighName = t.nucleus || "Sem bairro";
      let neighObj = cityObj.neighborhoods.find(
        (n: MindMapNeighborhood) => n.name === neighName,
      );
      if (!neighObj) {
        neighObj = { id: ++neighId, name: neighName, tasks: [] };
        cityObj.neighborhoods.push(neighObj);
      }
      neighObj.tasks.push(t);
    });
    return Object.values(contractMap);
  })();

  const contract = CONTRACTS_MM.find(
    (c: MindMapContract) => c.id === sel.contractId,
  );
  const cities = contract?.cities || [];
  const city = cities.find((c: MindMapCity) => c.id === sel.cityId);
  const neighborhoods = city?.neighborhoods || [];
  const neighborhood = neighborhoods.find(
    (n: MindMapNeighborhood) => n.id === sel.neighborhoodId,
  );
  const taskList = neighborhood?.tasks || [];
  const task = taskList.find((t: Task) => t.id === sel.taskId);
  const subtasks = task?.subtasks || [];
  const setRef = (key: string, el: HTMLElement | null) => {
    if (el) nodeRefs.current[key] = el;
  };

  const computeLines = () => {
    const cont = containerRef.current;
    if (!cont) return;
    const cRect = cont.getBoundingClientRect(),
      sl = cont.scrollLeft,
      st = cont.scrollTop;
    const nl: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      active: boolean;
    }[] = [];
    const ge = (key: string) => {
      const el = nodeRefs.current[key];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        rx: r.right - cRect.left + sl,
        lx: r.left - cRect.left + sl,
        my: r.top + r.height / 2 - cRect.top + st,
      };
    };
    const cn = (fk: string, tk: string, a: boolean) => {
      const f = ge(fk),
        t2 = ge(tk);
      if (f && t2)
        nl.push({ x1: f.rx, y1: f.my, x2: t2.lx, y2: t2.my, active: a });
    };
    if (sel.contractId != null)
      cities.forEach((c: MindMapCity) =>
        cn(`contract-${sel.contractId}`, `city-${c.id}`, c.id === sel.cityId),
      );
    if (sel.cityId != null)
      neighborhoods.forEach((n: MindMapNeighborhood) =>
        cn(`city-${sel.cityId}`, `neigh-${n.id}`, n.id === sel.neighborhoodId),
      );
    if (sel.neighborhoodId != null)
      taskList.forEach((t: Task) =>
        cn(`neigh-${sel.neighborhoodId}`, `task-${t.id}`, t.id === sel.taskId),
      );
    if (sel.taskId != null)
      subtasks.forEach((s: Subtask) =>
        cn(`task-${sel.taskId}`, `sub-${s.id}`, true),
      );
    setSvgDim({ w: cont.scrollWidth, h: cont.scrollHeight });
    setLines(nl);
  };
  useEffect(() => {
    const t = setTimeout(computeLines, 80);
    return () => clearTimeout(t);
  }, [sel]);

  const LC = ["#98af3b", "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981"];

  const Node = ({ id, label, sub, color, selected, onClick }: NodeProps) => (
    <div
      ref={(el) => setRef(id, el)}
      onClick={onClick}
      className="rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-150 select-none"
      style={{
        background: selected ? color : "var(--t-card)",
        border: `2px solid ${selected ? color : "var(--t-border)"}`,
        boxShadow: selected ? `0 0 0 4px ${color}28` : "none",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.boxShadow = `0 0 0 3px ${color}18`;
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "var(--t-border)";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
      <div
        className={`text-xs font-bold leading-[1.4] ${sub ? "mb-[3px]" : ""}`}
        style={{ color: selected ? "white" : "var(--t-text)" }}
      >
        {label}
      </div>
      {sub && (
        <div
          className="text-[10px]"
          style={{ color: selected ? "rgba(255,255,255,0.7)" : "var(--t-sub)" }}
        >
          {sub}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Mapa de Tarefas"
        subtitle={sel.contractId != null ? "Navegando na hierarquia" : "Clique nos nós para expandir a hierarquia"}
        actionButtons={
          <>
            {sel.contractId != null && (
              <button
                onClick={() =>
                  setSel({
                    contractId: null,
                    cityId: null,
                    neighborhoodId: null,
                    taskId: null,
                  })
                }
                className="flex items-center h-9 gap-2 px-3 rounded-lg text-[13px] font-medium cursor-pointer bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <ArrowLeft size={14} /> Resetar
              </button>
            )}
            <ExportButtons
              filtered={filteredTasks}
              kpi={getKpiData(filteredTasks, users)}
              users={users}
            />
          </>
        }
      />

      {!externalFilters && (
        <TaskFilters
          T={T}
          search={fSearch}
          setSearch={setFSearch}
          status={fStatus}
          setStatus={setFStatus}
          sector={fSector}
          setSector={setFSector}
          priority={fPriority}
          setPriority={setFPriority}
          type={fType}
          setType={setFType}
          contract={fContract}
          setContract={setFContract}
          city={fCity}
          setCity={setFCity}
          neighbor={fNeighbor}
          setNeighbor={setFNeighbor}
          responsible={fUser}
          setResponsible={setFUser}
          dateFrom={fDateFrom}
          setDateFrom={setFDateFrom}
          dateTo={fDateTo}
          setDateTo={setFDateTo}
          users={users}
          contracts={contracts}
          citiesNeighborhoods={citiesNeighborhoods}
          onClear={clearAll}
          totalTasks={tasks.length}
          filteredTasks={filteredTasks.length}
        />
      )}
      <div
        ref={containerRef}
        className="relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)] min-h-[300px] rounded-2xl p-7 px-5 border"
        style={{
          background: "var(--t-mm-bg)",
          borderColor: "var(--t-border)",
        }}
      >
        <svg
          className="absolute top-0 left-0 pointer-events-none z-0"
          style={{ width: svgDim.w, height: svgDim.h }}
        >
          {lines.map((l, i) => {
            const mx = (l.x1 + l.x2) / 2;
            return (
              <path
                key={i}
                d={`M${l.x1},${l.y1} C${mx},${l.y1} ${mx},${l.y2} ${l.x2},${l.y2}`}
                fill="none"
                stroke={l.active ? "#98af3b" : "var(--t-border)"}
                strokeWidth={l.active ? 2 : 1.5}
                strokeDasharray={l.active ? undefined : "5,4"}
                opacity={l.active ? 0.85 : 0.5}
              />
            );
          })}
        </svg>
        <div className="relative z-0 inline-flex items-start min-w-full gap-[56px]">
          <div className="flex flex-col gap-2 shrink-0 w-[190px]">
            <div
              className="text-[10px] font-extrabold mb-1 uppercase tracking-[0.06em] flex items-center gap-[5px]"
              style={{ color: LC[0] }}
            >
              <div
                className="w-[7px] h-[7px] rounded-full"
                style={{ background: LC[0] }}
              />
              Contratos
            </div>
            {CONTRACTS_MM.map((c) => (
              <Node
                key={c.id}
                id={`contract-${c.id}`}
                label={c.name}
                sub={`${c.cities.length} cidade(s)`}
                color={LC[0]}
                selected={sel.contractId === c.id}
                onClick={() =>
                  setSel({
                    contractId: c.id === sel.contractId ? null : c.id,
                    cityId: null,
                    neighborhoodId: null,
                    taskId: null,
                  })
                }
              />
            ))}
          </div>
          {sel.contractId != null && (
            <div className="flex flex-col gap-2 shrink-0 w-[190px]">
              <div
                className="text-[10px] font-extrabold mb-1 uppercase tracking-[0.06em] flex items-center gap-[5px]"
                style={{ color: LC[1] }}
              >
                <div
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ background: LC[1] }}
                />
                Cidades
              </div>
              {cities.map((c: MindMapCity) => (
                <Node
                  key={c.id}
                  id={`city-${c.id}`}
                  label={c.name}
                  sub={`${c.neighborhoods.length} bairro(s)`}
                  color={LC[1]}
                  selected={sel.cityId === c.id}
                  onClick={() =>
                    setSel((s: MindMapSelection) => ({
                      ...s,
                      cityId: c.id === s.cityId ? null : c.id,
                      neighborhoodId: null,
                      taskId: null,
                    }))
                  }
                />
              ))}
            </div>
          )}
          {sel.cityId != null && (
            <div className="flex flex-col gap-2 shrink-0 w-[190px]">
              <div
                className="text-[10px] font-extrabold mb-1 uppercase tracking-[0.06em] flex items-center gap-[5px]"
                style={{ color: LC[2] }}
              >
                <div
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ background: LC[2] }}
                />
                Bairros
              </div>
              {neighborhoods.map((n: MindMapNeighborhood) => (
                <Node
                  key={n.id}
                  id={`neigh-${n.id}`}
                  label={n.name}
                  sub={`${n.tasks.length} tarefa(s)`}
                  color={LC[2]}
                  selected={sel.neighborhoodId === n.id}
                  onClick={() =>
                    setSel((s: MindMapSelection) => ({
                      ...s,
                      neighborhoodId: n.id === s.neighborhoodId ? null : n.id,
                      taskId: null,
                    }))
                  }
                />
              ))}
            </div>
          )}
          {sel.neighborhoodId != null && (
            <div className="flex flex-col gap-2 shrink-0 w-[210px]">
              <div
                className="text-[10px] font-extrabold mb-1 uppercase tracking-[0.06em] flex items-center gap-[5px]"
                style={{ color: LC[3] }}
              >
                <div
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ background: LC[3] }}
                />
                Tarefas
              </div>
              {taskList.length === 0 && (
                <div className="text-xs text-center p-5 text-slate-500 dark:text-gray-400">
                  Sem tarefas
                </div>
              )}
              {taskList.map((t: Task) => {
                const sc = STATUS_COLOR[t.status],
                  isSel = sel.taskId === t.id;
                return (
                  <div
                    key={t.id}
                    ref={(el) => setRef(`task-${t.id}`, el)}
                    className="rounded-xl px-3 py-2.5 transition-all duration-150"
                    style={{
                      background: isSel ? LC[3] : "var(--t-card)",
                      border: `2px solid ${isSel ? LC[3] : "var(--t-border)"}`,
                    }}
                  >
                    <div
                      onClick={() =>
                        setSel((s: MindMapSelection) => ({
                          ...s,
                          taskId: t.id === s.taskId ? null : t.id,
                        }))
                      }
                      className="cursor-pointer mb-2"
                    >
                      <div
                        className="text-xs font-bold leading-[1.4] mb-[5px]"
                        style={{ color: isSel ? "white" : "var(--t-text)" }}
                      >
                        {t.title}
                      </div>
                      <span
                        className="text-[10px] px-[7px] py-[2px] rounded-full font-semibold"
                        style={{
                          background: sc + "33",
                          color: isSel ? "white" : sc,
                        }}
                      >
                        {t.status}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetail(t);
                      }}
                      className="w-full px-2 py-[5px] rounded-[7px] text-[11px] font-bold cursor-pointer flex items-center justify-center gap-[5px]"
                      style={{
                        background: isSel
                          ? "rgba(255,255,255,0.2)"
                          : "#98af3b11",
                        border: `1px solid ${isSel ? "rgba(255,255,255,0.3)" : "#98af3b33"}`,
                        color: isSel ? "white" : "#98af3b",
                      }}
                    >
                      <Eye size={11} />
                      Ver detalhes
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {sel.taskId != null && (
            <div className="flex flex-col gap-2 shrink-0 w-[190px]">
              <div
                className="text-[10px] font-extrabold mb-1 uppercase tracking-[0.06em] flex items-center gap-[5px]"
                style={{ color: LC[4] }}
              >
                <div
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ background: LC[4] }}
                />
                Subtarefas
              </div>
              {subtasks.length === 0 && (
                <div className="text-xs text-center p-5 text-slate-500 dark:text-gray-400">
                  Sem subtarefas
                </div>
              )}
              {subtasks.map((s: Subtask) => (
                <div
                  key={s.id}
                  ref={(el) => setRef(`sub-${s.id}`, el)}
                  className="rounded-xl px-3 py-2.5"
                  style={{
                    background: s.done ? LC[4] : "var(--t-card)",
                    border: `2px solid ${s.done ? LC[4] : "var(--t-border)"}`,
                  }}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0 mt-px"
                      style={{
                        background: s.done
                          ? "rgba(255,255,255,0.3)"
                          : "transparent",
                        border: s.done ? "none" : "2px solid var(--t-border)",
                      }}
                    >
                      {s.done && <Check size={9} color="white" />}
                    </div>
                    <div>
                      <div
                        className="text-xs font-semibold"
                        style={{ color: s.done ? "white" : "var(--t-text)" }}
                      >
                        {s.title}
                      </div>
                      <div
                        className="text-[10px] mt-0.5"
                        style={{
                          color: s.done
                            ? "rgba(255,255,255,0.65)"
                            : "var(--t-sub)",
                        }}
                      >
                        {s.done ? "Concluida" : "Pendente"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetail(task ?? null)}
                    className="w-full px-2 py-1 rounded-[7px] text-[11px] font-bold cursor-pointer flex items-center justify-center gap-[5px]"
                    style={{
                      background: s.done
                        ? "rgba(255,255,255,0.18)"
                        : "#10b98111",
                      border: `1px solid ${s.done ? "rgba(255,255,255,0.3)" : "#10b98133"}`,
                      color: s.done ? "white" : "#10b981",
                    }}
                  >
                    <Eye size={10} />
                    Ver tarefa
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {sel.contractId == null && (
        <div className="text-center p-5 text-[13px] text-slate-500 dark:text-gray-400">
          Clique em um contrato para comecar a expandir o mapa
        </div>
      )}
      {detail && (
        <div
          onClick={() => setDetail(null)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 font-[system-ui,sans-serif]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[500px] rounded-[20px] p-6 max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <span
                  className="text-[11px] font-semibold px-2.5 py-[3px] rounded-full"
                  style={{
                    background: STATUS_COLOR[detail.status] + "22",
                    color: STATUS_COLOR[detail.status],
                  }}
                >
                  {detail.status}
                </span>
                <h2 className="mt-1.5 mb-0 text-lg font-bold text-slate-900 dark:text-gray-50">
                  {detail.title}
                </h2>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="border-none rounded-lg p-1.5 cursor-pointer bg-slate-100 dark:bg-gray-700"
              >
                <X size={16} className="text-slate-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                ["Tipo", detail.type],
                ["Prioridade", detail.priority],
                ["Setor", detail.sector],
                ["Responsavel", detail.responsible],
                ["Contrato", detail.contract],
                ["Prazo", detail.deadline || "\u2014"],
              ].map(([k, v]) => (
                <div
                  key={k as string}
                  className="rounded-lg px-3 py-2 bg-slate-100 dark:bg-gray-700"
                >
                  <div className="text-[10px] font-semibold mb-0.5 text-slate-500 dark:text-gray-400">
                    {(k as string).toUpperCase()}
                  </div>
                  <div className="text-[13px] font-semibold text-slate-900 dark:text-gray-50">
                    {v as React.ReactNode}
                  </div>
                </div>
              ))}
            </div>
            {detail.subtasks?.length && detail.subtasks.length > 0 && (
              <div>
                <div className="text-[11px] font-bold mb-2 text-slate-500 dark:text-gray-400">
                  SUBTAREFAS
                </div>
                {detail.subtasks.map((s: Subtask) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 px-2.5 py-[7px] rounded-lg mb-[5px] bg-slate-100 dark:bg-gray-700"
                  >
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                      style={{
                        background: s.done ? "#10b981" : "transparent",
                        border: s.done ? "none" : "1px solid var(--t-border)",
                      }}
                    >
                      {s.done && <Check size={10} color="white" />}
                    </div>
                    <span
                      className={`text-[13px] ${s.done ? "text-slate-500 dark:text-gray-400 line-through" : "text-slate-900 dark:text-gray-50"}`}
                    >
                      {s.title}
                    </span>
                    <span
                      className="ml-auto text-[10px] font-semibold"
                      style={{ color: s.done ? "#10b981" : "#f59e0b" }}
                    >
                      {s.done ? "Concluida" : "Pendente"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
