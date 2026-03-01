
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export type ReadingMode = 'short' | 'long' | 'translate';

export interface ReadingTask {
    url: string;
    mode: ReadingMode;
    status: 'loading' | 'streaming' | 'completed' | 'error';
    content: string;
    error?: string;
    progress?: number; // Estimated progress or just indicator
}

interface ReadingContextType {
    activeTask: ReadingTask | null;
    isReading: boolean;
    startReading: (url: string, mode: ReadingMode) => void;
    cancelReading: () => void;
    clearTask: () => void;
}

const ReadingContext = createContext<ReadingContextType | undefined>(undefined);

export function ReadingProvider({ children }: { children: React.ReactNode }) {
    const [activeTask, setActiveTask] = useState<ReadingTask | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    const cancelReading = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setActiveTask(prev => prev ? { ...prev, status: 'error', error: 'Cancelled by user' } : null);
    }, []);

    const clearTask = useCallback(() => {
        cancelReading(); // Ensure stopped
        setActiveTask(null);
    }, [cancelReading]);

    const startReading = useCallback((url: string, mode: ReadingMode) => {
        // If already reading this URL, do nothing or focus it?
        // For now, cancel previous and start new
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        setActiveTask({
            url,
            mode,
            status: 'loading',
            content: '',
        });

        try {
            const es = new EventSource(`/api/ai/read?url=${encodeURIComponent(url)}&mode=${mode}`);
            eventSourceRef.current = es;

            es.onmessage = (event) => {
                if (event.data === '[DONE]') {
                    es.close();
                    eventSourceRef.current = null;
                    setActiveTask(prev => prev ? { ...prev, status: 'completed' } : null);
                    return;
                }

                try {
                    const payload = JSON.parse(event.data);
                    if (payload.error) {
                        es.close();
                        eventSourceRef.current = null;
                        setActiveTask(prev => prev ? { ...prev, status: 'error', error: payload.error } : null);
                    } else if (payload.text) {
                        setActiveTask(prev => {
                            if (!prev) return null;
                            return {
                                ...prev,
                                status: 'streaming',
                                content: prev.content + payload.text
                            };
                        });
                    }
                } catch (e) {
                    console.error("Failed to parse SSE message", e);
                }
            };

            es.onerror = (err) => {
                console.error("EventSource failed:", err);
                es.close();
                eventSourceRef.current = null;
                setActiveTask(prev => prev ? { ...prev, status: 'error', error: 'Connection failed' } : null);
            };

        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Unknown error";
            setActiveTask(prev => prev ? { ...prev, status: 'error', error: message } : null);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    return (
        <ReadingContext.Provider value={{
            activeTask,
            isReading: activeTask?.status === 'loading' || activeTask?.status === 'streaming',
            startReading,
            cancelReading,
            clearTask
        }}>
            {children}
        </ReadingContext.Provider>
    );
}

export function useReading() {
    const context = useContext(ReadingContext);
    if (context === undefined) {
        throw new Error('useReading must be used within a ReadingProvider');
    }
    return context;
}
