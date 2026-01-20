"use client";

import { motion } from "framer-motion";
import { ExternalLink, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useSignal } from "@/context/SignalContext";

interface Signal {
    id: string;
    title: string;
    url: string;
    summary?: string | null;
    score: number;
    source: string;
    category?: string | null;
    createdAt: Date | string;
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
    const [isRead, setIsRead] = useState(false);
    const { setSelectedSignal } = useSignal();

    useEffect(() => {
        setMounted(true);
        const readSignals = JSON.parse(localStorage.getItem("read_signals") || "[]");
        if (readSignals.includes(signal.id)) {
            setIsRead(true);
        }
    }, [signal.id]);

    const handleRead = () => {
        const readSignals = JSON.parse(localStorage.getItem("read_signals") || "[]");
        if (!readSignals.includes(signal.id)) {
            readSignals.push(signal.id);
            localStorage.setItem("read_signals", JSON.stringify(readSignals));
            setIsRead(true);
        }
    };

    const handleOpenDetail = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleRead();
        setSelectedSignal(signal);
    };

    if (variant === "compact") {
        return (
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                    "kanban-card group transition-all duration-300",
                    isRead ? "opacity-60 bg-white/5 grayscale" : "",
                    className
                )}
                onClick={handleOpenDetail}
            >
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-tighter",
                            isRead ? "text-neutral-500" : "text-accent"
                        )}>
                            {signal.score}
                        </span>
                        <span className="text-[10px] text-neutral-500">•</span>
                        <span className="text-[10px] text-neutral-500">
                            {mounted ? new Date(signal.createdAt).toLocaleString() : ""}
                        </span>
                    </div>
                    <a
                        href={signal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRead();
                        }}
                    >
                        <ExternalLink className="w-3 h-3 text-neutral-600 hover:text-white transition-colors" />
                    </a>
                </div>

                <h3 className={cn(
                    "text-sm font-medium leading-snug transition-colors mb-2 group-hover:underline decoration-white/20 underline-offset-2",
                    isRead ? "text-neutral-500" : "group-hover:text-accent"
                )}>
                    {signal.title}
                </h3>

                {signal.summary && (
                    <p className="text-[12px] text-neutral-400 line-clamp-2 leading-normal">
                        {signal.summary}
                    </p>
                )}
            </motion.div>
        );
    }

    // Fallback for default variant
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("bento-card group", isRead ? "opacity-60 grayscale" : "", className)}
            onClick={handleOpenDetail}
        >
            <div className="flex justify-between items-start mb-4">
                <span className="glass-pill text-[10px] uppercase tracking-wider text-neutral-400">
                    {signal.source}
                </span>
                <div className="flex items-center gap-2">
                    <TrendingUp className={cn("w-3 h-3", isRead ? "text-neutral-500" : "text-accent")} />
                    <span className="signal-score text-sm">{signal.score}</span>
                </div>
            </div>

            <h3 className={cn(
                "text-lg font-semibold mb-3 leading-snug transition-colors group-hover:underline decoration-white/20 underline-offset-2",
                isRead ? "text-neutral-500" : "group-hover:text-accent"
            )}>
                {signal.title}
            </h3>

            {signal.summary && (
                <p className="text-sm text-neutral-400 line-clamp-3 mb-4 flex-grow">
                    {signal.summary}
                </p>
            )}

            <div className="mt-auto pt-4 flex justify-between items-center text-xs text-neutral-500 border-t border-white/5">
                <span>{mounted ? new Date(signal.createdAt).toLocaleString() : ""}</span>
                <a
                    href={signal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRead();
                    }}
                >
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        </motion.div>
    );
}
