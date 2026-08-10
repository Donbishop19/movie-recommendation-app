import { Film, User } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/design-system/lib/cn";

export interface ImageFallbackProps extends ComponentProps<"div"> {
  /** Which icon reads as "missing image" for this context: a poster or an avatar. */
  kind?: "poster" | "avatar";
  /** Initials to show instead of an icon, e.g. for an avatar with a known name. */
  initials?: string;
  /** Accessible label; required, since this element stands in for a real image. */
  label: string;
}

/**
 * AC-6: what renders in place of a missing poster or avatar image, a solid color block with an
 * icon or initials, never a broken image icon. Use as the fallback branch around `next/image` /
 * `<img>`, not as an `<img>` itself.
 */
export function ImageFallback({
  kind = "poster",
  initials,
  label,
  className,
  ...props
}: ImageFallbackProps) {
  const Icon = kind === "avatar" ? User : Film;
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "flex items-center justify-center bg-surface text-muted",
        kind === "avatar" ? "rounded-full" : "rounded-md",
        className,
      )}
      {...props}
    >
      {initials ? (
        <span className="text-sm font-medium text-body" aria-hidden="true">
          {initials}
        </span>
      ) : (
        <Icon className="size-1/3" aria-hidden="true" />
      )}
    </div>
  );
}
