"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

interface GlobalLoadingCtx {
    register: (key: string) => void;
    unregister: (key: string) => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingCtx>({
    register: () => {},
    unregister: () => {},
});

export function useGlobalLoading() {
    return useContext(GlobalLoadingContext);
}

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
    const [count, setCount] = useState(0);

    const register = useCallback(() => {
        setCount((c) => c + 1);
    }, []);

    const unregister = useCallback(() => {
        setCount((c) => Math.max(0, c - 1));
    }, []);

    return (
        <GlobalLoadingContext.Provider value={{ register, unregister }}>
            {children}
            {count > 0 && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9998,
                        backgroundColor: "transparent",
                        cursor: "wait",
                    }}
                    aria-hidden="true"
                />
            )}
        </GlobalLoadingContext.Provider>
    );
}

export function ButtonSpinner({ size = 14 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ animation: "global-spin 0.75s linear infinite", display: "inline-block" }}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}
