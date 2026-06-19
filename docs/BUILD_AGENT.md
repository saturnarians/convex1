
<!-- BEGIN:nextjs-agent-rules -->

# BUILD_AGENT.md - Build Specification

# BUILD_AGENT.md - Build Specification

## STEP 1 — PRODUCT VISION (Don't Skip This)

What are we building?

A Real-Time Autonomous Decision System for Businesses where:

Users belong to workspaces (multi-tenant).
Each workspace has:
- Analytics dashboard
- Activity feed (real-time)
- Role-based access (Owner/Admin/Analyst/User)

This integrates **Convex**, **offline-first**, **API-first**, **RBAC**, **telemetry**, **device fingerprinting**, and **observability** — starting from the **Auth UX** and ending with **business usage**. Identity signals (device/risk/IP) and business signals (product events) both flow through one governed pipeline — see the Master System Flow below — rather than taking separate paths. A separate, non-tenant-scoped layer of platform staff oversees all workspaces for support, billing, and abuse detection — see Super Admin / Platform Staff.

---

# 🧠 MASTER BUILD DIRECTIVE — Adaptive Identity & Telemetry Platform (Convex)

## 🎯 Objective

Build a **multi-tenant, real-time identity intelligence platform** that:

* Prevents **multi-account abuse per device**
* Tracks **telemetry events in real-time + offline**, including the requesting IP address
* Supports **RBAC (Role-Based Access Control)**, hierarchical within each workspace
* Gives **platform staff oversight across all workspaces** for support, billing, and abuse detection — without breaking per-workspace isolation
* Sends alerts via **Telegram / WhatsApp / Email**
* Provides **business-facing dashboards + APIs**
* Handles **≥10K requests/min**
* Is **observable, scalable, and modular**

---

# 🏗️ ARCHITECTURE STYLE (MANDATORY)

> **Reactive, API-First, Offline-Capable, Event-Driven Clean Architecture using Convex**

### Engineering Principles:

* SOLID
* DRY
* KISS
* Domain separation
* Function-first APIs (Convex)
* Event-driven async flows
* Clean Boundaries

---

# 🧩 CORE DOMAINS (STRICT MODULE BOUNDARIES)

```
/convex
  /auth.ts
  /users.ts
  /rbac.ts
  /platform.ts          // Platform-staff oversight: requirePlatformAdmin check,
                         // cross-workspace operations (billing, support, system health)
  /devices.ts            // device fingerprinting + tracked_users (the business's
                         // own customers — distinct from /users.ts staff accounts)
  /telemetry.ts
  /risk.ts               // risk scoring, including IP/location signal
  /agent.ts              // AI Agent Worker: reads events, checks agent_rules +
                         // workspace.autonomyMode, writes to tasks
  /tasks.ts              // Task State Machine + Approval Gateway mutations
                         // (approve / reject / execute / auto_execute)
  /notifications.ts
  /tenants.ts
  /audit.ts              // Business Audit Trail (the `logs` table) — every
                         // observation, decision, and action. Distinct from
                         // observability.ts below.
  /sync.ts
  /observability.ts      // Technical monitoring: errors, traces, metrics —
                         // NOT the business audit trail.
  /schema.ts
```

`agent.ts`, `tasks.ts`, and `audit.ts` are additions to the original module list — the schema already defines `agent_rules`, `tasks`, and `logs` tables, and this is where that logic actually lives. `audit.ts` is split out from `observability.ts` because "audit trail of business decisions" and "technical error monitoring" are different concerns. `platform.ts` is a separate dimension again: it is never scoped by `workspaceId`, because by definition a platform admin's job is to see across every workspace.

---

# 🔁 MASTER SYSTEM FLOW (CANONICAL)

This is the backbone every other section in this document plugs into.

```
[SDK] → [Ingestion API] → events table (scoped by workspaceId)
                               │
                ┌──────────────┴───────────────┐
                ▼                               ▼
        [Real-Time Dashboard]            [AI Agent Worker]
        (live charts, humans              detects anomaly →
         watch what's happening)          checks agent_rules +
                                           workspace.autonomy_mode
                                                   │
                              ┌────────────────────┴────────────────────┐
                              ▼                                          ▼
                    requires approval?                          auto-execute allowed?
                              │                                          │
                              ▼                                          ▼
                  [Approval Gateway]                        [Notification Engine]
                  human: approve/reject                     fires immediately
                              │                                          │
                              ▼                                          ▼
                  [Task State Machine]  ◄───────────────────────────────┘
                  pending→approved/rejected/executed/auto_executed
                              │
                              ▼
                       [Audit Trail / Logs]
                  (every observation, decision, action — reviewable/revertible)

Underneath everything: [Auth + Multi-Tenancy] scopes all of the above by workspaceId
(Platform Staff is the one deliberate exception — see below)
```

**How the rest of this spec plugs in:**

* **Auth + Multi-Tenancy** (Clerk for credential checking, Convex RBAC for role checks) gates every arrow above — SDK calls need a workspace-scoped API key, dashboard/Approval Gateway access needs a logged-in user with the right role.
* **Device fingerprinting + Risk Engine** are a second detection source feeding the **AI Agent Worker**, alongside business-rule/LLM-based anomaly detection over `events`. Device hash and requesting IP address are both captured server-side at the Ingestion API / Auth endpoint and feed this detection — see Risk Engine below.
* **Platform Staff** (see Super Admin section) sit outside the `workspaceId` scoping entirely — the one deliberate exception to "everything is scoped by workspace."
* Client-side state libraries (e.g. React Query, Zustand) are implementation details inside the Real-Time Dashboard and Approval Gateway boxes — not part of this backend flow.

---

# 🗺️ BUILD PHASES

A practical companion to the Master System Flow above — what to build, in what order, and why. Each phase has a concrete "done when" so it's clear when to move on.

## Phase 0 — Scaffolding (not really a phase, but don't skip it)

* Next.js + Convex project initialized, Clerk wired up
* Testing tools installed (Vitest, convex-test, React Testing Library, Storybook, Playwright) — see Testing Strategy below

## 🥇 PHASE 1 — FOUNDATION

* Auth (Clerk) + owner account auto-created on signup
* Events + Ingestion API, scoped by `workspaceId`
* Capture device hash and IP on every login/signup event — store only, no Risk Engine response yet
* Real-time dashboard — the visual proof that ingestion + multi-tenancy actually work

**Done when:** two test workspaces exist, each sees only its own live event feed.

## 🥈 PHASE 2 — GOVERNANCE SCAFFOLDING

* Full RBAC: admin/analyst/user roles, the hierarchy check, and the role-assignment rules — this is where RBAC actually has something to gate
* Tasks + Approval Gateway — build and test against a manually-inserted fake task before any real detection exists
* Risk Engine output starts routing somewhere: a flagged login becomes a pending task, not just a number
* Notifications — wired to fire on an approved task

**Done when:** a human can manually create, approve, and reject a task, and an analyst-role account provably can't.

## 🥉 PHASE 3 — AUTONOMY (RULE-BASED)

* Agent worker, rule-based (SQL aggregates: "signups dropped >X%", device/IP risk thresholds)
* `agent_rules` + `workspace.autonomyMode` routing — decides `pending` vs. `auto_executed`
* Auto-executed tasks fire notifications immediately, logged for after-the-fact review

**Done when:** the full AI-governance loop works end to end with zero LLM calls — this is the demo-able milestone, reachable without Phase 4.

## 🏆 PHASE 4 — LLM

* LLM call gated behind Phase 3's rule-based triggers — used only to draft the human-readable `suggestion`/explanation text for a finding that's already been flagged
* The auto-execute vs. approval decision stays in Phase 3's `agent_rules` logic; the LLM never makes that call itself

**Done when:** a flagged anomaly's task card reads like a written explanation instead of a raw metric.

## Deliberately parked, not forgotten

* **Offline-first** (queue + sync + conflict resolution) — its own phase once Phase 1–2's online path is solid; bolting this onto Phase 1 makes the foundation harder to get right the first time
* **Super Admin / Platform Staff** — needed once there are multiple real tenants to oversee, not before
* **Full observability stack** (Sentry/OpenTelemetry/Prometheus/Grafana/LogRocket) — apply incrementally within each phase above rather than as a phase of its own; at minimum, Sentry should be wired by the end of Phase 2

---

# 🎨 UX FLOW (STARTING POINT — AUTH PAGE)

## 🟢 1. AUTH PAGE (ENTRY UX)

### Features:

* Login / Signup
* Collect device fingerprint silently
* Detect online/offline state
* Show trust indicators (new device, location)

---

## 🔐 AUTH FLOW (STEP-BY-STEP)

### Frontend:

1. Collect:
   * email/password
   * device fingerprint (FingerprintJS or custom)
2. Call Convex mutation:

```ts
auth.login()
```

---

### Backend (Convex):

1. Verify the Clerk session token — Clerk owns credential validation; Convex never sees a raw password, it only verifies the issued JWT and looks up (or creates) the matching `users` row.
2. Generate `device_hash`.
3. Capture the request's IP address server-side, read from the `x-forwarded-for` header — this must happen in a Convex `httpAction` (which has access to the raw request), not a plain mutation, since a client-self-reported IP is trivially spoofable.
4. Check: existing device? used by another `tracked_users` account?
5. Run Risk Engine → `{ riskScore, flags }`, using device history + IP/location.
6. Write a `login_attempt` event into the **same `events` table** the SDK writes product events to, scoped by `workspaceId`, including the captured `ipAddress`.
7. If risk is MEDIUM/HIGH, route through the **Agent Worker**: check `agent_rules` + `workspace.autonomyMode` for the relevant `actionType` (e.g. `"flag_device"`, `"lock_account"`):
   * auto-execute allowed → **Notification Engine** fires immediately (e.g. "⚠️ Suspicious login from new device"), task logged as `auto_executed`
   * requires approval → task created with `status = pending`, appears in the **Approval Gateway** (e.g. "Lock account X pending review")
8. Assign session — skipped if the account was just locked via an auto-executed or pending block above.
9. Every step writes to the **Audit Trail**.

---

## 🧠 UX EDGE CASES

* Offline login → queue + sync later
* New device → show alert UI
* Suspicious login → challenge (future)

---

# 🔐 RBAC SYSTEM (MANDATORY)

## Roles (hierarchical — each includes everything below it):

* `owner` → full control (rank 4)
* `admin` → manage users/devices (rank 3)
* `analyst` → read telemetry (rank 2)
* `user` → basic access (rank 1)

Registration creates the workspace's first user as `owner` automatically. Every other role is assigned afterward, by the owner or an admin.

## Who can assign which role:

* `owner` → can assign any role: owner, admin, analyst, user
* `admin` → can assign analyst or user only — never owner or admin, to prevent a non-owner escalating their own privileges
* `analyst` / `user` → cannot assign roles

## RBAC Rules:

* Every request must include:
  * `user_id`
  * `tenant_id` (= `workspaceId` in the schema — see Strategic Recommendation below)
  * `role`
* Middleware-style validation inside Convex functions
* Platform-staff requests (see Super Admin section) are checked separately — they don't carry a `tenant_id` at all

## Example:

```ts
const ROLE_RANK = { owner: 4, admin: 3, analyst: 2, user: 1 };

function requireRole(ctx, minimumRole) {
  if (ROLE_RANK[ctx.user.role] < ROLE_RANK[minimumRole]) {
    throw new Error("Unauthorized");
  }
}
```

This checks "at least this role," not "exactly this role" — so an `owner` calling a function that does `requireRole(ctx, "admin")` still passes, instead of being incorrectly rejected for not being an exact match.

---

# 🦸 SUPER ADMIN / PLATFORM STAFF (OVERSEES ALL WORKSPACES)

Owner/admin/analyst/user are all scoped to one `workspaceId` — none of them can see across tenants, by design. Platform staff is a different dimension entirely: people on **our** team (not the business's), with no `workspaceId` filter at all. Needed for support (debugging a workspace's data without being a member of it), billing/limit enforcement, platform-wide system health, and catching abuse patterns no single workspace owner could ever see (e.g. one actor spinning up dozens of fake workspaces).

## Roles:

* `platform_admin` → full oversight: billing, suspending workspaces, system health, can grant `support`
* `support` → read-only access into any workspace's data, for ticket resolution

## Example:

```ts
function requirePlatformAdmin(ctx) {
  const staff = ctx.platformStaff; // looked up by identity, NOT by workspaceId
  if (!staff) {
    throw new Error("Unauthorized — platform staff only");
  }
}
```

## RULES:

* Never add this as a 5th value on `users.role` — that role is tied to one workspace; platform staff is not.
* Every platform-staff action that touches a specific workspace still writes to that workspace's Audit Trail (`actor: "platform_staff"`), so customers can see when and why their data was accessed.
* This is the single highest-value attack surface in the system — no standing access by default; prefer time-boxed/just-in-time elevation over an always-on super-admin session.

---

# 💡 STRATEGIC RECOMMENDATION

| Stage      | Model                   |
| ---------- | ------------------------ |
| MVP        | Workspace = Tenant       |
| Growth     | Tenant → Workspace        |
| Enterprise | Multi-workspace tenants  |

Start simple: Workspace = Tenant (for now). Then evolve into enterprise structure later.

**Tenant isolation example:**

```
Workspace A — "Nike Analytics"   workspaceId = wsp_a1
  owner → alice@nike.com   admin → bob@nike.com   user → dave@nike.com
  + their own tracked_users / devices / events, all tagged wsp_a1

Workspace B — "StartupX Dashboard"   workspaceId = wsp_b1
  owner → frank@startupx.com   admin → grace@startupx.com
  + their own tracked_users / devices / events, all tagged wsp_b1
```

Alice's "full control" as owner of A has zero reach into B — every query in every function filters by `workspaceId`. Only Platform Staff (above) can see both.

---

# 🧱 DATABASE SCHEMA (CONVEX)

```ts
workspaces: defineTable({
    name: v.string(),
    config: v.optional(v.any()),
    autonomyMode: v.union(
      v.literal("manual"),
      v.literal("autonomous"),
      v.literal("hybrid")
    ),
  }),

  // Platform staff — never scoped by workspaceId. This is the team running
  // the platform itself, not any one tenant's employees.
  platform_staff: defineTable({
    email: v.string(),
    role: v.union(v.literal("platform_admin"), v.literal("support")),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Dashboard/staff accounts for ONE business — these are the people who
  // log into the dashboard and hold an RBAC role. NOT the business's own
  // customers (see tracked_users below).
  users: defineTable({
    email: v.string(),
    workspaceId: v.id("workspaces"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("analyst"),
      v.literal("user")
    ),
    channel: v.optional(v.string()), // notification channel handle (Telegram/WhatsApp/email)
  }).index("by_workspace", ["workspaceId"]),

  // The business's OWN customers — fingerprinted and tracked for fraud/abuse.
  // They never log into our dashboard and never have an RBAC role.
  tracked_users: defineTable({
    workspaceId: v.id("workspaces"),
    externalId: v.optional(v.string()), // the business's own ID/email for this person, if sent
    createdAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),

  devices: defineTable({
    endUserId: v.id("tracked_users"),
    workspaceId: v.id("workspaces"),
    hash: v.string(),
    fingerprint: v.optional(v.any()),
  }).index("by_workspace_hash", ["workspaceId", "hash"]),

  events: defineTable({
    endUserId: v.optional(v.id("tracked_users")),
    workspaceId: v.id("workspaces"),
    event: v.string(),
    metadata: v.optional(v.any()),
    ipAddress: v.optional(v.string()), // captured server-side, see Auth Flow + Risk Engine
    createdAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),

  // Per-action autonomy policy. Looked up by the agent worker
  // before it decides whether a task needs human approval.
  agent_rules: defineTable({
    workspaceId: v.id("workspaces"),
    actionType: v.string(), // e.g. "send_email", "issue_refund", "disable_account", "flag_device"
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    // null = fall back to workspace.autonomyMode; otherwise this overrides it
    autonomyOverride: v.optional(
      v.union(v.literal("auto"), v.literal("manual"))
    ),
  }).index("by_workspace_action", ["workspaceId", "actionType"]),

  // The approval queue / auto-executed feed. Core operational table.
  tasks: defineTable({
    workspaceId: v.id("workspaces"),
    actionType: v.string(),
    suggestion: v.string(), // human-readable summary, e.g. "Send 10% discount to 42 churning users"
    context: v.optional(v.any()), // snapshot of the data that triggered this, shown in the UI for review
    payload: v.any(), // structured data needed to actually execute the action
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("executed"),
      v.literal("auto_executed")
    ),
    requiredApproval: v.boolean(), // decided at creation time from agent_rules lookup
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    executedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  // Immutable audit trail — every observation, decision, and action.
  // workspaceId is optional because some platform-staff actions
  // (e.g. "viewed system-wide health") don't belong to any single workspace.
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
    action: v.string(), // "observed_anomaly" | "approved" | "rejected" | "executed" | "auto_executed" | "reverted"
    details: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_task", ["taskId"]),
```

---

# 📡 TELEMETRY SYSTEM

## Events to Track:

* login_attempt
* signup
* device_registered
* suspicious_activity
* session_start

These are the rows written into the `events` table — the same table both the SDK (product usage, tied to `tracked_users`) and the Auth Flow (identity signals) feed, each carrying the requesting `ipAddress`, and the same table the AI Agent Worker reads from in the Master System Flow above.

## RULE:

> Every important action MUST emit a telemetry event

---

# ⚠️ RISK ENGINE

## Rules:

* Same device + multiple `tracked_users` accounts → HIGH risk
* Known device, but IP/location suddenly different → MEDIUM (possible account takeover, VPN, or proxy)
* New device or new location → MEDIUM
* Known device, known location → LOW

"Location" is derived from `ipAddress` via geolocation lookup — IP must be read server-side from the incoming request (the `x-forwarded-for` header), never self-reported by the client SDK, since a client-supplied IP is trivially spoofable.

## Output:

```ts
{
  riskScore: 0.85,
  flags: ["multi_account"]
}
```

This output is a **candidate detection passed to the Agent Worker** — not a notification trigger on its own. It is evaluated against `agent_rules` + `workspace.autonomyMode` exactly like a business anomaly, per the Master System Flow.

---

# 🔔 NOTIFICATION SYSTEM

## Channels:

* Telegram Bot API
* WhatsApp Business API
* Email (SMTP)

## Trigger Events:

* New device login
* Suspicious activity
* Multi-account detection

These only fire via the governed path in the Master System Flow — i.e. from an `auto_executed` decision or an `approved` task — not directly from the Risk Engine or Telemetry System.

---

# 📴 OFFLINE-FIRST SYSTEM

## Frontend Requirements:

### 1. Local Queue

* Store:
  * login attempts
  * telemetry events

### 2. Sync Engine

* On reconnect:
  * replay queued actions
  * resolve conflicts

## RULE:

> No critical action should be lost due to connectivity

---

# 👁️ OBSERVABILITY (MANDATORY — NO EXCEPTIONS)

## Must Integrate:

### Error Tracking
* Sentry (note: Convex's built-in Sentry integration is a Pro-plan feature; on the free tier, wire Sentry manually inside Node actions)

### Logging
* Pino (only usable inside Convex actions declared `"use node"` — queries/mutations run in a restricted runtime without full Node APIs)

### Tracing
* OpenTelemetry

### Metrics
* Prometheus
* Grafana

### Session Replay
* LogRocket

## RULES:

* Every mutation must log
* Every error must be tracked
* Every critical flow must be traceable

---

# 🧪 TESTING STRATEGY

## 1. Convex Backend Logic — `convex-test` + Vitest

The official Convex testing library; runs your actual queries/mutations/actions against a mocked backend, no network calls needed. This is where the security- and correctness-critical logic gets validated:

* `rbac.ts` — `requireRole` correctly lets higher ranks through lower-rank gates (owner passes an admin check), and blocks lower ranks
* `platform.ts` — `requirePlatformAdmin` rejects anyone not in `platform_staff`
* **Multi-tenancy isolation** (the most important test in the whole suite): create two workspaces, assert Workspace A's owner cannot read or mutate Workspace B's `events`/`tasks`/`devices`
* `risk.ts` — known inputs (same device + 2 `tracked_users`, new IP on a known device) produce the expected `riskScore`/`flags`
* `tasks.ts` — the state machine: `pending → approved/rejected → executed`; approving twice only executes once (idempotency); `agent_rules` + `workspace.autonomyMode` correctly route an action to `pending` vs `auto_executed`
* `agent.ts` — given a fixed `events` history, the worker produces the expected task `suggestion`/`payload`
* `auth.ts` — device check + IP capture write the correct `events` row and trigger the correct risk path

## 2. React Component Tests — Vitest + React Testing Library

Convex's `useQuery`/`useMutation` mocked per Convex's documented pattern. Tests RBAC-driven UI, not just backend RBAC:

* an `analyst`-role dashboard renders without Approve/Reject buttons at all
* a `user`-role dashboard doesn't render device/telemetry detail views
* the Approval Gateway's "Pending" and "Auto-Executed" tabs render the correct task lists

## 3. Storybook — Component Development & Visual Review

Not a test runner — a way to build/review pieces in isolation before wiring into the real app: metric cards, the risk-score badge, a single Approval Gateway task card, the advanced table (pagination/sort/search/filter). No live data, no auth, no Convex connection needed.

## 4. End-to-End — Playwright

Full flows, real browser:

* signup → workspace creation → owner account created
* login → fingerprint captured → device check → dashboard loads with live data
* agent-detected anomaly appears in the Approval Gateway in real time (Convex's reactivity should make this visible with no manual refresh)
* approve a task → Audit Trail updates
* **offline-first**: `context.setOffline(true)` mid-session, queue a login attempt, go back online, assert it synced and replayed correctly — the only realistic way to test this end to end

## RULE:

> Every module in `/convex` gets at least one `convex-test` suite before it's considered done. Multi-tenancy isolation and RBAC are non-negotiable — no module ships without a test proving a lower-privileged role, or a different workspace, is actually blocked. Run all four layers on every push via GitHub Actions (free for this scale).

---

# 🧑‍💼 HOW BUSINESSES USE THIS

## 🟢 Onboarding Flow

**Required at signup** (creates the workspace + its first user):

* Business/workspace name
* Owner's email + password, or SSO via Clerk
* Acceptance of Terms of Service / Privacy Policy — the business is about to have its own customers' devices and IP addresses tracked through this platform, so this isn't boilerplate; it's an acknowledgment of that responsibility (and a nudge to disclose it in their own privacy policy)

**Useful, non-blocking** (ask during or shortly after onboarding):

* Plan tier (Free / Pro / Enterprise) — no payment info required for Free; only collect billing details on upgrade
* Notification channel (Telegram handle / email / WhatsApp number) — feeds `users.channel`
* Initial `autonomyMode` (manual / autonomous / hybrid) — defaults to `manual` if skipped, changeable later in Settings → Agent Rules

**Auto-generated, never asked:**

* `workspaceId`
* API key (shown once)
* The signing-up account's `users` row, with `role = "owner"`

## 🔧 Integration

### Option 1: SDK
* Plug into login/signup

### Option 2: API
* Send events manually

## 📊 Dashboard Features

* Device tracking per user
* Suspicious activity alerts
* Real-time login monitoring
* Risk scoring insights
* Metrics cards (Revenue, Users, Growth)
* Charts (line, bar)
* Filters (date range, category)
* Advanced Table: pagination, sorting, search, filters
* "Pending Approval" and "Auto-Executed (Review)" tabs feeding off the Approval Gateway / Task State Machine

## 💡 Core Value Proposition

> "Know every device your users touch in real-time."

---

# 🚀 PERFORMANCE & SCALING RULES

* Stateless frontend
* Convex handles backend scaling
* Use indexing on device hash
* Avoid heavy synchronous logic
* Use scheduler for async tasks

---

# 🔐 SECURITY RULES

* Hash all device fingerprints
* IP addresses are personal data under GDPR/CCPA — apply a retention window and truncate/anonymize stored IPs after it, same spirit as hashing device fingerprints
* Encrypt sensitive data
* Rate limit login attempts by device, email, AND IP — catches abuse that rotates one but not the others
* Validate tenant/workspace boundaries strictly
* RBAC middleware + auth guards
* Platform-staff access: no standing sessions by default; log every cross-workspace action

---

# 🧠 FUTURE-READY EXTENSIONS

* Behavioral biometrics
* AI anomaly detection
* Cross-tenant fraud graph (a natural extension of Platform Staff's cross-workspace visibility)
* Edge fingerprint scoring

---

# 📚 RESEARCH REFERENCES

* Martin Kleppmann — data systems
* Eric Evans — domain design
* Robert C. Martin — clean architecture
* Convex docs — reactive backend patterns

---

# 🧾 FINAL DIRECTIVE

> Build this system as a modular, observable, multi-tenant platform using Convex.
> The Master System Flow above is canonical: identity signals (device/risk/IP) and business signals (product events) both route through the Agent Worker → agent_rules → Task State Machine → Audit Trail, not through separate ad hoc paths.
> Dashboard staff (`users`, RBAC-scoped) and the business's own tracked customers (`tracked_users`, fingerprinted) are different concepts — never conflate them.
> Platform Staff oversee all workspaces but never bypass per-workspace Audit Trail logging.
> Enforce RBAC hierarchically at every boundary.
> Ensure offline capability with sync recovery.
> Every function must be observable, traceable, and scalable.
> No silent failures. No tight coupling.



<!-- END:nextjs-agent-rules -->