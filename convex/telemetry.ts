import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

const eventSourceValidator = v.union(v.literal("sdk"), v.literal("auth"), v.literal("system"));

export const ingestEvent = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    event: v.string(),
    metadata: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    deviceHash: v.optional(v.string()),
    source: eventSourceValidator,
  },
  async handler(ctx, args) {
    const workspace = await ctx.db.get(args.workspaceId);

    if (!workspace) {
      throw new Error("Workspace not found.");
    }

    const eventId = await ctx.db.insert("events", {
      workspaceId: args.workspaceId,
      event: args.event,
      metadata: args.metadata,
      ipAddress: args.ipAddress,
      deviceHash: args.deviceHash,
      source: args.source,
      createdAt: Date.now(),
    });

    await ctx.db.insert("logs", {
      workspaceId: args.workspaceId,
      actor: "system",
      action: "telemetry_event_ingested",
      details: {
        eventId,
        event: args.event,
        source: args.source,
      },
      createdAt: Date.now(),
    });

    return eventId;
  },
});

export const listRecentEvents = query({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const limit = Math.min(args.limit ?? 25, 100);

    return await ctx.db
      .query("events")
      .withIndex("by_workspaceId_and_createdAt", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(limit);
  },
});
