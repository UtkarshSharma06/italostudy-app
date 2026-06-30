import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { usePricing } from "@/context/PricingContext";

// Module-level cache to de-duplicate simultaneous hook calls and cache across page loads
let globalUsageCache: { totalPracticeCount: number; subjectCounts: Record<string, number>; mockAttempts: number } | null = null;
let globalUsagePromise: Promise<any> | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let lastFetchTime = 0;

export function usePlanAccess() {
    const { profile, user } = useAuth();
    const { openPricingModal } = usePricing();

    // State for usage tracking
    const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});
    const [totalPracticeCount, setTotalPracticeCount] = useState<number>(0);
    const [mockAttempts, setMockAttempts] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    // Server-verified expiry is now handled by the robust profile fetch and real-time updates in AuthProvider
    // Using the secure auth profile directly eliminates redundant database calls.

    // Plan & Role Definitions
    const plan = profile?.selected_plan || 'explorer';
    const tier = profile?.subscription_tier?.toLowerCase() || '';

    const isExplorer = plan === 'explorer';
    const isPro = plan === 'pro'; // Legacy check
    const isElite = plan === 'global' || tier === 'elite' || tier === 'global';
    const isGlobal = tier === 'global';
    const isAdmin = profile?.role === 'admin';

    // Subscription Expiry Check
    // Rely on the secure auth profile which is synced via realtime updates
    const expiryDate = profile?.subscription_expiry_date;
    const isSubscriptionExpired = expiryDate
        ? new Date(expiryDate) < new Date()
        : false;

    // "Premium" means valid Elite/Global subscription (Admins must use overrides or specific plan to see premium UI)
    // Changing this so Admin status doesn't automatically hide limits in the UI, allowing for testing.
    const hasPremiumAccess = (isElite || isGlobal) && !isSubscriptionExpired;


    // Block access if expired and trying to use paid features (and not admin)
    const shouldBlockAccess = isSubscriptionExpired && !isExplorer && !isAdmin;

    // ----------------------------------------------------------------------
    // LIMIT LOGIC
    // ----------------------------------------------------------------------
    const PRACTICE_DAILY_LIMIT = 15;
    const MOCK_TOTAL_LIMIT = 1;

    const fetchUsageData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const now = Date.now();
        // 1. Return from memory cache if fresh
        if (globalUsageCache && (now - lastFetchTime < CACHE_TTL)) {
            setTotalPracticeCount(globalUsageCache.totalPracticeCount);
            setSubjectCounts(globalUsageCache.subjectCounts);
            setMockAttempts(globalUsageCache.mockAttempts);
            setIsLoading(false);
            return;
        }

        // 2. If another component is already fetching, wait for its promise
        if (globalUsagePromise) {
            try {
                const cached = await globalUsagePromise;
                setTotalPracticeCount(cached.totalPracticeCount);
                setSubjectCounts(cached.subjectCounts);
                setMockAttempts(cached.mockAttempts);
            } catch (e) {
                // Ignore, will be handled by the primary fetcher
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // 3. Initiate the fetch and store the promise globally
        globalUsagePromise = (async () => {
            let result = { totalPracticeCount: 0, subjectCounts: {} as Record<string, number>, mockAttempts: 0 };
            try {
                const [practiceRes, mockRes] = await Promise.all([
                    supabase.rpc('check_practice_limit', { user_uuid: user.id }),
                    supabase.rpc('check_mock_limit', { user_uuid: user.id })
                ]);

                if (practiceRes.data) {
                    const practiceData = practiceRes.data as any;
                    result.totalPracticeCount = practiceData.used || 0;
                    
                    const { data: subjectData } = await supabase
                        .from('user_practice_responses')
                        .select('subject')
                        .eq('user_id', user.id)
                        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

                    if (subjectData) {
                        subjectData.forEach((r: any) => {
                            const subj = r.subject || 'General';
                            result.subjectCounts[subj] = (result.subjectCounts[subj] || 0) + 1;
                        });
                    }
                }

                if (mockRes.data) {
                    const mockData = mockRes.data as any;
                    result.mockAttempts = mockData.used || 0;
                }
                return result;
            } catch (error) {
                console.error('Error calculating plan usage:', error);
                return { totalPracticeCount: 999, subjectCounts: {}, mockAttempts: 999 };
            }
        })();

        // 4. Await our newly created promise and save to cache
        try {
            const finalResult = await globalUsagePromise;
            globalUsageCache = finalResult;
            lastFetchTime = Date.now();
            setTotalPracticeCount(finalResult.totalPracticeCount);
            setSubjectCounts(finalResult.subjectCounts);
            setMockAttempts(finalResult.mockAttempts);
        } finally {
            globalUsagePromise = null;
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (user) {
            fetchUsageData();
        }
    }, [user, fetchUsageData]);


    // ----------------------------------------------------------------------
    // CHECKER FUNCTIONS
    // ----------------------------------------------------------------------

    const getSubjectCount = (subject: string): number => {
        return subjectCounts[subject] || 0;
    };

    const getRemainingQuestions = (subject?: string): number => {
        if (hasPremiumAccess) return 9999;
        // Strict Global Limit: Remaining is typically (Limit - Total Usage)
        return Math.max(0, PRACTICE_DAILY_LIMIT - totalPracticeCount);
    };

    const hasReachedSubjectLimit = (subject: string): boolean => {
        if (hasPremiumAccess) return false;
        // Check Global Limit first
        if (totalPracticeCount >= PRACTICE_DAILY_LIMIT) return true;

        // Also check specific component if needed, but for "Total 15", the global check covers it.
        return false;
    };

    const hasReachedMockLimit = (): boolean => {
        if (hasPremiumAccess) return false;
        return mockAttempts >= MOCK_TOTAL_LIMIT;
    };

    // Simplified check for "Restricted" plans (Explorer, Free, Initiate)
    const isRestrictedPlan = isExplorer || tier === 'initiate' || tier === 'free';

    // Generic Access Check
    const checkAccess = (feature: 'practice' | 'explanations' | 'mocks' | 'chat', subject?: string): boolean => {
        // Active Premium Users bypass all checks. 
        // NOTE: Admins on 'explorer' plan will now be restricted by default to allow testing.
        // To bypass as Admin, we could add || isAdmin here, but user asked to set limit to 1.
        if (hasPremiumAccess) return true;

        switch (feature) {
            case 'practice':
                if (subject) return !hasReachedSubjectLimit(subject);
                // STRICT GLOBAL LIMIT CHECK:
                // If checking "general" practice access without a specific subject,
                // we must block if the TOTAL count across all subjects has reached limit.
                return totalPracticeCount < PRACTICE_DAILY_LIMIT;
            case 'mocks':
                return !hasReachedMockLimit();
            case 'explanations':
                return false; // Free users don't get detailed AI explanations
            case 'chat':
                return true;  // Chat is currently free?
            default:
                return true;
        }
    };

    return {
        // Plan State
        plan,
        tier,
        isExplorer,
        isPro,
        isElite,
        isGlobal,
        isAdmin,
        isRestrictedPlan,
        hasPremiumAccess,
        isSubscriptionExpired,
        shouldBlockAccess,
        expiryDate,

        // Data
        totalPracticeCount,
        subjectCounts,
        mockAttempts,
        isLoading,

        // Limits Constants
        practiceLimit: PRACTICE_DAILY_LIMIT,
        mockLimit: MOCK_TOTAL_LIMIT,

        // Checker Methods
        getSubjectCount,
        getRemainingQuestions,
        hasReachedSubjectLimit,
        hasReachedMockLimit,
        checkAccess,

        // Actions
        openPricingModal,
        refreshLimit: fetchUsageData
    };
}
