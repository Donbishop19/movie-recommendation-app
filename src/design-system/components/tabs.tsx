"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";

import { cn } from "@/design-system/lib/cn";
import { focusRing } from "@/design-system/lib/focus-ring";

export const Tabs = TabsPrimitive.Root;

/** The row of tab triggers. Arrow keys move selection (Radix's roving tabindex); only the active tab is in the tab order. */
export function TabsList({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex items-center gap-xxs rounded-md bg-surface p-xxs",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-sm px-md py-xs text-sm font-medium text-body",
        "transition-colors duration-(--duration-base) ease-standard",
        "data-[state=active]:bg-accent data-[state=active]:text-on-accent",
        "disabled:pointer-events-none disabled:opacity-50",
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("mt-md", focusRing, className)}
      {...props}
    />
  );
}
