import type { ReactNode } from "react";

import { MoviePoster } from "@/movies/movie-poster";
import { cn } from "@/design-system/lib/cn";

export interface HeroSpotlightProps {
  title: string;
  releaseYear: number | undefined;
  posterUrl: string | undefined;
  reason: string;
  action?: ReactNode;
  className?: string;
}

/**
 * The feed's top ranked recommendation: a large poster with a gradient overlay and its
 * recommendation reason (spec 0007, AC-5). The overlay uses `--color-scrim` at full opacity at
 * the very bottom, where the text sits, fading to transparent above; ink on a fully opaque scrim
 * matches the already verified 16.8:1 ink on canvas contrast, since scrim equals canvas.
 */
export function HeroSpotlight({
  title,
  releaseYear,
  posterUrl,
  reason,
  action,
  className,
}: HeroSpotlightProps) {
  return (
    <div
      className={cn(
        "relative aspect-2/3 w-full overflow-hidden rounded-lg bg-surface",
        className,
      )}
    >
      <MoviePoster posterUrl={posterUrl} title={title} />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-scrim via-scrim/75 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-xs p-lg">
        <h2 className="text-xl font-medium text-ink">
          {title}
          {releaseYear ? (
            <span className="text-body"> ({releaseYear})</span>
          ) : null}
        </h2>
        <p className="text-sm text-body">{reason}</p>
        {action}
      </div>
    </div>
  );
}
