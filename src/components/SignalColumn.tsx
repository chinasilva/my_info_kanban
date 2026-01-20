"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { SignalCard } from "./SignalCard";

interface Signal {
    id: string;
    title: string;
    url: string;
    summary?: string | null;
    score: number;
    source: string;
    category?: string | null;
    createdAt: Date;
}

interface SignalColumnProps {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    signals: Signal[];
    colorClass?: string;
}

export function SignalColumn({ title, subtitle, icon: Icon, signals, colorClass = "text-accent" }: SignalColumnProps) {
    return (
        <div className="kanban-column border-r border-[#30363d]/70">
            <header className="column-header">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/5 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm tracking-wide uppercase">{title}</h2>
                        <p className="text-[10px] text-neutral-500 font-medium">{subtitle}</p>
                    </div>
                </div>
                <div className="text-[10px] font-bold text-neutral-500 bg-white/5 px-2 py-1 rounded">
                    {signals.length}
                </div>
            </header>

            <div className="column-scroll-area">
                {signals.length > 0 ? (
                    signals.map((signal) => (
                        <SignalCard key={signal.id} signal={signal} variant="compact" />
                    ))
                ) : (
                    <div className="py-20 text-center px-6">
                        <p className="text-xs text-neutral-500 italic">No signals in this stream yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
