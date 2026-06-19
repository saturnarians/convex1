import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authSessionUserSchema, type AuthSessionUser } from "@/types/auth";

const AUTH_COOKIE_NAME = "convex1_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const DEV_SESSION_SECRET = "convex1-local-session-secret";

const sessionPayloadSchema = z
  .object({
    user: authSessionUserSchema,
    exp: z.number().int().positive(),
  })
  .strict();

function getSessionSecret() {
  const secret =
    process.env.SESSION_SECRET ??
    process.env.AUTH_SESSION_SECRET ??
    (process.env.NODE_ENV !== "production" ? DEV_SESSION_SECRET : undefined);

  if (!secret) {
    throw new Error("Missing SESSION_SECRET for auth session signing.");
  }

  return secret;
}

function signValue(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function encodePayload(payload: z.infer<typeof sessionPayloadSchema>) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function isValidSignature(value: string, signature: string) {
  const expectedSignature = signValue(value);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createSessionToken(user: AuthSessionUser) {
  const payload = encodePayload({
    user,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });

  return `${payload}.${signValue(payload)}`;
}

export function readSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [payload, signature, extra] = token.split(".");

  if (!payload || !signature || extra || !isValidSignature(payload, signature)) {
    return null;
  }

  try {
    const parsedPayload = sessionPayloadSchema.safeParse(decodePayload(payload));

    if (!parsedPayload.success || parsedPayload.data.exp <= Date.now()) {
      return null;
    }

    return parsedPayload.data.user;
  } catch {
    return null;
  }
}

export async function setAuthSession(user: AuthSessionUser) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: AUTH_COOKIE_NAME,
    value: createSessionToken(user),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearAuthSession() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getAuthSessionUser() {
  const cookieStore = await cookies();

  return readSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export const requireAuthSession = cache(async (redirectTo: string = "/") => {
  const sessionUser = await getAuthSessionUser();

  if (!sessionUser) {
    redirect(redirectTo);
  }

  return sessionUser;
});
