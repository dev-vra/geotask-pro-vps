"use client";

import { authFetch } from "@/lib/authFetch";
import { Search, UserCheck, UserPlus, X, Loader2, Check } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import type { User, Team, ThemeColors } from "@/types";
import { useUsers } from "@/hooks/useUsers";

interface ManageTeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  T: ThemeColors;
}

export function ManageTeamMembersModal({
  isOpen,
  onClose,
  team,
  T,
}: ManageTeamMembersModalProps) {
  const { users, isLoading, mutate } = useUsers();
  const [search, setSearch] = useState("");
  const [updatingIds, setUpdatingIds] = useState<number[]>([]);

  if (!isOpen) return null;

  const filteredUsers = useMemo(() => {
    return users.filter((u: User) => {
      const matchSearch = 
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      return u.active && matchSearch;
    });
  }, [users, search]);

  const handleToggleMember = async (userId: number, isMember: boolean) => {
    setUpdatingIds(prev => [...prev, userId]);
    try {
      const res = await authFetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          team_id: isMember ? null : team.id,
        }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar membro");
      
      await mutate();
    } catch (err) {
      console.error(err);
      alert("Falha ao atualizar membro do time.");
    } finally {
      setUpdatingIds(prev => prev.filter(id => id !== userId));
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          width: "100%",
          maxWidth: 500,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 24px 16px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>
              Gerenciar Membros
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: T.sub, fontWeight: 500 }}>
              Time: <span style={{ color: "#98af3b", fontWeight: 700 }}>{team.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: T.hover,
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              padding: 8,
              display: "flex",
              color: T.sub,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "16px 24px" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: T.sub,
              }}
            />
            <input
              type="text"
              placeholder="Buscar usuário por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 12px 12px 40px",
                borderRadius: 12,
                border: `1px solid ${T.border}`,
                background: T.inp,
                color: T.text,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Users List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {isLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: T.sub }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: 13, fontWeight: 500 }}>Carregando usuários...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.sub, fontSize: 13 }}>
              Nenhum usuário encontrado.
            </div>
          ) : (
            filteredUsers.map((u: User) => {
              const isMember = u.team_id === team.id;
              const isUpdating = updatingIds.includes(u.id);
              
              return (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: isMember ? `${T.hover}44` : "transparent",
                    border: `1px solid ${isMember ? "#98af3b44" : "transparent"}`,
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: isMember ? "#98af3b" : T.hover,
                        color: isMember ? "white" : T.sub,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {u.avatar && u.avatar.length <= 2 ? u.avatar : u.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: 11, color: T.sub, fontWeight: 500 }}>
                        {u.sector?.name || "Sem Setor"}
                        {u.team_id && u.team_id !== team.id && (
                          <span style={{ marginLeft: 8, color: "#ef4444" }}>
                            • Time: {u.team?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isUpdating}
                    onClick={() => handleToggleMember(u.id, isMember)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: isMember ? "#fee2e2" : "#ecfdf5",
                      color: isMember ? "#ef4444" : "#10b981",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: isUpdating ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.2s",
                      opacity: isUpdating ? 0.6 : 1,
                      minWidth: 80,
                      justifyContent: "center"
                    }}
                  >
                    {isUpdating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isMember ? (
                      <>
                        <X size={14} /> Remover
                      </>
                    ) : (
                      <>
                        <Check size={14} /> Adicionar
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
