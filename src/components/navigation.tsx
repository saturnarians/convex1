"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { useAppStore } from "@/store/app-store";

export function Navigation() {
  const router = useRouter();
  const currentUser = useAppStore((state) => state.currentUser);
  const currentWorkspace = useAppStore((state) => state.currentWorkspace);
  const workspaces = useAppStore((state) => state.workspaces);
  const setCurrentWorkspace = useAppStore((state) => state.setCurrentWorkspace);
  const clearSession = useAppStore((state) => state.clearSession);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/session", {
        method: "DELETE",
      });
    } finally {
      clearSession();
      router.replace("/");
    }
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-dark fixed top-0 left-0 right-0 z-50 px-6 py-4 border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <Link href="/dashboard" className="text-2xl font-bold gradient-text">
          Dashboard
        </Link>

        <div className="flex items-center gap-4">
          {currentUser && workspaces.length > 0 ? (
            <label className="glass-dark flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200">
              <span className="text-slate-400">Workspace</span>
              <select
                value={currentWorkspace?.id ?? workspaces[0]?.id}
                onChange={(event) => {
                  const nextWorkspace =
                    workspaces.find((workspace) => workspace.id === event.target.value) ?? null;
                  setCurrentWorkspace(nextWorkspace);
                  router.push("/dashboard");
                }}
                className="bg-transparent text-white outline-none"
              >
                {workspaces.map((workspace) => (
                  <option
                    key={workspace.id}
                    value={workspace.id}
                    className="bg-slate-900 text-white"
                  >
                    {workspace.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {currentUser ? (
            <>
              <Link
                href="/workspace-settings"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <Button
                type="button"
                variant="ghost"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                onClick={handleSignOut}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg glass glass-hover px-4 py-2 text-sm font-medium text-white"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
