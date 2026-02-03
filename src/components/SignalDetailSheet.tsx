"use client";

import { useSignal } from "@/context/SignalContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ExternalLink, Calendar, Tag, TrendingUp, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { convertToTraditional } from "@/lib/utils/converter";

export function SignalDetailSheet() {
    const { selectedSignal, setSelectedSignal } = useSignal();
    const pathname = usePathname();
    const isTw = pathname.startsWith("/tw");
    const isZh = pathname.startsWith("/zh");

    // State for converted text (Detail Sheet specific)
    const [convertedTitle, setConvertedTitle] = useState<string | null>(null);
    const [convertedSummary, setConvertedSummary] = useState<string | null>(null);
    const [convertedTags, setConvertedTags] = useState<string[]>([]);

    // Reset state when signal changes
    useEffect(() => {
        setConvertedTitle(null);
        setConvertedSummary(null);
        setConvertedTags([]);
    }, [selectedSignal]);

    // Conversion effect
    useEffect(() => {
        if (selectedSignal && isTw) {
            const convertContent = async () => {
                const titleSrc = selectedSignal.titleTranslated || selectedSignal.title;
                if (titleSrc) {
                    const twTitle = await convertToTraditional(titleSrc);
                    setConvertedTitle(twTitle);
                }

                const summarySrc = selectedSignal.aiSummaryZh || selectedSignal.aiSummary || selectedSignal.summary;
                if (summarySrc) {
                    const twSummary = await convertToTraditional(summarySrc);
                    setConvertedSummary(twSummary);
                }

                const tagsSrc = (selectedSignal.tagsZh && selectedSignal.tagsZh.length > 0) ? selectedSignal.tagsZh : selectedSignal.tags;
                if (tagsSrc && tagsSrc.length > 0) {
                    const twTags = await Promise.all(tagsSrc.map(tag => convertToTraditional(tag)));
                    setConvertedTags(twTags);
                }
            };
            convertContent();
        }
    }, [selectedSignal, isTw]);

    // Determine content to display
    const displayTitle = (selectedSignal && isTw && convertedTitle) ? convertedTitle :
        (selectedSignal && isZh && selectedSignal.titleTranslated ? selectedSignal.titleTranslated : selectedSignal?.title);

    const rawSummary = selectedSignal && ((isZh || isTw) && selectedSignal.aiSummaryZh ? selectedSignal.aiSummaryZh : (selectedSignal.aiSummary || selectedSignal.summary));
    const displaySummary = isTw && convertedSummary ? convertedSummary : rawSummary;

    // Tags Logic
    const rawTags = selectedSignal && ((isZh || isTw) && selectedSignal.tagsZh && selectedSignal.tagsZh.length > 0 ? selectedSignal.tagsZh : selectedSignal.tags);
    let displayTags = isTw && convertedTags.length > 0 ? convertedTags : rawTags;

    // [RSS Logic] If custom RSS source, prepend source name as the first tag
    if (selectedSignal && typeof selectedSignal.source !== 'string' && !selectedSignal.source?.isBuiltIn) {
        // Use type narrowing
        const sourceObj = selectedSignal.source as { name: string; id: string };
        const sourceName = sourceObj?.name;
        if (sourceName) {
            // Avoid duplicate if source name is already a tag
            if (!displayTags?.includes(sourceName)) {
                displayTags = displayTags ? [sourceName, ...displayTags] : [sourceName];
            }
        }
    }

    return (
        <Sheet open={!!selectedSignal} onOpenChange={(open) => !open && setSelectedSignal(null)}>
            <SheetContent side="right" className="w-full sm:max-w-xl border-l border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] p-0 overflow-hidden flex flex-col [&>button]:hidden">
                {/* Fixed Close Button - Minimalist & Consistent */}
                <div className="absolute right-4 top-4 z-50">
                    <button
                        onClick={() => setSelectedSignal(null)}
                        className="p-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-foreground)]/5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                        aria-label="Close detail view"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {selectedSignal && (
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide pt-16"> {/* Added top padding to account for close button */}
                        <SheetHeader className="pb-6 border-b border-[var(--color-border)] pr-2 relative">

                            <div className="flex gap-2 mb-4 pt-0">
                                <span className="glass-pill text-xs uppercase tracking-wider text-[var(--color-accent)] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-2.5 py-1 rounded-md font-medium">
                                    {typeof selectedSignal.source === 'string'
                                        ? selectedSignal.source
                                        : (selectedSignal.source as { name: string }).name}
                                </span>
                                {selectedSignal.category && (
                                    <span className="glass-pill text-xs uppercase tracking-wider text-[var(--color-text-muted)] border border-[var(--color-border)] px-2.5 py-1 rounded-md font-medium">
                                        {selectedSignal.category}
                                    </span>
                                )}
                            </div>
                            <SheetTitle className="text-2xl leading-snug font-bold text-[var(--color-foreground)] mb-3">
                                {displayTitle}
                            </SheetTitle>
                            <SheetDescription className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                                <span className="flex items-center gap-1.5 px-2 py-1 bg-[var(--color-card)] rounded border border-[var(--color-border)]">
                                    <TrendingUp className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                                    <span className="font-mono">Score: {selectedSignal.score}</span>
                                </span>
                                <span className="flex items-center gap-1.5 px-2 py-1 bg-[var(--color-card)] rounded border border-[var(--color-border)]">
                                    <Calendar className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                                    <span>{new Date(selectedSignal.createdAt).toLocaleString()}</span>
                                </span>
                            </SheetDescription>
                        </SheetHeader>

                        <div className="mt-8 space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                    {(selectedSignal.aiSummary || selectedSignal.aiSummaryZh) && <Sparkles className="w-4 h-4 text-purple-400" />}
                                    Summary
                                </h3>
                                <div className="prose prose-sm max-w-none text-[var(--color-foreground)] leading-relaxed space-y-4">
                                    {(selectedSignal.aiSummary || selectedSignal.aiSummaryZh) && (
                                        <div className="flex gap-2">
                                            <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                                            <span>{displaySummary}</span>
                                        </div>
                                    )}
                                    {/* Fallback if no AI summary */}
                                    {!selectedSignal.aiSummary && !selectedSignal.aiSummaryZh && (
                                        <p>{displaySummary || "No summary available."}</p>
                                    )}
                                </div>
                            </div>

                            {/* Tags Section */}
                            {(displayTags && displayTags.length > 0) && (
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-orange-400" />
                                        Tags
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {displayTags.map((tag, idx) => {
                                            const isSourceTag = typeof selectedSignal.source !== 'string'
                                                && !selectedSignal.source?.isBuiltIn
                                                && tag === (selectedSignal.source as { name: string }).name;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        const url = new URL(window.location.href);
                                                        // Safe access after check
                                                        if (isSourceTag && typeof selectedSignal.source !== 'string' && (selectedSignal.source as { id: string })?.id) {
                                                            url.searchParams.set('sourceId', (selectedSignal.source as { id: string }).id);
                                                            url.searchParams.delete('tag');
                                                        } else {
                                                            url.searchParams.set('tag', tag);
                                                            url.searchParams.delete('sourceId');
                                                        }
                                                        window.location.href = url.toString();
                                                        setSelectedSignal(null); // Close sheet to show results
                                                    }}
                                                    className={`
                                                        text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5
                                                        ${isSourceTag
                                                            ? "bg-orange-500/10 text-orange-500 border-orange-500/30 hover:bg-orange-500/20"
                                                            : "bg-[var(--color-background)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30"
                                                        }
                                                    `}
                                                >
                                                    {isSourceTag && <span className="text-[10px]">📡</span>}
                                                    #{tag}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
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
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
