"use client";

import { DatePicker } from "@/app/components/DatePicker";
import type { ThemeColors } from "@/types";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DateRange } from "react-day-picker";

// ── Shared Filter option type ──
export type FilterOption =
  | string
  | {
      id?: string | number;
      name?: string;
      label?: string;
      value?: string | number;
    };

// ── Shared FilterSelect ──
export function FilterSelect({
  val,
  onChange,
  opts,
  groups,
  placeholder = "",
  label = "",
  disabled = false,
}: {
  val: string;
  onChange: (v: string) => void;
  opts?: FilterOption[];
  groups?: { label: string; options: FilterOption[] }[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        value={val}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`h-10 px-3 rounded-xl text-xs outline-none cursor-pointer border transition-all ${
          disabled
            ? "bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-400 cursor-not-allowed"
            : val
              ? "border-primary text-primary bg-primary/5 font-semibold"
              : "border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:border-slate-300 dark:hover:border-gray-600"
        }`}
      >
        <option value="">
          {placeholder || (label ? `Todos ${label}` : "")}
        </option>
        {groups
          ? groups.map((g, gi) => (
              <optgroup key={`group-${gi}`} label={g.label}>
                {g.options.map((o: FilterOption, i: number) => {
                  const l = typeof o === "object" ? o.name || o.label : o;
                  const v = typeof o === "object" ? o.id || o.value : o;
                  const key = typeof o === "object" ? o.id || o.name || `fgopt-${gi}-${i}` : `fgopt-${gi}-${o}-${i}`;
                  return (
                    <option key={key} value={v}>
                      {l}
                    </option>
                  );
                })}
              </optgroup>
            ))
          : (opts || []).map((o: FilterOption, i: number) => {
              const l = typeof o === "object" ? o.name || o.label : o;
              const v = typeof o === "object" ? o.id || o.value : o;
              const key = typeof o === "object" ? o.id || o.name || `fopt-${i}` : `fopt-${o}-${i}`;
              return (
                <option key={key} value={v}>
                  {l}
                </option>
              );
            })}
      </select>
    </div>
  );
}

// ── Shared MultiSelect ──
export function MultiSelect({
  val = [],
  onChange,
  opts,
  placeholder = "",
  label = "",
}: {
  val: string[];
  onChange: (v: string[]) => void;
  opts: string[];
  placeholder?: string;
  label?: string;
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

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div
        onClick={() => setOpen(!open)}
        className={`h-10 px-3 rounded-xl text-xs cursor-pointer flex justify-between items-center border transition-all ${
          val.length > 0
            ? "border-primary text-primary bg-primary/5 font-semibold"
            : "border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:border-slate-300 dark:hover:border-gray-600"
        }`}
      >
        <span className="truncate">
          {val.length === 0
            ? placeholder
            : val.length === 1
              ? val[0]
              : `${val.length} selecionados`}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </div>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 mt-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-xl z-9999 p-2 min-w-[200px] max-h-[300px] overflow-y-auto anima-in">
          {opts.map((o: string, i: number) => {
            const selected = val.includes(o);
            return (
              <div
                key={i}
                onClick={() => toggle(o)}
                className={`px-3 py-2 rounded-lg text-xs cursor-pointer flex items-center gap-2 transition-colors ${
                  selected
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                    selected
                      ? "bg-primary text-white"
                      : "border-2 border-slate-300 dark:border-gray-600 bg-transparent"
                  }`}
                >
                  {selected && <Check size={10} strokeWidth={3} />}
                </div>
                <span>{o}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Shared DateRangePicker ──
export function DateRangePicker({
  date,
  setDate,
  label,
  T,
}: {
  date: DateRange | undefined;
  setDate: (d: DateRange | undefined) => void;
  label: string;
  T: ThemeColors;
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      <div className="grid grid-cols-2 gap-2 h-10">
        <DatePicker
          T={T}
          date={date?.from}
          setDate={(d: Date | undefined) => setDate({ from: d, to: date?.to })}
          label=""
        />
        <DatePicker
          T={T}
          date={date?.to}
          setDate={(d: Date | undefined) =>
            setDate({ from: date?.from, to: d })
          }
          label=""
        />
      </div>
    </div>
  );
}
