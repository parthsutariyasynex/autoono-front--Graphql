"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocale } from "@/lib/i18n/client";


interface CmsPage {
    title?: string;
    content?: string;
    content_heading?: string;
}

function Skeleton() {
    // Mirrors the real /about content structure inside the same parent wrapper
    // so the API-driven swap-in causes minimal layout shift. Pulse heights are
    // computed from real text rendered heights:
    //   • Title  h1 text-2xl sm:text-3xl md:text-[2rem] → ~28/36/40px
    //   • Body p text-[15px] leading-[1.9] → 15 × 1.9 ≈ 29px per line
    //   • H2     text-base font-black uppercase ≈ 24px
    //   • H3     ≈ 29px (inherits 15px × 1.9)
    const line = "h-7 bg-gray-200 rounded";

    const Paragraph = ({ lines = 3 }: { lines?: number }) => (
        <div className="space-y-3">
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className={`${line} ${i === lines - 1 ? "w-3/4" : "w-full"}`}
                />
            ))}
        </div>
    );

    const SectionHeader = ({ w = "w-1/3" }: { w?: string }) => (
        <div className={`h-6 bg-gray-200 rounded ${w} mt-4 mb-2`} />
    );

    const ListItems = ({ items = 5 }: { items?: number }) => {
        const widths = ["w-3/5", "w-2/3", "w-3/4", "w-1/2", "w-7/12", "w-2/3"];
        return (
            <ul className="pl-5 space-y-2">
                {Array.from({ length: items }).map((_, i) => (
                    <li key={i} className={`${line} ${widths[i % widths.length]}`} />
                ))}
            </ul>
        );
    };

    return (
        <div className="space-y-6 animate-pulse">
            {/* Title — centered, uppercase. Real h1: text-2xl sm:text-3xl md:text-[2rem]
                × ~1.5 line-height ≈ 36/45/48px, so the swap-in causes no vertical jump. */}
            <div className="flex justify-center mb-10 sm:mb-14">
                <div className="h-9 sm:h-[45px] md:h-12 bg-gray-200 rounded w-56 sm:w-64 md:w-72" />
            </div>

            {/* Intro paragraphs */}
            <Paragraph lines={3} />
            <Paragraph lines={3} />

            {/* Vision & Mission */}
            <SectionHeader w="w-2/5" />
            <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-24" />
                <Paragraph lines={2} />
            </div>
            <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-24" />
                <Paragraph lines={2} />
            </div>

            {/* Our Products list */}
            <SectionHeader w="w-1/4" />
            <ListItems items={6} />

            {/* Brands */}
            <SectionHeader w="w-1/3" />
            <Paragraph lines={2} />

            {/* Core Values list */}
            <SectionHeader w="w-1/3" />
            <ListItems items={5} />

            {/* Branch Network */}
            <SectionHeader w="w-1/3" />
            <Paragraph lines={3} />

            {/* Closing */}
            <SectionHeader w="w-1/4" />
            <Paragraph lines={2} />
        </div>
    );
}

/**
 * Adds `loading="lazy"` and `decoding="async"` to every <img> tag in a Magento
 * CMS HTML string. The hero image at the top of the About page is the only
 * above-the-fold image (rendered via next/image with `priority`); every image
 * inside the CMS body is below the fold and benefits from lazy loading.
 * Existing `loading` / `decoding` attributes are preserved.
 */
function lazyifyImages(html: string): string {
    return html.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
        let updated = attrs;
        if (!/\bloading\s*=/i.test(updated)) updated += ' loading="lazy"';
        if (!/\bdecoding\s*=/i.test(updated)) updated += ' decoding="async"';
        return `<img${updated}>`;
    });
}

/**
 * Magento Page Builder's "HTML Code" content-type stores its payload
 * HTML-entity-encoded inside a <div data-content-type="html"> wrapper — i.e.
 * the real tags arrive as `&lt;div&gt;…`. dangerouslySetInnerHTML decodes those
 * entities to TEXT ("<div>") instead of parsing them as elements, so the tags
 * appear as raw text on screen. Decode them back to real markup before render.
 * `&amp;` is decoded last so an intentionally-escaped "&amp;lt;" survives as the
 * literal text "&lt;" rather than collapsing into "<".
 */
function decodeHtmlEntities(html: string): string {
    return html
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&");
}

/**
 * Removes the Magento CMS hero / page-title block from a CMS HTML string.
 * The React page renders its own next/image hero above the content, so the
 * CMS `<div class="page-title…">…</div>` block must be stripped to avoid a
 * duplicate hero image. Counts nested <div> depth so the correct closing tag
 * is matched (a naive non-greedy regex would cut at the first inner </div>).
 * The CMS body (e.g. <div class="cms-page-section">…</div>) is preserved.
 */
function removeCmsHero(html: string): string {
    const openRe = /<div\b[^>]*\bclass\s*=\s*["'][^"']*page-title[^"']*["'][^>]*>/i;
    const open = openRe.exec(html);
    if (!open) return html;

    const start = open.index;
    const tagRe = /<(\/?)div\b[^>]*>/gi;
    tagRe.lastIndex = start + open[0].length;
    let depth = 1;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(html)) !== null) {
        depth += m[1] === "/" ? -1 : 1;
        if (depth === 0) {
            const end = m.index + m[0].length;
            return (html.slice(0, start) + html.slice(end)).trim();
        }
    }
    // Unbalanced markup — leave the HTML untouched rather than corrupt it.
    return html;
}

/** Clean up common typographic typos/errors in Magento plain text responses */
function cleanText(text: string): string {
    return text
        .replace(/جميعاًنسعى/g, "جميعاً نسعى")
        .replace(/مع مع/g, "مع")
        .replace(/تفضيلاًللإطارات/g, "تفضيلاً للإطارات")
        .replace(/واحفاظ/g, "والحفاظ")
        .replace(/13ًسطحا/g, "13 سطحًا")
        .replace(/13ًسطحًا/g, "13 سطحًا")
        .replace(/\[/g, "")
        .replace(/\]/g, "")
        .replace(/distribuƟ\s*on/g, "distribution")
        .replace(/distribu\s*on/g, "distribution")
        .trim();
}

/** Parses the dynamic plain text from Magento CMS into structured sections */
function parseAboutUs(text: string) {
    const markers = [
        { key: "vision_mission", en: "Vision and Mission:", ar: "الرؤية والرسالة" },
        { key: "vision", en: "Vision:", ar: "الرؤية:" },
        { key: "mission", en: "Mission:", ar: "الرسالة:" },
        { key: "products", en: "Our Products:", ar: "منتجاتنا:" },
        { key: "brands", en: "Brands Owned", ar: "العلامات التجارية المعتمدة" },
        { key: "values", en: "Core Values:", ar: "القيم الأساسية:" },
        { key: "network", en: "Branch Network:", ar: "فروعنا وانتشارنا" },
        { key: "closing", en: "Closing Statement:", ar: "كلمة ختامية" }
    ];

    // Find vm indices first to avoid overlapping substring matches
    const vmIdxEn = text.indexOf("Vision and Mission:");
    const vmIdxAr = text.indexOf("الرؤية والرسالة");

    const foundMarkers = markers.map(m => {
        let startFrom = 0;
        if (m.key === "vision" || m.key === "mission") {
            if (vmIdxEn !== -1) startFrom = Math.max(startFrom, vmIdxEn + "Vision and Mission:".length);
            if (vmIdxAr !== -1) startFrom = Math.max(startFrom, vmIdxAr + "الرؤية والرسالة".length);
        }

        let idx = text.indexOf(m.en, startFrom);
        if (idx === -1) {
            idx = text.indexOf(m.ar, startFrom);
        }
        // Fallback for variation in core values title
        if (m.key === "values" && idx === -1) {
            idx = text.indexOf("Autoono Core Values:", startFrom);
        }
        return { ...m, idx };
    }).filter(m => m.idx !== -1).sort((a, b) => a.idx - b.idx);

    if (foundMarkers.length === 0) {
        return { intro: cleanText(text) };
    }

    const sections: Record<string, string> = {};
    sections["intro"] = cleanText(text.slice(0, foundMarkers[0].idx));

    for (let i = 0; i < foundMarkers.length; i++) {
        const current = foundMarkers[i];
        const next = foundMarkers[i + 1];

        let markerLength = current.en.length;
        if (text.startsWith(current.ar, current.idx)) {
            markerLength = current.ar.length;
        } else if (text.startsWith("Autoono Core Values:", current.idx)) {
            markerLength = "Autoono Core Values:".length;
        }

        const startIdx = current.idx + markerLength;
        const endIdx = next ? next.idx : text.length;

        let chunk = text.slice(startIdx, endIdx).trim();
        if (chunk.startsWith(":")) {
            chunk = chunk.slice(1).trim();
        }
        sections[current.key] = cleanText(chunk);
    }

    return sections;
}

export default function AboutPage() {
    const { t, isRtl } = useTranslation();
    const locale = useLocale();

    const [page, setPage] = useState<CmsPage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        setHasError(false);
        fetch("/api/kleverapi/cms-page/about-us", {
            headers: { "x-locale": locale },
        })
            .then(r => {
                if (!r.ok) throw new Error("not ok");
                return r.json();
            })
            .then((data: CmsPage) => {
                setPage(data);
                setIsLoading(false);
            })
            .catch(() => {
                setHasError(true);
                setIsLoading(false);
            });
    }, [locale]);

    let title = page?.content_heading || page?.title || "";
    if (title.toLowerCase().trim() === "about us") {
        title = t("nav.aboutUs") || title;
    }
    const content = page?.content || "";
    // Detect HTML anywhere in the content (not just a leading "<") so CMS markup
    // with leading whitespace/text is still rendered as HTML rather than being
    // dumped through the plain-text parser (which would escape tags to text).
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(content.trim());

    // Only run the plain-text parser for non-HTML content.
    const parsed = isHtml ? null : parseAboutUs(content);

    // For HTML: decode Page Builder entity-encoded markup, then strip the
    // duplicate CMS hero (page-title) before rendering. Decode must run first —
    // the page-title block arrives encoded (&lt;div…&gt;) and removeCmsHero only
    // matches real tags.
    const cleanedHtml = isHtml ? removeCmsHero(decodeHtmlEntities(content)) : "";

    // Get Intro Paragraphs
    const getIntroParagraphs = () => {
            if (!parsed?.intro) return [];
            const cleanIntro = parsed?.intro
                .replace(/^About Autoono\s+/i, "")
                .replace(/^المقدمة عن الشركة\s+/, "")
                .trim();

            // Magento sometimes drops the period at a logical paragraph boundary
            // (e.g. "...energy production in 2022 Our commitment is to..."). Insert
            // a paragraph break when a 4-digit year is followed by a capital word
            // so the downstream block-split picks it up.
            const preProcessed = cleanIntro.replace(
                /(\d{4})\s+([A-Z][a-z])/g,
                "$1\n\n$2"
            );

            // Split on blank-line paragraph breaks (real ones in source + inserted).
            const blocks = preProcessed
                .split(/\n\s*\n+/)
                .map(p => p.replace(/\s+/g, " ").trim())
                .filter(Boolean);

            // For English, within each block apply the live page's grouping:
            //   para 1 = sentence 0
            //   para 2 = sentences 1 + 2 combined
            //   para 3+ = remaining sentences, one per paragraph
            // For Arabic and short blocks, return one paragraph per sentence.
            const result: string[] = [];
            for (const block of blocks) {
                const sentences = block
                    .split(/(?<=[.!?])\s+/)
                    .map(s => s.trim())
                    .filter(Boolean);
                if (!isRtl && sentences.length >= 4) {
                    result.push(sentences[0]);
                    result.push(sentences.slice(1, 3).join(" "));
                    result.push(...sentences.slice(3));
                } else {
                    result.push(...sentences);
                }
            }
            return result;
        };

    // Get Vision Items (paragraphs) — matches live grouping:
    //   sentences 0+1 combined, then each remaining sentence is its own paragraph.
    const getVisionItems = () => {
            if (!parsed?.vision) return [];
            const sentences = parsed?.vision
                .split(/(?<=[.!?])\s+/)
                .map(s => s.trim())
                .filter(Boolean);
            if (!isRtl && sentences.length >= 3) {
                return [
                    sentences[0] + " " + sentences[1],
                    ...sentences.slice(2),
                ];
            }
            return sentences;
        };

    // Get Product Items
    const getProductsList = () => {
            if (!parsed?.products) return [];
            if (isRtl) {
                return parsed?.products.split(/(?<=\.)\s+/).map(s => s.replace(/\.$/, "").trim()).filter(Boolean);
            } else {
                const knownProducts = [
                    "Automotive Lubricants",
                    "Industrial Lubricants",
                    "Marine Lubricants",
                    "Greases",
                    "Brake Fluids",
                    "Coolants"
                ];
                const found: string[] = [];
                knownProducts.forEach(kp => {
                    if (parsed?.products.toLowerCase().includes(kp.toLowerCase())) {
                        found.push(kp);
                    }
                });
                if (found.length > 0) return found;
                return parsed?.products.split(/(?=[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/).map(s => s.trim()).filter(Boolean);
            }
        };

    // Get Values List
    const getValuesList = () => {
            if (!parsed?.values) return [];
            if (isRtl) {
                return parsed?.values.split(".").map(s => s.trim()).filter(Boolean);
            } else {
                const knownValues = [
                    "Quality",
                    "Service",
                    "Trust",
                    "Efficiency with continuous improvement",
                    "Customer Centric"
                ];
                const found: string[] = [];
                knownValues.forEach(kv => {
                    if (parsed?.values.toLowerCase().includes(kv.toLowerCase())) {
                        found.push(kv);
                    }
                });
                if (found.length > 0) return found;
                return parsed?.values.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
            }
        };

    // Get Branch Network Paragraphs — matches live grouping:
    //   para 1 = sentence 0
    //   para 2 = sentences 1 + 2 combined
    //   para 3+ = remaining sentences, one per paragraph
    const getNetworkParagraphs = () => {
            if (!parsed?.network) return [];
            const sentences = parsed?.network
                .split(/(?<=[.!?])\s+/)
                .map(s => s.trim())
                .filter(Boolean);
            if (!isRtl && sentences.length >= 3) {
                return [
                    sentences[0],
                    sentences.slice(1, 3).join(" "),
                    ...sentences.slice(3),
                ];
            }
            return sentences;
        };

    const introParagraphs = getIntroParagraphs();
    const visionItems = getVisionItems();
    const productList = getProductsList();
    const valuesList = getValuesList();
    const networkParagraphs = getNetworkParagraphs();

    return (
        <div className="min-h-screen bg-white">

            {/* Hero banner — above the fold: priority + eager load (no lazy) */}
            {/* <div className="relative w-full h-[200px] sm:h-[280px] md:h-[360px] lg:h-[440px] overflow-hidden bg-gray-100">
                <Image
                    src="/images/about-tyresonline-uae.jpg"
                    alt="About Autoono"
                    fill
                    priority
                    fetchPriority="high"
                    sizes="100vw"
                    className="object-cover"
                />
            </div> */}
            {/* <div className="image-wrap loader picture aspect-custom pb-[17.7%] relative bg-no-repeat bg-center bg-[length:40px] bg-slate-100">
                <picture className="absolute left-0 top-0 w-full h-full">
                    <source className="" srcSet="/images/about-tyresonline-uae.jpg" />
                    <img fetchPriority="high" src="/images/about-tyresonline-uae.jpg" alt="About Autoono" className="absolute left-0 top-0 w-full h-full object-cover" />
                </picture>
            </div> */}


            {/* <div className="image-wrap loader picture aspect-custom">
                <picture>
                    <source
                        className="lazy"
                        srcSet="https://asimcoglobal.klever.ae/frontend/images/blank.png"
                        data-srcset="/images/about-tyresonline-uae.jpg"
                    />
                    <img
                        className="lazy"
                        src="https://asimcoglobal.klever.ae/frontend/images/blank.png"

                        data-src="/images/about-tyresonline-uae.jpg"
                        alt="About Autoono"
                    />
                </picture>
            </div> */}



            {/* Hero banner — above the fold:
                  • priority + fetchPriority="high" → never lazy, fetched first
                  • sizes="100vw" → optimizer picks the right device-size variant
                  • onLoad fade-in → swap from "loader" placeholder to real image
                  • aspect-custom + relative reserves space (no CLS)              */}
            <div
                className={`image-wrap picture pb-[68%] md:pb-[17.7%] ${!loaded ? "loader" : ""}`}
            >
                <Image
                    src="/images/about-tyresonline-uae.jpg"
                    alt="About Autoono"
                    fill
                    priority
                    fetchPriority="high"
                    sizes="100vw"
                    className={`object-cover transition-opacity duration-300 hidden md:block ${loaded ? "opacity-100" : "opacity-0"}`}
                    onLoad={() => setLoaded(true)}
                />

                <Image
                    src="/images/about-tyresonline-uae-mobile.jpg"
                    alt="About Autoono"
                    fill
                    priority
                    fetchPriority="high"
                    sizes="100vw"
                    className={`object-cover transition-opacity duration-300 block md:hidden ${loaded ? "opacity-100" : "opacity-0"}`}
                    onLoad={() => setLoaded(true)}
                />
            </div>

            <div
                className="max-w-[1170px] mx-auto px-3 py-10 sm:py-12 md:py-14"
                dir={isRtl ? "rtl" : "ltr"}
            >
                {isLoading ? (
                    <Skeleton />
                ) : hasError || !content ? (
                    <p className="text-center text-gray-400 py-12 text-sm">
                        Page content unavailable.
                    </p>
                ) : isHtml ? (
                    /* Magento returned HTML — render as-is with prose styles.
                       Below-the-fold <img> tags in the CMS body get
                       loading="lazy" + decoding="async" injected. */
                    <div
                        className="cms-content"
                        dir={isRtl ? "rtl" : "ltr"}
                        dangerouslySetInnerHTML={{ __html: lazyifyImages(cleanedHtml) }}
                    />
                ) : (
                    /* Plain text — parse sections and render cleanly exactly as in image */
                    <div className={`space-y-3 text-[16px] text-black font-normal text-left ${isRtl ? "text-right" : "text-left"}`}>

                        {title && (
                            <h1 className="text-2xl sm:text-3xl md:text-[2rem] font-black text-center mb-4 md:mb-6 text-black uppercase font-bold tracking-[0.6px]">
                                {title}
                            </h1>
                        )}

                        {/* Intro Paragraphs */}
                        {introParagraphs.map((para, idx) => (
                            <p key={idx}>{para}</p>
                        ))}

                        {/* Vision & Mission Heading */}
                        {(parsed?.vision || parsed?.mission) && (
                            <h2 className="text-xl font-bold tracking-[0.6px] font-black text-black uppercase tracking-widest mb-2 mt-4">
                                {isRtl ? "الرؤية والرسالة" : "Vision and Mission:"}
                            </h2>
                        )}

                        {/* Vision Section */}
                        {parsed?.vision && (
                            <div className="space-y-3">
                                <h3 className="font-black text-black font-bold">{isRtl ? "الرؤية:" : "Vision:"}</h3>
                                {visionItems.map((item, idx) => (
                                    <p key={idx}>{item}</p>
                                ))}
                            </div>
                        )}

                        {/* Mission Section */}
                        {parsed?.mission && (
                            <h3>
                                <span className="font-black text-black font-bold">{isRtl ? "الرسالة:" : "Mission:"}</span>{" "}
                                {parsed?.mission}
                            </h3>
                        )}

                        {/* Our Products Section */}
                        {productList.length > 0 && (
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold tracking-[0.6px] font-black text-black uppercase mb-2 mt-4 font-bold">
                                    {isRtl ? "منتجاتنا:" : "Our Products:"}
                                </h2>
                                <ul className={`list-disc ${isRtl ? "pr-5" : "pl-5"} space-y-1`}>
                                    {productList.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Brands Section */}
                        {parsed?.brands && (
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold tracking-[0.6px] font-black text-black uppercase mb-2 mt-4 font-bold">
                                    {isRtl ? "العلامات التجارية المعتمدة" : "Brands Owned"}
                                </h2>
                                <p>{parsed?.brands}</p>
                            </div>
                        )}

                        {/* Core Values Section */}
                        {valuesList.length > 0 && (
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold tracking-[0.6px] font-black text-black uppercase mb-2 mt-4 font-bold">
                                    {isRtl ? "القيم الأساسية:" : "Autoono Core Values:"}
                                </h2>
                                <ul className={`list-disc ${isRtl ? "pr-5" : "pl-5"} space-y-1`}>
                                    {valuesList.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Branch Network Section */}
                        {parsed?.network && (
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold tracking-[0.6px] font-black text-black uppercase mb-2 mt-4 font-bold">
                                    {isRtl ? "فروعنا وانتشارنا" : "Branch Network:"}
                                </h2>
                                {networkParagraphs.map((para, idx) => (
                                    <p key={idx}>{para}</p>
                                ))}
                            </div>
                        )}

                        {/* Closing Section */}
                        {parsed?.closing && (
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold tracking-[0.6px] font-black text-black uppercase mb-2 mt-4 font-bold">
                                    {isRtl ? "كلمة ختامية" : "Closing Statement:"}
                                </h2>
                                <p>{parsed?.closing.replace(/[“”"”]/g, "")}</p>
                            </div>
                        )}

                    </div>
                )}
            </div>

        </div>
    );
}
