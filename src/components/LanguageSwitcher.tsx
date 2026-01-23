"use client";

import { usePathname, useRouter } from "next/navigation";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function LanguageSwitcher() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get current locale
    let currentLocale = "zh"; // Default
    if (pathname.startsWith("/en")) currentLocale = "en";
    else if (pathname.startsWith("/zh")) currentLocale = "zh";
    else if (pathname.startsWith("/tw")) currentLocale = "tw";

    const languages = [
        { code: "en", label: "English" },
        { code: "zh", label: "简体中文" },
        { code: "tw", label: "繁體中文" }
    ];

    const currentLangLabel = languages.find(l => l.code === currentLocale)?.label || "简体中文";

    const switchLanguage = (newLocale: string) => {
        const segments = pathname.split("/");
        // segments[0] is empty, segments[1] is locale
        if (segments.length > 1 && ["en", "zh", "tw"].includes(segments[1])) {
            segments[1] = newLocale;
        } else {
            // If at root or invalid, prepend new locale or replace first segment
            if (segments.length > 1) segments[1] = newLocale;
            else segments.unshift("", newLocale);
        }
        const newPath = segments.join("/");
        router.push(newPath);
        setIsOpen(false);
    };

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-card-hover)] hover:bg-[var(--color-card)] rounded-lg text-[var(--color-foreground)] text-sm font-medium transition-all border border-[var(--color-border)]"
            >
                <Globe className="w-4 h-4 text-[var(--color-accent)]" />
                <span>{currentLangLabel}</span>
                <ChevronDown className={`w-3 h-3 text-[var(--color-text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => switchLanguage(lang.code)}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                                    ${currentLocale === lang.code
                                        ? "bg-[var(--color-card-hover)] text-[var(--color-accent)] font-medium"
                                        : "text-[var(--color-foreground)] hover:bg-[var(--color-card-hover)]"
                                    }`}
                            >
                                {lang.label}
                                {currentLocale === lang.code && <Check className="w-3.5 h-3.5" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
