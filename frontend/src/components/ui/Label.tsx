import type { LabelHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block text-[13px] font-medium text-foreground tracking-[var(--tracking-snug)]",
        className,
      )}
      {...rest}
    />
  );
}
