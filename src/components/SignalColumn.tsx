"use client";

import { ReactNode } from "react";
import { SignalCard } from "./SignalCard";

export interface Signal {
    id: string;
    title: string;
    url: string;
    summary?: string | null;
    score: number;
    source: {
        id: string;
        name: string;
        type: string;
        icon?: string | null;
    };
    category?: string | null;
    createdAt: string; // 客户端接收到的日期通常是序列化后的字符串
    isRead?: boolean;
    isFavorited?: boolean;
    valuable?: boolean;
    tags?: string[];
    tagsZh?: string[];
    aiSummary?: string | null;
    aiSummaryZh?: string | null;
    titleTranslated?: string | null;
}

interface SignalColumnProps {
    title: string;
    subtitle: string;
    icon: ReactNode;
    signals: Signal[];
    colorClass?: string;
    locale?: string;
}

export function SignalColumn({ title, subtitle, icon, signals, colorClass = "text-accent", locale = 'en' }: SignalColumnProps) {
    return (
        <div className="kanban-column border-r border-[#30363d]/70">
            <header className="column-header">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/5 ${colorClass}`}>
                        {icon}
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
                        <SignalCard
                            key={signal.id}
                            signal={{
                                ...signal,
                                createdAt: new Date(signal.createdAt).toISOString(),
                            }}
                            variant="compact"
                            locale={locale}
                        />
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
