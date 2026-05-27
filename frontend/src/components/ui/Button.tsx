import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

const VARIANTS: Record<Variant, string> = {
  // Primary CTA — Vercel Black, ring-border, hover lightens
  primary:
    "bg-foreground text-white hover:bg-gray-900/90 active:bg-gray-900",
  // Secondary — white with shadow-border, hover flips to dark
  secondary:
    "bg-white text-foreground shadow-[var(--shadow-border-light)] hover:shadow-[var(--shadow-border)] active:bg-gray-50",
  // Ghost — no chrome until hover
  ghost: "bg-transparent text-foreground hover:bg-gray-50",
  // Danger — for disconnect / delete actions
  danger:
    "bg-white text-ship shadow-[var(--shadow-border-light)] hover:bg-ship hover:text-white",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[13px]",
  md: "h-9 px-4 text-[14px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", fullWidth, className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium tracking-normal",
        "transition-colors duration-150 select-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    />
  );
});
