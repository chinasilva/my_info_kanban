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
    activeTag?: string;
    onClearTag?: () => void;
    activeDate?: string;
    locale?: string;
}

import { ThemeSwitcher } from "./ThemeSwitcher";
import { DatePicker } from "./DatePicker";

export function MobileHeader({ user, activeTag, onClearTag, activeDate, locale = "en" }: MobileHeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    // ... (keep existing logic)
    const isZh = pathname.startsWith("/zh");
    const isTw = pathname.startsWith("/tw");
    // Remove local locale definition as it shadows the prop
    // const locale = isZh ? "zh" : (isTw ? "tw" : "en");

    const toggleLanguage = () => {
        let newLocale = "en";
        // ...
    };

    // ... (keep getLanguageLabel methods if needed, but I'll skip re-implementing them here as they are inside)

    return (
        <>
            <header className="mobile-header bg-[var(--color-card)] border-b border-[var(--color-border)] flex flex-col">
                <div className="w-full flex items-center justify-between p-3">
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
                </div>

                {activeTag && (
                    <div className="w-full px-4 pb-3">
                        <div className="flex items-center justify-between bg-[var(--color-card-hover)]/50 border border-[var(--color-border)] rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                                    {isZh ? "当前标签" : "Active Tag"}
                                </span>
                                <div className="h-4 w-[1px] bg-[var(--color-border)]"></div>
                                <span className="text-sm font-semibold text-[var(--color-accent)] truncate">
                                    #{activeTag}
                                </span>
                            </div>
                            <button
                                onClick={onClearTag}
                                className="p-1.5 -mr-1 rounded-md hover:bg-[var(--color-border)]/50 text-[var(--color-text-muted)] hover:text-[var(--color-foreground)] transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div className="absolute top-14 left-0 right-0 bg-[var(--color-card)] border-b border-[var(--color-border)] z-50 shadow-lg">
                    <div className="p-4 space-y-3">
                        {/* Date Picker (Time Machine) */}
                        <div className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--color-card-hover)]/30 border border-[var(--color-border)]">
                            <span className="text-sm text-[var(--color-foreground)] font-medium">
                                {locale === "zh" ? "时光机" : "Time Machine"}
                            </span>
                            <DatePicker currentDate={activeDate} locale={locale} />
                        </div>

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
