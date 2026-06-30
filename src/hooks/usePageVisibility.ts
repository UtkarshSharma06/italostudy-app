import { useState, useEffect, useCallback } from 'react';
import { useSystemSettings } from '@/context/SystemSettingsContext';

export interface PageConfig {
    enabled: boolean;
    message: string;
}

export interface SitePageConfigs {
    [key: string]: PageConfig;
}

/**
 * usePageVisibility
 * ─────────────────
 * Reads page enable/disable configs from SystemSettingsContext (no own fetch,
 * no own realtime channel). All logic is identical to the previous version.
 */
export const usePageVisibility = () => {
    const { getSetting, loading: settingsLoading } = useSystemSettings();

    // Derive configs from shared SystemSettingsContext
    const buildConfigs = useCallback((): SitePageConfigs => {
        const pageConfigsJson = getSetting('page_configs') as SitePageConfigs | undefined;
        const communityEnabled = getSetting('enable_community') as boolean | undefined;

        const finalConfigs: SitePageConfigs = { ...(pageConfigsJson ?? {}) };

        // Merge community status if not explicitly in page_configs
        if (communityEnabled !== undefined && !finalConfigs['/community']) {
            finalConfigs['/community'] = {
                enabled: communityEnabled,
                message: 'The community features are currently disabled.',
            };
        }

        return finalConfigs;
    }, [getSetting]);

    const [configs, setConfigs] = useState<SitePageConfigs>(buildConfigs);

    // Re-derive whenever SystemSettingsContext updates
    useEffect(() => {
        setConfigs(buildConfigs());
    }, [buildConfigs]);

    const normalizePath = (path: string): string => {
        if (path.startsWith('/mobile/')) {
            return path.slice(7) || '/';
        }
        if (path === '/mobile') return '/';
        return path;
    };

    const isPageEnabled = (path: string): boolean => {
        const normalized = normalizePath(path);

        // [OVERRIDE] Store is always enabled as per user request
        if (normalized.startsWith('/store')) return true;

        // Handle exact matches or prefix matches for settings
        const config = configs[normalized] || (normalized.startsWith('/settings') ? configs['/settings'] : null);
        return config ? config.enabled : true; // Default to enabled if no config found
    };

    const getMaintenanceMessage = (path: string): string => {
        const normalized = normalizePath(path);
        const config = configs[normalized] || (normalized.startsWith('/settings') ? configs['/settings'] : null);
        return config?.message || 'This page is currently under development. Please check back later.';
    };

    // Expose refresh so callers can still call refresh() — delegates to SystemSettingsContext
    const { refresh } = useSystemSettings();

    return { configs, isPageEnabled, getMaintenanceMessage, loading: settingsLoading, refresh };
};
