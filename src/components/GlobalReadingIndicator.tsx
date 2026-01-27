"use client";

import { useState, useEffect } from 'react';
import { useReading } from '@/context/ReadingContext';
import { useTitleFlasher } from '@/hooks/useTitleFlasher';
import { Loader2, BookOpen } from 'lucide-react';
import { ReadingDrawer } from './ReadingDrawer';

export function GlobalReadingIndicator() {
    const { activeTask } = useReading();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Hook for title flashing (side effect)
    useTitleFlasher();

    // Auto-open drawer when a new task starts (loading/streaming)
    useEffect(() => {
        if (activeTask && (activeTask.status === 'loading' || activeTask.status === 'streaming')) {
            setIsDrawerOpen(true);
        }
    }, [activeTask?.url, activeTask?.status]); // Re-trigger on new URL or status change if needed

    const [progress, setProgress] = useState(0);

    // Reset progress when drawer opens or task changes
    useEffect(() => {
        if (!activeTask) setProgress(0);
    }, [activeTask]);

    useEffect(() => {
        if (activeTask?.status === 'loading') {
            setProgress(5);
        } else if (activeTask?.status === 'streaming') {
            // Very rough estimation: assume 1000-2000 chars is "full" for quick feel, or just slow increment
            const len = activeTask.content?.length || 0;
            const estimated = Math.min(95, Math.floor((len / 1000) * 100) + 10);
            setProgress(estimated);
        } else if (activeTask?.status === 'completed') {
            setProgress(100);
        } else if (activeTask?.status === 'error') {
            setProgress(0);
        }
    }, [activeTask?.status, activeTask?.content?.length]);


    if (!activeTask) return <ReadingDrawer isOpen={isDrawerOpen} setIsOpen={setIsDrawerOpen} />;

    return (
        <>
            {/* The actual Drawer Component */}
            <ReadingDrawer isOpen={isDrawerOpen} setIsOpen={setIsDrawerOpen} />

            {/* Floating Indicator (Visible only when drawer is closed) */}
            {!isDrawerOpen && activeTask && (
                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="fixed bottom-6 right-6 z-[80] group flex items-center justify-center w-14 h-14 bg-[var(--color-card)] rounded-full shadow-xl border border-[var(--color-border)] hover:scale-105 transition-all text-[var(--color-foreground)]"
                    title="点击查看 AI 阅读进度"
                >
                    {/* Progress Ring SVG */}
                    <div className="absolute inset-0 transform -rotate-90">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r="46"
                                fill="none"
                                stroke="var(--color-border)"
                                strokeWidth="6"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="46"
                                fill="none"
                                stroke={activeTask.status === 'error' ? '#ef4444' : (activeTask.status === 'completed' ? '#22c55e' : 'var(--color-accent)')}
                                strokeWidth="6"
                                strokeDasharray="289.02652413026095"
                                strokeDashoffset={289.02652413026095 * (1 - progress / 100)}
                                className="transition-all duration-500 ease-out"
                            />
                        </svg>
                    </div>

                    {/* Icon / Content */}
                    <div className="relative z-10 flex flex-col items-center justify-center">
                        {activeTask.status === 'loading' || activeTask.status === 'streaming' ? (
                            <>
                                <span className="text-[10px] font-bold tabular-nums leading-none mb-0.5">{progress}%</span>
                                <Loader2 className="w-4 h-4 animate-spin text-[var(--color-accent)]" />
                            </>
                        ) : activeTask.status === 'completed' ? (
                            <BookOpen className="w-6 h-6 text-green-500" />
                        ) : (
                            <span className="text-xl">⚠️</span>
                        )}
                    </div>

                    {/* Badge for "New" if completed and not seen? (Handled by red dot maybe) */}
                    {activeTask.status === 'completed' && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[var(--color-card)]"></span>
                    )}
                </button>
            )}
        </>
    );
}
