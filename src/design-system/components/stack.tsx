import type { ComponentProps, ElementType } from "react";

import { cn } from "@/design-system/lib/cn";

const gapClass = {
  none: "gap-0",
  xxs: "gap-xxs",
  xs: "gap-xs",
  sm: "gap-sm",
  md: "gap-md",
  lg: "gap-lg",
  xl: "gap-xl",
} as const;

const alignClass = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;

const justifyClass = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;

export interface StackProps extends ComponentProps<"div"> {
  as?: ElementType;
  direction?: "row" | "column";
  gap?: keyof typeof gapClass;
  align?: keyof typeof alignClass;
  justify?: keyof typeof justifyClass;
  wrap?: boolean;
}

/** The flex based layout primitive for arranging children in a row or column with token driven gaps. */
export function Stack({
  as: Comp = "div",
  direction = "column",
  gap = "md",
  align = "stretch",
  justify = "start",
  wrap = false,
  className,
  ...props
}: StackProps) {
  return (
    <Comp
      className={cn(
        "flex",
        direction === "row" ? "flex-row" : "flex-col",
        gapClass[gap],
        alignClass[align],
        justifyClass[justify],
        wrap && "flex-wrap",
        className,
      )}
      {...props}
    />
  );
}

export interface GridProps extends ComponentProps<"div"> {
  as?: ElementType;
  /** Column count at the `sm` breakpoint and up; mobile is always a single column. */
  cols?: 2 | 3 | 4;
  gap?: keyof typeof gapClass;
}

const gridColsClass = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

/** The CSS grid based layout primitive, for card grids and similar responsive collections. */
export function Grid({
  as: Comp = "div",
  cols = 3,
  gap = "md",
  className,
  ...props
}: GridProps) {
  return (
    <Comp
      className={cn(
        "grid grid-cols-1",
        gridColsClass[cols],
        gapClass[gap],
        className,
      )}
      {...props}
    />
  );
}
