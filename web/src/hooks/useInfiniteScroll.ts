import { useEffect, useRef } from 'react';

/**
 * Fetches the next page when the returned sentinel scrolls into view, so a list
 * grows as the user scrolls instead of waiting behind a button press.
 *
 * Pass `enabled: hasMore && !loadingMore`. Disabling while a page is in flight
 * tears the observer down, and re-enabling re-observes the sentinel — which
 * fires again immediately if it is still on screen, so a viewport taller than
 * one page keeps filling until it isn't.
 *
 * Works for horizontal rows too: intersection is measured against the viewport,
 * which a sideways-scrolling container moves the sentinel into just the same.
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>(
    onLoadMore: () => void,
    enabled: boolean,
) {
    const sentinelRef = useRef<T | null>(null);

    // Held in a ref so a fresh callback identity on every render doesn't
    // reconnect the observer (which would re-fire it) each time. Written after
    // commit rather than during render; the observer can only fire later anyway.
    const handler = useRef(onLoadMore);
    useEffect(() => {
        handler.current = onLoadMore;
    });

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || !enabled) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) handler.current();
            },
            // Start the fetch before the sentinel is actually reached, so the
            // next page is usually there by the time the user scrolls to it.
            { rootMargin: '400px' },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [enabled]);

    return sentinelRef;
}
