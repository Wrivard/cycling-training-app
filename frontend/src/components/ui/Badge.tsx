import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Tone =
  | "neutral"
  | "blue"
  | "endurance"
  | "intervals"
  | "recovery"
  | "rest"
  | "race"
  | "other"
  | "good"
  | "ok"
  | "bad";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

const TONES: Record<Tone, string> = {
  neutral:
    "bg-white text-foreground shadow-[var(--shadow-border-light)]",
  blue: "bg-[var(--color-badge-blue-bg)] text-[var(--color-badge-blue-text)]",
  endurance: "bg-[color-mix(in_srgb,var(--color-endurance)_14%,white)] text-[var(--color-endurance)]",
  intervals: "bg-[color-mix(in_srgb,var(--color-intervals)_14%,white)] text-[var(--color-intervals)]",
  recovery: "bg-gray-50 text-gray-600 shadow-[var(--shadow-border-light)]",
  rest: "bg-white text-gray-500 shadow-[var(--shadow-border-light)]",
  race: "bg-[color-mix(in_srgb,var(--color-race)_14%,white)] text-[var(--color-race)]",
  other: "bg-gray-50 text-foreground shadow-[var(--shadow-border-light)]",
  good: "bg-[color-mix(in_srgb,var(--color-rec-good)_14%,white)] text-[var(--color-rec-good)]",
  ok: "bg-[color-mix(in_srgb,var(--color-rec-ok)_14%,white)] text-[var(--color-rec-ok)]",
  bad: "bg-[color-mix(in_srgb,var(--color-rec-bad)_14%,white)] text-[var(--color-rec-bad)]",
};

export function Badge({ tone = "neutral", className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-medium",
        TONES[tone],
        className,
      )}
      {...rest}
    />
  );
}
