import { create } from "zustand";
import type { StateCreator } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthSessionUser } from "@/types/auth";

export type User = AuthSessionUser;

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "analyst" | "user" | "member" | "viewer";
}

export interface AppState {
  currentUser: User | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];

  // Actions
  setCurrentUser: (user: User | null) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  upsertWorkspace: (workspace: Workspace) => void;
  clearSession: () => void;
}

const createAppState: StateCreator<AppState> = (set, get) => ({
  currentUser: null,
  currentWorkspace: null,
  workspaces: [],

  setCurrentUser: (user: User | null) => set({ currentUser: user }),

  setCurrentWorkspace: (workspace: Workspace | null) => set({ currentWorkspace: workspace }),

  setWorkspaces: (workspaces: Workspace[]) => set({ workspaces }),

  upsertWorkspace: (workspace: Workspace) =>
    set((state: AppState) => {
      const existingIndex = state.workspaces.findIndex((item) => item.id === workspace.id);

      if (existingIndex === -1) {
        return { workspaces: [workspace, ...state.workspaces] };
      }

      const nextWorkspaces = [...state.workspaces];
      nextWorkspaces[existingIndex] = workspace;

      return { workspaces: nextWorkspaces };
    }),

  clearSession: () =>
    set({
      currentUser: null,
      currentWorkspace: null,
      workspaces: [],
    }),
});

export const useAppStore = create<AppState>()(
  persist(createAppState, {
    name: "convex1-app-store",
    storage: createJSONStorage(() => localStorage),
    partialize: (state: AppState) => ({
      currentUser: state.currentUser,
      currentWorkspace: state.currentWorkspace,
      workspaces: state.workspaces,
    }),
  })
);
