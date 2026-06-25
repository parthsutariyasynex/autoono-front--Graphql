"use client";

import { useCallback, useRef, useState } from "react";
import { useGlobalLoading } from "@/components/GlobalLoadingOverlay";

export function useAction(key: string) {
    const [loading, setLoading] = useState(false);
    const runningRef = useRef(false);
    const { register, unregister } = useGlobalLoading();

    const run = useCallback(
        async (fn: () => Promise<void>) => {
            if (runningRef.current) return;
            runningRef.current = true;
            setLoading(true);
            register(key);
            try {
                await fn();
            } finally {
                unregister(key);
                setLoading(false);
                runningRef.current = false;
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [key, register, unregister],
    );

    return { loading, run };
}
