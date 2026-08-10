/**
 * The one focus treatment every interactive component uses (AC-4): a visible,
 * accent colored ring on keyboard focus, never a suppressed outline with no
 * replacement. `focus-visible` so a mouse click does not show the ring.
 */
export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";
