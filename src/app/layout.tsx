import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/design-system/tokens.css";

import { Toaster } from "@/design-system/components/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Movie Recommendation App",
  description:
    "A personalized movie feed with reasons and a natural language vibe search.",
};

/** Root layout: wires the design token stylesheet, dark only color scheme, and base fonts. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="bg-canvas text-ink font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
