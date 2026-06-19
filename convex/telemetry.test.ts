/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const rawModules = import.meta.glob("./**/*.ts");
// Provide module keys that convex-test expects, including internal/ prefixed paths
const modules = Object.fromEntries([
  ...Object.entries(rawModules).map(([k, v]) => [k.replace(/^\.\//, "").replace(/\.ts$/, ""), v]),
  ...Object.entries(rawModules).map(([k, v]) => ["internal/" + k.replace(/^\.\//, "").replace(/\.ts$/, ""), v]),
]);

test("ingest event mutation writes an event", async () => {
  const t = convexTest(schema, modules);
  // Call the internal mutation to ingest an event
  // Create a user and a workspace for the test
  const user = await t.mutation(api.workspace.signIn, { email: "tester@example.com" });
  const workspaceId = await t.mutation(api.workspace.createWorkspace, {
    name: "Test Workspace",
    slug: "test-workspace",
    ownerId: user.id,
  });

  await t.mutation(api.internal.telemetry.ingestEvent, {
    workspaceId,
    event: "test_event",
    metadata: { foo: "bar" },
    deviceHash: "device123",
    source: "sdk",
  });

  const events = await t.query(api.telemetry.listRecentEvents, { workspaceId });
  expect(events.length).toBeGreaterThan(0);
});
