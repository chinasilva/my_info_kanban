"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

const RECOMMENDED_SOURCES = [
    { type: "hackernews", name: "Hacker News", icon: "🔶", description: "技术新闻和讨论" },
    { type: "github", name: "GitHub Trending", icon: "🐙", description: "热门开源项目" },
    { type: "producthunt", name: "Product Hunt", icon: "🚀", description: "新产品发布" },
];

export default function OnboardingPage() {
    const router = useRouter();
    const [selectedTypes, setSelectedTypes] = useState<string[]>(["hackernews", "github"]);
    const [isLoading, setIsLoading] = useState(false);

    const toggleSource = (type: string) => {
        setSelectedTypes((prev) =>
            prev.includes(type)
                ? prev.filter((t) => t !== type)
                : [...prev, type]
        );
    };

    const handleComplete = async () => {
        setIsLoading(true);

        try {
            // 获取所有数据源
            const res = await fetch("/api/sources");
            if (!res.ok) throw new Error("Failed to fetch sources");

            const sources = await res.json();

            // 订阅选中的数据源
            for (const source of sources) {
                if (selectedTypes.includes(source.type)) {
                    await fetch(`/api/sources/${source.id}/subscribe`, {
                        method: "POST",
                    });
                }
            }

            router.push("/");
            router.refresh();
        } catch (error) {
            console.error("Onboarding error:", error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
            <div className="max-w-lg w-full">
                <div className="text-center mb-8">
                    <span className="text-5xl mb-4 block">👋</span>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        欢迎使用 High-Signal
                    </h1>
                    <p className="text-gray-400">
                        选择你感兴趣的数据源，开始获取高质量信息
                    </p>
                </div>

                <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">
                        推荐数据源
                    </h2>
                    <div className="space-y-3">
                        {RECOMMENDED_SOURCES.map((source) => (
                            <button
                                key={source.type}
                                onClick={() => toggleSource(source.type)}
                                className={`
                                    w-full p-4 rounded-lg border transition text-left
                                    flex items-center justify-between
                                    ${selectedTypes.includes(source.type)
                                        ? "bg-blue-500/10 border-blue-500/50"
                                        : "bg-[#0d1117] border-[#30363d] hover:border-[#484f58]"
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{source.icon}</span>
                                    <div>
                                        <p className="font-medium text-white">{source.name}</p>
                                        <p className="text-sm text-gray-500">{source.description}</p>
                                    </div>
                                </div>
                                <div className={`
                                    w-5 h-5 rounded-full border-2 flex items-center justify-center
                                    ${selectedTypes.includes(source.type)
                                        ? "bg-blue-500 border-blue-500"
                                        : "border-[#30363d]"
                                    }
                                `}>
                                    {selectedTypes.includes(source.type) && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3">
                    <Link
                        href="/sources"
                        className="flex-1 py-3 bg-[#21262d] text-gray-300 rounded-lg 
                                   hover:bg-[#30363d] transition font-medium text-center
                                   flex items-center justify-center gap-2"
                    >
                        <Settings className="w-4 h-4" />
                        查看全部数据源
                    </Link>
                    <button
                        onClick={handleComplete}
                        disabled={selectedTypes.length === 0 || isLoading}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-lg 
                                   hover:bg-blue-700 transition font-medium
                                   disabled:opacity-50 disabled:cursor-not-allowed
                                   flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                设置中...
                            </>
                        ) : (
                            <>
                                开始使用
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
