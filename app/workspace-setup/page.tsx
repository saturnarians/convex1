"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import { useWorkspaceMutations } from "@/hooks/useWorkspace";
import { useAppStore } from "@/store/app-store";
import type { Id } from "../../convex/_generated/dataModel";

function toUserId(userId: string) {
  return userId as Id<"users">;
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function CreateWorkspacePage() {
  const router = useRouter();
  const currentUser = useAppStore((state) => state.currentUser);
  const upsertWorkspace = useAppStore((state) => state.upsertWorkspace);
  const setCurrentWorkspace = useAppStore((state) => state.setCurrentWorkspace);
  const { createWorkspace } = useWorkspaceMutations();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !createWorkspace) {
      setErrorMessage("Please sign in before creating a workspace.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const normalizedSlug = normalizeSlug(slug || name);
      const workspaceId = await createWorkspace({
        name: name.trim(),
        slug: normalizedSlug,
        ownerId: toUserId(currentUser.id),
      });

      const nextWorkspace = {
        id: workspaceId,
        name: name.trim(),
        slug: normalizedSlug,
        role: "owner" as const,
      };

      upsertWorkspace(nextWorkspace);
      setCurrentWorkspace(nextWorkspace);
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "We couldn't create your workspace."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-6 h-6" />
              Create Your Workspace
            </CardTitle>
            <CardDescription>
              Set up your first workspace to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!currentUser ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Sign in first so we know which workspace owner to create.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-lg glass glass-hover px-4 py-2 font-medium text-white"
                >
                  Go to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Workspace Name
                  </label>
                  <Input
                    placeholder="My Company"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setSlug(normalizeSlug(e.target.value));
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Slug (URL-friendly)
                  </label>
                  <Input
                    placeholder="my-company"
                    value={slug}
                    onChange={(e) => setSlug(normalizeSlug(e.target.value))}
                    required
                  />
                </div>

                {errorMessage ? (
                  <p className="text-sm text-red-300">{errorMessage}</p>
                ) : null}

                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating..." : "Create Workspace"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
