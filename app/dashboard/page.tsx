import { DashboardPageClient } from "@/components/dashboard-page-client";
import { requireAuthSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const sessionUser = await requireAuthSession("/");

  return <DashboardPageClient sessionUser={sessionUser} />;
}
