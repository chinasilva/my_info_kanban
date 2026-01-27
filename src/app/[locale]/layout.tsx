import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import "../globals.css";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SignalProvider } from "@/context/SignalContext";
import { SignalDetailSheet } from "@/components/SignalDetailSheet";
import { Analytics } from "@vercel/analytics/react";
import { ReadingProvider } from "@/context/ReadingContext";

import { GlobalReadingIndicator } from "@/components/GlobalReadingIndicator";

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
    default: "High-Signal Aggregator",
    template: "%s | High-Signal",
  },
  description: "Curated high-quality tech and finance signals from HackerNews, GitHub, and more.",
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
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
      </body>
    </html>
  );
}
