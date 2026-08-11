import Image from "next/image";
import { ImageFallback } from "@/design-system/components/image-fallback";
import { cn } from "@/design-system/lib/cn";

export interface MoviePosterProps {
  posterUrl: string | undefined;
  title: string;
  className?: string;
}

/** A movie poster or its AC-6 fallback. Fills a `relative`, sized parent. */
export function MoviePoster({ posterUrl, title, className }: MoviePosterProps) {
  if (!posterUrl) {
    return (
      <ImageFallback
        kind="poster"
        label={`${title}: no poster available`}
        className={cn("absolute inset-0", className)}
      />
    );
  }

  return (
    <Image
      src={posterUrl}
      alt={`${title} poster`}
      fill
      sizes="(max-width: 640px) 100vw, 400px"
      className={cn("object-cover", className)}
    />
  );
}
