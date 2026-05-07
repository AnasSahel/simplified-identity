import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { isSailpointSsoEnabled } from "@/lib/auth";

import { SailpointButton } from "../_components/sailpoint-button";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  const sso = isSailpointSsoEnabled();

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your Simplified Identity workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {sso && (
          <>
            <SailpointButton />
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                or
              </span>
              <Separator className="flex-1" />
            </div>
          </>
        )}
        <SignInForm />
      </CardContent>
    </Card>
  );
}
