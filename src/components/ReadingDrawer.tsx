'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useReading } from '@/context/ReadingContext';
import { X, Copy, Check, Minimize2, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ReadingDrawerProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export function ReadingDrawer({ isOpen, setIsOpen }: ReadingDrawerProps) {
    const { activeTask } = useReading();
    const [copied, setCopied] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom only if streaming
    useEffect(() => {
        if (scrollRef.current && isOpen && activeTask?.status === 'streaming') {
            const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
            if (scrollHeight - scrollTop - clientHeight < 100) {
                scrollRef.current.scrollTop = scrollHeight;
            }
        }
    }, [activeTask?.content, isOpen]);

    const handleCopy = () => {
        if (!activeTask?.content) return;
        navigator.clipboard.writeText(activeTask.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getTitle = () => {
        if (!activeTask) return 'AI 阅读';
        switch (activeTask.mode) {
            case 'short': return '⚡️ 短总结';
            case 'long': return '📝 长总结';
            case 'translate': return '🌐 逐字翻译';
            default: return 'AI 阅读';
        }
    };

    // If no task, don't show drawer content (or show empty state if forced open)
    if (!activeTask && !isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-[90] transition-opacity backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-full sm:w-[480px] lg:w-[600px] bg-[var(--color-card)] shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out border-l border-[var(--color-border)] flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-background)]/50 backdrop-blur-md">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-xl">{activeTask?.mode === 'translate' ? '🌐' : activeTask?.mode === 'short' ? '⚡️' : '📝'}</span>
                        <div className="flex flex-col min-w-0">
                            <h3 className="font-semibold text-[var(--color-foreground)] truncate text-base">
                                {getTitle()}
                            </h3>
                            {activeTask?.url && (
                                <a
                                    href={activeTask.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] truncate flex items-center gap-1"
                                >
                                    {new URL(activeTask.url).hostname}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={handleCopy}
                            className="p-2 hover:bg-[var(--color-card-hover)] rounded-lg transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-foreground)]"
                            title="复制内容"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-[var(--color-card-hover)] rounded-lg transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-foreground)]"
                            title="最小化"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-[var(--color-card-hover)] rounded-lg transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-foreground)]"
                            title="关闭"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth" ref={scrollRef}>
                    {activeTask ? (
                        <>
                            {activeTask.error ? (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg">
                                    {activeTask.error}
                                </div>
                            ) : (
                                <div className="prose prose-sm dark:prose-invert max-w-none text-[var(--color-foreground)] marker:text-[var(--color-text-muted)]">
                                    {/* Handle Loading State */}
                                    {activeTask.status === 'loading' && (
                                        <div className="flex flex-col items-center justify-center py-12 gap-4 text-[var(--color-text-muted)]">
                                            <span className="animate-pulse text-4xl">🤔</span>
                                            <p>AI 正在阅读分析中...</p>
                                        </div>
                                    )}

                                    {/* Handle Content */}
                                    {activeTask.content && (
                                        <ReactMarkdown>
                                            {activeTask.content}
                                        </ReactMarkdown>
                                    )}

                                    {/* Cursor */}
                                    {activeTask.status === 'streaming' && (
                                        <span className="inline-block w-2 h-4 bg-[var(--color-accent)] ml-1 animate-pulse align-middle" />
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] opacity-50">
                            <p>没有正在进行的内容</p>
                        </div>
                    )}
                </div>

                {/* Footer Status */}
                {activeTask?.status === 'streaming' && (
                    <div className="p-2 bg-[var(--color-accent)]/5 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-accent)] animate-pulse">
                        🚀 AI 正在实时生成...
                    </div>
                )}
                {activeTask?.status === 'completed' && (
                    <div className="p-2 bg-green-500/5 border-t border-[var(--color-border)] text-center text-xs text-green-500">
                        ✅ 生成完毕
                    </div>
                )}
            </div>
        </>
    );
}
