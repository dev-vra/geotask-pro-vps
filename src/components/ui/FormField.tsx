"use client";

import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export function FormField({
  label,
  req = false,
  err = "",
  children,
}: {
  label: string;
  req?: boolean;
  err?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: err ? "#ef4444" : "#9ca3af",
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
        {req && <span style={{ color: "#ef4444" }}>*</span>}
        {err && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#ef4444",
              marginLeft: 4,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <AlertCircle size={10} />
            {err}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
