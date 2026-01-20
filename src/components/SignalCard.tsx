"use client";

import { motion } from "framer-motion";
import { ExternalLink, TrendingUp, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

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

export function SignalCard({
    signal,
    className,
    variant = "default"
}: {
    signal: Signal;
    className?: string;
    variant?: "default" | "compact"
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isHN = signal.source === "hackernews";

    if (variant === "compact") {
        return (
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn("kanban-card group", className)}
            >
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-accent uppercase tracking-tighter">
                            {signal.score}
                        </span>
                        <span className="text-[10px] text-neutral-500">•</span>
                        <span className="text-[10px] text-neutral-500">
                            {mounted ? new Date(signal.createdAt).toLocaleDateString() : ""}
                        </span>
                    </div>
                    <a href={signal.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 text-neutral-600 hover:text-white transition-colors" />
                    </a>
                </div>

                <h3 className="text-sm font-medium leading-snug group-hover:text-accent transition-colors mb-2">
                    <a href={signal.url} target="_blank" rel="noopener noreferrer">
                        {signal.title}
                    </a>
                </h3>

                {signal.summary && (
                    <p className="text-[12px] text-neutral-400 line-clamp-2 leading-normal">
                        {signal.summary}
                    </p>
                )}
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("bento-card group", className)}
        >
            <div className="flex justify-between items-start mb-4">
                <span className="glass-pill text-[10px] uppercase tracking-wider text-neutral-400">
                    {signal.source}
                </span>
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-accent" />
                    <span className="signal-score text-sm">{signal.score}</span>
                </div>
            </div>

            <h3 className="text-lg font-semibold mb-3 leading-snug group-hover:text-accent transition-colors">
                <a href={signal.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {signal.title}
                </a>
            </h3>

            {signal.summary && (
                <p className="text-sm text-neutral-400 line-clamp-3 mb-4 flex-grow">
                    {signal.summary}
                </p>
            )}

            <div className="mt-auto pt-4 flex justify-between items-center text-xs text-neutral-500 border-t border-white/5">
                <span>{mounted ? new Date(signal.createdAt).toLocaleDateString() : ""}</span>
                <a
                    href={signal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        </motion.div>
    );
}
