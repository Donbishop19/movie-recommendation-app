import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/design-system/tokens.css";

import { Toaster } from "@/design-system/components/toast";
import { PostHogProvider } from "@/analytics/posthog-provider";
import { authEnv } from "@/auth/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(authEnv.siteUrl),
  title: "TellaMovie",
  description:
    "A personalized movie feed with reasons and a natural language vibe search.",
  openGraph: {
    siteName: "TellaMovie",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

/** Root layout: wires the design token stylesheet, dark only color scheme, and base fonts. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="bg-canvas text-ink font-sans antialiased">
        <PostHogProvider>
          {children}
          <Toaster />
        </PostHogProvider>
      </body>
    </html>
  );
}
