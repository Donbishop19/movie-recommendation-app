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
        backgroundColor: "#0b0f1c",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: -0.5,
          color: "#3491ef",
        }}
      >
        TellaMovie
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 60,
          fontWeight: 700,
          lineHeight: 1.15,
          maxWidth: 920,
          color: "#f2f4fb",
        }}
      >
        Find the best movies and shows to watch with friends.
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 28,
          maxWidth: 820,
          color: "#aab2c8",
        }}
      >
        Swipe, import your Letterboxd ratings, or search by vibe.
      </div>
    </div>,
    { ...size },
  );
}
