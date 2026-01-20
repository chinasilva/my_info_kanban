import { prisma } from "@/lib/prisma/db";
import { SignalColumn } from "@/components/SignalColumn";
import { Code2, BarChart3, Newspaper, Rocket } from "lucide-react";
import { getTranslations } from 'next-intl/server';

export const revalidate = 60; // Revalidate every minute

export default async function DashboardPage() {
  const t = await getTranslations("Dashboard");

  const allSignals = await prisma.signal.findMany({
    orderBy: { createdAt: "desc" },
    take: 200, // Fetch more to ensure we fill columns
  });

  // Grouping logic
  const buildSignals = allSignals.filter((s: any) =>
    ["github", "huggingface", "devto"].includes(s.source)
  );

  const marketSignals = allSignals.filter((s: any) =>
    ["polymarket", "cryptopanic", "dune"].includes(s.source)
  );

  const newsSignals = allSignals.filter((s: any) =>
    ["hackernews", "substack"].includes(s.source)
  );

  const launchSignals = allSignals.filter((s: any) =>
    ["producthunt"].includes(s.source)
  );

  return (
    <main className="min-h-screen bg-[#0d1117] overflow-hidden">
      <div className="kanban-container h-screen flex">
        <SignalColumn
          title={t('buildTitle')}
          subtitle={t('buildSubtitle')}
          icon={Code2}
          signals={buildSignals}
          colorClass="text-blue-400"
        />
        <SignalColumn
          title={t('marketTitle')}
          subtitle={t('marketSubtitle')}
          icon={BarChart3}
          signals={marketSignals}
          colorClass="text-purple-400"
        />
        <SignalColumn
          title={t('newsTitle')}
          subtitle={t('newsSubtitle')}
          icon={Newspaper}
          signals={newsSignals}
          colorClass="text-orange-400"
        />
        <SignalColumn
          title={t('launchTitle')}
          subtitle={t('launchSubtitle')}
          icon={Rocket}
          signals={launchSignals}
          colorClass="text-pink-400"
        />
      </div>
    </main>
  );
}
