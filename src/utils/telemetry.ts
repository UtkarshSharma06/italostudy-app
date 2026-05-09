import { supabase } from '@/integrations/supabase/client';

const UTM_CACHE_KEY = 'italostudy_utm_params';
const LAST_SIGN_IN_KEY = 'italostudy_last_sign_in';

// 1. UTM Tracking
export const captureUTMParams = () => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('utm_source');
    const medium = urlParams.get('utm_medium');
    const campaign = urlParams.get('utm_campaign');

    if (source || medium || campaign) {
        const utm = {
            source: source || 'Organic',
            medium: medium || 'Direct',
            campaign: campaign || 'None',
            timestamp: new Date().getTime(),
        };
        localStorage.setItem(UTM_CACHE_KEY, JSON.stringify(utm));
        console.log('✅ Captured Acquisition Source:', utm);
    }
};

export const getCachedUTMParams = () => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(UTM_CACHE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        // Expiry logic: 30 days
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        if (new Date().getTime() - parsed.timestamp > thirtyDays) {
            localStorage.removeItem(UTM_CACHE_KEY);
            return null;
        }
        return parsed;
    } catch (e) {
        return null;
    }
};

export const clearUTMParams = () => {
    localStorage.removeItem(UTM_CACHE_KEY);
};

// 2. Event Tracking (Funnel)
export const trackEvent = async (eventName: string, eventData: Record<string, any> = {}) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from('analytics_events').insert([{
            user_id: user?.id || null,
            event_name: eventName,
            event_data: eventData
        }]);
        
        console.log(`📊 Event Tracked: ${eventName}`, eventData);
    } catch (err) {
        console.error('Failed to track event:', err);
    }
};

// 3. DAU / MAU Tracking
export const updateLastSignIn = async (userId: string) => {
    try {
        const lastSignInRaw = localStorage.getItem(LAST_SIGN_IN_KEY);
        const now = new Date();
        
        // Debounce: Only update DB if it's been more than 12 hours since last local recorded sign in
        if (lastSignInRaw) {
            const lastSignIn = new Date(lastSignInRaw);
            const hoursSinceLastSignIn = (now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastSignIn < 12) {
                return; // Skip DB update to save costs
            }
        }

        const { error } = await supabase
            .from('profiles')
            .update({ last_sign_in_at: now.toISOString() })
            .eq('id', userId);

        if (!error) {
            localStorage.setItem(LAST_SIGN_IN_KEY, now.toISOString());
            console.log('✅ Updated Active User Timestamp (DAU tracking)');
        }
    } catch (err) {
        console.error('Failed to update DAU tracking:', err);
    }
};
