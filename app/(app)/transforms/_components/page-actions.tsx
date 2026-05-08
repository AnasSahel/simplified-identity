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
