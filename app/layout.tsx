import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Anton } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LectureAlly",
  description: "Upload lecture slides and have an AI professor narrate them.",
};

// resizes-content: when the phone's keyboard opens, shrink the layout
// viewport instead of just covering it — the chat input (and the dvh-based
// deck layout) reflow above the keyboard instead of hiding behind it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} h-full antialiased`}
      // Browser extensions (dark-mode, translators, password managers) routinely
      // inject classes/attributes into <html> before React hydrates, which
      // triggers a spurious hydration warning. Suppression is one level deep —
      // mismatches anywhere inside the tree still surface.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-bg text-text font-sans">{children}</body>
    </html>
  );
}
