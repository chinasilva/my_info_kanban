"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface Source {
    id: string;
    name: string;
    type: string;
    icon?: string | null;
}

interface Signal {
    id: string;
    title: string;
    url: string;
    summary?: string | null;
    score: number;
    source: Source | string; // 支持新旧两种格式
    category?: string | null;
    createdAt: Date | string;
    isRead?: boolean;
    isFavorited?: boolean;
    aiSummary?: string | null;
    aiSummaryZh?: string | null;
}

interface SignalContextType {
    selectedSignal: Signal | null;
    setSelectedSignal: (signal: Signal | null) => void;
}

const SignalContext = createContext<SignalContextType | undefined>(undefined);

export function SignalProvider({ children }: { children: ReactNode }) {
    const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

    return (
        <SignalContext.Provider value={{ selectedSignal, setSelectedSignal }}>
            {children}
        </SignalContext.Provider>
    );
}

export function useSignal() {
    const context = useContext(SignalContext);
    if (!context) {
        throw new Error("useSignal must be used within a SignalProvider");
    }
    return context;
}
