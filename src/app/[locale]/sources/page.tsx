"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Rss, Check, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface Source {
    id: string;
    name: string;
    type: string;
    baseUrl: string;
    icon: string | null;
    isBuiltIn: boolean;
    signalCount: number;
    isSubscribed: boolean;
}

export default function SourcesPage() {
    const router = useRouter();
    const [sources, setSources] = useState<Source[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const t = useTranslations("SourcePage");

    // RSS 表单
    const [showRssForm, setShowRssForm] = useState(false);
    const [rssName, setRssName] = useState("");
    const [rssFeedUrl, setRssFeedUrl] = useState("");
    const [rssIcon, setRssIcon] = useState("📡");
    const [rssLoading, setRssLoading] = useState(false);
    const [rssError, setRssError] = useState("");

    useEffect(() => {
        fetchSources();
    }, []);

    const fetchSources = async () => {
        try {
            const res = await fetch("/api/sources");
            if (res.ok) {
                const data = await res.json();
                setSources(data);
            }
        } catch (error) {
            console.error("Failed to fetch sources:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSubscription = async (sourceId: string, isSubscribed: boolean) => {
        setActionLoading(sourceId);
        try {
            const method = isSubscribed ? "DELETE" : "POST";
            await fetch(`/api/sources/${sourceId}/subscribe`, { method });

            setSources(sources.map(s =>
                s.id === sourceId ? { ...s, isSubscribed: !isSubscribed } : s
            ));
        } catch (error) {
            console.error("Failed to toggle subscription:", error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleAddRss = async (e: React.FormEvent) => {
        e.preventDefault();
        setRssLoading(true);
        setRssError("");

        try {
            const res = await fetch("/api/sources/rss", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: rssName,
                    feedUrl: rssFeedUrl,
                    icon: rssIcon,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setRssError(data.error || t("rssModal.error.addFailed"));
                return;
            }

            // 刷新列表
            await fetchSources();
            setShowRssForm(false);
            setRssName("");
            setRssFeedUrl("");
            setRssIcon("📡");
        } catch (error) {
            setRssError(t("rssModal.error.network"));
        } finally {
            setRssLoading(false);
        }
    };

    const builtInSources = sources.filter(s => s.isBuiltIn);
    const customSources = sources.filter(s => !s.isBuiltIn);

    return (
        <div className="min-h-screen bg-[#0d1117] p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/")}
                            className="p-2 rounded-lg bg-[#21262d] text-gray-400 hover:text-white hover:bg-[#30363d] transition"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
                            <p className="text-gray-400 text-sm">{t("subtitle")}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowRssForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                                   hover:bg-blue-700 transition font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        {t("addRss")}
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Built-in Sources */}
                        <section className="mb-8">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                {t("builtIn")}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {builtInSources.map((source) => (
                                    <SourceCard
                                        key={source.id}
                                        source={source}
                                        isLoading={actionLoading === source.id}
                                        onToggle={() => toggleSubscription(source.id, source.isSubscribed)}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* Custom Sources */}
                        {customSources.length > 0 && (
                            <section>
                                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    {t("custom")}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {customSources.map((source) => (
                                        <SourceCard
                                            key={source.id}
                                            source={source}
                                            isLoading={actionLoading === source.id}
                                            onToggle={() => toggleSubscription(source.id, source.isSubscribed)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}

                {/* Add RSS Modal */}
                {showRssForm && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-md p-6">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Rss className="w-5 h-5 text-orange-400" />
                                {t("rssModal.title")}
                            </h3>

                            <form onSubmit={handleAddRss} className="space-y-4">
                                {rssError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                        {rssError}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">{t("rssModal.nameLabel")}</label>
                                    <input
                                        type="text"
                                        value={rssName}
                                        onChange={(e) => setRssName(e.target.value)}
                                        placeholder={t("rssModal.namePlaceholder")}
                                        className="w-full px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg 
                                                   text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">{t("rssModal.urlLabel")}</label>
                                    <input
                                        type="url"
                                        value={rssFeedUrl}
                                        onChange={(e) => setRssFeedUrl(e.target.value)}
                                        placeholder="https://example.com/feed.xml"
                                        className="w-full px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg 
                                                   text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">{t("rssModal.iconLabel")}</label>
                                    <input
                                        type="text"
                                        value={rssIcon}
                                        onChange={(e) => setRssIcon(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg 
                                                   text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                        maxLength={4}
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowRssForm(false)}
                                        className="flex-1 py-3 bg-[#21262d] text-gray-300 rounded-lg 
                                                   hover:bg-[#30363d] transition font-medium"
                                    >
                                        {t("rssModal.cancel")}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={rssLoading}
                                        className="flex-1 py-3 bg-blue-600 text-white rounded-lg 
                                                   hover:bg-blue-700 transition font-medium disabled:opacity-50
                                                   flex items-center justify-center gap-2"
                                    >
                                        {rssLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                {t("rssModal.verifying")}
                                            </>
                                        ) : t("rssModal.add")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SourceCard({
    source,
    isLoading,
    onToggle
}: {
    source: Source;
    isLoading: boolean;
    onToggle: () => void;
}) {
    const t = useTranslations("SourcePage");
    return (
        <div className={`
            p-4 rounded-xl border transition
            ${source.isSubscribed
                ? "bg-[#161b22] border-blue-500/50"
                : "bg-[#0d1117] border-[#30363d] hover:border-[#484f58]"
            }
        `}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{source.icon || "📡"}</span>
                    <div>
                        <h3 className="font-medium text-white">{source.name}</h3>
                        <p className="text-sm text-gray-500">{source.signalCount} {t("signalCountSuffix")}</p>
                    </div>
                </div>
                <button
                    onClick={onToggle}
                    disabled={isLoading}
                    className={`
                        p-2 rounded-lg transition
                        ${source.isSubscribed
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-[#21262d] text-gray-400 hover:text-white hover:bg-[#30363d]"
                        }
                        disabled:opacity-50
                    `}
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : source.isSubscribed ? (
                        <Check className="w-5 h-5" />
                    ) : (
                        <Plus className="w-5 h-5" />
                    )}
                </button>
            </div>
        </div>
    );
}
