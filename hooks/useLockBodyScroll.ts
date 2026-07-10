"use client";

import { useLayoutEffect } from "react";

/**
 * Reusable hook to lock body scroll when a component (like a modal) is mounted.
 * Pairs with `scrollbar-gutter: stable` on <html> in globals.css, which reserves
 * the scrollbar gutter whether or not the bar is visible — so simply setting
 * overflow: hidden no longer causes content to shift sideways.
 *
 * @param lock - boolean to determine if scroll should be locked
 */
export function useLockBodyScroll(lock: boolean = true) {
    useLayoutEffect(() => {
        if (!lock) return;

        // Lock scroll on body — NOT on html. html must remain a scroll container so
        // that `scrollbar-gutter: stable` (set in globals.css) keeps the gutter space
        // reserved even while the scrollbar bar itself is gone. If overflow:hidden is
        // applied to html instead, the stable-gutter rule no longer fires and the
        // gutter collapses, shifting content sideways.
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [lock]);
}
