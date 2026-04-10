"use client";

import type { ThemeColors } from "@/lib/helpers";

export function FormSelect({
  T,
  val,
  onChange,
  opts,
  groups,
  placeholder = "",
  err = "",
}: {
  T: ThemeColors;
  val: string;
  onChange: (v: string) => void;
  opts?: Array<
    | string
    | { id?: number | string; name?: string; label?: string; value?: string }
  >;
  groups?: Array<{
    label: string;
    options: Array<
      | string
      | { id?: number | string; name?: string; label?: string; value?: string }
    >;
  }>;
  placeholder?: string;
  err?: string;
}) {
  return (
    <select
      value={val}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "9px 12px",
        borderRadius: 8,
        border: `1px solid ${err ? "#ef4444" : T.border}`,
        background: T.inp,
        color: val ? T.text : T.sub,
        fontSize: 13,
        outline: "none",
        boxSizing: "border-box",
      }}
    >
      <option value="">{placeholder || "Selecionar..."}</option>

      {opts &&
        opts.map((o, i) => {
          const label = typeof o === "object" ? o.name || o.label : o;
          const value = typeof o === "object" ? o.id || o.value : o;
          const key =
            typeof o === "object"
              ? o.id || o.name || `opt-${i}`
              : `opt-${o}-${i}`;
          return (
            <option key={key} value={String(value)}>
              {String(label)}
            </option>
          );
        })}

      {groups &&
        groups.map((g: any, i: number) => (
          <optgroup key={`group-${i}`} label={g.label}>
            {g.options.map((o: any, j: number) => {
              const label = typeof o === "object" ? o.name || o.label : o;
              const value = typeof o === "object" ? o.id || o.value : o;
              const key =
                typeof o === "object"
                  ? o.id || o.name || `opt-${j}`
                  : `opt-${o}-${j}`;
              return (
                <option key={key} value={String(value)}>
                  {String(label)}
                </option>
              );
            })}
          </optgroup>
        ))}
    </select>
  );
}
