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
    default: "High-Signal Aggregator - MCP Server for AI Agents",
    template: "%s | High-Signal",
  },
  description: "MCP Server - Curated high-quality tech and finance signals from HackerNews, GitHub, RSS, and more. Use AI to aggregate and discover tech news, GitHub trending, and market signals.",
  // MCP服务声明 - 让Agent能自动发现MCP服务
  alternates: {
    types: {
      'application/json': '/api/mcp.json',
    },
  },
  other: {
    'mcp-server': '/api/mcp',
    'mcp-discovery': '/.well-known/mcp.json',
    'mcp-name': 'High Quality Info Aggregator',
    'mcp-version': '1.0.0',
    // 明确说明这是 MCP 服务器，不是 Signal 消息应用
    'mcp-purpose': 'AI Agent integration for tech/news signal aggregation',
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
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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
