import type { Metadata } from "next";
import Link from "next/link";
import { Space_Grotesk, Spectral } from "next/font/google";
import { Trophy } from "lucide-react";

import { HeaderAccountMenu } from "@/components/header-account-menu";

import "./globals.css";

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
});

const bodyFont = Spectral({
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Badminton Rankings",
  description: "Quản lý bảng đấu cầu lông đôi, mùa giải và xếp hạng cá nhân.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="font-sans">
        <div className="relative min-h-screen">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.14),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.35),transparent)]" />

          <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Trophy className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-heading text-lg font-semibold tracking-tight">Badminton Rankings</p>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Season Control Center</p>
                </div>
              </Link>
              <HeaderAccountMenu />
            </div>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}
