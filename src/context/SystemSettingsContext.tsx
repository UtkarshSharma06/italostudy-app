/**
 * SystemSettingsContext
 * ─────────────────────
 * Single source of truth for all rows in the `system_settings` table.
 *
 * • ONE fetch on mount — fetches every key at once, no per-component queries.
 * • ONE stable realtime channel (`system-settings-global`) — shared across the
 *   entire app; no per-component channels that multiply with navigation.
 * • localStorage SWR cache — instant hydration on revisit, no loading flash.
 *
 * Consumers (usePageVisibility, PricingContext, SecurityEnforcer, Layout)
 * call `getSetting(key)` instead of running their own Supabase queries.
 */

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

type SettingsMap = Record<string, any>;

interface SystemSettingsContextType {
    /** Returns the raw DB value for a given key, or undefined if not loaded yet. */
    getSetting: (key: string) => any;
    /** True only on the very first mount before any data is available. */
    loading: boolean;
    /** Manually trigger a re-fetch (e.g. after an admin save). */
    refresh: () => Promise<void>;
}

// ── Context ──────────────────────────────────────────────────────────────────

const SystemSettingsContext = createContext<SystemSettingsContextType>({
    getSetting: () => undefined,
    loading: true,
    refresh: async () => { },
});

// ── Cache helpers ─────────────────────────────────────────────────────────────

const CACHE_KEY = 'italostudy_system_settings_v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Keys that must NEVER be served from cache — always fetched fresh from DB.
 * This prevents localStorage manipulation from bypassing security-critical flags.
 */
const UNCACHEABLE_KEYS = new Set(['maintenance_mode']);

function readCache(): SettingsMap | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts >= CACHE_TTL) return null;
        // Strip any uncacheable keys that may have been written by older versions
        const safe: SettingsMap = {};
        Object.entries(data).forEach(([k, v]) => {
            if (!UNCACHEABLE_KEYS.has(k)) safe[k] = v;
        });
        return safe;
    } catch { return null; }
}

function writeCache(data: SettingsMap) {
    try {
        // Never persist security-critical keys to localStorage
        const cacheable: SettingsMap = {};
        Object.entries(data).forEach(([k, v]) => {
            if (!UNCACHEABLE_KEYS.has(k)) cacheable[k] = v;
        });
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: cacheable, ts: Date.now() }));
    } catch { /* silent */ }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
    // Hydrate synchronously from cache so consumers don't flash on revisit.
    // NOTE: maintenance_mode is NOT in the cache (UNCACHEABLE_KEYS), so loading
    // stays true until the first DB fetch resolves — this prevents any flash
    // of the app during maintenance while still allowing fast hydration for
    // all other settings.
    const cached = readCache();
    const [settings, setSettings] = useState<SettingsMap>(cached ?? {});
    const [loading, setLoading] = useState(true); // always wait for fresh DB fetch
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const fetchAll = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('key, value');

            if (error || !data) return;
            if (!isMounted.current) return;

            const map: SettingsMap = {};
            data.forEach((row: any) => {
                map[row.key] = row.value;
            });

            setSettings(map);
            writeCache(map);
        } catch { /* non-critical */ } finally {
            if (isMounted.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch (background if cache exists, blocking if no cache)
        fetchAll();

        // ONE stable realtime channel for the entire app — no Math.random()
        const channel = supabase
            .channel('system-settings-global')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'system_settings' },
                (payload: any) => {
                    // Surgical update — only change the one key that changed
                    if (payload.new?.key) {
                        setSettings(prev => ({
                            ...prev,
                            [payload.new.key]: payload.new.value,
                        }));
                        // Also refresh cache entry
                        fetchAll();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchAll]);

    const getSetting = useCallback((key: string) => settings[key], [settings]);

    return (
        <SystemSettingsContext.Provider value={{ getSetting, loading, refresh: fetchAll }}>
            {children}
        </SystemSettingsContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSystemSettings() {
    return useContext(SystemSettingsContext);
}
