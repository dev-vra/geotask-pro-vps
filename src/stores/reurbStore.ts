import { create } from "zustand";

interface ReurbFilters {
  search?: string;
  sector_id?: string;
}

interface ReurbStore {
  selectedSolicitacaoId: number | null;
  selectedProcessId: number | null;
  drawerOpen: boolean;
  filters: ReurbFilters;
  openSolicitacao: (solicitacaoId: number, processId?: number) => void;
  closeDrawer: () => void;
  setFilters: (f: ReurbFilters) => void;
}

export const useReurbStore = create<ReurbStore>((set) => ({
  selectedSolicitacaoId: null,
  selectedProcessId: null,
  drawerOpen: false,
  filters: {},
  openSolicitacao: (solicitacaoId, processId) =>
    set({ selectedSolicitacaoId: solicitacaoId, selectedProcessId: processId ?? null, drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false, selectedSolicitacaoId: null }),
  setFilters: (f) => set({ filters: f }),
}));
