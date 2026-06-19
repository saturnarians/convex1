"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import type { DashboardActivityItem } from "@/types/dashboard";

interface ActivityFeedProps {
  workspaceId?: string | null;
  items?: DashboardActivityItem[];
}

function formatRelativeTime(timestamp: number) {
  const diffInMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
}

export function ActivityFeed({ workspaceId, items }: ActivityFeedProps) {
  const displayActivities = items ?? [];
  const description = workspaceId
    ? "Updates in your selected workspace"
    : "Updates in your workspace";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivities.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
              No activity yet for this workspace.
            </div>
          ) : null}
          {displayActivities.map((activity, idx) => (
            <motion.div
              key={activity.id || idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="pb-4 border-b border-white/10 last:border-0"
            >
              <p className="text-sm font-medium text-slate-200">
                <span className="text-blue-400">{activity.user}</span>{" "}
                <span className="text-slate-400">{activity.action}</span>{" "}
                <span className="text-purple-400">{activity.entity}</span>
              </p>
              {activity.description ? (
                <p className="mt-1 text-xs text-slate-400">{activity.description}</p>
              ) : null}
              <p className="text-xs text-slate-500 mt-1">
                {formatRelativeTime(activity.createdAt)}
              </p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
