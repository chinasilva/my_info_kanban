
"use client";

import { Download, Share2, Loader2 } from "lucide-react";
import { useState } from "react";
import html2canvas from "html2canvas";

export function ShareButton({ targetId, locale }: { targetId: string; locale: string }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleShare = async () => {
        setIsLoading(true);
        try {
            const element = document.getElementById(targetId);
            if (!element) return;

            const canvas = await html2canvas(element, {
                useCORS: true,
                scale: 2, // Retina support
                backgroundColor: "#0d1117", // Ensure dark background
                ignoreElements: (element) => element.classList.contains("no-capture"), // Exclude capturing controls if needed
            });

            // Trigger download
            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = `high-signal-snapshot-${new Date().toISOString().split('T')[0]}.png`;
            link.click();

        } catch (error) {
            console.error("Snapshot failed:", error);
            alert(locale === "zh" ? "生成图片失败" : "Failed to generate snapshot");
        } finally {
            setIsLoading(false);
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
