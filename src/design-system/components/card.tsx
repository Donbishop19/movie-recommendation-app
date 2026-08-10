import type { ComponentProps } from "react";

import { cn } from "@/design-system/lib/cn";
import { Skeleton } from "@/design-system/components/skeleton";

/** A raised surface for grouping related content. Compose with `CardHeader`, `CardContent`, `CardFooter`. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-surface text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-xxs p-lg", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3 className={cn("text-lg font-medium text-ink", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-body", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-lg pb-lg", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-sm px-lg pb-lg", className)}
      {...props}
    />
  );
}

/** AC-5: a loading placeholder shaped like a populated `Card`, for card grid loading states. */
export function CardSkeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-sm rounded-md border border-border bg-surface p-lg",
        className,
      )}
      {...props}
    >
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
