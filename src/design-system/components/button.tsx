import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/design-system/lib/cn";
import { focusRing } from "@/design-system/lib/focus-ring";
import { Spinner } from "@/design-system/components/spinner";

export const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-xs whitespace-nowrap rounded-md text-sm font-medium",
    "transition-colors duration-(--duration-base) ease-standard",
    "disabled:pointer-events-none disabled:opacity-50",
    focusRing,
  ),
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent hover:bg-accent/90",
        secondary:
          "bg-surface text-ink border border-border hover:bg-surface/70",
        ghost: "text-body hover:bg-surface hover:text-ink",
        destructive: "bg-error text-on-accent hover:bg-error/90",
      },
      size: {
        sm: "h-8 px-sm text-xs",
        md: "h-10 px-md",
        lg: "h-12 px-lg text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Renders as its child element (Radix `Slot`) instead of a `<button>`, e.g. to wrap a `Link`. */
  asChild?: boolean;
  /** Shows a spinner in place of the label and disables the button while an action is pending. */
  isLoading?: boolean;
}

/** A button styled through the design token set, with a loading state and an `asChild` escape hatch. */
export function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled ?? isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Spinner size="sm" className="text-current" /> : null}
      {children}
    </Comp>
  );
}
