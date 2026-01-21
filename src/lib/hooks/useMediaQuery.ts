"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect if the current viewport is mobile-sized.
 * Uses a default breakpoint of 768px (Tailwind's `md` breakpoint).
 */
export function useMediaQuery(query: string = "(max-width: 767px)"): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);

        // Set initial value
        setMatches(mediaQuery.matches);

        // Create listener
        const handler = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        // Add listener
        mediaQuery.addEventListener("change", handler);

        // Cleanup
        return () => mediaQuery.removeEventListener("change", handler);
    }, [query]);

    return matches;
}

/**
 * Convenience hook that returns true if viewport is mobile (<768px).
 */
export function useIsMobile(): boolean {
    return useMediaQuery("(max-width: 767px)");
}
