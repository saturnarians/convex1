"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart, Clock, TrendingUp, Users } from "lucide-react";
import { AuthGuard } from "@/components/auth_guard";
import { ActivityFeed } from "@/components/activity-feed";
import { SimpleChart } from "@/components/chart";
import { MetricCard } from "@/components/metric-card";
import { Table, type TableColumn } from "@/components/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceData } from "@/hooks/useWorkspace";
import type { AuthSessionUser } from "@/types/auth";
import type { DashboardReportRow } from "@/types/dashboard";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${value.toFixed(1)}%`;
}

function calculateTrend(values: number[]) {
  if (values.length < 2) {
    return undefined;
  }

  const previous = values[values.length - 2] ?? 0;
  const current = values[values.length - 1] ?? 0;

  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

const reportColumns: TableColumn<DashboardReportRow>[] = [
  { key: "name", label: "Company", sortable: true },
  { key: "email", label: "Email", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (value) => (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === "Active" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
        }`}
      >
        {value}
      </span>
    ),
  },
  {
    key: "revenue",
    label: "Revenue",
    sortable: true,
    render: (value) => `$${value.toLocaleString()}`,
  },
  { key: "date", label: "Date", sortable: true },
];

export function DashboardPageClient({ sessionUser }: { sessionUser: AuthSessionUser }) {
  const {
    workspace,
    workspaces,
    metrics,
    charts,
    recentReports,
    activityFeed,
    telemetryEvents,
    isLoading,
  } = useWorkspaceData(null, sessionUser);

  const metricCards = [
    {
      title: "Revenue",
      value: metrics ? formatCurrency(metrics.revenue) : "-",
      description: "Last 30 days",
      trend: charts ? calculateTrend(charts.revenueTrend.map((point) => point.value)) : undefined,
      icon: <BarChart />,
    },
    {
      title: "Users",
      value: metrics ? metrics.activeUsers.toLocaleString() : "-",
      description: "Workspace members",
      trend: charts ? calculateTrend(charts.userGrowth.map((point) => point.value)) : undefined,
      icon: <Users />,
    },
    {
      title: "Growth",
      value: metrics ? formatPercent(metrics.growth) : "-",
      description: "Latest growth reading",
      trend: metrics?.growth,
      icon: <TrendingUp />,
    },
    {
      title: "Uptime",
      value: metrics ? formatPercent(metrics.uptime) : "-",
      description: "Latest uptime reading",
      icon: <Clock />,
    },
  ];

  return (
    <AuthGuard sessionUser={sessionUser}>
      <div className="min-h-screen pt-20 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold gradient-text">Dashboard</h1>
            <p className="text-slate-400 mt-2">
              {workspace
                ? `Live performance for ${workspace.name}.`
                : "Live performance across your active workspace."}
            </p>
          </motion.div>

          {!isLoading && workspaces.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No workspace data yet</CardTitle>
                <CardDescription>
                  Create a workspace first, then your Convex dashboard data will start showing up
                  here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/workspace-setup"
                  className="inline-flex items-center justify-center rounded-lg glass glass-hover px-4 py-2 font-medium text-white"
                >
                  Create a workspace
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metricCards.map((metric, idx) => (
              <MetricCard key={metric.title} {...metric} delay={idx * 0.1} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SimpleChart
              title="Revenue Trend"
              description={workspace ? `${workspace.name} revenue trend` : "Revenue trend"}
              data={charts?.revenueTrend ?? []}
              maxValue={Math.max(...(charts?.revenueTrend.map((point) => point.value) ?? [0]), 1)}
            />
            <SimpleChart
              title="User Growth"
              description={workspace ? `${workspace.name} member growth` : "User growth"}
              data={charts?.userGrowth ?? []}
              maxValue={Math.max(...(charts?.userGrowth.map((point) => point.value) ?? [0]), 1)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Table
                columns={reportColumns}
                data={recentReports}
                title="Recent Reports"
                searchFields={["name", "email"]}
              />
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ActivityFeed workspaceId={workspace?.id ?? null} items={activityFeed} />
            </motion.div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Telemetry Events</CardTitle>
              <CardDescription>
                Recent workspace-scoped events from the ingestion API.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {telemetryEvents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                  No telemetry events ingested yet.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {telemetryEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-100">{event.event}</p>
                          <p className="text-xs uppercase tracking-wide text-blue-300">
                            {event.source}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {new Date(event.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-slate-400">
                        <p>IP: {event.ipAddress ?? "not captured"}</p>
                        <p>Device: {event.deviceHash ?? "not provided"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
