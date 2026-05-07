"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowUpFromLine, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageActions() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(() => {
    setIsRefreshing(true);
    router.refresh();
    // Brief visual delay so the spinner registers even on a hot cache.
    window.setTimeout(() => setIsRefreshing(false), 600);
  }, [router]);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="gap-1.5"
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
        />
        Refresh
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        className="cursor-not-allowed gap-1.5"
        title="Import coming soon"
      >
        <ArrowUpFromLine className="h-3.5 w-3.5" />
        Import
      </Button>
      <Button
        size="sm"
        disabled
        className="cursor-not-allowed gap-1 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
        title="Authoring coming soon"
      >
        <Plus className="h-3.5 w-3.5" />
        New transform
      </Button>
    </div>
  );
}
