"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: "system-ui, sans-serif",
        background: "#f8fafc",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "#fef2f2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
        }}
      >
        ⚠️
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
        Algo deu errado
      </h2>
      <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
        Ocorreu um erro inesperado. Tente novamente.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "8px 20px",
          borderRadius: 8,
          border: "none",
          background: "#98af3b",
          color: "white",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
