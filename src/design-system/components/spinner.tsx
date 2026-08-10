import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/design-system/lib/cn";

const sizeMap = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const;

export interface SpinnerProps extends ComponentProps<"svg"> {
  size?: keyof typeof sizeMap;
  /** Accessible label read by a screen reader; omit only when an adjacent element already announces the busy state. */
  label?: string;
}

/** An indeterminate loading indicator. Spins unless the user has asked for reduced motion, in which case it pulses instead. */
export function Spinner({
  size = "md",
  label = "Loading",
  className,
  ...props
}: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn(
        sizeMap[size],
        "animate-spin motion-reduce:animate-pulse",
        className,
      )}
      {...props}
    />
  );
}
