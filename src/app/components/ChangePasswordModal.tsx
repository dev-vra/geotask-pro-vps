"use client";

import { authFetch } from "@/lib/authFetch";
import { AlertCircle, CheckCircle, Lock, Save, X } from "lucide-react";
import { useState } from "react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName?: string;
  T: any;
  isAdmin?: boolean; // Se true, não pede senha atual (reset admin)
  isMandatory?: boolean; // Se true, modal não pode ser fechado sem trocar
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  userId,
  userName,
  T,
  isAdmin = false,
  isMandatory = false,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isMandatory) return; // Non-closeable if mandatory
    onClose();
  };

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("A confirmação de senha não coincide com a nova senha");
      return;
    }

    if (!isAdmin && !currentPassword) {
      setError("Informe a senha atual");
      return;
    }

    setLoading(true);

    try {
      if (isAdmin) {
        // Admin reseta via PATCH /api/users (resetPassword flag)
        const res = await authFetch("/api/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: userId, password: newPassword }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erro ao alterar senha");
        }
      } else {
        // Usuário altera própria senha
        const res = await authFetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, currentPassword, newPassword }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erro ao alterar senha");
        }
      }

      setSuccess(true);
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${T.border}`,
    background: T.inp,
    color: T.text,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  const label: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: T.text,
    marginBottom: 6,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.6)",
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
          maxWidth: 420,
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: isMandatory ? 8 : 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock size={18} color="#98af3b" />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: T.text,
                }}
              >
                {isAdmin ? "Definir Nova Senha" : "Alterar Senha"}
              </h3>
              {userName && (
                <p style={{ margin: 0, fontSize: 12, color: T.sub }}>
                  Para: {userName}
                </p>
              )}
            </div>
          </div>
          {!isMandatory && (
            <button
              onClick={handleClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={20} color={T.sub} />
            </button>
          )}
        </div>

        {/* Aviso de troca obrigatória */}
        {isMandatory && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 8,
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              fontSize: 12,
              color: "#9a3412",
            }}
          >
            ⚠️ Por segurança, você deve definir uma nova senha antes de
            continuar.
          </div>
        )}

        {/* Error */}
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

        {/* Success */}
        {success && (
          <div
            style={{
              marginBottom: 16,
              padding: 10,
              borderRadius: 8,
              background: "#dcfce7",
              color: "#166534",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle size={16} />
            Senha alterada com sucesso!
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* Senha atual — somente para usuário (não-admin) */}
          {!isAdmin && (
            <div>
              <label style={label}>Senha Atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={inp}
                placeholder="••••••••"
              />
            </div>
          )}

          <div>
            <label style={label}>Nova Senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                ...inp,
                border: `1px solid ${
                  newPassword && newPassword.length < 6 ? "#ef4444" : T.border
                }`,
              }}
              placeholder="Mínimo 6 caracteres"
            />
            {newPassword && newPassword.length < 6 && (
              <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>
                Mínimo de 6 caracteres
              </p>
            )}
          </div>

          <div>
            <label style={label}>Confirmar Nova Senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                ...inp,
                border: `1px solid ${
                  confirmPassword && confirmPassword !== newPassword
                    ? "#ef4444"
                    : T.border
                }`,
              }}
              placeholder="Repita a nova senha"
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>
                As senhas não coincidem
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || success}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              background: success ? "#22c55e" : "#98af3b",
              color: "white",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading || success ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              "Salvando..."
            ) : success ? (
              "Salvo!"
            ) : (
              <>
                <Save size={16} /> Salvar Senha
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
