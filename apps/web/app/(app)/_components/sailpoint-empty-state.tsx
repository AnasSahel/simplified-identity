import Link from "next/link";
import { Anchor, KeyRound, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Reason = "not_connected" | "auth_failed" | "api_error";

const COPY: Record<
  Reason,
  {
    icon: typeof Anchor;
    title: string;
    description: (detail?: string) => string;
    cta: { label: string; href: string };
  }
> = {
  not_connected: {
    icon: Anchor,
    title: "Connect your SailPoint tenant",
    description: () =>
      "Sign in with SailPoint to load this view from your tenant. The button is on the sign-in page when the workspace is configured.",
    cta: { label: "Sign in with SailPoint", href: "/sign-in" },
  },
  auth_failed: {
    icon: KeyRound,
    title: "SailPoint session expired",
    description: () =>
      "Your access to SailPoint was revoked or has expired. Sign in again to continue.",
    cta: { label: "Sign in again", href: "/sign-in" },
  },
  api_error: {
    icon: AlertTriangle,
    title: "SailPoint API error",
    description: (detail) =>
      `The request failed: ${detail ?? "unknown error"}. Try again, or contact your administrator if it persists.`,
    cta: { label: "Back to dashboard", href: "/dashboard" },
  },
};

export function SailpointEmptyState({
  reason,
  detail,
}: {
  reason: Reason;
  detail?: string;
}) {
  const { icon: Icon, title, description, cta } = COPY[reason];
  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description(detail)}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
