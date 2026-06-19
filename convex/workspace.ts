import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import Decimal from "decimal.js";
import type {
  DashboardActivityItem,
  DashboardChartPoint,
  DashboardEventItem,
  DashboardReportRow,
  DashboardSnapshot,
} from "../src/types/dashboard";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

function deriveNameFromEmail(email: string) {
  const [localPart] = email.split("@");

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toDayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function toDayLabel(dayKey: string) {
  const day = new Date(`${dayKey}T00:00:00.000Z`).getUTCDay();
  return DAY_LABELS[day];
}

function buildChartSeries(
  records: Array<{ date: number; value: number }>,
  mode: "sum" | "latest"
): DashboardChartPoint[] {
  const byDay = new Map<string, Decimal>();

  const sortedRecords = [...records].sort((left, right) => left.date - right.date);

  for (const record of sortedRecords) {
    const dayKey = toDayKey(record.date);
    const currentValue = byDay.get(dayKey) ?? new Decimal(0);
    const nextValue =
      mode === "sum" ? currentValue.plus(record.value) : new Decimal(record.value);

    byDay.set(dayKey, nextValue);
  }

  return Array.from(byDay.entries())
    .slice(-7)
    .map(([dayKey, value]) => ({
      label: toDayLabel(dayKey),
      value: value.toNumber(),
    }));
}

function calculateTrend(series: DashboardChartPoint[]) {
  if (series.length < 2) {
    return 0;
  }

  const previous = new Decimal(series[series.length - 2]?.value ?? 0);
  const current = new Decimal(series[series.length - 1]?.value ?? 0);

  if (previous.equals(0)) {
    return current.equals(0) ? 0 : 100;
  }

  return current.minus(previous).div(previous).times(100).toDecimalPlaces(1).toNumber();
}

export const signIn = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const normalizedEmail = args.email.trim().toLowerCase();
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    if (existingUser) {
      const nextName = args.name?.trim() || existingUser.name;

      if (nextName !== existingUser.name) {
        await ctx.db.patch(existingUser._id, { name: nextName });
      }

      return {
        id: existingUser._id,
        email: existingUser.email,
        name: nextName,
        avatar: existingUser.avatar,
      };
    }

    const name = args.name?.trim() || deriveNameFromEmail(normalizedEmail) || "Workspace User";
    const userId = await ctx.db.insert("users", {
      clerkId: `local:${normalizedEmail}`,
      email: normalizedEmail,
      name,
      createdAt: Date.now(),
    });

    return {
      id: userId,
      email: normalizedEmail,
      name,
      avatar: undefined,
    };
  },
});

export const createWorkspace = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    ownerId: v.id("users"),
    description: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      ownerId: args.ownerId,
      autonomyMode: "manual",
      createdAt: Date.now(),
    });

    // Registration creates the first workspace member as owner.
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId: args.ownerId,
      role: "owner",
      joinedAt: Date.now(),
    });

    await ctx.db.insert("logs", {
      workspaceId,
      actor: "human",
      actorId: args.ownerId,
      action: "workspace_created",
      details: {
        name: args.name,
        slug: args.slug,
      },
      createdAt: Date.now(),
    });

    return workspaceId;
  },
});

export const getWorkspacesByUser = query({
  args: { userId: v.id("users") },
  async handler(ctx, args) {
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const workspaces = await Promise.all(
      memberships.map((m) =>
        ctx.db.get(m.workspaceId).then((ws) =>
          ws
            ? {
                ...ws,
                role: m.role,
              }
            : null
        )
      )
    );

    return workspaces.filter((workspace) => workspace !== null);
  },
});

export const getWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  async handler(ctx, args) {
    return await ctx.db.get(args.workspaceId);
  },
});

export const getAnalytics = query({
  args: { workspaceId: v.id("workspaces") },
  async handler(ctx, args) {
    return await ctx.db
      .query("analytics")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

export const addActivityFeed = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    description: v.string(),
  },
  async handler(ctx, args) {
    return await ctx.db.insert("activityFeed", {
      workspaceId: args.workspaceId,
      userId: args.userId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      description: args.description,
      createdAt: Date.now(),
    });
  },
});

export const getActivityFeed = query({
  args: { workspaceId: v.id("workspaces"), limit: v.optional(v.number()) },
  async handler(ctx, args) {
    return await ctx.db
      .query("activityFeed")
      .withIndex("by_workspace_date", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(args.limit || 50);
  },
});

export const createReport = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    createdBy: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    data: v.object({
      rows: v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          email: v.string(),
          status: v.string(),
          revenue: v.number(),
          date: v.string(),
        })
      ),
    }),
  },
  async handler(ctx, args) {
    const reportId = await ctx.db.insert("reports", {
      workspaceId: args.workspaceId,
      createdBy: args.createdBy,
      title: args.title,
      description: args.description,
      data: args.data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return reportId;
  },
});

export const getReports = query({
  args: { workspaceId: v.id("workspaces") },
  async handler(ctx, args) {
    return await ctx.db
      .query("reports")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

export const getDashboardSnapshot = query({
  args: { workspaceId: v.id("workspaces"), userId: v.id("users") },
  async handler(ctx, args): Promise<DashboardSnapshot | null> {
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .unique();

    if (!membership) {
      return null;
    }

    const workspace = await ctx.db.get(args.workspaceId);

    if (!workspace) {
      return null;
    }

    const [members, analytics, reports, activities] = await Promise.all([
      ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
        .take(100),
      ctx.db
        .query("analytics")
        .withIndex("by_workspace_date", (q) => q.eq("workspaceId", args.workspaceId))
        .take(500),
      ctx.db
        .query("reports")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
        .take(100),
      ctx.db
        .query("activityFeed")
        .withIndex("by_workspace_date", (q) => q.eq("workspaceId", args.workspaceId))
        .order("desc")
        .take(10),
    ]);

    const recentEvents = await ctx.db
      .query("events")
      .withIndex("by_workspaceId_and_createdAt", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(10);

    const now = Date.now();
    const revenueAnalytics = analytics.filter((item) => item.metric === "revenue");
    const usersAnalytics = analytics.filter((item) => item.metric === "users");
    const growthAnalytics = analytics.filter((item) => item.metric === "growth");
    const uptimeAnalytics = analytics.filter((item) => item.metric === "uptime");

    const lastThirtyDaysRevenue = revenueAnalytics
      .filter((item) => item.date >= now - THIRTY_DAYS_IN_MS)
      .reduce((total, item) => total.plus(item.value), new Decimal(0));

    const fallbackRevenue = reports.reduce((total, report) => {
      const reportTotal = report.data.rows.reduce(
        (reportSum: Decimal, row: { revenue: number }) => reportSum.plus(row.revenue),
        new Decimal(0)
      );

      return total.plus(reportTotal);
    }, new Decimal(0));

    const revenueTrend = buildChartSeries(
      revenueAnalytics.map((item) => ({
        date: item.date,
        value: item.value,
      })),
      "sum"
    );

    const userGrowth = buildChartSeries(
      usersAnalytics.map((item) => ({
        date: item.date,
        value: item.value,
      })),
      "latest"
    );

    const latestUsers = usersAnalytics.at(-1)?.value ?? members.length;
    const latestGrowth = growthAnalytics.at(-1)?.value ?? calculateTrend(userGrowth);
    const latestUptime = uptimeAnalytics.at(-1)?.value ?? null;

    const recentReports: DashboardReportRow[] = reports
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .flatMap((report) =>
        report.data.rows.map((row: DashboardReportRow) => ({
          id: `${report._id}-${row.id}`,
          name: row.name,
          email: row.email,
          status: row.status,
          revenue: new Decimal(row.revenue).toNumber(),
          date: row.date,
        }))
      )
      .slice(0, 10);

    const activityUsers = await Promise.all(
      activities.map(async (activity) => {
        const user = await ctx.db.get(activity.userId);
        return [activity._id, user?.name ?? "Unknown user"] as const;
      })
    );

    const userNamesByActivityId = new Map(activityUsers);

    const recentActivity: DashboardActivityItem[] = activities.map((activity) => ({
      id: activity._id,
      user: userNamesByActivityId.get(activity._id) ?? "Unknown user",
      action: activity.action,
      entity: activity.entityId ?? activity.entityType,
      createdAt: activity.createdAt,
      description: activity.description,
    }));

    const telemetryEvents: DashboardEventItem[] = recentEvents.map((event) => ({
      id: event._id,
      event: event.event,
      source: event.source,
      createdAt: event.createdAt,
      ipAddress: event.ipAddress,
      deviceHash: event.deviceHash,
    }));

    return {
      workspace: {
        id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        createdAt: workspace.createdAt,
        memberCount: members.length,
      },
      metrics: {
        revenue: (lastThirtyDaysRevenue.equals(0) ? fallbackRevenue : lastThirtyDaysRevenue).toNumber(),
        activeUsers: latestUsers,
        growth: latestGrowth,
        uptime: latestUptime,
      },
      charts: {
        revenueTrend,
        userGrowth,
      },
      recentReports,
      recentActivity,
      telemetryEvents,
    };
  },
});
