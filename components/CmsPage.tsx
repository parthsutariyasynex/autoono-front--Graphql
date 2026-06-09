"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/client";
import { useTranslation } from "@/hooks/useTranslation";
import { CmsPageSkeleton } from "@/components/skeletons";

interface CmsResponse {
    title?: string;
    content?: string;
    content_heading?: string;
    identifier?: string;
}

interface CmsPageProps {
    /** The Magento CMS page slug, e.g. "privacy-policy", "terms-and-conditions". */
    identifier: string;
    /** Optional translation key used as the title fallback when the API doesn't return one. */
    fallbackTitleKey?: string;
    /**
     * Known Arabic section heading phrases, in order they appear. Arabic has no
     * case distinction, so the English ALL-CAPS heuristic can't detect them
     * automatically. These exact phrases are matched against the content and
     * used as H2 section boundaries when locale === "ar".
     */
    arabicHeadings?: string[];
}

type Block =
    | { type: "h2"; text: string }
    | { type: "p"; text: string }
    | { type: "ol" | "ul"; items: string[] };

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

/** Split a paragraph into sentences by ". " followed by a capital letter or opening quote. */
function splitSentences(text: string): string[] {
    return text
        // Allow opening quotes (straight, smart, French) so quoted lines become their own sentence
        .split(/(?<=[.!?])\s+(?=["“«A-Z؀-ۿ])/)
        .map((s) => s.trim())
        .filter(Boolean);
}

/** Quoted standalone sentence detector (e.g., the Saudi Arabia closing clause). */
const QUOTED_RE = /^["“«].*["”»]\s*$/;

/** Group sentences into paragraphs (max ~280 chars per paragraph).
 *  Standalone quoted lines always get their own paragraph so they can be
 *  styled distinctly (italic bold) instead of being merged into adjacent text. */
function groupParagraphs(text: string): string[] {
    const sentences = splitSentences(text);
    const paragraphs: string[] = [];
    let buf: string[] = [];

    const flush = () => {
        if (buf.length) {
            paragraphs.push(buf.join(" "));
            buf = [];
        }
    };

    for (const s of sentences) {
        const isStandaloneQuote = QUOTED_RE.test(s.trim());

        // Force a paragraph break before a standalone quote so it stands alone.
        if (isStandaloneQuote) {
            flush();
            paragraphs.push(s);
            continue;
        }

        buf.push(s);
        if (buf.join(" ").length > 280) flush();
    }
    flush();
    return paragraphs;
}

/** Push text body as either an intro + list (if "the following:" pattern matches) or paragraphs. */
function pushBody(blocks: Block[], body: string) {
    if (!body) return;

    // Detect intro that ends with "the following:" pattern (English or Arabic).
    // English: "...will notify you of the following:" / "...you can do the following...:"
    // Arabic: "...ما يلي:" / "...التالي:"
    // (\b is omitted because it does not work reliably with Arabic chars.)
    const followingMatch = body.match(/^(.*?(?:the\s+following|ما\s+يلي|التالي)\s*:)\s*(.+)$/is);

    if (followingMatch) {
        const intro = followingMatch[1].trim();
        const rest = followingMatch[2].trim();

        if (intro) blocks.push({ type: "p", text: intro });

        // Pick list style based on intro context
        // - "do the following" / "you can do" → bulleted (action list)
        // - default (e.g., "notify you of the following") → numbered (fact list)
        // (\b removed because it does not work reliably with Arabic chars.)
        const isActionList =
            /(?:do\s+the\s+following|you\s+can\s+do|يمكنك|قم\s+ب)/i.test(intro);
        const listType: "ul" | "ol" = isActionList ? "ul" : "ol";

        // Sentences after the intro: each short sentence becomes one list item.
        // Stop list when sentences get long (paragraph-like, > 200 chars).
        const sentences = splitSentences(rest);
        const items: string[] = [];
        let stopAt = 0;
        for (let i = 0; i < sentences.length; i++) {
            if (sentences[i].length > 200) break;
            items.push(sentences[i]);
            stopAt = i + 1;
            // Stop at common limit
            if (stopAt >= 8) break;
        }

        if (items.length > 0) {
            blocks.push({ type: listType, items });
        }

        // Remaining sentences become normal paragraphs
        const remaining = sentences.slice(stopAt).join(" ").trim();
        if (remaining) {
            for (const p of groupParagraphs(remaining)) {
                blocks.push({ type: "p", text: p });
            }
        }
    } else {
        for (const p of groupParagraphs(body)) {
            blocks.push({ type: "p", text: p });
        }
    }
}

/**
 * Splits content using an explicit list of heading phrases.
 * Used for Arabic content where ALL-CAPS detection doesn't work (Arabic has no case).
 */
function parseWithExplicitHeadings(
    rawContent: string,
    knownTitle: string | undefined,
    headings: string[]
): Block[] {
    if (!rawContent) return [];
    let text = rawContent.replace(/\s+/g, " ").trim();

    if (knownTitle) {
        const upperTitle = knownTitle.toUpperCase().trim();
        if (text.toUpperCase().startsWith(upperTitle)) {
            text = text.slice(upperTitle.length).trim();
        }
    }

    // Find first occurrence of each known heading, in order
    const matches: { heading: string; start: number; end: number }[] = [];
    let searchFrom = 0;
    for (const h of headings) {
        const idx = text.indexOf(h, searchFrom);
        if (idx >= 0) {
            matches.push({ heading: h, start: idx, end: idx + h.length });
            searchFrom = idx + h.length;
        }
    }

    const blocks: Block[] = [];
    if (matches.length === 0) {
        pushBody(blocks, text);
        return blocks;
    }

    const intro = text.slice(0, matches[0].start).trim();
    if (intro) pushBody(blocks, intro);

    for (let i = 0; i < matches.length; i++) {
        const { heading, end } = matches[i];
        const nextStart = i + 1 < matches.length ? matches[i + 1].start : text.length;
        const body = text.slice(end, nextStart).trim();
        blocks.push({ type: "h2", text: heading });
        pushBody(blocks, body);
    }

    return blocks;
}

/**
 * Parses Magento CMS plain-text content into structured blocks.
 * Detects ALL-CAPS section headings (1-8 uppercase words) and "following:" list patterns.
 */
function parseCmsContent(rawContent: string, knownTitle?: string): Block[] {
    if (!rawContent) return [];

    let text = rawContent.replace(/\s+/g, " ").trim();

    // Strip leading document title (e.g., "PRIVACY POLICY ...")
    if (knownTitle) {
        const upperTitle = knownTitle.toUpperCase().trim();
        const upperText = text.toUpperCase();
        if (upperText.startsWith(upperTitle)) {
            text = text.slice(upperTitle.length).trim();
        }
    }

    // Find ALL-CAPS section headings.
    // Allowed: 1-8 consecutive uppercase words (commas, &, /, . permitted between).
    // Single-word heading must be >=5 chars (filters out 2-3 char acronyms like USA, FAQ, B.T).
    // Heading must be at sentence boundary (after period/start) and followed by a
    // Capitalized-then-lowercase word (the start of the body paragraph).
    // Lookahead matches body start: "Capital + lowercase" OR "Capital.Capital+lowercase" (e.g., "B.Tire").
    const HEADING_RE = /(?:^|(?<=[.!?])\s+)((?:[A-Z][A-Z&؀-ۿ]+(?:[,/&.] ?)?\s+){0,7}[A-Z][A-Z&؀-ۿ]+)(?=\s+(?:[A-Z؀-ۿ][a-z؀-ۿ]|[A-Z]\.[A-Z][a-z]))/g;

    const matches: { heading: string; start: number; end: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = HEADING_RE.exec(text)) !== null) {
        const raw = m[1].trim().replace(/[\s,]+$/, "");
        const words = raw.split(/\s+/).filter(Boolean);

        // Single-word heading must be reasonably long (avoids "USA", "FAQ" false positives)
        if (words.length === 1 && words[0].length < 5) continue;
        // Too long → likely body text (e.g., ALL-CAPS disclaimer paragraph), not a heading
        if (words.length > 8) continue;

        matches.push({
            heading: raw,
            start: m.index,
            end: m.index + m[0].length,
        });
    }

    const blocks: Block[] = [];

    if (matches.length === 0) {
        pushBody(blocks, text);
        return blocks;
    }

    // Pre-heading intro
    const intro = text.slice(0, matches[0].start).trim();
    if (intro) pushBody(blocks, intro);

    for (let i = 0; i < matches.length; i++) {
        const { heading, end } = matches[i];
        const nextStart = i + 1 < matches.length ? matches[i + 1].start : text.length;
        const body = text.slice(end, nextStart).trim();
        blocks.push({ type: "h2", text: heading });
        pushBody(blocks, body);
    }

    return blocks;
}

/**
 * Generic renderer for a Magento CMS page (privacy, terms, returns, etc).
 * Fetches `/api/kleverapi/cms-page/{identifier}` with the current locale,
 * parses the returned plain text into structured blocks (headings, paragraphs,
 * numbered/bulleted lists), and renders them.
 */
export default function CmsPage({ identifier, fallbackTitleKey, arabicHeadings }: CmsPageProps) {
    const locale = useLocale();
    const { t, isRtl } = useTranslation();
    const [page, setPage] = useState<CmsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        setHasError(false);
        fetch(`/api/kleverapi/cms-page/${encodeURIComponent(identifier)}`, {
            headers: { "x-locale": locale },
        })
            .then((r) => {
                if (!r.ok) throw new Error("not ok");
                return r.json();
            })
            .then((data: CmsResponse) => {
                setPage(data);
                setIsLoading(false);
            })
            .catch(() => {
                setHasError(true);
                setIsLoading(false);
            });
    }, [identifier, locale]);

    const title =
        page?.content_heading?.trim() ||
        page?.title?.trim() ||
        (fallbackTitleKey ? t(fallbackTitleKey) : "");

    const content = page?.content || "";
    // Detect HTML anywhere in the content (not just a leading "<") so CMS markup
    // with leading whitespace/text is still rendered as HTML rather than being
    // dumped through the plain-text parser (which would escape tags to text).
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(content.trim());

    // Parse plain-text content into structured blocks (skipped when content is HTML).
    // For AR with provided heading phrases, use explicit heading-based splitting
    // since the English ALL-CAPS detection doesn't apply to Arabic.
    const blocks = useMemo(() => {
        if (isHtml || !content) return [];
        if (locale === "ar" && arabicHeadings && arabicHeadings.length > 0) {
            return parseWithExplicitHeadings(content, title, arabicHeadings);
        }
        return parseCmsContent(content, title);
    }, [isHtml, content, title, locale, arabicHeadings]);

    // Show the shared skeleton as a complete page replacement while loading.
    // This guarantees the placeholder fills the same area as the real content
    // and there's no inline-skeleton flicker.
    if (isLoading) {
        return <CmsPageSkeleton sections={6} />;
    }

    return (
        <div className="min-h-screen bg-white">
            <div
                className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-8 sm:py-12 md:py-16 lg:py-20"
                dir={isRtl ? "rtl" : "ltr"}
            >
                {/* Title */}
                <h1 className="text-h3 sm:text-h2 md:text-h1-sm lg:text-h1 font-bold text-black uppercase tracking-tight mb-8 sm:mb-10 md:mb-12 text-center">
                    {title}
                </h1>

                {/* Body */}
                {hasError ? (
                    <div className="text-center text-black/60 py-12 text-body-lg">
                        {t("common.serverError")}
                    </div>
                ) : isHtml ? (
                    <div
                        className={`text-body sm:text-body-lg md:text-[15px] leading-[1.8] sm:leading-[1.9] text-black/80 font-medium ${isRtl ? "text-right" : "text-left"} prose prose-sm sm:prose max-w-none`}
                        dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(content) }}
                    />
                ) : (
                    <div
                        className={`text-body sm:text-body-lg md:text-[15px] leading-[1.8] sm:leading-[1.9] text-black/80 font-medium ${isRtl ? "text-right" : "text-left"}`}
                    >
                        {blocks.map((b, i) => {
                            if (b.type === "h2") {
                                return (
                                    <h2
                                        key={i}
                                        className="text-h3-sm sm:text-h3 md:text-h2-sm font-bold text-black uppercase tracking-tight mt-10 mb-4"
                                    >
                                        {b.text}
                                    </h2>
                                );
                            }
                            if (b.type === "p") {
                                // Render quoted standalone lines (e.g., the Saudi Arabia clause)
                                // in italic bold, matching the live site presentation.
                                const trimmed = b.text.trim();
                                const isQuote = /^["“«].*["”»]\s*$/.test(trimmed);
                                return (
                                    <p
                                        key={i}
                                        className={`mb-4 ${isQuote ? "italic font-bold text-black mt-8" : ""}`}
                                    >
                                        {b.text}
                                    </p>
                                );
                            }
                            if (b.type === "ol") {
                                return (
                                    <ol
                                        key={i}
                                        className={`list-decimal ${isRtl ? "pr-6" : "pl-6"} space-y-2 mb-6 marker:font-semibold marker:text-black`}
                                    >
                                        {b.items.map((it, j) => (
                                            <li key={j} className="pl-1">
                                                {it}
                                            </li>
                                        ))}
                                    </ol>
                                );
                            }
                            // ul
                            return (
                                <ul
                                    key={i}
                                    className={`list-disc ${isRtl ? "pr-6" : "pl-6"} space-y-2 mb-6 marker:text-black`}
                                >
                                    {b.items.map((it, j) => (
                                        <li key={j} className="pl-1">
                                            {it}
                                        </li>
                                    ))}
                                </ul>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
