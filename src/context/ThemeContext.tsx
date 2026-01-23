"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeType = "dark" | "light" | "navy" | "sepia";

interface ThemeContextType {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<ThemeType>("sepia");
    const [mounted, setMounted] = useState(false);

    // 从 localStorage 读取保存的主题
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as ThemeType;
        if (savedTheme && ["dark", "light", "navy", "sepia"].includes(savedTheme)) {
            setTheme(savedTheme);
        }
        setMounted(true);
    }, []);

    // 切换主题时保存到 localStorage 并更新 DOM
    useEffect(() => {
        if (!mounted) return;

        localStorage.setItem("theme", theme);

        // 移除所有主题类
        document.documentElement.classList.remove("theme-dark", "theme-light", "theme-navy", "theme-sepia");
        // 添加当前主题类
        document.documentElement.classList.add(`theme-${theme}`);
    }, [theme, mounted]);

    // 防止 hydration 不匹配
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
