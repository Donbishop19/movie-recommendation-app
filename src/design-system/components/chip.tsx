import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/design-system/lib/cn";
import { focusRing } from "@/design-system/lib/focus-ring";

export const chipVariants = cva(
  "inline-flex shrink-0 items-center rounded-full border px-md py-xs text-sm font-medium transition-colors duration-(--duration-base)",
  {
    variants: {
      active: {
        true: "border-accent bg-accent text-on-accent",
        false: "border-border bg-surface text-body hover:text-ink",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export interface ChipProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {}

/** A pill shaped selectable tag, used inside `ChipGroup`. */
export function Chip({ className, active, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={Boolean(active)}
      className={cn(chipVariants({ active }), focusRing, className)}
      {...props}
    />
  );
}

export interface ChipGroupProps {
  children: ReactNode;
  /** Accessible name for the group, e.g. "Categories". */
  label: string;
  className?: string;
}

/** A horizontally scrollable row of `Chip`s, e.g. category filters above a poster grid. */
export function ChipGroup({ children, label, className }: ChipGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex gap-sm overflow-x-auto pb-xxs", className)}
    >
      {children}
    </div>
  );
}
