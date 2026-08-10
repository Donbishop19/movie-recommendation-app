"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/design-system/lib/cn";
import { focusRing } from "@/design-system/lib/focus-ring";

/** A checkbox built on Radix's primitive, which supplies keyboard operation and `aria-checked` for free. */
export function Checkbox({
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer size-5 shrink-0 rounded-sm border border-border bg-surface",
        "transition-colors duration-(--duration-base) ease-standard",
        "data-[state=checked]:bg-accent data-[state=checked]:border-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-on-accent">
        <Check className="size-4" aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
