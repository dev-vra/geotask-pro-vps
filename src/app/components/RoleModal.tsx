"use client";

import { authFetch } from "@/lib/authFetch";
import { AlertCircle, Save, X } from "lucide-react";
import { useEffect, useState } from "react";

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  role?: any; // If null, create mode
  T: any;
}

export function RoleModal({
  isOpen,
  onClose,
  onSuccess,
  role,
  T,
}: RoleModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (role) {
        setName(role.name);
      } else {
        setName("");
      }
      setError("");
    }
  }, [isOpen, role]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!name) {
        throw new Error("Nome do cargo é obrigatório");
      }

      const method = role ? "PATCH" : "POST";
      const body: any = { name };

      if (role) {
        body.id = role.id;
      }

      const res = await authFetch("/api/roles", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar cargo");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: "100%",
          maxWidth: 400,
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3
            style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}
          >
            {role ? "Editar Cargo" : "Novo Cargo"}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={20} color={T.sub} />
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: 10,
              borderRadius: 8,
              background: "#fee2e2",
              color: "#ef4444",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: T.text,
                marginBottom: 6,
              }}
            >
              Nome do Cargo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: T.inp,
                color: T.text,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="Ex: Gerente de Projetos"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              background: "#98af3b",
              color: "white",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              "Salvando..."
            ) : (
              <>
                <Save size={16} /> Salvar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
