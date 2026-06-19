import { z } from "zod";

export const authSessionUserSchema = z
  .object({
    id: z.string().min(1, "User id is required."),
    email: z.string().trim().email("A valid email is required."),
    name: z.string().trim().min(1, "User name is required."),
    avatar: z.string().trim().min(1).optional(),
  })
  .strict();

export type AuthSessionUser = z.infer<typeof authSessionUserSchema>;
