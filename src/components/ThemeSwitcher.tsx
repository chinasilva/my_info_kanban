"use client";

import { useTheme, ThemeType } from "@/context/ThemeContext";
import { Palette, Moon, Sun, Waves, BookOpen } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const THEMES: { id: ThemeType; label: string; labelZh: string; icon: React.ReactNode; color: string }[] = [
    { id: "dark", label: "Dark", labelZh: "深色", icon: <Moon className="w-4 h-4" />, color: "bg-[#0d1117]" },
    { id: "light", label: "Light", labelZh: "浅色", icon: <Sun className="w-4 h-4" />, color: "bg-white border border-gray-300" },
    { id: "navy", label: "Navy", labelZh: "深蓝", icon: <Waves className="w-4 h-4" />, color: "bg-[#1e293b]" },
    { id: "sepia", label: "Sepia", labelZh: "护眼", icon: <BookOpen className="w-4 h-4" />, color: "bg-[#f5f0e1]" },
];

interface ThemeSwitcherProps {
    locale?: string;
}

export function ThemeSwitcher({ locale = "en" }: ThemeSwitcherProps) {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isZh = locale === "zh";

    // 点击外部关闭
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg
                           hover:bg-[var(--color-card-hover)] transition-colors"
                title={isZh ? "切换主题" : "Switch Theme"}
            >
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">{isZh ? currentTheme.labelZh : currentTheme.label}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 rounded-lg shadow-xl z-50
                                bg-[var(--color-card)] border border-[var(--color-border)]">
                    {THEMES.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => {
                                setTheme(t.id);
                                setIsOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                                "hover:bg-[var(--color-card-hover)]",
                                theme === t.id && "text-[var(--color-accent)]"
                            )}
                        >
                            <span className={cn("w-4 h-4 rounded-full shrink-0", t.color)} />
                            {t.icon}
                            <span>{isZh ? t.labelZh : t.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
