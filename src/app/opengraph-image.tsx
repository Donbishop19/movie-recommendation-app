import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The default social share image (spec 0011 basic SEO): the design system's palette rendered as a card. */
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 28,
        padding: 96,
        backgroundColor: "#0c0a08",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: -0.5,
          color: "#f5a524",
        }}
      >
        Movie Recommendation App
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 60,
          fontWeight: 700,
          lineHeight: 1.15,
          maxWidth: 920,
          color: "#f2ecdd",
        }}
      >
        A movie feed that knows your taste, and can say why.
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 28,
          maxWidth: 820,
          color: "#a79c89",
        }}
      >
        Swipe, import your Letterboxd ratings, or search by vibe.
      </div>
    </div>,
    { ...size },
  );
}
