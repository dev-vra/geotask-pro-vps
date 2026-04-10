"use client";

import { authFetch } from "@/lib/authFetch";
import { AlertCircle, RefreshCw, Save, X } from "lucide-react";
import { useEffect, useState } from "react";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: any; // null = create mode
  roles: any[];
  sectors: any[];
  teams: any[];
  users: any[];
  T: any;
}

export function UserModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  roles,
  sectors,
  teams,
  users,
  T,
}: UserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [secondarySectorIds, setSecondarySectorIds] = useState<number[]>([]);
  const [resetPassword, setResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setName(user.name);
        setEmail(user.email);
        setRoleId(user.role_id?.toString() || user.role?.id?.toString() || "");
        setSectorId(
          user.sector_id?.toString() || user.sector?.id?.toString() || "",
        );
        setTeamId(user.team_id?.toString() || user.team?.id?.toString() || "");
        setManagerId(user.manager_id?.toString() || "");
        setResetPassword(false);

        // Fetch user sectors
        authFetch(`/api/user-sectors?user_id=${user.id}`)
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data)) {
              setSecondarySectorIds(data.map((us: any) => us.sector_id));
            }
          })
          .catch(console.error);
      } else {
        setName("");
        setEmail("");
        setRoleId("");
        setSectorId("");
        setTeamId("");
        setManagerId("");
        setSecondarySectorIds([]);
        setResetPassword(false);
      }
      setError("");
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!name || !email || !roleId || !sectorId) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      const method = user ? "PATCH" : "POST";
      const body: any = {
        name,
        email,
        role_id: Number(roleId),
        sector_id: Number(sectorId),
        team_id: teamId ? Number(teamId) : null,
        manager_id: managerId ? Number(managerId) : null,
      };

      if (user) {
        body.id = user.id;
        if (resetPassword) {
          body.resetPassword = true;
        }
      }

      const res = await authFetch("/api/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar usuário");
      }

      const savedUser = await res.json();

      // Sync secondary sectors
      await authFetch("/api/user-sectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: savedUser.id,
          sector_ids: secondarySectorIds,
        }),
      });

      onSuccess();
      onClose();
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
          maxWidth: 500,
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
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
            {user ? "Editar Usuário" : "Novo Usuário"}
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
            <label style={label}>Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inp}
              placeholder="Ex: João Silva"
            />
          </div>

          <div>
            <label style={label}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inp}
              placeholder="joao@geotask.com"
            />
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div>
              <label style={label}>Cargo</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                style={inp}
              >
                <option value="">Selecione...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Setor</label>
              <select
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
                style={inp}
              >
                <option value="">Selecione...</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div>
              <label style={label}>Time / Equipe</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                style={inp}
              >
                <option value="">Nenhum time</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={label}>Gestor Imediato</label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                style={inp}
              >
                <option value="">Topo da Cadeia</option>
                {users && users
                  .filter((u) => u.id !== user?.id && u.active)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label style={label}>Setores Adicionais (Visibilidade)</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px 12px",
                padding: "12px",
                background: T.inp,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                maxHeight: 120,
                overflowY: "auto",
              }}
            >
              {sectors
                .filter((s) => s.id.toString() !== sectorId)
                .map((s) => (
                  <label
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: T.text,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={secondarySectorIds.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSecondarySectorIds([...secondarySectorIds, s.id]);
                        } else {
                          setSecondarySectorIds(
                            secondarySectorIds.filter((id) => id !== s.id),
                          );
                        }
                      }}
                      style={{ cursor: "pointer", accentColor: "#98af3b" }}
                    />
                    {s.name}
                  </label>
                ))}
            </div>
            <p style={{ fontSize: 10, color: T.sub, marginTop: 4, margin: 0 }}>
              Permite que o usuário visualize tarefas destes setores adicionais.
            </p>
          </div>

          {/* Se criando: info sobre senha padrão */}
          {!user && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: T.inp,
                border: `1px solid ${T.border}`,
                fontSize: 12,
                color: T.sub,
              }}
            >
              O usuário será solicitado a alterar a senha no primeiro acesso.
            </div>
          )}

          {/* Se editando: opção de resetar senha */}
          {user && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 8,
                background: resetPassword ? "#fff7ed" : T.inp,
                border: `1px solid ${resetPassword ? "#f97316" : T.border}`,
                cursor: "pointer",
              }}
              onClick={() => setResetPassword(!resetPassword)}
            >
              <input
                type="checkbox"
                checked={resetPassword}
                readOnly
                style={{ cursor: "pointer", accentColor: "#f97316" }}
              />
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.text,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <RefreshCw size={13} />
                  Resetar senha para o padrão
                </div>
                <div style={{ fontSize: 11, color: T.sub }}>
                  Senha será redefinida e o usuário deverá alterá-la
                  no próximo acesso.
                </div>
              </div>
            </div>
          )}

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
