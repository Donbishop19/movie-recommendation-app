import Image from "next/image";

export interface AppBackdropProps {
  posterUrl: string | undefined;
}

/**
 * A fixed, blurred, dimmed full viewport backdrop drawn from the current poster, sat behind the
 * authenticated shell's phone width column. Without it a wide viewport reads as a narrow column
 * stranded on blank canvas (a UI build disqualifier); with it the extra space reads as deliberate,
 * the way a music or video app blurs the current cover into the background. Renders a plain
 * canvas backdrop when there is no poster yet (loading, empty, error states).
 */
export function AppBackdrop({ posterUrl }: AppBackdropProps) {
  if (!posterUrl) {
    return <div className="fixed inset-0 -z-10 bg-canvas" aria-hidden="true" />;
  }

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden bg-canvas"
      aria-hidden="true"
    >
      <Image
        src={posterUrl}
        alt=""
        fill
        className="scale-110 object-cover opacity-40 blur-3xl"
      />
      <div className="absolute inset-0 bg-canvas/80" />
    </div>
  );
}
