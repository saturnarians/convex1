import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

// Minimal agent: scans recent events and creates a pending task for suspicious events.
export const runAgentOnce = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    lookbackMs: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const lookback = args.lookbackMs ?? 60_000; // default: last 60s
    const cutoff = Date.now() - lookback;

    const recent = await ctx.db
      .query("events")
      .withIndex("by_workspaceId_and_createdAt", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(200);

    const candidates = recent.filter((e) => (e.createdAt ?? 0) >= cutoff);

    const createdTasks = [] as string[];

    for (const ev of candidates) {
      try {
        // Simple rule: any `suspicious_activity` event becomes a pending task.
        if (ev.event === "suspicious_activity") {
          const suggestion = `Review suspicious activity: ${ev.event} (device=${ev.deviceHash ?? "unknown"})`;
          const taskId = await ctx.db.insert("tasks", {
            workspaceId: args.workspaceId,
            actionType: "investigate",
            suggestion,
            context: ev,
            payload: { deviceHash: ev.deviceHash, metadata: ev.metadata },
            status: "pending",
            requiredApproval: true,
            createdAt: Date.now(),
          });

          await ctx.db.insert("logs", {
            workspaceId: args.workspaceId,
            taskId,
            actor: "agent",
            action: "created_task",
            details: { reason: "suspicious_activity", event: ev.event },
            createdAt: Date.now(),
          });

          createdTasks.push(String(taskId));
        }
      } catch (err) {
        // Log and continue; agent should be resilient to single-row failures
        await ctx.db.insert("logs", {
          workspaceId: args.workspaceId,
          actor: "agent",
          action: "error",
          details: { message: String(err) },
          createdAt: Date.now(),
        });
      }
    }

    return { createdTasks };
  },
});

export const listAgentTasks = query({
  args: { workspaceId: v.id("workspaces"), limit: v.optional(v.number()) },
  async handler(ctx, args) {
    const limit = Math.min(args.limit ?? 50, 200);
    return await ctx.db
      .query("tasks")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(limit);
  },
});
