import { NextResponse } from "next/server";
import { z } from "zod";
import { clearAuthSession, setAuthSession } from "@/lib/auth/session";
import { authSessionUserSchema } from "@/types/auth";

const createSessionSchema = z
  .object({
    user: authSessionUserSchema,
  })
  .strict();

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsedBody = createSessionSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        message: "Invalid auth session payload.",
        errors: parsedBody.error.flatten(),
      },
      { status: 400 }
    );
  }

  await setAuthSession(parsedBody.data.user);

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAuthSession();

  return NextResponse.json({ ok: true });
}
