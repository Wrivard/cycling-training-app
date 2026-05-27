import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

/** Vercel-style section header — compressed display heading + relaxed subtitle. */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex items-end justify-between gap-6 pb-6", className)}>
      <div>
        <h1
          className="text-[40px] font-semibold leading-[1.1] tracking-[var(--tracking-section)] text-foreground"
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-gray-600">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
