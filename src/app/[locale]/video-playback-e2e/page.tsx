import { VideoHighlights } from "@/components/VideoHighlights";
import type { Signal } from "@/schemas/signal";

const mockVideoSignals: Signal[] = [
    {
        id: "e2e-video-signal-1",
        title: "E2E Video Signal",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        sourceId: "e2e-source",
        score: 0,
        tags: [],
        tagsZh: [],
        createdAt: "2026-03-01T00:00:00.000Z",
        source: {
            id: "e2e-source",
            name: "E2E Source",
            icon: "🎬",
            isBuiltIn: true,
        },
        metadata: {
            contentType: "video",
            videoPlatform: "youtube",
            videoId: "dQw4w9WgXcQ",
            watchUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            durationText: "3:33",
        },
    },
];

export default async function VideoPlaybackE2EPage(props: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await props.params;

    return (
        <main className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] p-4">
            <VideoHighlights signals={mockVideoSignals} locale={locale} />
        </main>
    );
}
