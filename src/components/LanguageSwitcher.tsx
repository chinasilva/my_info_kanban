"use client";

import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
    const pathname = usePathname();
    const router = useRouter();

    const toggleLanguage = () => {
        // Cycle: en -> zh -> tw -> en
        let newLocale = "en";
        if (pathname.startsWith("/en")) newLocale = "zh";
        else if (pathname.startsWith("/zh")) newLocale = "tw";
        else if (pathname.startsWith("/tw")) newLocale = "en";
        // Default fallback if path doesn't start with locale (e.g. root) might need handling, 
        // but middleware usually enforces it. 
        // If current is / (default zh), then en is next? Or check active locale?
        // Let's rely on pathname segments.

        const segments = pathname.split("/");
        // segments[0] is empty, segments[1] is locale
        if (segments.length > 1 && ["en", "zh", "tw"].includes(segments[1])) {
            segments[1] = newLocale;
        } else {
            // If no locale in path (root), prepend it? 
            // Ideally we should know current locale.
            // But for now, assuming middleware redirects / to /zh, so segment[1] exists.
            if (segments.length > 1) segments[1] = newLocale;
            else segments.unshift("", newLocale);
        }
        const newPath = segments.join("/");
        router.push(newPath);
    };

    const getCurrentLabel = () => {
        if (pathname.startsWith("/zh")) return "简";
        if (pathname.startsWith("/tw")) return "繁";
        return "EN";
    };

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-card-hover)] hover:bg-[var(--color-card)] rounded-lg text-[var(--color-foreground)] text-xs font-medium transition-all border border-[var(--color-border)]"
        >
            <Globe className="w-3 h-3 text-[var(--color-accent)]" />
            <span>{getCurrentLabel()}</span>
        </button>
    );
}
