import { clsx, type ClassValue } from "clsx";

/** Lightweight class composer (no twMerge — we don't need conflict resolution yet). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
