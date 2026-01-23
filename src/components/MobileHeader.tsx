"use client";

import { useState } from "react";
import { Menu, X, Globe, Settings } from "lucide-react";
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
    const locale = isZh ? "zh" : "en";

    const toggleLanguage = () => {
        const newLocale = isZh ? "en" : "zh";
        const segments = pathname.split("/");
        if (segments.length > 1) {
            segments[1] = newLocale;
        }
        router.push(segments.join("/"));
        setIsMenuOpen(false);
    };

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

                        {/* Language Toggle */}
                        <button
                            onClick={toggleLanguage}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--color-card-hover)]/30 border border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition text-left"
                        >
                            <Globe className="w-5 h-5 text-[var(--color-text-muted)]" />
                            <div>
                                <span className="text-[var(--color-foreground)]">
                                    {isZh ? "切换到英文" : "Switch to Chinese"}
                                </span>
                                <span className="block text-xs text-[var(--color-text-muted)]">
                                    {isZh ? "English" : "中文"}
                                </span>
                            </div>
                        </button>

                        {/* Manage Sources */}
                        <Link
                            href="/sources"
                            onClick={() => setIsMenuOpen(false)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--color-card-hover)]/30 border border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition"
                        >
                            <Settings className="w-5 h-5 text-[var(--color-text-muted)]" />
                            <span className="text-[var(--color-foreground)]">
                                {isZh ? "管理数据源" : "Manage Sources"}
                            </span>
                        </Link>

                        {/* User Section */}
                        {user && (
                            <div className="pt-3 border-t border-[var(--color-border)]">
                                <UserMenu user={user} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
