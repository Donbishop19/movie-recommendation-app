import NextLink from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/design-system/lib/cn";
import { focusRing } from "@/design-system/lib/focus-ring";

export interface LinkProps extends ComponentProps<typeof NextLink> {
  /** `accent`: an inline text link. `nav`: a navigation item, no underline until hover/focus. */
  variant?: "accent" | "nav";
}

/** A navigable link. Always a real `<a>` (via `next/link`), never a styled `<div onClick>`. */
export function Link({ className, variant = "accent", ...props }: LinkProps) {
  return (
    <NextLink
      className={cn(
        "rounded-sm transition-colors duration-(--duration-base) ease-standard",
        variant === "accent" &&
          "text-accent underline underline-offset-4 hover:text-accent/80",
        variant === "nav" &&
          "text-body no-underline hover:text-ink data-[active=true]:text-ink",
        focusRing,
        className,
      )}
      {...props}
    />
  );
}
