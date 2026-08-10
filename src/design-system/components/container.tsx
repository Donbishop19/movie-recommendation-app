import type { ComponentProps, ElementType } from "react";

import { cn } from "@/design-system/lib/cn";

export interface ContainerProps extends ComponentProps<"div"> {
  /** The element to render as; `<main>` for a page's primary landmark, `<div>` otherwise. */
  as?: ElementType;
}

/** Centers content and caps its width, with responsive horizontal padding. The page level layout primitive. */
export function Container({
  as: Comp = "div",
  className,
  ...props
}: ContainerProps) {
  return (
    <Comp
      className={cn("mx-auto w-full max-w-6xl px-md sm:px-lg", className)}
      {...props}
    />
  );
}
