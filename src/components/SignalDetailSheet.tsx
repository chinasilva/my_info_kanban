"use client";

import { useSignal } from "@/context/SignalContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ExternalLink, Calendar, Tag, TrendingUp, Sparkles } from "lucide-react";

export function SignalDetailSheet() {
    const { selectedSignal, setSelectedSignal } = useSignal();

    return (
        <Sheet open={!!selectedSignal} onOpenChange={(open) => !open && setSelectedSignal(null)}>
            <SheetContent side="right" className="w-full sm:max-w-xl border-l border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)]">
                {selectedSignal && (
                    <>
                        <SheetHeader className="pb-6 border-b border-[var(--color-border)]">
                            <div className="flex gap-2 mb-2">
                                <span className="glass-pill text-xs uppercase tracking-wider text-[var(--color-accent)] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-2 py-0.5 rounded">
                                    {typeof selectedSignal.source === 'string' ? selectedSignal.source : (selectedSignal.source as any).name}
                                </span>
                                {selectedSignal.category && (
                                    <span className="glass-pill text-xs uppercase tracking-wider text-[var(--color-text-muted)] border border-[var(--color-border)] px-2 py-0.5 rounded">
                                        {selectedSignal.category}
                                    </span>
                                )}
                            </div>
                            <SheetTitle className="text-2xl leading-normal font-bold text-[var(--color-foreground)] mb-2">
                                {selectedSignal.title}
                            </SheetTitle>
                            <SheetDescription className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                                <span className="flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3 text-[var(--color-accent)]" />
                                    <span>Score: {selectedSignal.score}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-[var(--color-text-muted)]" />
                                    <span>{new Date(selectedSignal.createdAt).toLocaleString()}</span>
                                </span>
                            </SheetDescription>
                        </SheetHeader>

                        <div className="mt-8 space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                    {selectedSignal.aiSummary && <Sparkles className="w-4 h-4 text-purple-400" />}
                                    Summary
                                </h3>
                                <div className="prose prose-sm max-w-none text-[var(--color-foreground)] leading-relaxed space-y-4">
                                    {selectedSignal.aiSummary && (
                                        <div className="flex gap-2">
                                            <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                                            <span>{selectedSignal.aiSummary}</span>
                                        </div>
                                    )}
                                    {selectedSignal.aiSummaryZh && (
                                        <div className="pl-6 border-l-2 border-[var(--color-border)] text-[var(--color-text-muted)]">
                                            {selectedSignal.aiSummaryZh}
                                        </div>
                                    )}
                                    {!selectedSignal.aiSummary && !selectedSignal.aiSummaryZh && (
                                        <p>{selectedSignal.summary || "No summary available."}</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-8 border-t border-[var(--color-border)]">
                                <a
                                    href={selectedSignal.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--color-accent)] text-white font-bold rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors shadow-lg"
                                >
                                    <span>Read Original Source</span>
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
