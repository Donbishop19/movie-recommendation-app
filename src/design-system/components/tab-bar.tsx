"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Link } from "@/design-system/components/link";
import { cn } from "@/design-system/lib/cn";
import { focusRing } from "@/design-system/lib/focus-ring";

const itemClass =
  "flex flex-col items-center gap-xxs rounded-full py-xs text-xs font-medium no-underline transition-colors duration-(--duration-base)";

function iconWrapClass(active: boolean) {
  return cn(
    "flex size-8 items-center justify-center rounded-full transition-colors duration-(--duration-base)",
    active && "bg-accent text-on-accent",
  );
}

export interface TabBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * The authenticated app shell's persistent bottom navigation (spec 0007, AC-3, AC-4): a floating
 * rounded pill inset from the screen edges with a filled circle behind the active icon, matching
 * the reference. Replaces `NavBar` on the onboarding and feed pages; the signed out shell keeps
 * `NavBar`. Compose with `TabBarItem` (a route link) and `TabBarAction` (a non route action).
 */
export function TabBar({ children, className }: TabBarProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center px-lg pb-lg",
        className,
      )}
    >
      <ul className="flex h-(--size-tab-bar) w-full max-w-(--container-sm) items-center justify-around rounded-full border border-border bg-surface/95 px-sm shadow-lg backdrop-blur">
        {children}
      </ul>
    </nav>
  );
}

export interface TabBarItemProps {
  href: string;
  label: string;
  icon: ReactNode;
}

/** A route destination in the `TabBar`. Active state is derived from the current path. */
export function TabBarItem({ href, label, icon }: TabBarItemProps) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <li className="flex flex-1 justify-center">
      <Link
        href={href}
        variant="nav"
        aria-current={active ? "page" : undefined}
        className={cn(
          itemClass,
          active ? "text-accent" : "text-muted hover:text-body",
          focusRing,
        )}
      >
        <span className={iconWrapClass(active)}>{icon}</span>
        {label}
      </Link>
    </li>
  );
}

export interface TabBarActionProps {
  label: string;
  icon: ReactNode;
  /** A Server Action, invoked by submitting the item's own form (e.g. sign out). */
  action: (formData: FormData) => void | Promise<void>;
}

/** A non route `TabBar` entry: a submit button inside its own form, styled like `TabBarItem`. */
export function TabBarAction({ label, icon, action }: TabBarActionProps) {
  return (
    <li className="flex flex-1 justify-center">
      <form action={action} className="contents">
        <button
          type="submit"
          className={cn(itemClass, "text-muted hover:text-body", focusRing)}
        >
          <span className={iconWrapClass(false)}>{icon}</span>
          {label}
        </button>
      </form>
    </li>
  );
}
