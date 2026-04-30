import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Rich Value Support
// A field_value is either a plain string OR a JSON-encoded RichValue.
// ---------------------------------------------------------------------------
export interface RichValue {
    __rich: true;
    text: string;
    color?: string;                       // hex solid colour
    gradient?: { from: string; to: string; direction?: string }; // gradient
}

export function encodeRich(v: RichValue): string {
    return JSON.stringify(v);
}

export function parseRich(raw: string): { text: string; style?: React.CSSProperties } {
    try {
        if (raw && raw.startsWith('{"__rich"')) {
            const parsed: RichValue = JSON.parse(raw);
            const style: React.CSSProperties = {};
            if (parsed.gradient) {
                const dir = parsed.gradient.direction ?? 'to right';
                style.backgroundImage = `linear-gradient(${dir}, ${parsed.gradient.from}, ${parsed.gradient.to})`;
                style.WebkitBackgroundClip = 'text';
                style.WebkitTextFillColor = 'transparent';
                style.backgroundClip = 'text';
                style.display = 'inline-block';
            } else if (parsed.color) {
                style.color = parsed.color;
            }
            return { text: parsed.text, style };
        }
    } catch { /* not rich */ }
    return { text: raw };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LiveEditContextValue {
    isEditMode: boolean;
    pageSlug: string;
    pendingCount: number;
    saving: boolean;
    content: Record<string, string>;
    loading: boolean;
    syncToAllPages: boolean;
    setSyncToAllPages: (v: boolean) => void;
    toggleEditMode: () => void;
    saveField: (key: string, value: string) => Promise<void>;
    saveAll: () => Promise<void>;
    setPageSlug: (slug: string) => void;
    setFieldPrefix: (prefix: string) => void;
    getField: (key: string, fallback?: string) => string;
    getRawField: (key: string) => string;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const LiveEditContext = createContext<LiveEditContextValue>({
    isEditMode: false,
    pageSlug: '',
    pendingCount: 0,
    saving: false,
    content: {},
    loading: false,
    syncToAllPages: false,
    setSyncToAllPages: () => { },
    toggleEditMode: () => { },
    saveField: async () => { },
    saveAll: async () => { },
    setPageSlug: () => { },
    setFieldPrefix: () => { },
    getField: (_k, f = '') => f,
    getRawField: () => '',
});

// All page slugs that exist — used for "sync to all" feature
const ALL_SLUGS = ['landing-global', 'landing-tr', 'landing-it'];

// ---------------------------------------------------------------------------
// Global Provider — mount ONCE at App level or wrap specific pages
// ---------------------------------------------------------------------------
export function LiveEditProvider({ children, slug, fieldPrefix: initialPrefix }: { children: React.ReactNode, slug?: string, fieldPrefix?: string }) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [pageSlug, _setPageSlug] = useState('');
    const [fieldPrefix, setFieldPrefix] = useState(initialPrefix ?? '');
    const [saving, setSaving] = useState(false);

    // Helper: read window.__CMS__ injected at build time
    const getPreloaded = (s: string): Record<string, string> => {
        try {
            const w = window as any;
            if (w.__CMS__ && w.__CMS__[s]) return w.__CMS__[s];
        } catch { /* SSR safety */ }
        return {};
    };

    const [content, setContent] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [syncToAllPages, setSyncToAllPages] = useState(false);
    const pending = useRef<Map<string, string>>(new Map());
    const [pendingCount, setPendingCount] = useState(0);

    const setPageSlug = useCallback((s: string) => {
        _setPageSlug(prev => {
            if (prev === s) return prev;
            const preloaded = getPreloaded(s);
            setContent(preloaded);
            pending.current.clear();
            setPendingCount(0);
            return s;
        });
    }, []);

    // If props change, sync state
    useEffect(() => {
        if (slug) setPageSlug(slug);
    }, [slug, setPageSlug]);

    useEffect(() => {
        if (initialPrefix !== undefined) setFieldPrefix(initialPrefix);
    }, [initialPrefix]);

    // Fetch content: show cache instantly, refresh from Supabase in background
    useEffect(() => {
        if (!pageSlug) return;
        let cancelled = false;

        // 1. Show cached content immediately (zero flash)
        const cacheKey = `cms_content_${pageSlug}`;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                setContent(JSON.parse(cached));
            }
        } catch { /* ignore */ }

        // 2. Fetch fresh from Supabase in background
        setLoading(true);
        (supabase as any)
            .from('page_content')
            .select('field_key, field_value')
            .eq('page_slug', pageSlug)
            .then(({ data, error }) => {
                if (!cancelled) {
                    if (!error && data) {
                        const map: Record<string, string> = {};
                        data.forEach((row: any) => {
                            if (row.field_value) map[row.field_key] = row.field_value;
                        });
                        setContent(map);
                        // 3. Update cache for next load
                        try { localStorage.setItem(cacheKey, JSON.stringify(map)); } catch { /* ignore */ }
                    }
                    setLoading(false);
                }
            });
        return () => { cancelled = true; };
    }, [pageSlug]);

    const toggleEditMode = useCallback(() => setIsEditMode(v => !v), []);

    // Returns the plain text value (strips rich formatting)
    const getField = useCallback((key: string, fallback = ''): string => {
        const fullKey = (fieldPrefix && !key.startsWith(fieldPrefix)) ? `${fieldPrefix}${key}` : key;
        const raw = content[fullKey];
        if (!raw) return fallback;
        return parseRich(raw).text || fallback;
    }, [content, fieldPrefix]);

    // Returns the raw stored value (may be JSON-rich)
    const getRawField = useCallback((key: string): string => {
        const fullKey = (fieldPrefix && !key.startsWith(fieldPrefix)) ? `${fieldPrefix}${key}` : key;
        return content[fullKey] ?? '';
    }, [content, fieldPrefix]);

    const saveField = useCallback(async (key: string, value: string) => {
        const fullKey = (fieldPrefix && !key.startsWith(fieldPrefix)) ? `${fieldPrefix}${key}` : key;
        pending.current.set(fullKey, value);
        setPendingCount(pending.current.size);
        setContent(prev => ({ ...prev, [fullKey]: value }));

        const slugsToSave = syncToAllPages
            ? ALL_SLUGS
            : [pageSlug];

        await Promise.all(slugsToSave.map(slug =>
            (supabase as any)
                .from('page_content')
                .upsert(
                    [{ page_slug: slug, field_key: fullKey, field_value: value }],
                    { onConflict: 'page_slug,field_key' }
                )
        ));

        pending.current.delete(fullKey);
        setPendingCount(pending.current.size);
    }, [pageSlug, syncToAllPages, fieldPrefix]);

    const saveAll = useCallback(async () => {
        if (pending.current.size === 0) return;
        setSaving(true);
        const entries = Array.from(pending.current.entries());
        const slugsToSave = syncToAllPages ? ALL_SLUGS : [pageSlug];

        await Promise.all(slugsToSave.map(slug =>
            (supabase as any)
                .from('page_content')
                .upsert(
                    entries.map(([field_key, field_value]) => ({
                        page_slug: slug, field_key, field_value
                    })),
                    { onConflict: 'page_slug,field_key' }
                )
        ));

        pending.current.clear();
        setPendingCount(0);
        setSaving(false);
    }, [pageSlug, syncToAllPages]);

    return (
        <LiveEditContext.Provider value={{
            isEditMode, pageSlug, pendingCount, saving, content, loading,
            syncToAllPages, setSyncToAllPages,
            toggleEditMode, saveField, saveAll, setPageSlug, setFieldPrefix, getField, getRawField
        }}>
            {children}
        </LiveEditContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useLiveEdit() {
    return useContext(LiveEditContext);
}
