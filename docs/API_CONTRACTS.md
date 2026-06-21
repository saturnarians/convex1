# API_CONTRACTS.md — Phase 1–4 API Specifications

This document defines the canonical API contracts for the Convex1 identity intelligence platform across all build phases. All endpoints follow strict TypeScript/Zod validation and must maintain backward compatibility once released.

---

## 📋 Overview

- **API Format**: HTTP Actions (Convex) + Mutations/Queries
- **Validation**: Zod schemas (TypeScript-first)
- **Authentication**: Clerk JWT tokens (Bearer) + Convex context
- **Multi-Tenancy**: All endpoints scoped by `workspaceId`
- **Response Format**: JSON with consistent error handling

---

## 🟢 PHASE 1 — FOUNDATION APIs

Foundation phase focuses on event ingestion, workspace setup, and real-time dashboard data.

### 1. POST /ingest — Event Ingestion Endpoint

**Purpose**: SDK and system events ingestion with server-side IP capture and device tracking.

**Type**: HTTP Action (httpRouter)  
**Auth**: Optional Bearer token (Clerk JWT) when `CLERK_JWT_ISSUER_DOMAIN` is set  
**Rate Limit**: 10,000 req/min per workspace

#### Request

```typescript
// Zod Schema
const IngestEventSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  event: z.string().min(1, "event is required"),
  metadata: z.record(z.any()).optional(),
  deviceHash: z.string().optional(),
  source: z.enum(["sdk", "auth", "system"]).default("sdk"),
});

type IngestEventRequest = z.infer<typeof IngestEventSchema>;
```

**Example Request**:
```bash
curl -X POST https://your-deployment.convex.cloud/ingest \
  -H "Authorization: Bearer <clerk_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "wsp_abc123",
    "event": "login_attempt",
    "metadata": {
      "email": "user@example.com",
      "loginMethod": "email_password"
    },
    "deviceHash": "fp_abc123",
    "source": "auth"
  }'
```

#### Response

**Status 202 (Accepted)**:
```typescript
const IngestEventResponseSchema = z.object({
  ok: z.literal(true),
  eventId: z.string(),
  timestamp: z.number().optional(),
});

type IngestEventResponse = z.infer<typeof IngestEventResponseSchema>;
```

**Example Response**:
```json
{
  "ok": true,
  "eventId": "evt_xyz789",
  "timestamp": 1718837612000
}
```

#### Error Responses

**Status 400 (Bad Request)**:
```json
{
  "message": "workspaceId and event are required."
}
```

**Status 401 (Unauthorized)**:
```json
{
  "message": "Unauthorized: missing Bearer token"
}
```
or
```json
{
  "message": "Unauthorized: invalid token"
}
```

**Status 500 (Server Error)**:
```json
{
  "message": "Internal server error"
}
```

#### Implementation Notes

- **IP Capture**: Server-side only, never trust client-provided IP
  - Headers checked in order: `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`, `x-client-ip`
  - Takes first IP from comma-separated list
- **Auth**: Optional unless `CLERK_JWT_ISSUER_DOMAIN` env var is set
- **Device Hash**: Auto-captured if omitted (future fingerprinting integration)
- **Audit Trail**: Every event writes to `logs` table with actor="system"

---

### 2. Convex Mutation: `auth.login`

**Purpose**: Authenticate user with Clerk JWT, capture device info, check risk.

**Type**: Public Mutation  
**Auth**: Clerk JWT required via context  
**Scope**: Workspace-scoped via JWT claims

#### Request Args

```typescript
const AuthLoginArgsSchema = z.object({
  clerkToken: z.string().min(1, "clerkToken is required"),
  deviceFingerprint: z.object({
    hash: z.string(),
    metadata: z.record(z.any()).optional(),
  }),
});

type AuthLoginArgs = z.infer<typeof AuthLoginArgsSchema>;
```

#### Response

```typescript
const AuthLoginResponseSchema = z.object({
  success: z.boolean(),
  userId: z.string(),
  workspaceId: z.string(),
  sessionToken: z.string().optional(),
  riskScore: z.number().min(0).max(1).optional(),
  requiresApproval: z.boolean().optional(),
});

type AuthLoginResponse = z.infer<typeof AuthLoginResponseSchema>;
```

**Example Response**:
```json
{
  "success": true,
  "userId": "usr_abc123",
  "workspaceId": "wsp_xyz789",
  "sessionToken": "sess_token_xyz",
  "riskScore": 0.15,
  "requiresApproval": false
}
```

#### Error Cases

| Scenario | Status | Response |
|----------|--------|----------|
| Invalid Clerk token | 401 | `{ "message": "Unauthorized: invalid token" }` |
| User not found | 404 | `{ "message": "User not found" }` |
| Device mismatch detected | 403 | `{ "message": "Device verification failed", "requiresChallenge": true }` |

---

### 3. Convex Query: `telemetry.listRecentEvents`

**Purpose**: Fetch recent events for workspace with pagination.

**Type**: Public Query  
**Auth**: Requires authenticated Convex context  
**Scope**: Workspace-scoped

#### Request Args

```typescript
const ListRecentEventsArgsSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  limit: z.number().int().min(1).max(100).optional().default(25),
  eventType: z.string().optional(), // Filter by event type
  source: z.enum(["sdk", "auth", "system"]).optional(),
});

type ListRecentEventsArgs = z.infer<typeof ListRecentEventsArgsSchema>;
```

#### Response

```typescript
const EventDocSchema = z.object({
  _id: z.string(),
  _creationTime: z.number(),
  workspaceId: z.string(),
  event: z.string(),
  metadata: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  deviceHash: z.string().optional(),
  source: z.enum(["sdk", "auth", "system"]),
  createdAt: z.number(),
});

const ListRecentEventsResponseSchema = z.array(EventDocSchema);

type ListRecentEventsResponse = z.infer<typeof ListRecentEventsResponseSchema>;
```

**Example Response**:
```json
[
  {
    "_id": "evt_1",
    "_creationTime": 1718837612000,
    "workspaceId": "wsp_abc123",
    "event": "login_attempt",
    "metadata": { "email": "user@example.com" },
    "ipAddress": "192.168.1.1",
    "deviceHash": "fp_abc123",
    "source": "auth",
    "createdAt": 1718837612000
  },
  {
    "_id": "evt_2",
    "_creationTime": 1718837600000,
    "workspaceId": "wsp_abc123",
    "event": "signup",
    "metadata": { "plan": "free" },
    "source": "sdk",
    "createdAt": 1718837600000
  }
]
```

---

### 4. Convex Mutation: `workspace.createWorkspace`

**Purpose**: Create new workspace with owner role assignment.

**Type**: Public Mutation  
**Auth**: Requires Clerk JWT  
**Scope**: Auto-scoped to authenticated user

#### Request Args

```typescript
const CreateWorkspaceArgsSchema = z.object({
  name: z.string().min(1).max(256, "Workspace name must be ≤ 256 chars"),
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, "Slug must be alphanumeric + hyphens"),
  description: z.string().max(500).optional(),
  autonomyMode: z.enum(["manual", "autonomous", "hybrid"]).default("manual"),
});

type CreateWorkspaceArgs = z.infer<typeof CreateWorkspaceArgsSchema>;
```

#### Response

```typescript
const WorkspaceDocSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  ownerId: z.string(),
  autonomyMode: z.enum(["manual", "autonomous", "hybrid"]),
  createdAt: z.number(),
});

type CreateWorkspaceResponse = z.infer<typeof WorkspaceDocSchema>;
```

**Example Response**:
```json
{
  "_id": "wsp_new123",
  "name": "Nike Analytics",
  "slug": "nike-analytics",
  "description": "Real-time device tracking for Nike users",
  "ownerId": "usr_owner123",
  "autonomyMode": "manual",
  "createdAt": 1718837612000
}
```

#### Error Cases

| Scenario | Status | Response |
|----------|--------|----------|
| Slug already exists | 409 | `{ "message": "Workspace slug already taken" }` |
| Invalid slug format | 400 | `{ "message": "Slug must be alphanumeric + hyphens" }` |
| Unauthorized | 401 | `{ "message": "Unauthorized" }` |

---

## 🟡 PHASE 2 — GOVERNANCE APIs (Scaffolded)

Phase 2 introduces task management, RBAC enforcement, and approval workflows.

### 5. Convex Mutation: `tasks.createTask` (Phase 2)

**Purpose**: Create an approval task from risk detection.

**Type**: Internal Mutation (called by agent worker)  
**Auth**: Internal only  
**Scope**: Workspace-scoped

#### Request Args

```typescript
const CreateTaskArgsSchema = z.object({
  workspaceId: z.string(),
  actionType: z.string(), // e.g. "flag_device", "lock_account"
  suggestion: z.string(), // Human-readable summary
  context: z.record(z.any()).optional(), // Data that triggered task
  payload: z.record(z.any()), // Structured data to execute
  requiredApproval: z.boolean(),
});

type CreateTaskArgs = z.infer<typeof CreateTaskArgsSchema>;
```

#### Response

```typescript
const TaskDocSchema = z.object({
  _id: z.string(),
  workspaceId: z.string(),
  actionType: z.string(),
  suggestion: z.string(),
  status: z.enum(["pending", "approved", "rejected", "executed", "auto_executed"]),
  requiredApproval: z.boolean(),
  createdAt: z.number(),
});

type CreateTaskResponse = z.infer<typeof TaskDocSchema>;
```

---

### 6. Convex Mutation: `tasks.approveTask` (Phase 2)

**Purpose**: Approve a pending task (requires analyst+ role).

**Type**: Public Mutation  
**Auth**: Role-based (analyst+)  
**Scope**: Workspace-scoped

#### Request Args

```typescript
const ApproveTaskArgsSchema = z.object({
  taskId: z.string(),
  reason: z.string().optional(),
});

type ApproveTaskArgs = z.infer<typeof ApproveTaskArgsSchema>;
```

#### Response

```typescript
const ApproveTaskResponseSchema = z.object({
  success: z.boolean(),
  taskId: z.string(),
  status: z.enum(["approved", "executed"]),
  executedAt: z.number().optional(),
});

type ApproveTaskResponse = z.infer<typeof ApproveTaskResponseSchema>;
```

---

## 🟠 PHASE 3 — AUTONOMY APIs (Scaffolded)

Phase 3 introduces agent rule evaluation and autonomous decision making.

### 7. Convex Query: `agent.queryRules` (Phase 3)

**Purpose**: Fetch agent rules for a workspace/action type.

**Type**: Internal Query  
**Auth**: Internal only  
**Scope**: Workspace-scoped

#### Request Args

```typescript
const QueryRulesArgsSchema = z.object({
  workspaceId: z.string(),
  actionType: z.string().optional(),
});

type QueryRulesArgs = z.infer<typeof QueryRulesArgsSchema>;
```

#### Response

```typescript
const AgentRuleDocSchema = z.object({
  _id: z.string(),
  workspaceId: z.string(),
  actionType: z.string(),
  riskLevel: z.enum(["low", "medium", "high"]),
  autonomyOverride: z.enum(["auto", "manual"]).optional(),
});

const QueryRulesResponseSchema = z.array(AgentRuleDocSchema);

type QueryRulesResponse = z.infer<typeof QueryRulesResponseSchema>;
```

---

## 🔵 PHASE 4 — LLM APIs (Scaffolded)

Phase 4 integrates LLM-generated explanations for task suggestions.

### 8. Convex Action: `llm.generateTaskSuggestion` (Phase 4)

**Purpose**: Generate human-readable task suggestion via LLM.

**Type**: Internal Action  
**Auth**: Internal only  
**Scope**: Workspace-scoped

#### Request Args

```typescript
const GenerateSuggestionArgsSchema = z.object({
  workspaceId: z.string(),
  anomalyType: z.string(), // e.g. "multi_account_detection"
  eventContext: z.record(z.any()),
  riskScore: z.number(),
});

type GenerateSuggestionArgs = z.infer<typeof GenerateSuggestionArgsSchema>;
```

#### Response

```typescript
const GenerateSuggestionResponseSchema = z.object({
  suggestion: z.string(), // LLM-generated explanation
  confidence: z.number().min(0).max(1),
});

type GenerateSuggestionResponse = z.infer<typeof GenerateSuggestionResponseSchema>;
```

---

## 🔐 Authentication & Authorization

### Bearer Token Flow

All endpoints requiring authentication follow this pattern:

```typescript
// Client
const response = await fetch("https://your-deployment.convex.cloud/ingest", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${clerkToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({...}),
});

// Server (Convex httpAction)
const authHeader = request.headers.get("authorization") || "";
const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
if (!token) {
  return jsonResponse({ message: "Unauthorized: missing Bearer token" }, 401);
}
await verifyClerkToken(token, process.env.CLERK_JWT_ISSUER_DOMAIN);
```

### RBAC Hierarchy

```
owner (rank 4)   → can do everything
  ├─ admin (rank 3)    → can manage users, approve tasks
  ├─ analyst (rank 2)  → can read telemetry, approve tasks
  └─ user (rank 1)     → can read own data only
```

---

## 🧪 Testing the Contracts

### Phase 1 Integration Test Example

```typescript
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("ingest event creates audit log", async () => {
  const t = convexTest(schema, modules);

  // Create workspace
  const workspace = await t.mutation(api.workspace.createWorkspace, {
    name: "Test Workspace",
    slug: "test-workspace",
    autonomyMode: "manual",
  });

  // Ingest event
  const eventId = await t.mutation(api.telemetry.ingestEvent, {
    workspaceId: workspace._id,
    event: "login_attempt",
    metadata: { email: "test@example.com" },
    source: "auth",
    ipAddress: "192.168.1.1",
  });

  // Query recent events
  const events = await t.query(api.telemetry.listRecentEvents, {
    workspaceId: workspace._id,
  });

  expect(events).toHaveLength(1);
  expect(events[0].event).toBe("login_attempt");
  expect(events[0].ipAddress).toBe("192.168.1.1");
});
```

---

## 📊 Error Handling Standards

All errors follow this response format:

```typescript
const ErrorResponseSchema = z.object({
  message: z.string(), // Human-readable error
  code: z.string().optional(), // Machine-readable code: e.g. "WORKSPACE_NOT_FOUND"
  details: z.record(z.any()).optional(), // Additional context
});

type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
```

**Example**:
```json
{
  "message": "Workspace not found",
  "code": "WORKSPACE_NOT_FOUND",
  "details": {
    "workspaceId": "wsp_notfound"
  }
}
```

---

## 🚀 Versioning & Evolution

- **Current Version**: Phase 1 (v1.0.0)
- **Breaking Changes**: Will be released as new major version (v2.0.0)
- **Backward Compatibility**: All Phase 1 contracts guaranteed stable through v1.x
- **Deprecation Policy**: 90-day notice before removal of deprecated endpoints

---

## 📚 References

- [BUILD_AGENT.md](./BUILD_AGENT.md) — Master build directive and phases
- [DEVELOPMENT.md](./DEVELOPMENT.md) — Current implementation status
- [convex/_generated/ai/guidelines.md](../convex/_generated/ai/guidelines.md) — Convex best practices
