import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PageConfig {
    enabled: boolean;
    message: string;
}

export interface SitePageConfigs {
    [key: string]: PageConfig;
}

export const usePageVisibility = () => {
    const [configs, setConfigs] = useState<SitePageConfigs>({});
    const [loading, setLoading] = useState(true);

    const fetchConfigs = async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('key, value')
                .in('key', [
                    'page_configs',
                    'enable_community' // fallback for existing toggle
                ]);

            if (error) throw error;

            const pageConfigsJson = data.find(item => item.key === 'page_configs')?.value as unknown as SitePageConfigs || {};
            const communityEnabled = data.find(item => item.key === 'enable_community')?.value as boolean;

            // Merge community status if not explicitly in page_configs
            const finalConfigs = { ...pageConfigsJson };
            if (communityEnabled !== undefined && !finalConfigs['/community']) {
                finalConfigs['/community'] = {
                    enabled: communityEnabled,
                    message: "The community features are currently disabled."
                };
            }

            setConfigs(finalConfigs);
        } catch (err) {
            console.error('Error fetching page configs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();

        const channel = supabase
            .channel(`system-settings-changes-${Math.random().toString(36).slice(2)}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'system_settings' },
                () => fetchConfigs()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const isPageEnabled = (path: string): boolean => {
        // [OVERRIDE] Store is always enabled as per user request
        if (path.startsWith('/store')) return true;

        // Handle exact matches or prefix matches for settings
        const config = configs[path] || (path.startsWith('/settings') ? configs['/settings'] : null);
        return config ? config.enabled : true; // Default to enabled if no config found
    };

    const getMaintenanceMessage = (path: string): string => {
        const config = configs[path] || (path.startsWith('/settings') ? configs['/settings'] : null);
        return config?.message || "This page is currently under development. Please check back later.";
    };

    return { configs, isPageEnabled, getMaintenanceMessage, loading, refresh: fetchConfigs };
};
