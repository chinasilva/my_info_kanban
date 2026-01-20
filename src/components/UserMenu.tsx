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
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#21262d] transition"
            >
                {user.image ? (
                    <img
                        src={user.image}
                        alt={user.name || "User"}
                        className="w-7 h-7 rounded-full"
                    />
                ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                            {(user.name || user.email || "U").charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                <span className="text-sm text-gray-300 hidden sm:block">
                    {user.name || user.email?.split("@")[0]}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[#161b22] border border-[#30363d] 
                                    rounded-lg shadow-xl z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#30363d]">
                            <p className="text-sm font-medium text-white truncate">
                                {user.name || "用户"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                {user.email}
                            </p>
                        </div>
                        <div className="py-1">
                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 
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
