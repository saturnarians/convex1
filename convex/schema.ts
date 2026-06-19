import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_tokenIdentifier", ["tokenIdentifier"]),

  workspaces: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    avatar: v.optional(v.string()),
    autonomyMode: v.optional(
      v.union(v.literal("manual"), v.literal("autonomous"), v.literal("hybrid"))
    ),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_ownerId", ["ownerId"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("analyst"),
      v.literal("user"),
      v.literal("member"),
      v.literal("viewer")
    ),
    joinedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_userId", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  analytics: defineTable({
    workspaceId: v.id("workspaces"),
    metric: v.string(), // "revenue", "users", "growth", etc.
    value: v.number(),
    date: v.number(),
    category: v.optional(v.string()),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspace_date", ["workspaceId", "date"]),

  activityFeed: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    action: v.string(), // "created", "updated", "deleted"
    entityType: v.string(), // "report", "dashboard", "member"
    entityId: v.optional(v.string()),
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspace_date", ["workspaceId", "createdAt"]),

  reports: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_createdBy", ["createdBy"]),

  platform_staff: defineTable({
    email: v.string(),
    role: v.union(v.literal("platform_admin"), v.literal("support")),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  tracked_users: defineTable({
    workspaceId: v.id("workspaces"),
    externalId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_and_externalId", ["workspaceId", "externalId"]),

  devices: defineTable({
    endUserId: v.id("tracked_users"),
    workspaceId: v.id("workspaces"),
    hash: v.string(),
    fingerprint: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_and_hash", ["workspaceId", "hash"]),

  events: defineTable({
    endUserId: v.optional(v.id("tracked_users")),
    workspaceId: v.id("workspaces"),
    event: v.string(),
    metadata: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    deviceHash: v.optional(v.string()),
    source: v.union(v.literal("sdk"), v.literal("auth"), v.literal("system")),
    createdAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_and_createdAt", ["workspaceId", "createdAt"])
    .index("by_workspaceId_and_event", ["workspaceId", "event"]),

  agent_rules: defineTable({
    workspaceId: v.id("workspaces"),
    actionType: v.string(),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    autonomyOverride: v.optional(v.union(v.literal("auto"), v.literal("manual"))),
  }).index("by_workspaceId_and_actionType", ["workspaceId", "actionType"]),

  tasks: defineTable({
    workspaceId: v.id("workspaces"),
    actionType: v.string(),
    suggestion: v.string(),
    context: v.optional(v.any()),
    payload: v.any(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("executed"),
      v.literal("auto_executed")
    ),
    requiredApproval: v.boolean(),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    executedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_and_status", ["workspaceId", "status"]),

  logs: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    taskId: v.optional(v.id("tasks")),
    actor: v.union(
      v.literal("agent"),
      v.literal("human"),
      v.literal("system"),
      v.literal("platform_staff")
    ),
    actorId: v.optional(v.union(v.id("users"), v.id("platform_staff"))),
    action: v.string(),
    details: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_taskId", ["taskId"]),
});
