"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> & {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
};

export function Checkbox({
  className,
  checked,
  indeterminate,
  onChange,
  ...props
}: CheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onChange?.(e.currentTarget.checked)}
      className={cn(
        "h-3.5 w-3.5 cursor-pointer rounded border-input accent-foreground",
        className,
      )}
      {...props}
    />
  );
}
