"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function SailpointGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4"
    >
      <path d="M12 3 L4 18 L20 18 Z" />
      <path d="M12 18 L12 21" />
    </svg>
  );
}

export function SailpointButton({ callbackURL = "/dashboard" }: { callbackURL?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setPending(true);
    const { error } = await authClient.signIn.oauth2({
      providerId: "sailpoint",
      callbackURL,
    });
    if (error) {
      setError(error.message ?? "Could not start SailPoint sign-in.");
      setPending(false);
    }
    // On success, the browser is being redirected away — no need to clear pending.
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onClick}
        disabled={pending}
      >
        <SailpointGlyph />
        {pending ? "Redirecting…" : "Continue with SailPoint"}
      </Button>
      {error && (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
