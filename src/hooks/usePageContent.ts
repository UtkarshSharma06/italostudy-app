import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContentRecord {
    field_key: string;
    field_value: string;
}

interface UsePageContentReturn {
    content: Record<string, string>;
    loading: boolean;
    /** Returns DB value if set, otherwise the provided fallback */
    getField: (key: string, fallback?: string) => string;
}

/**
 * Fetches CMS content for a given page slug from the page_content table.
 * Falls back to hardcoded defaults when no DB record exists.
 *
 * Usage:
 *   const { getField, loading } = usePageContent('cent-s-syllabus-2026');
 *   <h1>{getField('hero_headline', 'CENT-S Detailed Syllabus 2026')}</h1>
 */
export function usePageContent(pageSlug: string): UsePageContentReturn {
    const [content, setContent] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!pageSlug) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchContent = async () => {
            setLoading(true);

            let rows: ContentRecord[] | null = null;

            // 1. Try Redis-cached API route (fast, Frankfurt)
            try {
                const res = await fetch(`/api/page-content?slug=${encodeURIComponent(pageSlug)}`);
                if (res.ok) {
                    const json = await res.json();
                    rows = json.data as ContentRecord[];
                }
            } catch {
                // API route not available (local dev) → fall through to Supabase
            }

            // 2. Fallback: direct Supabase call (local dev / API failure)
            if (!rows) {
                const { data, error } = await (supabase as any)
                    .from('page_content')
                    .select('field_key, field_value')
                    .eq('page_slug', pageSlug);
                if (!error && data) rows = data as ContentRecord[];
            }

            if (!cancelled && rows) {
                const map: Record<string, string> = {};
                rows.forEach((row) => {
                    if (row.field_value) map[row.field_key] = row.field_value;
                });
                setContent(map);
            }

            if (!cancelled) setLoading(false);
        };

        fetchContent();
        return () => { cancelled = true; };
    }, [pageSlug]);

    const getField = (key: string, fallback = ''): string => {
        return content[key] ?? fallback;
    };

    return { content, loading, getField };
}

