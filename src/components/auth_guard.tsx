"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import type { AuthSessionUser } from "@/types/auth";

interface AuthGuardProps {
  sessionUser: AuthSessionUser;
  children: React.ReactNode;
}

export const AuthGuard = ({ sessionUser, children }: AuthGuardProps) => {
  const currentUser = useAppStore((state) => state.currentUser);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);

  useEffect(() => {
    const shouldSyncUser =
      currentUser?.id !== sessionUser.id ||
      currentUser?.email !== sessionUser.email ||
      currentUser?.name !== sessionUser.name ||
      currentUser?.avatar !== sessionUser.avatar;

    if (shouldSyncUser) {
      setCurrentUser(sessionUser);
    }
  }, [currentUser, sessionUser, setCurrentUser]);

  return <>{children}</>;
};
