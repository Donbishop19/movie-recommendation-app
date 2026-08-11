"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Link } from "@/design-system/components/link";
import { cn } from "@/design-system/lib/cn";
import { focusRing } from "@/design-system/lib/focus-ring";

const tabItemClass =
  "flex h-full min-w-11 flex-1 flex-col items-center justify-center gap-xxs text-xs font-medium text-muted transition-colors duration-(--duration-base) hover:text-body data-[active=true]:text-accent";

export interface TabBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * The authenticated app shell's persistent bottom navigation (spec 0007, AC-3, AC-4). Replaces
 * `NavBar` on the onboarding and feed pages; the signed out shell keeps `NavBar`. Compose with
 * `TabBarItem` (a route link) and `TabBarAction` (a non route action, e.g. sign out).
 */
export function TabBar({ children, className }: TabBarProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 h-(--size-tab-bar) border-t border-border bg-canvas/95 backdrop-blur",
        className,
      )}
    >
      <ul className="mx-auto flex h-full w-full max-w-(--container-sm) items-stretch justify-around px-md">
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
    <li className="flex flex-1">
      <Link
        href={href}
        variant="nav"
        aria-current={active ? "page" : undefined}
        data-active={active}
        className={cn(tabItemClass, focusRing)}
      >
        {icon}
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
    <li className="flex flex-1">
      <form action={action} className="contents">
        <button type="submit" className={cn(tabItemClass, focusRing, "w-full")}>
          {icon}
          {label}
        </button>
      </form>
    </li>
  );
}
