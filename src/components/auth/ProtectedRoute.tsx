import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { MaintenanceOverlay } from '@/components/MaintenanceOverlay';
import { getSkeletonForPath } from '@/lib/skeletons';
import Layout from '@/components/Layout';
import MobileLayout from '@/mobile/components/MobileLayout';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
    allowedPlans?: string[];
}

export default function ProtectedRoute({ children, allowedRoles, allowedPlans }: ProtectedRouteProps) {
    const { user, profile, loading, aal, hasMFA } = useAuth() as any;
    const [isBypassed, setIsBypassed] = useState(false);
    const { isPageEnabled, getMaintenanceMessage, loading: visibilityLoading } = usePageVisibility();
    const location = useLocation();

    const userRole = profile?.role || 'user';
    const isConsultant = profile?.is_consultant;
    const isAdmin = userRole === 'admin' || userRole === 'sub_admin';

    const isAuthLoading = loading || visibilityLoading || (user && !profile);
    
    // Guess if user is logged in before async auth check resolves
    const hasAuthHint = () => {
        try {
            // Only guess "true" if we have strong indicators. 
            // supabase token alone isn't enough as it might be expired.
            // profile cache + cookie is the sweet spot.
            const hasProfileCache = !!localStorage.getItem('italostudy_auth_profile_v1');
            const hasLoggedCookie = document.cookie.includes('italostudy_logged_in=true');
            return hasProfileCache && hasLoggedCookie;
        } catch { return false; }
    };

    if (isAuthLoading) {
        // If we have no reason to believe the user is logged in, don't show a dashboard skeleton
        if (!hasAuthHint()) {
            return null;
        }

        const isMobile = location.pathname.startsWith('/mobile') || (window.innerWidth <= 768);
        
        if (isMobile) {
            return (
                <MobileLayout isLoading={true}>
                    {getSkeletonForPath(location.pathname)}
                </MobileLayout>
            );
        }

        return (
            <Layout isLoading={true}>
                {getSkeletonForPath(location.pathname)}
            </Layout>
        );
    }

    // Page Visibility Enforcement - Checked first so guests also see "Under Development"
    if (!isPageEnabled(location.pathname) && !isBypassed) {
        return (
            <MaintenanceOverlay 
                message={getMaintenanceMessage(location.pathname)} 
                pageName={location.pathname.split('/')[1]?.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')} 
                showAdminBypass={isAdmin}
                onBypass={() => setIsBypassed(true)}
            />
        );
    }

    if (!user) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    // Onboarding Enforcement: Ensure non-admin users have selected an exam, plan, study hours, and provided a phone number
    const isOnboardingPage = location.pathname === '/onboarding';
    const hasOnboarded = isAdmin || (
        profile?.selected_exam && 
        profile?.selected_plan && 
        profile?.phone_number && 
        profile?.study_hours
    );

    // Only redirect if profile is loaded and user is explicitly not onboarded
    if (profile && !hasOnboarded && !isOnboardingPage && !isAdmin) {
        return <Navigate to="/onboarding" state={{ from: location }} replace />;
    }

    // Prevent access to onboarding if already completed
    if (profile && hasOnboarded && isOnboardingPage) {
        return <Navigate to="/" replace />;
    }

    // MFA Enforcement: If user has MFA enabled but session is aal1, they must verify
    if (hasMFA && aal !== 'aal2') {
        const isAuthPage = location.pathname === '/auth';
        if (!isAuthPage) {
            return <Navigate to="/auth" state={{ from: location, mfaRequired: true }} replace />;
        }
    }

    // Role-based protection
    const userPlan = profile?.selected_plan || 'explorer';
    const userTier = profile?.subscription_tier?.toLowerCase() || '';

    // Check if the current user has any of the allowed roles
    const hasRoleAccess = allowedRoles ? (
        allowedRoles.includes(userRole) ||
        (isConsultant && allowedRoles.includes('consultant'))
    ) : true;

    // Check if the current user has any of the allowed plans
    // Admins always have access to everything
    const hasPlanAccess = allowedPlans ? (
        userRole === 'admin' ||
        allowedPlans.includes(userPlan) ||
        allowedPlans.includes(userTier)
    ) : true;

    const hasAccess = hasRoleAccess && hasPlanAccess;

    if (!hasAccess && profile) {
        // Redirect to the most appropriate "Home" for their role
        if ((userRole === 'consultant' || isConsultant) && location.pathname !== '/consultant/dashboard') {
            return <Navigate to="/consultant/dashboard" replace />;
        }
        // For regular users, redirect to dashboard
        if (userRole === 'user' && location.pathname !== '/') {
            return <Navigate to="/" replace />;
        }
        // For admin/sub_admin trying to access restricted routes, redirect to appropriate page
        // instead of forcing them to /admin (they can access user routes too)
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
