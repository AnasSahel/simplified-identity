import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  // Layout enforces presence; this guards type-narrowing.
  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-xl border bg-card p-8 shadow">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="text-lg font-medium">{session.user.email}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Welcome to SailSimplified.
          </p>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
