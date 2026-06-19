"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConvex, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/app-store";
import type { Id } from "../../convex/_generated/dataModel";

function toUserId(userId: string) {
  return userId as Id<"users">;
}

function deriveName(email: string) {
  const [localPart] = email.split("@");

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function LoginPageClient() {
  const router = useRouter();
  const convex = useConvex();
  const signIn = useMutation(api.workspace.signIn);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const setCurrentWorkspace = useAppStore((state) => state.setCurrentWorkspace);
  const setWorkspaces = useAppStore((state) => state.setWorkspaces);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const user = await signIn({
        email,
        name: deriveName(email),
      });

      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user }),
      });

      if (!sessionResponse.ok) {
        throw new Error("We couldn't start your session.");
      }

      setCurrentUser(user);

      const workspaces = await convex.query(api.workspace.getWorkspacesByUser, {
        userId: toUserId(user.id),
      });

      const normalizedWorkspaces = workspaces.map((workspace) => ({
        id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
        role: workspace.role,
      }));

      setWorkspaces(normalizedWorkspaces);

      if (normalizedWorkspaces.length > 0) {
        setCurrentWorkspace(normalizedWorkspaces[0]);
        router.replace("/dashboard");
        return;
      }

      setCurrentWorkspace(null);
      router.replace("/workspace-setup");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "We couldn't sign you in right now."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">Sign in to your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="rounded-lg border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
                Local demo sign-in: your email creates or resumes your workspace account.
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="********"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}

              <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              <p className="text-center text-sm text-slate-400">
                We currently use a local demo auth flow, so any email address can get started.
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
