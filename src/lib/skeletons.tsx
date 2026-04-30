import { 
    AnalyticsSkeleton, 
    SubjectsGridSkeleton, 
    MockExamsSkeleton,
    TestListSkeleton,
    HistorySkeleton,
    NotificationSkeleton,
    LabSkeleton,
    SettingsSkeleton,
    GlobalSkeleton,
    AuthorityPageSkeleton,
    BlogSkeleton,
    PricingSkeleton,
    CommunitySkeleton,
    LearningSkeleton,
    ProfileSkeleton,
    BookmarkSkeleton,
} from '@/components/SkeletonLoader';
import { DesktopDashboardSkeleton } from '@/components/DesktopDashboardSkeleton';
import { DashboardSkeleton as MobileDashboardSkeleton } from '@/mobile/components/DashboardSkeleton';
export { LayoutSkeleton } from '@/components/SkeletonLoader';
import { isPublicRoute } from './routes';
import { LoadingSpinner } from '@/components/LoadingSpinner';

/**
 * Maps a URL path to its corresponding premium skeleton component.
 * This ensures the UI feels "instant" by showing the shimmering structure
 * before data or components have finished loading.
 */
export const getSkeletonForPath = (path: string) => {
    const normalizedPath = path.replace(/\/$/, '') || '/';
    
    // Mobile Dashboard specifically
    if (normalizedPath === '/mobile/dashboard' || (normalizedPath === '/' && window.innerWidth < 1024)) {
        return <MobileDashboardSkeleton />;
    }

    // Dashboard or Root (logged in users landing on / get redirected to dashboard)
    if (normalizedPath === '/' || normalizedPath === '/dashboard') {
        return <DesktopDashboardSkeleton />;
    }

    // Public routes get null — the pre-JS HTML skeleton in index.html already
    // covers the visual gap before React mounts. No spinner needed here.
    if (isPublicRoute(normalizedPath)) {
        return null;
    }

    // Analytics / Detailed Analysis
    if (
        normalizedPath === '/analytics' || 
        normalizedPath === '/mobile/analytics' || 
        normalizedPath === '/detailed-analysis' || 
        normalizedPath === '/mobile/detailed-analysis' ||
        normalizedPath.startsWith('/detailed-analysis/') ||
        normalizedPath.startsWith('/mobile/detailed-analysis/')
    ) {
        return <AnalyticsSkeleton />;
    }

    // Subjects
    if (normalizedPath === '/subjects' || normalizedPath === '/mobile/subjects') {
        return <SubjectsGridSkeleton />;
    }

    // Practice / Test Lists
    if (normalizedPath === '/practice' || normalizedPath === '/mobile/practice') {
        return <TestListSkeleton />;
    }

    // Mock Exams
    if (normalizedPath === '/mock-exams' || normalizedPath === '/mobile/mock-exams') {
        return <MockExamsSkeleton />;
    }

    // History
    if (normalizedPath === '/history' || normalizedPath === '/mobile/history') {
        return <HistorySkeleton />;
    }


    // Notifications
    if (normalizedPath === '/mobile/notifications') {
        return <NotificationSkeleton />;
    }

    // Labs
    if (normalizedPath === '/labs' || normalizedPath === '/mobile/labs') {
        return <LabSkeleton />;
    }

    // Settings & Pricing
    if (
        normalizedPath === '/settings' || 
        normalizedPath === '/mobile/settings' ||
        normalizedPath === '/setting' || 
        normalizedPath === '/mobile/setting' ||
        normalizedPath === '/billing' ||
        normalizedPath === '/mobile/billing'
    ) {
        return <PricingSkeleton />;
    }

    // Community
    if (normalizedPath === '/community' || normalizedPath === '/mobile/community') {
        return <CommunitySkeleton />;
    }

    // Learning
    if (normalizedPath === '/learning' || normalizedPath === '/mobile/learning') {
        return <LearningSkeleton />;
    }

    // Bookmarks
    if (normalizedPath === '/bookmarks' || normalizedPath === '/mobile/bookmarks') {
        return <BookmarkSkeleton />;
    }

    // Student Profiles
    if (
        normalizedPath.startsWith('/student/') || 
        normalizedPath.startsWith('/mobile/student/') ||
        normalizedPath.startsWith('/u/') ||
        normalizedPath.startsWith('/mobile/u/')
    ) {
        return <ProfileSkeleton />;
    }

    if (normalizedPath === '/pricing') {
        return <PricingSkeleton />;
    }

    // Blog
    if (normalizedPath === '/blog' || normalizedPath.startsWith('/blog/')) {
        return <BlogSkeleton />;
    }

    // Authority Cluster & Syllabus (Detailed heavy pages)
    if (
        normalizedPath.includes('ultimate-guide') ||
        normalizedPath.includes('syllabus-2026') ||
        normalizedPath.includes('exam-dates') ||
        normalizedPath.includes('registration-2026') ||
        normalizedPath.includes('preparation-strategy') ||
        normalizedPath.includes('cutoff-trends') ||
        normalizedPath.includes('previous-year-papers') ||
        normalizedPath.includes('vs-cents') ||
        normalizedPath.includes('difficulty-analysis') ||
        normalizedPath.includes('eligibility-criteria') ||
        normalizedPath.includes('mock-test-free') ||
        normalizedPath.includes('passing-score-explained') ||
        normalizedPath.includes('exam-pattern') ||
        normalizedPath.startsWith('/exams/') ||
        normalizedPath.startsWith('/syllabus/') ||
        normalizedPath.startsWith('/study-in-italy/') ||
        normalizedPath === '/resources' ||
        normalizedPath.startsWith('/resources/')
    ) {
        return <AuthorityPageSkeleton />;
    }

    // Fallback: Global premium skeleton
    return <GlobalSkeleton />;
};
