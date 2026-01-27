"use client";

import { useState } from "react";
import { Link, Sparkles, FileText, Globe, Loader2, Play } from "lucide-react";
import { useReading } from "@/context/ReadingContext";
import { useTranslations } from "next-intl";

interface AIReadInputProps {
    onStart?: () => void;
}

export function AIReadInput({ onStart }: AIReadInputProps) {
    const t = useTranslations("AIReader"); // Assume we'll add these strings
    const [url, setUrl] = useState("");
    const [mode, setMode] = useState<'short' | 'long' | 'translate'>('short');
    const { startReading } = useReading();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        setIsSubmitting(true);
        try {
            // Start reading (non-blocking)
            await startReading(url, mode);
            setUrl(""); // Clear input
            onStart?.(); // Notify parent to show success toast or refresh list
        } catch (error) {
            console.error("Failed to start reading", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
                <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                    AI 深度阅读 (Deep Read)
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. URL Input */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                        <Link className="w-4 h-4" />
                    </div>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="在此粘贴文章链接 (Paste URL here)..."
                        required
                        className="w-full pl-10 pr-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all outline-none"
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    {/* 2. Mode Selection */}
                    <div className="flex p-1 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)] w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setMode('short')}
                            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 justify-center ${mode === 'short'
                                    ? 'bg-[var(--color-card)] text-[var(--color-accent)] shadow-sm border border-[var(--color-border)]'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-foreground)]'
                                }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            短总结
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('long')}
                            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 justify-center ${mode === 'long'
                                    ? 'bg-[var(--color-card)] text-[var(--color-accent)] shadow-sm border border-[var(--color-border)]'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-foreground)]'
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            长总结
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('translate')}
                            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 justify-center ${mode === 'translate'
                                    ? 'bg-[var(--color-card)] text-[var(--color-accent)] shadow-sm border border-[var(--color-border)]'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-foreground)]'
                                }`}
                        >
                            <Globe className="w-4 h-4" />
                            逐字翻译
                        </button>
                    </div>

                    {/* 3. Submit Button */}
                    <button
                        type="submit"
                        disabled={!url || isSubmitting}
                        className="w-full sm:w-auto px-6 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                启动中...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 fill-current" />
                                开始阅读
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
