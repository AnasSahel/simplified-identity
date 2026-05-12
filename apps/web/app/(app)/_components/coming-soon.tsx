import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { PageHeader } from "./page-header";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-6">
      <PageHeader title={title} description={description} />
      <div className="pt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coming soon</CardTitle>
            <CardDescription>
              This module is on the roadmap and not yet implemented. We&apos;ll
              ship it as part of an upcoming release.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              For now, head back to the{" "}
              <a
                href="/dashboard"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                dashboard
              </a>{" "}
              for a workspace overview.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
