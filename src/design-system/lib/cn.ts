import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges class names, resolving conflicting Tailwind utility classes in favor of the last one given. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
