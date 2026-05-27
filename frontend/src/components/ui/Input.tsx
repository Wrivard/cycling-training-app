import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-9 w-full rounded-md bg-white px-3 text-[14px] text-foreground",
        "shadow-[var(--shadow-border-light)] placeholder:text-gray-400",
        "transition-shadow duration-150",
        "hover:shadow-[var(--shadow-border)]",
        "focus:outline-none focus:shadow-[0_0_0_1px_var(--color-focus)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...rest}
    />
  );
});
