// "use client";

// import { useEffect } from "react";

// /**
//  * React implementation of the global currency symbol replacement script.
//  * Replaces text placeholders (SAR, SR, \u0631.\u0633) with the custom 
//  * Saudi Riyal font icon (Unicode E900).
//  */
// export default function PriceIconObserver() {
//     useEffect(() => {
//         const riyalSpan = `<span class="currency-riyal"></span>`;
//         // Classes targeted by the user script
//         const targetSelectors = [
//             '.price',
//             '.proprice',
//             '.offer-price',
//             '.single-tyre-price',
//             '.cart-price',
//         ];

//         const observer = new MutationObserver((mutations) => {
//             let shouldRun = false;
//             for (const mutation of mutations) {
//                 if (mutation.addedNodes.length > 0) {
//                     shouldRun = true;
//                     break;
//                 }
//             }
//             if (shouldRun) replaceSARWithIcon();
//         });

//         // Helper to convert Western digits to Arabic-Indic digits
//         const toArabicDigits = (str: string) => str.replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

//         function replaceSARWithIcon() {
//             const isAr = window.location.pathname.startsWith("/ar");

//             targetSelectors.forEach(selector => {
//                 document.querySelectorAll(selector).forEach(el => {
//                     // Skip if we already injected the icon span to avoid recursive loops
//                     if (el.querySelector('.currency-riyal')) return;

//                     let newHTML = el.innerHTML;
//                     let changed = false;

//                     // Support multiple patterns (English and Arabic)
//                     const patterns = [
//                         { regex: /SAR/g, replacement: riyalSpan },
//                         { regex: /SR/g, replacement: riyalSpan },
//                         { regex: /\u200F?\u0631\.\u0633\.?\u200F?/g, replacement: riyalSpan }
//                     ];

//                     patterns.forEach(({ regex, replacement }) => {
//                         if (regex.test(newHTML)) {
//                             newHTML = newHTML.replace(regex, replacement);
//                             changed = true;
//                         }
//                     });

//                     if (changed) {
//                         // If Arabic locale, also convert numbers to Arabic-Indic digits
//                         if (isAr) {
//                             newHTML = toArabicDigits(newHTML);
//                         }

//                         el.innerHTML = newHTML;
//                         // Force LTR and alignment on the element to ensure "Symbol Value" order
//                         if (el instanceof HTMLElement) {
//                             el.dir = "ltr";
//                             el.classList.add("inline-flex", "items-center", "gap-1");
//                         }
//                     }
//                 });
//             });
//         }

//         observer.observe(document.body, { childList: true, subtree: true });

//         // Initial run
//         replaceSARWithIcon();

//         return () => observer.disconnect();
//     }, []);

//     // This component renders nothing, it just runs the background effect
//     return null;
// }


"use client";

import { useEffect } from "react";

/**
 * React implementation of the global currency symbol replacement script.
 * Replaces text placeholders (SAR, SR, \u0631.\u0633) with the custom 
 * Saudi Riyal font icon (Unicode E900).
 */
export default function PriceIconObserver() {
    useEffect(() => {
        // Character mapped to the Riyal icon in the custom font
        const riyalIcon = "\uE900";
        // Classes targeted by the user script
        const targetSelectors = [
            '.price',
            '.proprice',
            '.offer-price',
            '.single-tyre-price',
            '.cart-price',
        ];

        const observer = new MutationObserver((mutations) => {
            let shouldRun = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldRun = true;
                    break;
                }
            }
            if (shouldRun) replaceSARWithIcon();
        });

        // Helper to convert Western digits to Arabic-Indic digits
        const toArabicDigits = (str: string) => str.replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

        function replaceSARWithIcon() {
            const isAr = window.location.pathname.startsWith("/ar");

            targetSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    // Skip if we already injected the icon span to avoid recursive loops
                    if (el.querySelector('.currency-riyal')) return;

                    let newHTML = el.innerHTML;
                    let changed = false;

                    // Support multiple patterns (English and Arabic)
                    const patterns = [
                        { regex: /SAR/g, replacement: `<span class="currency-riyal">${riyalIcon}</span>` },
                        { regex: /SR/g, replacement: `<span class="currency-riyal">${riyalIcon}</span>` },
                        { regex: /\u200F?\u0631\.\u0633\.?\u200F?/g, replacement: `<span class="currency-riyal">${riyalIcon}</span>` }
                    ];

                    patterns.forEach(({ regex, replacement }) => {
                        if (regex.test(newHTML)) {
                            newHTML = newHTML.replace(regex, replacement);
                            changed = true;
                        }
                    });

                    if (changed) {
                        // If Arabic locale, also convert numbers to Arabic-Indic digits
                        if (isAr) {
                            newHTML = toArabicDigits(newHTML);
                        }

                        el.innerHTML = newHTML;
                        // Layout styles (inline-flex / items-center / gap / dir=ltr)
                        // are pre-applied in globals.css to avoid post-hydration CLS.
                    }
                });
            });
        }

        observer.observe(document.body, { childList: true, subtree: true });

        // Initial run
        replaceSARWithIcon();

        return () => observer.disconnect();
    }, []);

    // This component renders nothing, it just runs the background effect
    return null;
}
