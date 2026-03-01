
import { Share2, Loader2 } from "lucide-react";
import { useSnapshot } from "@/hooks/useSnapshot";

export function ShareButton({ targetId, locale }: { targetId: string; locale: string }) {
    const { capture, isLoading } = useSnapshot();

    const handleShare = async () => {
        try {
            await capture(targetId, {
                fileName: `high-signal-dashboard-${new Date().toISOString().split('T')[0]}.png`
            });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            alert(locale === "zh" ? `生成图片失败: ${msg}` : `Failed to generate snapshot: ${msg}`);
        }
    };

    return (
        <button
            onClick={handleShare}
            disabled={isLoading}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-card-hover)] rounded-lg transition-colors"
            title={locale === "zh" ? "分享当前视图" : "Share Snapshot"}
        >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
        </button>
    );
}
