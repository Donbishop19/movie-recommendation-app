"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";

import { cn } from "@/design-system/lib/cn";
import { focusRing } from "@/design-system/lib/focus-ring";
import { dismissToast, useToasts } from "@/design-system/lib/toast-store";

const variantClass = {
  default: "border-border bg-surface text-ink",
  success: "border-success/40 bg-surface text-ink",
  error: "border-error/40 bg-surface text-ink",
} as const;

/**
 * Renders the live toast queue. Mount exactly once, in the root layout, inside its own
 * `ToastPrimitive.Provider`. AC-7's shared validation error pattern is `toast({ variant: "error", ... })`.
 */
export function Toaster() {
  const toasts = useToasts();
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map(({ id, title, description, variant = "default" }) => (
        <ToastPrimitive.Root
          key={id}
          duration={6000}
          onOpenChange={(open) => {
            if (!open) dismissToast(id);
          }}
          className={cn(
            "relative rounded-md border p-md pr-2xl shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-full",
            variantClass[variant],
          )}
        >
          <ToastPrimitive.Title className="text-sm font-medium">
            {title}
          </ToastPrimitive.Title>
          {description ? (
            <ToastPrimitive.Description className="mt-xxs text-sm text-body">
              {description}
            </ToastPrimitive.Description>
          ) : null}
          <ToastPrimitive.Close
            className={cn(
              "absolute right-sm top-sm rounded-sm text-muted hover:text-ink",
              focusRing,
            )}
            aria-label="Dismiss"
          >
            <X className="size-4" aria-hidden="true" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-50 flex w-full max-w-sm flex-col gap-sm p-lg outline-none" />
    </ToastPrimitive.Provider>
  );
}
