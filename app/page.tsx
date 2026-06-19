import { redirect } from "next/navigation";
import { LoginPageClient } from "@/components/login-page-client";
import { getAuthSessionUser } from "@/lib/auth/session";

export default async function Home() {
  const sessionUser = await getAuthSessionUser();

  if (sessionUser) {
    redirect("/dashboard");
  }

  return <LoginPageClient />;
}
