import type { InputHTMLAttributes } from "react";

import { cn } from "@/design-system/lib/cn";
import { focusRing } from "@/design-system/lib/focus-ring";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Marks the field as failing validation: red border plus `aria-invalid`. Pair with `aria-describedby` pointing at the error text. */
  invalid?: boolean;
}

/** A single line text input. Never relies on placeholder alone; pair with a `Label`. */
export function Input({ className, invalid = false, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-10 w-full rounded-sm border border-border bg-surface px-sm text-sm text-ink",
        "placeholder:text-muted",
        "transition-colors duration-(--duration-base) ease-standard",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid && "border-error focus-visible:ring-error",
        focusRing,
        className,
      )}
      {...props}
    />
  );
}
