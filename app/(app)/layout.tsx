import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { sailpointFetch } from "@/lib/sailpoint/client";
import { AppSidebar } from "./_components/app-sidebar";
import { Topbar } from "./_components/topbar";

async function fetchSidebarCounts(
  userId: string,
): Promise<Record<string, number | undefined>> {
  // Best-effort: any failure leaves the count undefined → no badge rendered.
  // Only Transforms is wired today; the other routes are placeholders, so
  // we skip their network calls entirely until those pages are real.
  const transforms = await sailpointFetch<unknown[]>(
    userId,
    "/v2025/transforms?limit=250",
  );

  return {
    "/transforms": transforms.ok ? transforms.data.length : undefined,
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  const counts = await fetchSidebarCounts(session.user.id);

  return (
    <SidebarProvider>
      <AppSidebar
        name={session.user.name ?? null}
        email={session.user.email}
        counts={counts}
      />
      <SidebarInset>
        <Topbar tenant={process.env.SAILPOINT_TENANT ?? null} />
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
