"use client";

import { useState } from "react";
import { Menu, X, Globe, Settings, LogIn, Check } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserMenu } from "./UserMenu";

interface MobileHeaderProps {
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    } | null;
}

import { ThemeSwitcher } from "./ThemeSwitcher";

export function MobileHeader({ user }: MobileHeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const isZh = pathname.startsWith("/zh");
    const isTw = pathname.startsWith("/tw");
    const locale = isZh ? "zh" : (isTw ? "tw" : "en");

    const toggleLanguage = () => {
        let newLocale = "en";
        if (locale === "en") newLocale = "zh";
        else if (locale === "zh") newLocale = "tw";
        else if (locale === "tw") newLocale = "en";

        const segments = pathname.split("/");
        if (segments.length > 1) {
            segments[1] = newLocale;
        }
        router.push(segments.join("/"));
        setIsMenuOpen(false);
    };

    const getLanguageLabel = () => {
        if (isZh) return "切换到繁体";
        if (isTw) return "Switch to English";
        return "切换到简体";
    }

    const getLanguageSubLabel = () => {
        if (isZh) return "Traditional";
        if (isTw) return "English";
        return "简体中文";
    }

    return (
        <>
            <header className="mobile-header bg-[var(--color-card)] border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                    <span className="text-xl">📡</span>
                    <h1 className="text-base font-semibold text-[var(--color-foreground)]">High-Signal</h1>
                </div>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 rounded-lg hover:bg-[var(--color-card-hover)] transition"
                >
                    {isMenuOpen ? (
                        <X className="w-5 h-5 text-[var(--color-foreground)]" />
                    ) : (
                        <Menu className="w-5 h-5 text-[var(--color-foreground)]" />
                    )}
                </button>
            </header>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div className="absolute top-14 left-0 right-0 bg-[var(--color-card)] border-b border-[var(--color-border)] z-50 shadow-lg">
                    <div className="p-4 space-y-3">
                        {/* Theme Switcher */}
                        <div className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--color-card-hover)]/30 border border-[var(--color-border)]">
                            <span className="text-sm text-[var(--color-foreground)] font-medium">
                                {isZh ? "界面主题" : "Interface Theme"}
                            </span>
                            <ThemeSwitcher locale={locale} />
                        </div>

                        {/* Language Selection */}
                        <div className="w-full rounded-lg bg-[var(--color-card-hover)]/30 border border-[var(--color-border)] overflow-hidden">
                            <div className="px-4 py-3 border-b border-[var(--color-border)]/50 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-[var(--color-text-muted)]" />
                                <span className="text-sm font-medium text-[var(--color-foreground)]">
                                    {isZh ? "语言" : (isTw ? "語言" : "Language")}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                {[
                                    { code: "en", label: "English" },
                                    { code: "zh", label: "简体中文" },
                                    { code: "tw", label: "繁體中文" }
                                ].map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            const segments = pathname.split("/");
                                            if (segments.length > 1) segments[1] = lang.code;
                                            router.push(segments.join("/"));
                                            setIsMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between border-b last:border-0 border-[var(--color-border)]/30
                                            ${locale === lang.code
                                                ? "bg-[var(--color-card-hover)] text-[var(--color-accent)] font-medium"
                                                : "text-[var(--color-foreground)] hover:bg-[var(--color-card-hover)]/50"
                                            }`}
                                    >
                                        {lang.label}
                                        {locale === lang.code && <Check className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Manage Sources */}
                        <Link
                            href={`/${locale}/sources`}
                            onClick={() => setIsMenuOpen(false)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--color-card-hover)]/30 border border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition"
                        >
                            <Settings className="w-5 h-5 text-[var(--color-text-muted)]" />
                            <span className="text-[var(--color-foreground)]">
                                {isZh ? "管理数据源" : (isTw ? "管理數據源" : "Manage Sources")}
                            </span>
                        </Link>

                        {/* User Section */}
                        {user ? (
                            <div className="pt-3 border-t border-[var(--color-border)]">
                                <UserMenu user={user} />
                            </div>
                        ) : (
                            <div className="pt-3 border-t border-[var(--color-border)]">
                                <Link
                                    href={`/${locale}/login`}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--color-card-hover)]/30 border border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition text-left group"
                                >
                                    <LogIn className="w-5 h-5 text-[var(--color-accent)] group-hover:text-[var(--color-accent-hover)] transition-colors" />
                                    <span className="text-[var(--color-foreground)] font-medium">
                                        {isZh ? "登录" : "Sign In"}
                                    </span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
