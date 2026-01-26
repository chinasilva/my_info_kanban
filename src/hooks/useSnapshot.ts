import { useState, useCallback } from "react";

interface SnapshotOptions {
    fileName?: string;
    addBranding?: boolean;
}

export function useSnapshot() {
    const [isLoading, setIsLoading] = useState(false);

    const capture = useCallback(async (targetId: string, options: SnapshotOptions = {}) => {
        const { fileName = `snapshot-${new Date().toISOString().split('T')[0]}.png`, addBranding = true } = options;

        setIsLoading(true);
        try {
            const element = document.getElementById(targetId);
            if (!element) throw new Error("Element not found");

            const { toPng } = await import("html-to-image");

            // Capture computed background color to avoid transparency issues if bg is inherited
            const computedStyle = window.getComputedStyle(element);
            const bgColor = computedStyle.backgroundColor === 'rgba(0, 0, 0, 0)'
                ? getComputedStyle(document.body).backgroundColor
                : computedStyle.backgroundColor;

            const dataUrl = await toPng(element, {
                cacheBust: true,
                backgroundColor: bgColor, // Use actual background color
                filter: (node: HTMLElement) => !node.classList?.contains("no-capture"),
                onClone: (clonedNode: HTMLElement) => {
                    if (addBranding) {
                        const footer = document.createElement("div");
                        footer.style.padding = "16px";
                        footer.style.textAlign = "center";
                        footer.style.color = getComputedStyle(element).color || "#888";
                        footer.style.fontSize = "12px";
                        footer.style.opacity = "0.7";
                        footer.style.borderTop = "1px solid rgba(128,128,128,0.2)";
                        footer.style.marginTop = "auto"; // Push to bottom in flex container
                        footer.style.background = bgColor; // Ensure footer matches background

                        // Icon + Text
                        footer.innerHTML = `
                            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <span>📡 High-Signal</span>
                                <span>|</span>
                                <span>${window.location.host}</span>
                            </div>
                        `;

                        // If element is a flex column, just append. If not, we might need a wrapper?
                        // Assuming most targets (Dashboard, Card) can handle an appended div or we append to internal container.
                        // Ideally, we treat the clonedNode as the container.
                        clonedNode.appendChild(footer);
                    }
                }
            } as any);

            // Handle Sharing
            try {
                // 1. Try Web Share API with File
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], fileName, { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'High-Signal Snapshot',
                        text: 'Check out this signal from High-Signal!'
                    });
                    return; // Share successful
                }
            } catch (shareError) {
                console.warn("Web Share API failed, falling back to download:", shareError);
                // Continue to download fallback
            }

            // Fallback: Download
            const link = document.createElement("a");
            link.download = fileName;
            link.href = dataUrl;
            link.click();

        } catch (error) {
            console.error("Snapshot failed:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { capture, isLoading };
}
