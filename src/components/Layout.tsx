import { ReactNode, Suspense, lazy } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
    Infinity,
    LayoutDashboard,
    BookOpen,
    Clock,
    LogOut,
    Brain,
    Menu,
    X,
    Globe,
    BarChart3,
    ChevronDown,
    Award,
    Bell,
    Settings,
    User,
    Play,
    Loader2,
    MessageCircle,
    Users,
    FlaskConical,
    Bookmark,
    Hash,
    FileText,
    Smartphone,
    ShieldCheck,
    Crown,
    Sun,
    Moon,
    Book,
    Pencil,
    ShoppingBag,
    Bug,
    Radar,
    GraduationCap,
    Flame,
    Target,
    ChevronsLeft,
    ChevronsRight,
    TrendingUp,
    Trophy,
    ChevronRight,
    Newspaper
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
// Heavy modules lazy-loaded
const NotificationDropdown = lazy(() => import('./NotificationDropdown'));
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExam } from '@/context/ExamContext';
import { usePricing } from '@/context/PricingContext';
const FeedbackDialog = lazy(() => import('./FeedbackDialog').then(m => ({ default: m.FeedbackDialog })));
const AuthModal = lazy(() => import('@/components/auth/AuthModal').then(m => ({ default: m.AuthModal })));
import { usePlanAccess } from '@/hooks/usePlanAccess';
const PremiumSuccessAnimation = lazy(() => import('./PremiumSuccessAnimation').then(m => ({ default: m.PremiumSuccessAnimation })));
import { useToast } from '@/hooks/use-toast';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
import { useLiveEdit } from '@/contexts/LiveEditContext';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useSystemSettings } from '@/context/SystemSettingsContext';
import { useGamification } from '@/hooks/useGamification';
import { MaintenanceOverlay } from './MaintenanceOverlay';
import Footer from './Footer';

const AnnouncementBar = lazy(() => import('./AnnouncementBar'));
const SeatTrackerModal = lazy(() => import('./SeatTrackerModal').then(m => ({ default: m.SeatTrackerModal })));
import { SidebarSkeleton, HeaderSkeleton, MobileHeaderSkeleton, MobileBottomBarSkeleton } from './SkeletonLoader';
import { getSkeletonForPath } from '@/lib/skeletons';
const SupportWidget = lazy(() => import('./SupportWidget'));

export const LayoutContext = createContext(false);

interface LayoutProps {
    children: ReactNode;
    showFooter?: boolean;
    showHeader?: boolean;
    subNavigation?: React.ReactNode;
    variant?: 'dashboard';
    isLoading?: boolean;
}

export default function Layout({
    children,
    showFooter = true,
    showHeader = true,
    subNavigation,
    variant = 'dashboard',
    isLoading = false
}: LayoutProps) {
    const isInsideLayout = useContext(LayoutContext);
    
    if (isInsideLayout) {
        return <>{children}</>;
    }

    const { user, signOut, profile } = useAuth() as any;
    const { isEditMode } = useLiveEdit();
    const { activeExam, setActiveExam, allExams } = useExam();
    const isImat = activeExam?.id?.includes('imat');
    const navigate = useNavigate();
    const location = useLocation();
    const isAdminPath = location.pathname.startsWith('/admin') || location.pathname.startsWith('/store-admin');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncTarget, setSyncTarget] = useState("");
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState<boolean | null>(() => {
        // Initial detection based on user agent or window width as fallback
        if (typeof window !== 'undefined') {
            return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768;
        }
        return null;
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { shouldBlockAccess, isExplorer, plan, isSubscriptionExpired, hasPremiumAccess, isGlobal, isElite } = usePlanAccess();
    const { openPricingModal } = usePricing();
    const [showPremiumAnimation, setShowPremiumAnimation] = useState(false);
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const [hasError, setHasError] = useState(false);
    const { isPageEnabled, getMaintenanceMessage } = usePageVisibility();
    const [isBypassed, setIsBypassed] = useState(false);
    const gamification = useGamification(user?.id);


    useEffect(() => {
        const checkPlatform = async () => {
            try {
                const { Device } = await import('@capacitor/device');
                const info = await Device.getInfo();
                // Strictly Native App detection - but DON'T overwrite if already true from window check
                if (info.platform === 'android' || info.platform === 'ios') {
                    setIsMobile(true);
                }
            } catch (e) {
                // Keep the default detection
            }
        };
        checkPlatform();
    }, []);

    // ────────────────────────────────────────────────────────────────────────
    // SCROLL RECOVERY MECHANISM (Refined)
    // Runs once on mount and on location changes to unlock body scroll
    // ────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const recoverScroll = () => {
            const hasOpenDialog = document.querySelector('[role="dialog"]') || 
                                 document.querySelector('[data-state="open"]') ||
                                 document.body.classList.contains('radix-scroll-lock');
            
            if (!hasOpenDialog) {
                document.body.style.overflow = '';
                document.body.style.pointerEvents = '';
                document.documentElement.style.overflow = '';
            }
        };

        recoverScroll();
        window.addEventListener('resize', recoverScroll);
        return () => window.removeEventListener('resize', recoverScroll);
    }, [location.pathname]);

    const handleExamSwitch = async (exam: any) => {
        setIsSyncing(true);
        setSyncTarget(exam.name);
        // Wait for the animation/simulation feel plus the actual DB update
        await setActiveExam(exam.id);
        setTimeout(() => {
            navigate('/dashboard');
            setIsSyncing(false);
        }, 1200);
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const handleNavClick = (path: string) => {
        if (path.startsWith('http') || path === '/store' || path === '/blog' || path === '/resources' || path === '/exams') {
            let url = path;
            if (path === '/store') url = 'https://store.italostudy.com';
            else if (path === '/blog') url = 'https://italostudy.com/blog';
            else if (path === '/resources') url = 'https://italostudy.com/resources';
            else if (path === '/exams') url = 'https://italostudy.com/exams';
            
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            navigate(path);
        }
    };

    const fetchGlobalUnread = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase.rpc('has_unread_messages', { p_user_id: user.id });
            if (error) throw error;
            setHasUnreadCommunityMessages(!!data);
        } catch (err) {
            console.error('Error fetching global unread:', err);
        }
    }, [user]);

    const [hasUnreadCommunityMessages, setHasUnreadCommunityMessages] = useState(false);

    const { getSetting } = useSystemSettings();
    const enableCommunity = getSetting('enable_community') !== false; // default true

    useEffect(() => {
        if (!user) return;
        fetchGlobalUnread();

        const messageSub = supabase
            .channel('global-chat-notifications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages' }, () => fetchGlobalUnread())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'community_read_status', filter: `user_id=eq.${user.id}` }, () => fetchGlobalUnread())
            .subscribe();

        // Listen for premium upgrade success event (from payment completion OR profile_changes in auth.tsx)
        const handlePremiumUpgrade = () => {
            setShowPremiumAnimation(true);
        };
        window.addEventListener('premium-upgrade-success', handlePremiumUpgrade);

        return () => {
            supabase.removeChannel(messageSub);
            window.removeEventListener('premium-upgrade-success', handlePremiumUpgrade);
        };
    }, [user, fetchGlobalUnread, activeExam?.id]);

    const isAdmin = profile?.role === 'admin' || profile?.role === 'sub_admin';

    // Global Page Visibility Enforcement (for public/unprotected routes)
    // Only enforced if not already handled by ProtectedRoute (which is most dashboard pages)
    // but useful for landing pages, syllabus, etc.
    const isProtectedPath = ['/dashboard', '/community', '/subjects', '/practice', '/mock-exams', '/analytics', '/history', '/settings', '/learning'].some(p => location.pathname.startsWith(p));
    
    if (!isProtectedPath && !isPageEnabled(location.pathname) && !isBypassed) {
        return (
            <MaintenanceOverlay 
                message={getMaintenanceMessage(location.pathname)} 
                pageName={location.pathname.split('/')[1]?.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')} 
                showAdminBypass={isAdmin}
                onBypass={() => setIsBypassed(true)}
            />
        );
    }


    const mainNav = [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Courses', path: '/courses', icon: GraduationCap },
        { label: 'Subjects', path: '/subjects', icon: BookOpen },
        { label: 'Practice', path: '/practice', icon: Pencil },
        { label: 'Notes & PDFs', path: '/notes', icon: FileText },
        { label: 'Mock Tests', path: '/mock-exams', icon: Target },
        { label: 'Resources', path: '/resources', icon: FileText },
    ];

    const trackNav = [
        { label: 'Analytics', path: '/analytics', icon: BarChart3 },
        { label: 'History', path: '/history', icon: Clock },
        { label: 'Saved', path: '/bookmarks', icon: Bookmark },
    ];

    const exploreNav = [
        { label: 'Blog', path: '/blog', icon: Newspaper },
        { label: 'Store', path: '/store', icon: ShoppingBag },
        { label: 'Community', path: '/community', icon: MessageCircle }
    ];

    const allNavItems = [...mainNav, ...trackNav, ...exploreNav];

    const displayName = profile?.display_name || profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Student';

    return (
        <LayoutContext.Provider value={true}>
            {/* MOBILE APP RENDER */}
            {isMobile ? (
                <div className={cn(
                    "flex flex-col bg-background font-sans overflow-x-hidden",
                    location.pathname.startsWith('/community') ? "h-screen overflow-hidden" : "min-h-screen"
                )}>
                    {/* Global Announcement System for Mobile Web */}
                    <Suspense fallback={null}>
                        <AnnouncementBar />
                    </Suspense>

                    {isLoading && <MobileHeaderSkeleton />}
                    
                    <main className="flex-1 relative">
                        {isLoading ? (
                            <div className="p-4">
                                {getSkeletonForPath(location.pathname)}
                            </div>
                        ) : (
                            children
                        )}
                    </main>

                    {isLoading && <MobileBottomBarSkeleton />}

                    
                    <Suspense fallback={null}>
                        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
                    </Suspense>
                </div>
            ) : (
                <div className={cn(
                    "bg-slate-50 dark:bg-slate-950 transition-colors duration-500 flex font-sans selection:bg-indigo-100 selection:text-indigo-900 relative",
                    (location.pathname.startsWith('/community') || isLoading) ? "h-screen overflow-hidden" : "min-h-screen"
                )}>

                    {/* Disney+ Style Sidebar Redesigned */}
                    {variant === 'dashboard' && showHeader && !isAdminPath && !isEditMode && !location.pathname.startsWith('/community') && (
                        <motion.nav
                            initial={false}
                            animate={{ width: isSidebarCollapsed ? 72 : 280 }}
                            style={{ zoom: '0.9' }}
                            className="fixed left-0 top-0 bottom-0 z-[120] bg-[#fdfdfd] dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-[8px_0_32px_rgba(0,0,0,0.03)] flex flex-col pt-6 transition-colors duration-500 group"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            {/* Header: Logo and Toggle */}
                            <div className="flex items-center justify-between px-5 mb-8 shrink-0 relative">
                                <Link to="/" className="flex items-center h-8">
                                    <AnimatePresence mode="wait" initial={false}>
                                        {!isSidebarCollapsed ? (
                                            <motion.img
                                                key="full-logo"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                src={theme === 'dark' ? "/logo-dark-full.webp" : "/logo.webp"}
                                                alt="logo"
                                                className="h-8 object-contain origin-left"
                                            />
                                        ) : (
                                            <motion.img
                                                key="collapsed-logo"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                src={theme === 'dark' ? "/logo-dark-compact.webp" : "/sidebar-logo.webp"}
                                                alt="logo"
                                                className="h-12 w-12 object-contain absolute left-3"
                                            />
                                        )}
                                    </AnimatePresence>
                                </Link>
                                {!isSidebarCollapsed && (
                                    <button 
                                        onClick={() => setIsSidebarCollapsed(true)}
                                        className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors shrink-0"
                                    >
                                        <ChevronsLeft size={14} />
                                    </button>
                                )}
                                {isSidebarCollapsed && (
                                    <button 
                                        onClick={() => setIsSidebarCollapsed(false)}
                                        className="absolute right-[-12px] top-1 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-md z-10 hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                )}
                            </div>

                            {isLoading ? (
                                <SidebarSkeleton />
                            ) : (
                                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col gap-4 px-4 pb-8">
                                    {/* Profile Card */}
                                    {!isSidebarCollapsed ? (
                                        <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col gap-2 shrink-0">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-100 dark:border-slate-800 overflow-hidden shrink-0">
                                                    {profile?.avatar_url ? (
                                                        <img src={getOptimizedImageUrl(profile.avatar_url, 80, 80)} alt="avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-indigo-500 font-bold text-xs">
                                                            {displayName.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <h4 className="text-[12px] font-bold text-slate-900 dark:text-white truncate max-w-[120px] leading-tight">{displayName.split(' ')[0]}</h4>
                                                        {hasPremiumAccess ? (
                                                            <span className="flex items-center gap-0.5 bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 text-[7px] font-black px-1 py-[1px] rounded uppercase tracking-widest shadow-sm shrink-0">
                                                                <Crown size={8} className="shrink-0" />
                                                                GLOBAL
                                                            </span>
                                                        ) : (
                                                            <ShieldCheck size={12} className="text-indigo-500 shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 leading-tight">Level {gamification.level} Student</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center px-0.5">
                                                <div className="flex items-center gap-1">
                                                    <Flame size={10} className="text-amber-500" />
                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{gamification.xp} XP</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Trophy size={10} className="text-yellow-500" />
                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{gamification.stars} Stars</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                                                <div className="bg-indigo-500 h-full transition-all duration-1000 ease-out" style={{ width: `${gamification.progressPercent}%` }} />
                                            </div>
                                            <div className="flex justify-between items-center px-0.5">
                                                <p className="text-[8px] text-slate-400 font-medium">{gamification.streak} Day Streak</p>
                                                <p className="text-[8px] text-slate-400 font-medium">Next: {gamification.nextLevelTotalXp}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-indigo-100 dark:border-slate-800 overflow-hidden mx-auto shrink-0 cursor-pointer" onClick={() => setIsSidebarCollapsed(false)}>
                                            {profile?.avatar_url ? (
                                                <img src={getOptimizedImageUrl(profile.avatar_url, 80, 80)} alt="avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-indigo-500 font-bold">
                                                    {displayName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Render Nav Sections */}
                                    {[
                                        { title: 'MAIN', items: mainNav },
                                        { title: 'TRACK', items: trackNav },
                                        { title: 'EXPLORE', items: exploreNav }
                                    ].map((section) => (
                                        <div key={section.title} className="flex flex-col">
                                            {!isSidebarCollapsed && (
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2">{section.title}</h3>
                                            )}
                                            <div className="flex flex-col gap-1">
                                                {section.items.map((item) => {
                                                    const isActive = location.pathname === item.path;
                                                    return (
                                                        <button
                                                            key={item.path}
                                                            onClick={() => handleNavClick(item.path)}
                                                            className={cn(
                                                                "relative flex items-center h-10 transition-all duration-300 group",
                                                                isSidebarCollapsed ? "justify-center w-10 mx-auto rounded-xl" : "w-full px-3 rounded-[10px]",
                                                                isActive 
                                                                    ? "bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold" 
                                                                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
                                                            )}
                                                        >
                                                            <item.icon className={cn(
                                                                "w-[18px] h-[18px] shrink-0 transition-transform",
                                                                isActive ? "scale-105" : "group-hover:scale-110",
                                                                isSidebarCollapsed ? "" : "mr-3"
                                                            )} strokeWidth={isActive ? 2.5 : 2} />
                                                            
                                                            {!isSidebarCollapsed && (
                                                                <span className="text-[13px] whitespace-nowrap overflow-hidden">
                                                                    {item.label}
                                                                </span>
                                                            )}

                                                            {/* Notification Badge for Community */}
                                                            {item.label === 'Community' && hasUnreadCommunityMessages && (
                                                                <motion.div
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    className={cn("absolute bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_10px_rgba(244,63,94,0.4)]", isSidebarCollapsed ? "top-1 right-1 w-2.5 h-2.5" : "top-2 right-2 w-2 h-2")}
                                                                />
                                                            )}

                                                            {/* Active Indicator Left Strip */}
                                                            {isActive && (
                                                                <motion.div
                                                                    layoutId="active-nav-indicator"
                                                                    className={cn(
                                                                        "absolute bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]",
                                                                        isSidebarCollapsed 
                                                                            ? "left-[-8px] top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                                                                            : "left-[-12px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                                                    )}
                                                                />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Bottom Actions Container */}
                            <div className="shrink-0 p-2 pb-3 flex flex-col gap-1 mt-auto border-t border-indigo-200/50 dark:border-indigo-800/30 bg-indigo-100/60 dark:bg-indigo-950/40 z-10">
                                {/* Premium Banner (Pinned) */}
                                {isExplorer && !isSidebarCollapsed && (
                                    <div className="relative group cursor-pointer mb-1 w-[92%] mx-auto" onClick={openPricingModal}>
                                        {/* Massive outer glow */}
                                        <div className="absolute inset-0 bg-[#6b42f5] blur-[24px] opacity-20 group-hover:opacity-30 transition-opacity duration-500 rounded-full" />
                                        
                                        <div className="bg-gradient-to-b from-[#28194a] to-[#160d2b] rounded-[16px] p-2 flex flex-col shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] relative overflow-hidden border border-[#4a2e85]/70">
                                            {/* Glossy overlay effect */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent pointer-events-none" />
                                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-[200%] transition-transform duration-1000" />
                                            
                                            {/* Top Section */}
                                            <div className="flex items-center gap-2.5 relative z-10">
                                                {/* Glossy Icon Box */}
                                                <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#8a5ef8] to-[#5727e3] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_12px_rgba(91,54,245,0.3)] border border-[#a37efa]/30 flex items-center justify-center shrink-0">
                                                    <Crown size={18} strokeWidth={2.5} className="text-[#fed754] drop-shadow-sm" />
                                                </div>
                                                
                                                <div className="flex flex-col flex-1 min-w-0 justify-center">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="text-white font-bold text-[12px] leading-none tracking-tight truncate">Italo Premium</span>
                                                        <span className="bg-[#2d2111] text-[#f2b938] text-[7px] font-black px-1.5 py-0.5 rounded-[4px] uppercase tracking-widest border border-[#5c441b] shrink-0">GLOBAL</span>
                                                    </div>
                                                    <span className="text-[9px] text-[#b4a4d6] leading-tight truncate">Unlock all premium features</span>
                                                </div>
                                                <div className="w-[20px] h-[20px] rounded-full bg-[#3f2673] border border-[#5c3c9c]/50 flex items-center justify-center shrink-0 shadow-sm">
                                                    <ChevronRight size={12} className="text-[#bba1f2]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {isExplorer && isSidebarCollapsed && (
                                    <button onClick={openPricingModal} className="w-10 h-10 mx-auto bg-gradient-to-br from-[#1a0b38] to-[#2b1654] rounded-xl flex items-center justify-center shadow-lg group mb-1">
                                        <Crown size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
                                    </button>
                                )}

                                {/* Chats / Community */}
                                <button
                                    onClick={() => handleNavClick('/community')}
                                    className={cn(
                                        "flex items-center h-10 transition-all group relative",
                                        isSidebarCollapsed ? "justify-center w-10 mx-auto rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" : "w-full px-3 justify-between hover:bg-white dark:hover:bg-slate-800/50 rounded-[10px]",
                                        location.pathname.startsWith('/community') && !isSidebarCollapsed ? "bg-white dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm" : "text-slate-500 dark:text-slate-400"
                                    )}
                                >
                                    <div className="flex items-center gap-3 relative">
                                        <MessageCircle size={18} className={cn(
                                            "transition-transform",
                                            location.pathname.startsWith('/community') ? "scale-105" : "group-hover:scale-110",
                                            location.pathname.startsWith('/community') ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
                                        )} strokeWidth={location.pathname.startsWith('/community') ? 2.5 : 2} />
                                        
                                        {/* Notification Badge */}
                                        {hasUnreadCommunityMessages && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className={cn("absolute bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_10px_rgba(244,63,94,0.4)]", isSidebarCollapsed ? "top-[-4px] right-[-4px] w-2.5 h-2.5" : "top-[-2px] left-[10px] w-2 h-2")}
                                            />
                                        )}

                                        {!isSidebarCollapsed && (
                                            <span className={cn(
                                                "text-[13px]",
                                                location.pathname.startsWith('/community') ? "" : "font-medium text-slate-600 dark:text-slate-300"
                                            )}>Chats</span>
                                        )}
                                    </div>
                                    
                                    {/* Active Indicator Left Strip */}
                                    {location.pathname.startsWith('/community') && (
                                        <motion.div
                                            layoutId="active-nav-indicator"
                                            className={cn(
                                                "absolute bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]",
                                                isSidebarCollapsed 
                                                    ? "left-[-8px] top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                                                    : "left-[-16px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                            )}
                                        />
                                    )}
                                </button>

                                {/* Settings */}
                                <button
                                    onClick={() => navigate('/settings')}
                                    className={cn(
                                        "flex items-center h-10 transition-all group",
                                        isSidebarCollapsed ? "justify-center w-10 mx-auto rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" : "w-full px-3 justify-between hover:bg-white dark:hover:bg-slate-800/50 rounded-[10px]"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Settings size={18} className="text-slate-400 group-hover:rotate-45 transition-transform duration-500" />
                                        {!isSidebarCollapsed && <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300">Settings</span>}
                                    </div>
                                    {!isSidebarCollapsed && <ChevronRight size={14} className="text-slate-300" />}
                                </button>

                                {/* Logout */}
                                <button
                                    onClick={handleSignOut}
                                    className={cn(
                                        "flex items-center h-10 transition-all group",
                                        isSidebarCollapsed ? "justify-center w-10 mx-auto rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10" : "w-full px-3 justify-between hover:bg-white dark:hover:bg-red-500/10 rounded-[10px]"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <LogOut size={18} className="text-red-400 group-hover:text-red-500 transition-colors duration-500" />
                                        {!isSidebarCollapsed && <span className="text-[13px] font-medium text-red-500">Sign Out</span>}
                                    </div>
                                </button>
                            </div>
                        </motion.nav>
                    )}

                    <div className={cn(
                        "flex-1 flex flex-col transition-all duration-300 ease-out min-w-0",
                        !isMobile && showHeader && !isAdminPath && !isEditMode && !location.pathname.startsWith('/community') 
                            ? (isSidebarCollapsed ? 'ml-[65px]' : 'ml-[252px]')
                            : '',
                        isLoading ? 'overflow-hidden h-full' : ''
                    )}>
                        {/* Global Announcement System (Banners & Popups) */}
                        {!isAdminPath && (
                            <Suspense fallback={null}>
                                <AnnouncementBar />
                            </Suspense>
                        )}


                        {variant === 'dashboard' && showHeader && !isAdminPath && !location.pathname.startsWith('/community') && (
                            <header className="sticky top-0 z-[101] w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300 flex flex-col">
                                {isLoading ? (
                                    <HeaderSkeleton />
                                ) : (
                                    <div className="container mx-auto px-6 h-[56px] flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Page Identifier / Breadcrumb feel */}
                                            <div className="hidden lg:flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                    {allNavItems.find(i => i.path === location.pathname)?.label || 'Protocol'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 xl:gap-5">
                                            {!isMobile && (
                                                <div className="hidden md:flex items-center gap-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                                        className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform w-9 h-9"
                                                    >
                                                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
                                                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-400" />
                                                        <span className="sr-only">Toggle theme</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => navigate('/download-app')}
                                                        className="hidden h-9 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm group"
                                                    >
                                                        <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Mobile App</span>
                                                    </Button>

                                                    {(profile?.role === 'admin' || profile?.role === 'sub_admin') && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => navigate('/admin')}
                                                            className="h-9 px-4 rounded-xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm flex items-center gap-2 group"
                                                        >
                                                            <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Admin Panel</span>
                                                        </Button>
                                                    )}

                                                    {activeExam?.id === 'cent-s-prep' && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setIsTrackerModalOpen(true)}
                                                            className="h-9 px-4 rounded-xl bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-all shadow-sm flex items-center gap-2 group"
                                                        >
                                                            <Radar className="w-4 h-4 text-orange-600 animate-pulse" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-700">Slot Tracker</span>
                                                        </Button>
                                                    )}

                                                    {(profile?.role === 'consultant' || profile?.is_consultant) && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => navigate('/consultant/dashboard')}
                                                            className="h-9 px-4 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all shadow-sm flex items-center gap-2 group"
                                                        >
                                                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Consultant Dashboard</span>
                                                        </Button>
                                                    )}

                                                    <DropdownMenu modal={false}>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" className="h-9 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
                                                                <Globe className="w-4 h-4 text-indigo-600" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">{activeExam?.id?.split('-')[0].toUpperCase()}</span>
                                                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-indigo-500/10 dark:border-indigo-500/20 shadow-2xl backdrop-blur-3xl bg-white/90 dark:bg-slate-900/90">
                                                            {Object.values(allExams)
                                                                .sort((a, b) => (a.isSoon === b.isSoon ? 0 : a.isSoon ? 1 : -1))
                                                                .map((exam) => (
                                                                    <DropdownMenuItem
                                                                        key={exam.id}
                                                                        disabled={exam.isSoon}
                                                                        onClick={() => !exam.isSoon && handleExamSwitch(exam)}
                                                                        className={`rounded-xl p-3 mb-1 cursor-pointer transition-all flex items-center justify-between group ${activeExam?.id === exam.id ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50'} ${exam.isSoon ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                                                                    >
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-black uppercase tracking-widest">{exam.name}</span>
                                                                            <span className="text-[8px] opacity-60 font-bold uppercase">{(exam as any).sections?.length || (exam as any).subjects?.length || 0} Modules</span>
                                                                        </div>
                                                                        {exam.isSoon && (
                                                                            <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full tracking-widest animate-pulse">SOON</span>
                                                                        )}
                                                                    </DropdownMenuItem>
                                                                ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}



                                            <div className="w-[1px] h-6 bg-slate-200/60 hidden md:block" />
                                            
                                            <Suspense fallback={null}>
                                                <FeedbackDialog 
                                                    trigger={
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="hidden lg:flex items-center gap-2 px-3 py-1.5 h-auto rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all group shadow-sm shadow-rose-500/5"
                                                        >
                                                            <Bug className="w-3.5 h-3.5 group-hover:animate-pulse" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Feedback / Bug</span>
                                                        </Button>
                                                    }
                                                />
                                            </Suspense>

                                            <Suspense fallback={<Loader2 className="w-4 h-4 animate-spin text-slate-400" />}>
                                                <NotificationDropdown />
                                            </Suspense>

                                            <div className="md:hidden">
                                                <DropdownMenu modal={false}>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="flex items-center gap-2.5 p-1 pr-4 rounded-full border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group overflow-hidden bg-white dark:bg-slate-900 shadow-sm ring-1 ring-transparent hover:ring-indigo-100 dark:hover:ring-indigo-900 relative">
                                                            <div className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform duration-300 overflow-hidden shadow-inner relative transition-all",
                                                                !isExplorer ? "ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-slate-900 bg-amber-50 dark:bg-amber-900/20" : "bg-slate-100 dark:bg-slate-800"
                                                            )}>
                                                                {profile?.avatar_url && !hasError ? (
                                                                    <img
                                                                        src={getOptimizedImageUrl(profile.avatar_url, 64, 64)}
                                                                        alt={displayName}
                                                                        className="w-full h-full object-cover"
                                                                        onError={() => setHasError(true)}
                                                                    />
                                                                ) : (
                                                                    <User className="w-4 h-4" />
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none flex items-center gap-2">
                                                                {displayName}
                                                                {!isExplorer && (
                                                                    <motion.span
                                                                        animate={{
                                                                            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                                                                        }}
                                                                        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                                                                        className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-[length:200%_auto] text-amber-950 px-2 py-0.5 rounded-full text-[8px] font-black border border-amber-300/50 shadow-[0_2px_8px_rgba(251,191,36,0.3)] uppercase tracking-tighter"
                                                                    >
                                                                        {plan}
                                                                    </motion.span>
                                                                )}
                                                            </span>
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" sideOffset={8} className="w-48 p-0 rounded-sm border border-slate-200 bg-white shadow-2xl text-slate-900 overflow-hidden">
                                                        <div className="flex flex-col py-2">
                                                            <DropdownMenuItem onClick={() => navigate('/billing')} className="px-4 py-2.5 text-[13px] font-semibold cursor-pointer hover:bg-slate-900 hover:text-white rounded-none border-none transition-colors">
                                                                Account / Billing
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => window.open('https://italostudy.com/contact', '_blank')} className="px-4 py-2.5 text-[13px] font-semibold cursor-pointer hover:bg-slate-900 hover:text-white rounded-none border-none transition-colors">
                                                                Help Center
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => navigate('/settings')} className="px-4 py-2.5 text-[13px] font-semibold cursor-pointer hover:bg-slate-900 hover:text-white rounded-none border-none transition-colors">
                                                                Settings
                                                            </DropdownMenuItem>
                                                        </div>
                                                        <div className="h-px w-full bg-slate-100" />
                                                        <div className="py-2">
                                                            <DropdownMenuItem onClick={handleSignOut} className="px-4 py-3 text-[13px] font-bold cursor-pointer hover:bg-slate-900 hover:text-white rounded-none border-none justify-center text-center transition-colors">
                                                                Sign out of Italostudy
                                                            </DropdownMenuItem>
                                                        </div>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <button
                                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                                className="lg:hidden p-3 rounded-xl hover:bg-slate-50 transition-colors"
                                            >
                                                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </header>
                        )}
                        <main className={`flex-1 w-full relative ${
                            location.pathname.startsWith('/community') ? 'flex flex-col min-h-0 overflow-hidden' :
                            isLoading ? 'overflow-y-auto overflow-x-hidden' : ''
                        }`}>
                            <Suspense fallback={
                                <div className={cn(
                                    "w-full",
                                    !['/', '/dashboard', '/mobile/dashboard'].includes(location.pathname) && "p-4 md:p-8"
                                )}>
                                    {getSkeletonForPath(location.pathname)}
                                </div>
                            }>
                                {isLoading ? (
                                    <div className={cn(
                                        "w-full",
                                        !['/', '/dashboard', '/mobile/dashboard'].includes(location.pathname) && "p-4 md:p-8"
                                    )}>
                                        {getSkeletonForPath(location.pathname)}
                                    </div>
                                ) : (
                                    children
                                )}
                            </Suspense>
                        </main>
                    </div>
                    <Suspense fallback={null}>
                        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
                    </Suspense>

                    <Suspense fallback={null}>
                        <PremiumSuccessAnimation
                            show={showPremiumAnimation}
                            onComplete={() => setShowPremiumAnimation(false)}
                        />
                    </Suspense>

                    <Suspense fallback={null}>
                        <SeatTrackerModal 
                            isOpen={isTrackerModalOpen} 
                            onClose={() => setIsTrackerModalOpen(false)} 
                            isGlobal={isGlobal || isElite} 
                            isExpired={isSubscriptionExpired}
                        />
                    </Suspense>

                    {/* Simple Mobile Web Navigation */}
                    {isMobileMenuOpen && (
                        <div className="lg:hidden fixed inset-0 z-[60] bg-white dark:bg-slate-950 p-6 animate-in slide-in-from-right duration-300 overflow-y-auto">
                            <div className="flex items-center justify-between mb-8">
                                <img src="/logo.webp" alt="logo" className="h-8 w-auto" />
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2"><X className="w-6 h-6" /></button>
                            </div>
                            <div className="flex flex-col gap-4">
                                {allNavItems.map((item) => (
                                    <button
                                        key={item.path}
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            handleNavClick(item.path);
                                        }}
                                        className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-between w-full"
                                    >
                                        <div className="flex items-center gap-4">
                                            <item.icon className="w-5 h-5 text-indigo-600" />
                                            <span className="font-black text-xs uppercase tracking-widest leading-none">{item.label}</span>
                                        </div>
                                        {(item as any).isSoon && (
                                            <span className="bg-indigo-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full tracking-widest">SOON</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Global Support Widget - Hidden on Admin and Community routes */}
                    {!isAdminPath && !location.pathname.startsWith('/community') && (
                        <Suspense fallback={null}>
                            <SupportWidget />
                        </Suspense>
                    )}
                </div>
            )}
        </LayoutContext.Provider>
    );
}