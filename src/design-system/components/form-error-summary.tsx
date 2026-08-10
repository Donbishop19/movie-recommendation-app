import { AlertTriangle } from "lucide-react";

import { cn } from "@/design-system/lib/cn";

export interface FormErrorSummaryProps {
  /** One message per failed field or rule. Renders nothing when empty, so callers can pass it unconditionally. */
  errors: string[];
  /** Heading above the list; defaults to a generic prompt. */
  title?: string;
  className?: string;
}

/**
 * AC-7: the reusable validation error summary, the inline banner half of the shared pattern
 * (`toast()` from `toast-store.ts` is the transient half). Any Server Action backed form renders
 * this from its returned error state; `role="alert"` announces it the moment it appears without
 * the form needing to manage focus itself.
 */
export function FormErrorSummary({
  errors,
  title = "Please fix the following:",
  className,
}: FormErrorSummaryProps) {
  if (errors.length === 0) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex gap-sm rounded-md border border-error/40 bg-error/10 p-md text-sm text-ink",
        className,
      )}
    >
      <AlertTriangle
        className="mt-xxs size-4 shrink-0 text-error"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-xxs">
        <p className="font-medium">{title}</p>
        <ul className="list-disc space-y-xxs pl-lg text-body">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
