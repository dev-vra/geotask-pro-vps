import { create } from "zustand";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  clearMustChangePassword: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  setUser: (user) => {
    set({ user });
    // Keep localStorage for UI state (name, avatar, etc.) — NOT for auth
    if (user) {
      localStorage.setItem("geotask_user", JSON.stringify(user));
    }
  },

  setLoading: (loading) => set({ loading }),

  logout: async () => {
    try {
      // Call server to clear the HttpOnly cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Even if the API call fails, clear local state
    }
    localStorage.removeItem("geotask_user");
    set({ user: null, loading: false });
    window.location.href = "/login";
  },

  clearMustChangePassword: () => {
    const { user } = get();
    if (!user) return;
    const updated = { ...user, must_change_password: false };
    set({ user: updated });
    localStorage.setItem("geotask_user", JSON.stringify(updated));
  },
}));
