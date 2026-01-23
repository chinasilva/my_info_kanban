import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import "../globals.css";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SignalProvider } from "@/context/SignalContext";
import { SignalDetailSheet } from "@/components/SignalDetailSheet";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "High-Signal Aggregator",
  description: "Curated high-quality tech and finance signals.",
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
              <SignalDetailSheet />
              {children}
              <Analytics />
            </SignalProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
