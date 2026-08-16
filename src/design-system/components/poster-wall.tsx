import { MoviePoster } from "@/movies/movie-poster";
import { cn } from "@/design-system/lib/cn";

export interface PosterWallProps {
  movies: ReadonlyArray<{
    readonly title: string;
    readonly posterUrl: string | undefined;
  }>;
  className?: string;
}

/**
 * AC-2, AC-10 of spec 0011: the signed out home hero's decorative poster collage background,
 * tiled from the app's own catalog data. Purely decorative, `aria-hidden`, always paired with a
 * dark scrim (drawn by the caller) so the headline above it keeps the already verified ink on
 * canvas contrast. Renders nothing when there are no movies to tile, so the caller's plain
 * gradient fallback shows through instead (AC-5).
 */
export function PosterWall({ movies, className }: PosterWallProps) {
  if (movies.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid grid-cols-4 gap-xxs sm:grid-cols-6 md:grid-cols-8",
        className,
      )}
    >
      {movies.map((movie, index) => (
        <div
          key={index}
          className="relative aspect-2/3 overflow-hidden rounded-sm bg-surface"
        >
          <MoviePoster posterUrl={movie.posterUrl} title={movie.title} />
        </div>
      ))}
    </div>
  );
}
