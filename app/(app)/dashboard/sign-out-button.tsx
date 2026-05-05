"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <Button onClick={onClick} variant="outline" size="sm" disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
