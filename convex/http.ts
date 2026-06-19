import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { verifyClerkToken } from "./clerk";

type IngestEventBody = {
  workspaceId?: string;
  event?: string;
  metadata?: unknown;
  deviceHash?: string;
  source?: "sdk" | "auth" | "system";
};

const http = httpRouter();

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function firstForwardedIp(value: string | null) {
  return value?.split(",")[0]?.trim() || undefined;
}

function captureClientIp(request: Request) {
  // Prefer standard proxies then common vendor headers as fallbacks
  return (
    firstForwardedIp(request.headers.get("x-forwarded-for")) ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-client-ip") ||
    undefined
  );
}

http.route({
  path: "/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = (await request.json().catch(() => null)) as IngestEventBody | null;

    if (!body?.workspaceId || !body.event) {
      return jsonResponse({ message: "workspaceId and event are required." }, 400);
    }

    // If Clerk issuer is configured, require and verify a Bearer token.
    const clerkIssuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
    if (clerkIssuer) {
      const authHeader = request.headers.get("authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!token) {
        return jsonResponse({ message: "Unauthorized: missing Bearer token" }, 401);
      }
      try {
        await verifyClerkToken(token, clerkIssuer);
      } catch (err) {
        return jsonResponse({ message: "Unauthorized: invalid token" }, 401);
      }
    }

    const eventId = await ctx.runMutation(internal.telemetry.ingestEvent, {
      workspaceId: body.workspaceId as Id<"workspaces">,
      event: body.event,
      metadata: body.metadata,
      deviceHash: body.deviceHash,
      source: body.source ?? "sdk",
      ipAddress: captureClientIp(request),
    });

    return jsonResponse({ ok: true, eventId }, 202);
  }),
});

export default http;
