import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { usePricing } from "@/context/PricingContext";

export function usePlanAccess() {
    const { profile, user } = useAuth();
    const { openPricingModal } = usePricing();

    // State for usage tracking
    const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});
    const [totalPracticeCount, setTotalPracticeCount] = useState<number>(0);
    const [mockAttempts, setMockAttempts] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    // Plan & Role Definitions
    const plan = profile?.selected_plan || 'explorer';
    const tier = profile?.subscription_tier?.toLowerCase() || '';

    const isExplorer = plan === 'explorer';
    const isPro = plan === 'pro'; // Legacy check
    const isElite = plan === 'global' || tier === 'elite' || tier === 'global';
    const isGlobal = tier === 'global';
    const isAdmin = profile?.role === 'admin';

    // Subscription Expiry Check
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

        try {
            // Use secure RPCs for limits (server-side validation)
            const [practiceRes, mockRes] = await Promise.all([
                supabase.rpc('check_practice_limit', { user_uuid: user.id }),
                supabase.rpc('check_mock_limit', { user_uuid: user.id })
            ]);

            // Process practice limit response
            if (practiceRes.data) {
                const practiceData = practiceRes.data as any;
                setTotalPracticeCount(practiceData.used || 0);
                // Subject counts can still be calculated client-side for UI display
                const { data: subjectData } = await supabase
                    .from('user_practice_responses')
                    .select('subject')
                    .eq('user_id', user.id)
                    .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

                const counts: Record<string, number> = {};
                if (subjectData) {
                    subjectData.forEach((r: any) => {
                        const subj = r.subject || 'General';
                        counts[subj] = (counts[subj] || 0) + 1;
                    });
                }
                setSubjectCounts(counts);
            }

            // Process mock limit response
            if (mockRes.data) {
                const mockData = mockRes.data as any;
                setMockAttempts(mockData.used || 0);
            }

        } catch (error) {
            console.error('Error calculating plan usage:', error);
            // Fallback to restrictive limits on error
            setTotalPracticeCount(999);
            setMockAttempts(999);
        } finally {
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
