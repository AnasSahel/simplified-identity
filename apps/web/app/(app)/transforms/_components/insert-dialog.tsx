"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { templateFor } from "@/lib/sailpoint/transforms/templates";

import { TypePicker } from "./type-picker";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Called with the JSON skeleton string ready to be inserted at the cursor */
  onInsert: (skeleton: string) => void;
};

export function InsertTransformDialog({ open, onOpenChange, onInsert }: Props) {
  function handlePick(type: string) {
    const skeleton = templateFor(type);
    const text = JSON.stringify(skeleton, null, 2);
    onInsert(text);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4">
        <div className="flex items-center gap-2 pb-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <DialogTitle className="text-base">Insert transform</DialogTitle>
        </div>
        <DialogDescription>
          Pick a type — a JSON skeleton will be inserted at the cursor
          position. You can wrap or compose it from there.
        </DialogDescription>
        <div className="pt-2">
          <TypePicker value={null} onChange={handlePick} label="Pick a type" />
        </div>
        <p className="pt-1 text-[11px] text-muted-foreground">
          Tip: <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">⌘I</kbd>{" "}
          opens this dialog from the editor.
        </p>
      </DialogContent>
    </Dialog>
  );
}
