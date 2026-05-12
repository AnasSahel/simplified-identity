import Link from "next/link";
import { ArrowUpFromLine, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PageActions() {
  return (
    <div className="flex items-center gap-2">
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
      <Button asChild size="sm" className="gap-1">
        <Link href="/transforms/new">
          <Plus className="h-3.5 w-3.5" />
          New transform
        </Link>
      </Button>
    </div>
  );
}
