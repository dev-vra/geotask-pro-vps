"use client";

import type { ThemeColors } from "@/lib/helpers";
import type { ReactNode } from "react";

export function FormInput({
  T,
  value,
  onChange,
  placeholder,
  type = "text",
  icon = null,
}: {
  T: ThemeColors;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      {icon && (
        <span
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
          }}
        >
          {icon}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: icon ? "9px 12px 9px 30px" : "9px 12px",
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          background: T.inp,
          color: T.text,
          fontSize: 13,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

export function FormTextarea({
  T,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  T: ThemeColors;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        padding: "9px 12px",
        borderRadius: 8,
        border: `1px solid ${T.border}`,
        background: T.inp,
        color: T.text,
        fontSize: 13,
        outline: "none",
        resize: "vertical",
        boxSizing: "border-box",
        fontFamily: "inherit",
      }}
    />
  );
}
