import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
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
  );
}
