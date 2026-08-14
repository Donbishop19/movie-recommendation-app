import type { ReactNode } from "react";

import { Container } from "@/design-system/components/container";
import { Link } from "@/design-system/components/link";
import { cn } from "@/design-system/lib/cn";

export interface NavItem {
  label: string;
  href: string;
  /** Marks the item as the current page; styled distinctly and exposed via `aria-current`. */
  active?: boolean;
}

export interface NavBarProps {
  /** Brand mark or wordmark, rendered as the header's own link to `/`. */
  logo: ReactNode;
  items?: NavItem[];
  /** Right aligned slot: sign in button, account menu, and so on. */
  actions?: ReactNode;
  className?: string;
}

/**
 * The signed out shell's header and primary navigation landmark (home, sign in). The
 * authenticated shell (onboarding, feed) uses `TabBar` instead (spec 0007).
 */
export function NavBar({ logo, items = [], actions, className }: NavBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-canvas/95 backdrop-blur",
        className,
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-lg">
        <div className="text-lg font-medium text-ink">{logo}</div>
        {items.length > 0 ? (
          <nav aria-label="Primary" className="hidden sm:block">
            <ul className="flex items-center gap-lg">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    variant="nav"
                    data-active={item.active}
                    aria-current={item.active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {actions ? (
          <div className="flex items-center gap-sm">{actions}</div>
        ) : null}
      </Container>
    </header>
  );
}
