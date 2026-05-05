import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { Topbar } from "./_components/topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Topbar name={session.user.name ?? null} email={session.user.email} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
