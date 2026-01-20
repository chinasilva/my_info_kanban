import { prisma } from "@/lib/prisma/db";
import { SignalColumn } from "@/components/SignalColumn";
import { Code, BarChart3, Zap, BookOpen } from "lucide-react";

export default async function DashboardPage() {
  const allSignals = await prisma.signal.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const codeSignals = allSignals.filter((s: any) => s.source === "github");
  const signalSignals = allSignals.filter((s: any) => s.source === "hackernews");
  const marketSignals: any[] = []; // Placeholder
  const readSignals: any[] = []; // Placeholder

  return (
    <main className="min-h-screen bg-[#0d1117] overflow-hidden">
      <div className="kanban-container h-screen flex">
        <SignalColumn
          title="CODE"
          subtitle="GitHub & HF"
          icon={Code}
          signals={codeSignals}
          colorClass="text-blue-400"
        />
        <SignalColumn
          title="MARKET"
          subtitle="Polymarket & Dune"
          icon={BarChart3}
          signals={marketSignals}
          colorClass="text-purple-400"
        />
        <SignalColumn
          title="SIGNAL"
          subtitle="HN & Product Hunt"
          icon={Zap}
          signals={signalSignals}
          colorClass="text-orange-400"
        />
        <SignalColumn
          title="READ"
          subtitle="Substack & Podcast"
          icon={BookOpen}
          signals={readSignals}
          colorClass="text-emerald-400"
        />
      </div>
    </main>
  );
}
