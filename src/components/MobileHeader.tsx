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
    };
}

export function MobileHeader({ user }: MobileHeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const isZh = pathname.startsWith("/zh");

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
            <header className="mobile-header">
                <div className="flex items-center gap-2">
                    <span className="text-xl">📡</span>
                    <h1 className="text-base font-semibold text-white">High-Signal</h1>
                </div>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 rounded-lg hover:bg-white/10 transition"
                >
                    {isMenuOpen ? (
                        <X className="w-5 h-5 text-white" />
                    ) : (
                        <Menu className="w-5 h-5 text-white" />
                    )}
                </button>
            </header>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div className="absolute top-14 left-0 right-0 bg-[#161b22] border-b border-[#30363d] z-50 shadow-lg">
                    <div className="p-4 space-y-3">
                        {/* Language Toggle */}
                        <button
                            onClick={toggleLanguage}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition text-left"
                        >
                            <Globe className="w-5 h-5 text-gray-400" />
                            <div>
                                <span className="text-white">
                                    {isZh ? "切换到英文" : "Switch to Chinese"}
                                </span>
                                <span className="block text-xs text-gray-500">
                                    {isZh ? "English" : "中文"}
                                </span>
                            </div>
                        </button>

                        {/* Manage Sources */}
                        <Link
                            href="/sources"
                            onClick={() => setIsMenuOpen(false)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                            <Settings className="w-5 h-5 text-gray-400" />
                            <span className="text-white">
                                {isZh ? "管理数据源" : "Manage Sources"}
                            </span>
                        </Link>

                        {/* User Section */}
                        {user && (
                            <div className="pt-3 border-t border-[#30363d]">
                                <UserMenu user={user} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
