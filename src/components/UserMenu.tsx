"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { LogOut, User, ChevronDown } from "lucide-react";

interface UserMenuProps {
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

export function UserMenu({ user }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--color-card-hover)] transition"
            >
                {user.image ? (
                    <img
                        src={user.image}
                        alt={user.name || "User"}
                        className="w-7 h-7 rounded-full border border-[var(--color-border)]"
                    />
                ) : (
                    <div className="w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                            {(user.name || user.email || "U").charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                <span className="text-sm text-[var(--color-text-muted)] hidden sm:block">
                    {user.name || user.email?.split("@")[0]}
                </span>
                <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--color-card)] border border-[var(--color-border)] 
                                    rounded-lg shadow-xl z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-[var(--color-border)]">
                            <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                                {user.name || "用户"}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] truncate">
                                {user.email}
                            </p>
                        </div>
                        <div className="py-1">
                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 
                                           hover:bg-red-500/10 transition"
                            >
                                <LogOut className="w-4 h-4" />
                                退出登录
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
