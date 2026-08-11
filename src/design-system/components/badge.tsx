import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/design-system/lib/cn";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-sm py-xxs text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-surface text-body border border-border",
        accent: "bg-accent text-on-accent",
        success: "bg-success/15 text-success",
        error: "bg-error/15 text-error",
        /** A pill for text sitting on top of a poster image, e.g. the TMDB rating badge (spec 0007). */
        rating: "bg-scrim/80 text-ink backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

/** A small status or tag label. Never the only way meaning is conveyed; pair with text a screen reader announces. */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}
