"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Rss, Check, Plus, ArrowLeft, Loader2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { AIReadInput } from "@/components/AIReadInput";
import { AIReadHistory } from "@/components/AIReadHistory";
import { useReading } from "@/context/ReadingContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { OpmlImportDialog } from "@/components/OpmlImportDialog";

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
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger history refresh
    const t = useTranslations("SourcePage");

    // RSS 表单
    const [showRssForm, setShowRssForm] = useState(false);
    const [rssName, setRssName] = useState("");
    const [rssFeedUrl, setRssFeedUrl] = useState("");
    const [rssIcon, setRssIcon] = useState("📡");
    const [rssLoading, setRssLoading] = useState(false);
    const [rssError, setRssError] = useState("");

    // 删除确认对话框
    const [deleteTarget, setDeleteTarget] = useState<Source | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // OPML Import
    const [showOpmlImport, setShowOpmlImport] = useState(false);

    // Bulk action loading states
    const [bulkLoading, setBulkLoading] = useState(false);

    const { activeTask } = useReading();

    useEffect(() => {
        fetchSources();
    }, []);

    // Auto-refresh history when reading task completes
    useEffect(() => {
        if (activeTask?.status === 'completed' || activeTask?.status === 'error') {
            setRefreshTrigger(prev => prev + 1);
        }
    }, [activeTask?.status]);

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

    // Bulk subscribe/unsubscribe for custom sources
    const bulkSubscribe = async (subscribe: boolean) => {
        const customSourcesToUpdate = sources.filter(s => !s.isBuiltIn && s.isSubscribed !== subscribe);
        if (customSourcesToUpdate.length === 0) return;

        setBulkLoading(true);
        try {
            await Promise.all(
                customSourcesToUpdate.map(s =>
                    fetch(`/api/sources/${s.id}/subscribe`, {
                        method: subscribe ? "POST" : "DELETE"
                    })
                )
            );
            // Update local state
            setSources(sources.map(s =>
                !s.isBuiltIn ? { ...s, isSubscribed: subscribe } : s
            ));
        } catch (error) {
            console.error("Bulk action failed:", error);
        } finally {
            setBulkLoading(false);
        }
    };

    const deleteSource = async () => {
        if (!deleteTarget) return;

        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/sources/rss/${deleteTarget.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setSources(sources.filter(s => s.id !== deleteTarget.id));
                setDeleteTarget(null);
            } else {
                const data = await res.json();
                console.error("Delete failed:", data.error);
                alert(t("deleteError"));
            }
        } catch (error) {
            console.error("Failed to delete source:", error);
            alert(t("deleteError"));
        } finally {
            setDeleteLoading(false);
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
        <div className="h-[100dvh] overflow-y-auto bg-[var(--color-background)] text-[var(--color-foreground)] pb-20 md:pb-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <button
                                onClick={() => router.back()}
                                className="p-2 -ml-2 rounded-lg hover:bg-[var(--color-page-background)] transition text-[var(--color-text-muted)] hover:text-[var(--color-foreground)]"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Rss className="w-6 h-6 text-orange-500" />
                                {t("title")}
                            </h1>
                        </div>
                        <p className="text-[var(--color-text-muted)]">
                            {t("description")}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowOpmlImport(true)}
                            className="bg-[#21262d] hover:bg-[#30363d] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition border border-gray-700"
                        >
                            <Upload className="w-4 h-4" />
                            {t("importOpml", { fallback: "Import OPML" })}
                        </button>
                        <button
                            onClick={() => setShowRssForm(true)}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-lg shadow-orange-900/20"
                        >
                            <Plus className="w-4 h-4" />
                            {t("add")}
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                    </div>
                ) : (
                    <>
                        {/* New AI Reader Section */}
                        <section className="mb-10">
                            <AIReadInput onStart={() => setRefreshTrigger(prev => prev + 1)} />
                            <AIReadHistory refreshTrigger={refreshTrigger} />
                        </section>

                        {/* Built-in Sources */}
                        <section className="mb-8">
                            <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4 flex items-center gap-2">
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

                        {customSources.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-[var(--color-foreground)] flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        {t("custom")}
                                    </h2>
                                    {/* Bulk Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => bulkSubscribe(true)}
                                            disabled={bulkLoading}
                                            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            {t("followAll", { fallback: "Follow All" })}
                                        </button>
                                        <button
                                            onClick={() => bulkSubscribe(false)}
                                            disabled={bulkLoading}
                                            className="px-3 py-1.5 text-sm bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-lg transition border border-gray-700 disabled:opacity-50"
                                        >
                                            {t("unfollowAll", { fallback: "Unfollow All" })}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {customSources.map((source) => (
                                        <SourceCard
                                            key={source.id}
                                            source={source}
                                            isLoading={actionLoading === source.id}
                                            onToggle={() => toggleSubscription(source.id, source.isSubscribed)}
                                            onDelete={() => setDeleteTarget(source)}
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

                {/* Delete Confirm Dialog */}
                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title={t("confirmDelete.title")}
                    message={t("confirmDelete.message")}
                    confirmLabel={t("confirmDelete.confirm")}
                    cancelLabel={t("confirmDelete.cancel")}
                    variant="danger"
                    isLoading={deleteLoading}
                    onConfirm={deleteSource}
                    onCancel={() => setDeleteTarget(null)}
                />

                {/* OPML Import Dialog */}
                <OpmlImportDialog
                    isOpen={showOpmlImport}
                    onClose={() => setShowOpmlImport(false)}
                    onSuccess={() => {
                        fetchSources(); // Refresh list
                        // setShowOpmlImport(false); // Handled by component Done button or onClose
                    }}
                />
            </div>
        </div>
    );
}

function SourceCard({
    source,
    isLoading,
    onToggle,
    onDelete
}: {
    source: Source;
    isLoading: boolean;
    onToggle: () => void;
    onDelete?: () => void;
}) {
    const t = useTranslations("SourcePage");
    return (
        <div className={`
            p-4 rounded-xl border transition
            ${source.isSubscribed
                ? "bg-[var(--color-card)] border-blue-500/50"
                : "bg-[var(--color-background)] border-[var(--color-border)] hover:border-[var(--color-foreground)]"
            }
        `}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{source.icon || "📡"}</span>
                    <div>
                        <h3 className="font-medium text-[var(--color-foreground)]">{source.name}</h3>
                        <p className="text-sm text-[var(--color-text-muted)]">{source.signalCount} {t("signalCountSuffix")}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* 自定义源显示删除按钮 */}
                    {!source.isBuiltIn && onDelete && (
                        <button
                            onClick={onDelete}
                            className="p-2 rounded-lg transition bg-[#21262d] text-gray-400 
                                       hover:text-red-400 hover:bg-red-500/10"
                            title="Delete source"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    {/* 订阅/取消订阅按钮 */}
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
        </div>
    );
}
