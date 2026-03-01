import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import "../globals.css";
import { SignalProvider } from "@/context/SignalContext";
import { SignalDetailSheet } from "@/components/SignalDetailSheet";
import { Analytics } from "@vercel/analytics/react";
import { ReadingProvider } from "@/context/ReadingContext";

import { GlobalReadingIndicator } from "@/components/GlobalReadingIndicator";
import { NextAuthProvider } from "@/components/NextAuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://signal.binaryworks.app"),
  title: {
    default: "High-Signal Aggregator - Skill Setup for AI Agents",
    template: "%s | High-Signal",
  },
  description: "Skill-first API service for AI Agents. Aggregate and operate high-quality tech and finance signals from multiple sources.",
  alternates: {
    types: {
      'application/json': '/api/skill.json',
    },
  },
  other: {
    "agent-integration": "skill-only",
    "skill-config": "/api/skill.json",
    "openclaw-config": "/api/openclaw.json",
    "agent-purpose": "AI Agent integration for tech/news signal aggregation",
  },
  openGraph: {
    title: "High-Signal Aggregator",
    description: "Curated high-quality tech and finance signals.",
    url: "https://signal.binaryworks.app",
    siteName: "High-Signal Aggregator",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "High-Signal Aggregator",
    description: "Curated high-quality tech and finance signals.",
    creator: "@BinaryWorks",
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { ThemeProvider } from "@/context/ThemeContext";

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<unknown>;
}) {
  const resolvedParams = (await params) as { locale?: string } | undefined;
  const locale = resolvedParams?.locale ?? "zh";
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextAuthProvider>
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider>
              <SignalProvider>
                <ReadingProvider>
                  <SignalDetailSheet />
                  <GlobalReadingIndicator />
                  {children}
                </ReadingProvider>
                <Analytics />
              </SignalProvider>
            </ThemeProvider>
          </NextIntlClientProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
