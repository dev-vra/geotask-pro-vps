import React, { useState, useMemo } from "react";
import { Plus, Trophy, Target, Search, Download } from "lucide-react";
import { useGaming } from "@/hooks/useGaming";
import GamingFormModal from "./GamingFormModal";
import GamingDetailModal from "./GamingDetailModal";

interface GamingPageProps {
  T: any;
  user: any;
  users: any[];
  sectors: any[];
}

export default function GamingPage({
  T,
  user,
  users,
  sectors,
}: GamingPageProps) {
  const [cycleFilter, setCycleFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedGamingId, setSelectedGamingId] = useState<number | null>(null);

  const { gamings, isLoading, mutate } = useGaming({
    cycle: cycleFilter || undefined,
    userId: userFilter ? parseInt(userFilter) : undefined,
    sectorId: sectorFilter ? parseInt(sectorFilter) : undefined,
  });

  const isLiderado = user?.role?.name === "Liderado";
  const canCreate =
    ["Admin", "Gestor", "Gerente", "Diretor", "Coordenador"].includes(
      user?.role?.name,
    ) || user?.sector?.name === "RH";

  // Group users by sector
  const usersBySector = useMemo(() => {
    const groups: Record<string, any[]> = {};
    users.forEach((u) => {
      const sectorName = u.sector?.name || "Sem Setor";
      if (!groups[sectorName]) groups[sectorName] = [];
      groups[sectorName].push(u);
    });
    return groups;
  }, [users]);

  return (
    <div className="flex h-full flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div
        className={`flex flex-col md:flex-row items-center justify-between gap-4 p-6 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 ${T.bg} shadow-sm`}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Trophy size={24} />
          </div>
          <div>
            <h1
              className={`text-2xl font-bold font-display tracking-tight ${T.text}`}
            >
              Gaming e Metas
            </h1>
            <p className={`text-sm ${T.sub}`}>
              Acompanhe o desempenho e alcance de objetivos individuais
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {canCreate && (
            <button
              onClick={() => setShowFormModal(true)}
              className="btn-primary flex-1 md:flex-none flex justify-center items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all"
            >
              <Plus size={18} /> Nova Gaming
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div
        className={`p-6 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 flex flex-col md:flex-row gap-5 ${T.bg} shadow-sm`}
      >
        {!isLiderado && (
          <>
            <div className="flex-1">
              <label
                className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${T.sub}`}
              >
                Setor
              </label>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm transition-all border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 ${T.text}`}
              >
                <option value="">Todos os Setores</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label
                className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${T.sub}`}
              >
                Liderado (Usuário)
              </label>
              <div className="relative">
                <Search
                  className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${T.sub}`}
                />
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className={`w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm transition-all border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 ${T.text}`}
                >
                  <option value="">Filtrar Usuário...</option>
                  {user && <option value={user.id}>Minha Gaming</option>}
                  {Object.entries(usersBySector).map(
                    ([sectorName, sectorUsers]) => (
                      <optgroup key={sectorName} label={sectorName}>
                        {sectorUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </optgroup>
                    ),
                  )}
                </select>
              </div>
            </div>
          </>
        )}

        <div className={`w-full ${!isLiderado ? "md:w-72" : "flex-1"}`}>
          <label
            className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${T.sub}`}
          >
            Ciclo / Período
          </label>
          <div className="relative">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${T.sub}`}
            />
            <input
              type="text"
              placeholder="Ex: Janeiro 2026, Q1 2026..."
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm transition-all border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 ${T.text}`}
            />
          </div>
        </div>

        <div className="flex items-end">
          <a
            href={`/api/gaming/export?type=xlsx${userFilter ? `&userId=${userFilter}` : ""}${sectorFilter ? `&sectorId=${sectorFilter}` : ""}${cycleFilter ? `&cycle=${cycleFilter}` : ""}`}
            target="_blank"
            className={`flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-bold transition-all h-[44px] ${T.text} hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm`}
          >
            <Download size={18} /> Exportar
          </a>
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading && (
          <div className="py-20 text-center col-span-full">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className={T.sub}>Buscando gamings...</p>
          </div>
        )}

        {!isLoading && gamings.length === 0 && (
          <div
            className={`py-16 text-center col-span-full border border-dashed rounded-[32px] border-gray-200 dark:border-gray-800/60 ${T.sub} bg-slate-50/50 dark:bg-slate-800/10`}
          >
            <Target className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhuma Gaming encontrada</p>
            <p className="text-sm opacity-60">
              Tente ajustar seus filtros de busca.
            </p>
          </div>
        )}

        {!isLoading &&
          gamings.map((gaming: any, idx: number) => {
            // calc visual score
            let totalScore = 0;
            gaming.items?.forEach((i: any) => {
              const ratio = Math.min(
                (parseFloat(i.achieved) || 0) / (parseFloat(i.target) || 1),
                1.0,
              );
              totalScore += ratio * parseFloat(i.weight);
            });

            return (
              <div
                key={gaming.id}
                onClick={() => setSelectedGamingId(gaming.id)}
                className={`group p-5 rounded-[32px] border shadow-sm border-gray-100 dark:border-gray-800/60 flex flex-col gap-4 cursor-pointer card-hover ${T.card} animate-fade-in-up stagger-${(idx % 12) + 1}`}
              >
                <div className="flex justify-between items-start">
                  <div
                    className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 ${T.sub}`}
                  >
                    {gaming.cycle_name}
                  </div>
                  <span
                    className={`text-[10px] font-black tracking-tighter px-2 py-1 rounded-md ${gaming.status === "CLOSED" ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30"}`}
                  >
                    {gaming.status === "CLOSED" ? "FECHADO" : "EM ABERTO"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-primary border border-white dark:border-gray-700 shadow-sm overflow-hidden">
                    {gaming.user.avatar ? (
                      <img
                        src={
                          gaming.user.avatar.length > 2
                            ? gaming.user.avatar
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(gaming.user.name)}&background=84cc16&color=fff`
                        }
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      gaming.user.name[0]
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-bold truncate font-display ${T.text} group-hover:text-primary transition-colors`}
                    >
                      {gaming.user.name}
                    </p>
                    <p className={`text-[11px] truncate font-medium ${T.sub}`}>
                      {gaming.user.Sector?.name || "Setor não informado"}
                    </p>
                  </div>
                </div>

                <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                  <div>
                    <p
                      className={`text-[10px] uppercase font-bold tracking-widest ${T.sub}`}
                    >
                      Nota Final
                    </p>
                    <p className="text-2xl font-black text-primary font-display">
                      {totalScore.toFixed(totalScore % 1 === 0 ? 0 : 1)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-[10px] uppercase font-bold tracking-widest ${T.sub}`}
                    >
                      Avaliador
                    </p>
                    <p
                      className={`text-[11px] font-bold truncate w-24 ${T.text}`}
                    >
                      {gaming.evaluator?.name || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {showFormModal && (
        <GamingFormModal
          T={T}
          user={user}
          users={users}
          onClose={() => setShowFormModal(false)}
          onSaved={() => {
            setShowFormModal(false);
            mutate();
          }}
        />
      )}

      {selectedGamingId && (
        <GamingDetailModal
          T={T}
          user={user}
          gamingId={selectedGamingId}
          onClose={() => setSelectedGamingId(null)}
          onUpdate={() => mutate()}
        />
      )}
    </div>
  );
}
