"use client";

import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
    const pathname = usePathname();
    const router = useRouter();

    const toggleLanguage = () => {
        const newLocale = pathname.startsWith("/zh") ? "en" : "zh";
        // Construct new path: replace /zh or /en with new locale
        // Handle root / case just in case, though middleware handles it.
        // If path is /zh/foo, becomes /en/foo.
        // If path is /en/foo, becomes /zh/foo.
        const segments = pathname.split("/");
        if (segments.length > 1) {
            segments[1] = newLocale;
        } else {
            // Should not happen with current middleware but fallback
            segments.unshift("", newLocale);
        }
        const newPath = segments.join("/");
        router.push(newPath);
    };

    const currentLang = pathname.startsWith("/zh") ? "中" : "EN";

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-card-hover)] hover:bg-[var(--color-card)] rounded-lg text-[var(--color-foreground)] text-xs font-medium transition-all border border-[var(--color-border)]"
        >
            <Globe className="w-3 h-3 text-[var(--color-accent)]" />
            <span>{currentLang}</span>
        </button>
    );
}
