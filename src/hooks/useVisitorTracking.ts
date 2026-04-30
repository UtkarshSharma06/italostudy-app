import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAnalytics } from './useAnalytics';

import { generateUUID } from '@/lib/uuid';

export function useVisitorTracking() {
    const location = useLocation();
    const navigate = useNavigate();
    const [userIp, setUserIp] = useState<string | null>(null);
    const { trackEvent } = useAnalytics();

    useEffect(() => {
        // --- MARKETING CORE ---
        if (!sessionStorage.getItem('analytics_session_id')) {
            sessionStorage.setItem('analytics_session_id', generateUUID());
        }

        if (!sessionStorage.getItem('initial_referrer') && document.referrer) {
            if (!document.referrer.includes(window.location.host)) {
                sessionStorage.setItem('initial_referrer', document.referrer);
            }
        }

        const params = new URLSearchParams(window.location.search);
        ['utm_source', 'utm_medium', 'utm_campaign'].forEach(utm => {
            const val = params.get(utm);
            if (val) sessionStorage.setItem(utm, val);
        });

        const trackVisit = async () => {
            try {
                // Check session storage to avoid redundant tracking
                const sessionTrackKey = `tracked_${location.pathname}`;
                const hasTrackedThisPage = sessionStorage.getItem(sessionTrackKey);

                // We still want to check for banned IPs frequently, but GeoIP and logging 
                // can be throttled. Let's cache the IP and banned status for the session.
                let ip = sessionStorage.getItem('user_ip');
                let isBanned = sessionStorage.getItem('is_banned') === 'true';

                if (!ip) {
                    const ipResponse = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipResponse.json();
                    ip = ipData.ip;
                    if (ip) {
                        sessionStorage.setItem('user_ip', ip);

                        // Check if IP is banned
                        const { data: bannedData } = await supabase
                            .from('banned_ips')
                            .select('ip')
                            .eq('ip', ip)
                            .maybeSingle();

                        isBanned = !!bannedData;
                        sessionStorage.setItem('is_banned', isBanned ? 'true' : 'false');
                    }
                }

                if (isBanned && !location.pathname.includes('/auth')) {
                    navigate('/auth?banned=true', { replace: true });
                    return;
                }

                // If already tracked this specific path in this session, skip logging and profile updates
                if (hasTrackedThisPage && ip) {
                    setUserIp(ip);
                    return;
                }

                // 2. Try to get Country (Throttled: only once per session)
                let country = sessionStorage.getItem('user_country') || 'Unknown';
                if (country === 'Unknown') {
                    try {
                        const geoRes = await fetch('https://api.db-ip.com/v2/free/self');
                        if (geoRes.ok) {
                            const geoData = await geoRes.json();
                            country = geoData.countryName || 'Unknown';
                            sessionStorage.setItem('user_country', country);
                        }
                    } catch (e) {
                        console.warn('Failed to fetch location data:', e);
                    }
                }

                if (ip) setUserIp(ip);

                // 3. Log visit to site_visits and marketing events
                if (ip) {
                    await supabase.from('site_visits').insert({
                        ip_address: ip,
                        path: location.pathname,
                        user_agent: navigator.userAgent
                    });
                    
                    // Fire analytics event
                    trackEvent('page_view', { ip_captured: true, country });
                    
                    sessionStorage.setItem(sessionTrackKey, 'true');
                }

                // 4. Update user profile with last_ip and country if authenticated (Throttled: once per session)
                if (!sessionStorage.getItem('profile_updated_this_session')) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user && ip) {
                        await supabase
                            .from('profiles')
                            .update({
                                last_ip: ip,
                                country: country
                            })
                            .eq('id', session.user.id);
                        sessionStorage.setItem('profile_updated_this_session', 'true');
                    }
                }
            } catch (error) {
                console.error('Visitor tracking error:', error);
            }
        };

        trackVisit();
    }, [location.pathname]);

    return { userIp };
}
