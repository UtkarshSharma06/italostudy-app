import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for pushing analytics events to the database.
 * Used for Marketing and SEO tracking (search queries, conversions, bounce rates).
 */
export function useAnalytics() {
    const trackEvent = useCallback(async (
        eventName: string,
        properties: Record<string, any> = {}
    ) => {
        try {
            // Get standard tracking info stored by useVisitorTracking
            const sessionId = sessionStorage.getItem('analytics_session_id') || undefined;
            const utmSource = sessionStorage.getItem('utm_source');
            const utmCampaign = sessionStorage.getItem('utm_campaign');
            const utmMedium = sessionStorage.getItem('utm_medium');
            const referrer = sessionStorage.getItem('initial_referrer') || document.referrer;
            
            // Get authenticated user ID if any
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;

            // Enriched properties
            const enrichedProperties = {
                ...properties,
                utm_source: utmSource || undefined,
                utm_campaign: utmCampaign || undefined,
                utm_medium: utmMedium || undefined,
                referrer: referrer ? referrer.substring(0, 500) : undefined,
                path: window.location.pathname,
                url: window.location.href,
            };

            await supabase.from('analytics_events').insert({
                event_name: eventName,
                user_id: userId || null,
                session_id: sessionId || null,
                properties: enrichedProperties
            });
            
        } catch (error) {
            console.error('[Analytics] Failed to track event:', eventName, error);
            // We never want tracking errors to break the user experience
        }
    }, []);

    return { trackEvent };
}
