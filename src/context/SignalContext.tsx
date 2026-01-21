"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

import { Signal } from "@/schemas/signal";

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
