import { useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAppStore } from "@/store/app-store";
import type { Id } from "../../convex/_generated/dataModel";
import type { User } from "@/store/app-store";
import type { DashboardSnapshot } from "@/types/dashboard";

function toWorkspaceId(workspaceId: string) {
  return workspaceId as Id<"workspaces">;
}

function toUserId(userId: string) {
  return userId as Id<"users">;
}

export function useWorkspaceData(workspaceId: string | null, initialUser: User | null = null) {
  const storedUser = useAppStore((state) => state.currentUser);
  const currentWorkspace = useAppStore((state) => state.currentWorkspace);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const setCurrentWorkspace = useAppStore((state) => state.setCurrentWorkspace);
  const setWorkspaces = useAppStore((state) => state.setWorkspaces);
  const currentUser = initialUser ?? storedUser;

  useEffect(() => {
    if (!initialUser) {
      return;
    }

    const shouldSyncUser =
      storedUser?.id !== initialUser.id ||
      storedUser?.email !== initialUser.email ||
      storedUser?.name !== initialUser.name ||
      storedUser?.avatar !== initialUser.avatar;

    if (shouldSyncUser) {
      setCurrentUser(initialUser);
    }
  }, [initialUser, setCurrentUser, storedUser]);

  const workspaces = useQuery(
    api.workspace.getWorkspacesByUser,
    currentUser ? { userId: toUserId(currentUser.id) } : "skip"
  ) as
    | Array<{
        _id: Id<"workspaces">;
        name: string;
        slug: string;
        role: "owner" | "admin" | "analyst" | "user" | "member" | "viewer";
      }>
    | undefined;

  const normalizedWorkspaces = useMemo(
    () =>
      workspaces?.map((workspace) => ({
        id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
        role: workspace.role,
      })) ?? [],
    [workspaces]
  );

  useEffect(() => {
    if (!currentUser) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      return;
    }

    setWorkspaces(normalizedWorkspaces);

    if (normalizedWorkspaces.length === 0) {
      setCurrentWorkspace(null);
      return;
    }

    const selectedWorkspace =
      normalizedWorkspaces.find((workspace) => workspace.id === currentWorkspace?.id) ??
      normalizedWorkspaces[0] ??
      null;

    if (!selectedWorkspace) {
      setCurrentWorkspace(null);
      return;
    }

    if (selectedWorkspace.id !== currentWorkspace?.id) {
      setCurrentWorkspace(selectedWorkspace);
    }
  }, [
    currentUser,
    currentWorkspace?.id,
    normalizedWorkspaces,
    setCurrentWorkspace,
    setWorkspaces,
  ]);

  const selectedWorkspaceId =
    workspaceId ?? currentWorkspace?.id ?? normalizedWorkspaces[0]?.id ?? null;

  const dashboard = useQuery(
    api.workspace.getDashboardSnapshot,
    selectedWorkspaceId && currentUser
      ? {
          workspaceId: toWorkspaceId(selectedWorkspaceId),
          userId: toUserId(currentUser.id),
        }
      : "skip"
  ) as DashboardSnapshot | null | undefined;

  return {
    currentUser,
    workspaces: normalizedWorkspaces,
    selectedWorkspaceId,
    workspace: dashboard?.workspace ?? null,
    metrics: dashboard?.metrics ?? null,
    charts: dashboard?.charts ?? null,
    recentReports: dashboard?.recentReports ?? [],
    activityFeed: dashboard?.recentActivity ?? [],
    telemetryEvents: dashboard?.telemetryEvents ?? [],
    isLoading:
      (currentUser !== null && workspaces === undefined) ||
      (selectedWorkspaceId !== null && currentUser !== null && dashboard === undefined),
  };
}

export function useWorkspaceMutations() {
  const createWorkspace = useMutation(api.workspace.createWorkspace);
  const addActivity = useMutation(api.workspace.addActivityFeed);
  const createReport = useMutation(api.workspace.createReport);

  return { createWorkspace, addActivity, createReport };
}
