import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Space_Grotesk, Spectral } from "next/font/google";

import { AppFeedbackProvider } from "@/components/app-feedback-provider";
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
  title: "Diamond Ranking",
  applicationName: "Diamond Ranking",
  icons: {
    icon: "/diamond-ranking-logo.png",
    apple: "/diamond-ranking-logo.png",
  },
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
        <AppFeedbackProvider>
          <div className="relative min-h-screen">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.14),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.35),transparent)]" />

            <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
              <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
                <Link href="/" className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 shadow-lg shadow-primary/20 ring-1 ring-black/10 sm:size-11">
                    <Image
                      src="/diamond-ranking-logo.png"
                      alt="Diamond Ranking logo"
                      width={48}
                      height={48}
                      priority
                      className="size-full scale-[1.28] object-cover object-center"
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate font-heading text-sm font-semibold tracking-tight sm:text-lg">
                      Diamond Ranking
                    </p>
                    <p className="hidden text-xs uppercase tracking-[0.24em] text-muted-foreground sm:block">
                      Ranking Control Center
                    </p>
                  </div>
                </Link>
                <HeaderAccountMenu />
              </div>
            </header>

            {children}
          </div>
        </AppFeedbackProvider>
      </body>
    </html>
  );
}
