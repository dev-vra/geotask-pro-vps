import { Check, Search, Users, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { Sector, ThemeColors, User } from "@/types";

interface TeamSelectionModalProps {
  T: ThemeColors;
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedIds: number[]) => void;
  users: User[];
  sectors: (Sector | string)[]; // Can be Sector object or string depending on where it's called
  initialSelectedIds: number[];
  mainResponsibleId?: number | null; // Optional: we might not want to show the main responsible in the coworkers list
}

export default function TeamSelectionModal({
  T,
  isOpen,
  onClose,
  onSave,
  users,
  sectors,
  initialSelectedIds,
  mainResponsibleId,
}: TeamSelectionModalProps) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(initialSelectedIds)
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilterSector, setSelectedFilterSector] = useState<string>("");
  const [selectedFilterRole, setSelectedFilterRole] = useState<string>("");

  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    users.forEach((u) => {
      const r = typeof u.role === "object" ? u.role?.name : u.role;
      if (r) roles.add(String(r));
    });
    return Array.from(roles).sort();
  }, [users]);

  const availableSectors = useMemo(() => {
    const sNames = new Set<string>();
    users.forEach((u) => {
      const s = typeof u.sector === "object" ? u.sector?.name : typeof u.sector === "string" ? u.sector : null;
      if (s) sNames.add(String(s));
    });
    return Array.from(sNames).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Exclude the main responsible from being selected as a coworker if provided
      if (mainResponsibleId && Number(u.id) === Number(mainResponsibleId))
        return false;

      // Ensure user has an ID
      if (!u.id) return false;

      // Resolve sector and role names for comparison
      const uSectorName =
        typeof u.sector === "object" ? u.sector?.name : typeof u.sector === "string" ? u.sector : "";
      
      const finalSName = uSectorName || (u.sector_id
        ? (sectors.find((s) => typeof s === "object" && s.id === u.sector_id) as Sector)?.name
        : "");

      const uRoleName = typeof u.role === "object" ? u.role?.name : String(u.role || "");

      // Apply Search Term Filter
      let searchMatches = true;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const nameMatch = u.name.toLowerCase().includes(term);
        const sectorMatch = String(finalSName).toLowerCase().includes(term);
        const roleMatch = String(uRoleName).toLowerCase().includes(term);
        searchMatches = nameMatch || sectorMatch || roleMatch;
      }

      // Apply Dropdown Filters
      const sectorFilterMatches = selectedFilterSector ? String(finalSName) === selectedFilterSector : true;
      const roleFilterMatches = selectedFilterRole ? String(uRoleName) === selectedFilterRole : true;

      return searchMatches && sectorFilterMatches && roleFilterMatches;
    });
  }, [users, searchTerm, selectedFilterSector, selectedFilterRole, mainResponsibleId, sectors]);

  const handleSelectAll = () => {
    // Determine if all CURRENTLY FILTERED users are selected
    const allFilteredSelected =
      filteredUsers.length > 0 &&
      filteredUsers.every((u) => selected.has(Number(u.id)));

    setSelected((prev) => {
      const newSet = new Set(prev);
      if (allFilteredSelected) {
        // Deselect all filtered
        filteredUsers.forEach((u) => newSet.delete(Number(u.id)));
      } else {
        // Select all filtered
        filteredUsers.forEach((u) => newSet.add(Number(u.id)));
      }
      return newSet;
    });
  };

  const toggleUser = (id: number) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (!isOpen) return null;

  const allFilteredSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => selected.has(Number(u.id)));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-200 flex items-center justify-center p-4 font-sans bg-black/60"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[500px] rounded-[20px] bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex flex-col max-h-[85vh] shadow-[0_24px_64px_rgba(0,0,0,0.25)]"
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Users size={16} />
            </div>
            <div>
              <h2 className="m-0 text-[16px] font-bold text-slate-900 dark:text-gray-50">
                Gerenciar Equipe
              </h2>
              <p className="m-0 text-xs text-slate-500 dark:text-gray-400">
                {selected.size} usuário{selected.size !== 1 ? "s" : ""}{" "}
                selecionado{selected.size !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-100 dark:bg-gray-700 border-none rounded-lg p-1.5 cursor-pointer h-fit"
          >
            <X size={16} className="text-slate-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 dark:border-gray-700 space-y-3 shrink-0">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar por nome ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:border-primary text-slate-900 dark:text-gray-50 transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedFilterSector}
              onChange={(e) => setSelectedFilterSector(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:border-primary text-slate-900 dark:text-gray-50 transition-colors appearance-none"
            >
              <option value="">Todos os Setores</option>
              {availableSectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={selectedFilterRole}
              onChange={(e) => setSelectedFilterRole(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:border-primary text-slate-900 dark:text-gray-50 transition-colors appearance-none"
            >
              <option value="">Todos os Cargos</option>
              {availableRoles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center mt-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">
              {filteredUsers.length} usuários encontrados
            </span>
            {filteredUsers.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-3 py-1.5 rounded-md border-none cursor-pointer"
              >
                {allFilteredSelected ? "Desmarcar Todos" : "Selecionar Todos"}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-gray-400 text-sm">
              Nenhum usuário encontrado.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((u) => {
                const uId = Number(u.id);
                const isSelected = selected.has(uId);

                // Sector name resolution
                const sName =
                  typeof u.sector === "object"
                    ? u.sector?.name
                    : typeof u.sector === "string"
                    ? u.sector
                    : null;
                const finalSectorName = sName
                  ? sName
                  : u.sector_id
                  ? sectors.find((s) => typeof s === "object" && s.id === u.sector_id)
                      // @ts-ignore
                      ?.name
                  : "Sem setor";

                return (
                  <div
                    key={uId}
                    onClick={() => toggleUser(uId)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/5 border border-primary/30"
                        : "bg-transparent border border-transparent hover:bg-slate-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <div className="w-[34px] h-[34px] rounded-full bg-primary/10 text-primary text-[12px] font-bold flex flex-col items-center justify-center shrink-0 overflow-hidden ring-1 ring-primary/20">
                      {typeof u.avatar === "string" &&
                      u.avatar.startsWith("http") ? (
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-full h-full object-cover"
                        />
                      ) : typeof u.avatar === "string" && u.avatar ? (
                        u.avatar
                      ) : u.name ? (
                        u.name.charAt(0)
                      ) : (
                        "?"
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-slate-900 dark:text-gray-50 truncate">
                        {u.name}
                      </div>
                      <div className="text-[12px] text-slate-500 dark:text-gray-400 truncate flex items-center gap-1.5">
                        <span className="max-w-[120px] truncate">
                          {typeof u.role === "object" ? u.role?.name : u.role}
                        </span>
                        {finalSectorName && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-gray-600 shrink-0"></span>
                            <span className="truncate">{finalSectorName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                        isSelected
                          ? "bg-primary border-primary text-white"
                          : "bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600 text-transparent"
                      }`}
                    >
                      <Check
                        size={14}
                        className={isSelected ? "opacity-100" : "opacity-0"}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-gray-700 shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 text-[14px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSave(Array.from(selected));
              onClose();
            }}
            className="flex-1 py-2.5 rounded-lg border-none bg-primary text-white text-[14px] font-semibold cursor-pointer hover:bg-primary/90 transition-colors shadow-sm"
          >
            Confirmar ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}
