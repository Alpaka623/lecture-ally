import type { Metadata } from "next";
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
