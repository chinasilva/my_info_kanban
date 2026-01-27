
import { useEffect, useRef } from 'react';
import { useReading } from '../context/ReadingContext';

export function useTitleFlasher() {
    const { activeTask } = useReading();
    const originalTitle = useRef<string>("");
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Save original title
        if (typeof document !== 'undefined' && !originalTitle.current) {
            originalTitle.current = document.title;
        }
    }, []);

    useEffect(() => {
        // If completed and hidden, flash
        if (activeTask?.status === 'completed') {
            if (document.hidden) {
                startFlashing();
            }
        } else {
            stopFlashing();
        }

        // Cleanup watcher
        const onVisibilityChange = () => {
            if (!document.hidden) {
                stopFlashing();
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            stopFlashing();
        };
    }, [activeTask?.status]);

    const startFlashing = () => {
        if (intervalRef.current) return;
        let isOriginal = true;
        intervalRef.current = setInterval(() => {
            document.title = isOriginal ? "🚀 你的 AI 总结完成了！" : originalTitle.current;
            isOriginal = !isOriginal;
        }, 1000);
    };

    const stopFlashing = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            document.title = originalTitle.current;
        }
    };
}
