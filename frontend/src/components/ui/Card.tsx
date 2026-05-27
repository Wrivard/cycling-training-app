import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Use the lifted shadow (more depth) for featured cards. */
  lift?: boolean;
};

/**
 * Vercel-style card: NO traditional CSS border. The "border" is in the shadow
 * stack (`--shadow-card` / `--shadow-card-lift`) so corners can round cleanly
 * and elevation feels engineered rather than dropped-in.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { lift, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg bg-white",
        lift ? "shadow-[var(--shadow-card-lift)]" : "shadow-[var(--shadow-card)]",
        className,
      )}
      {...rest}
    />
  );
});

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-5 pb-3", className)} {...rest} />;
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 px-5 py-3 shadow-[inset_0_1px_0_0_rgba(0,0,0,0.08)]",
        className,
      )}
      {...rest}
    />
  );
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-[20px] font-semibold leading-tight tracking-[var(--tracking-card)] text-foreground",
        className,
      )}
      {...rest}
    />
  );
}

export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-[14px] leading-normal text-gray-600", className)} {...rest} />;
}
