import type { ComponentProps } from "react";

import { cn } from "@/design-system/lib/cn";

/** A loading placeholder shaped like the content it stands in for. Pulses unless reduced motion is requested. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-pulse motion-reduce:animate-none rounded-sm bg-surface",
        className,
      )}
      {...props}
    />
  );
}
