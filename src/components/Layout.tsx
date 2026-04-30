import { ReactNode, Suspense, lazy } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
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
    Radar
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
// Heavy modules lazy-loaded
const NotificationDropdown = lazy(() => import('./NotificationDropdown'));
import { useState, useEffect, useCallback } from 'react';
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
import { useVisitorTracking } from '@/hooks/useVisitorTracking';
import { usePlanAccess } from '@/hooks/usePlanAccess';
const PremiumSuccessAnimation = lazy(() => import('./PremiumSuccessAnimation').then(m => ({ default: m.PremiumSuccessAnimation })));
import { useToast } from '@/hooks/use-toast';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
import { useLiveEdit } from '@/contexts/LiveEditContext';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { MaintenanceOverlay } from './MaintenanceOverlay';
import Footer from './Footer';

const AnnouncementBar = lazy(() => import('./AnnouncementBar'));
const SeatTrackerModal = lazy(() => import('./SeatTrackerModal').then(m => ({ default: m.SeatTrackerModal })));
import { SidebarSkeleton, HeaderSkeleton, MobileHeaderSkeleton, MobileBottomBarSkeleton } from './SkeletonLoader';
import { getSkeletonForPath } from '@/lib/skeletons';

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
    const [isSidebarHovered, setIsSidebarHovered] = useState(false);
    const { shouldBlockAccess, isExplorer, plan, isSubscriptionExpired } = usePlanAccess();
    const { openPricingModal } = usePricing();
    const [showPremiumAnimation, setShowPremiumAnimation] = useState(false);
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const [hasError, setHasError] = useState(false);
    const { isPageEnabled, getMaintenanceMessage } = usePageVisibility();
    const [isBypassed, setIsBypassed] = useState(false);

    // Global Visitor Analytics & IP Tracking
    useVisitorTracking();

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
        if (path.startsWith('http') || path === '/store' || path === '/blog' || path === '/resources' || path === '/syllabus') {
            let url = path;
            if (path === '/store') url = 'https://store.italostudy.com';
            else if (path === '/blog') url = 'https://italostudy.com/blog';
            else if (path === '/resources') url = 'https://italostudy.com/resources';
            else if (path === '/syllabus') url = 'https://italostudy.com/syllabus';
            
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
    const [enableCommunity, setEnableCommunity] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'enable_community')
                .maybeSingle();
            if (data) setEnableCommunity(data.value as boolean);
        };
        fetchSettings();

        const channel = supabase
            .channel('layout-community-check')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, fetchSettings)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchGlobalUnread();

        // Listen for subscription upgrades to show animation
        const profileSub = supabase
            .channel('profile-upsell-check')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${user.id}`
            }, (payload) => {
                const oldPlan = payload.old?.selected_plan || 'explorer';
                const newPlan = payload.new?.selected_plan;
                if (oldPlan === 'explorer' && newPlan !== 'explorer') {
                    setShowPremiumAnimation(true);
                }
            })
            .subscribe();

        const messageSub = supabase
            .channel('global-chat-notifications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages' }, () => fetchGlobalUnread())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'community_read_status', filter: `user_id=eq.${user.id}` }, () => fetchGlobalUnread())
            .subscribe();

        // Listen for premium upgrade success event (from payment completion)
        const handlePremiumUpgrade = () => {
            setShowPremiumAnimation(true);
        };
        window.addEventListener('premium-upgrade-success', handlePremiumUpgrade);

        return () => {
            supabase.removeChannel(messageSub);
            supabase.removeChannel(profileSub);
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


    const navItems = [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'Subjects', path: '/subjects', icon: Book },
        { label: 'Practice', path: '/practice', icon: Pencil },
        { label: 'Learning', path: '/learning', icon: Play, isSoon: true },
        { label: 'Community', path: '/community', icon: MessageCircle },
        { label: 'Store', path: '/store', icon: ShoppingBag },
        { label: 'Mock Exams', path: '/mock-exams', icon: Globe },
        { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    ];

    const displayName = profile?.display_name || profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Student';

    // MOBILE APP RENDER
    if (isMobile) {
        const isCommunity = location.pathname.startsWith('/community');
        return (
            <div className={cn(
                "flex flex-col bg-background font-sans overflow-x-hidden",
                isCommunity ? "h-screen overflow-hidden" : "min-h-screen"
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
        );
    }



    // DESKTOP RENDER
    const isCommunity = location.pathname.startsWith('/community');
    return (
        <div className={cn(
            "bg-slate-50 dark:bg-slate-950 transition-colors duration-500 flex font-sans selection:bg-indigo-100 selection:text-indigo-900 relative",
            (isCommunity || isLoading) ? "h-screen overflow-hidden" : "min-h-screen"
        )}>

            {/* Sidebar logic stays at the top level of the horizontal flex container */}

            {/* Disney+ Style Sidebar */}
            {variant === 'dashboard' && showHeader && !isMobile && !isAdminPath && !isEditMode && !location.pathname.startsWith('/community') && (
                <motion.nav
                    initial={false}
                    animate={{ width: isSidebarHovered ? 210 : 72 }}
                    onMouseEnter={() => setIsSidebarHovered(true)}
                    onMouseLeave={() => setIsSidebarHovered(false)}
                    className="fixed left-0 top-0 bottom-0 z-[120] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 shadow-[8px_0_32px_rgba(0,0,0,0.06)] flex flex-col items-center py-6 group transition-colors duration-500"
                    transition={{ type: "tween", ease: "circOut", duration: 0.15 }}
                >
                    {/* Sidebar Logo */}
                    <Link to="/" className="mb-10 shrink-0 px-4 w-full h-12 flex items-center justify-center relative">
                        <AnimatePresence mode="wait" initial={false}>
                            {isSidebarHovered ? (
                                <motion.img
                                    key="full-logo"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.1 }}
                                    src={theme === 'dark' ? "/logo-dark-full.webp" : "/logo.webp"}
                                    alt="logo"
                                    loading="eager"
                                    className="h-10 w-full object-contain"
                                />
                            ) : (
                                <motion.div
                                    key="collapsed-logo"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.1 }}
                                    className="w-12 h-12 flex items-center justify-center"
                                >
                                    <img 
                                        src={theme === 'dark' ? "/logo-dark-compact.webp" : "/sidebar-logo.webp"} 
                                        alt="logo" 
                                        loading="eager"
                                        className="w-12 h-12 object-contain" 
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Link>

                    {isLoading ? (
                        <SidebarSkeleton />
                    ) : (
                        <>
                            {/* Nav Items */}
                            <div className="flex-1 w-full space-y-1 px-3">
                                {navItems.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <button
                                            key={item.path}
                                            onClick={() => handleNavClick(item.path)}
                                            className={`relative flex items-center w-full h-12 rounded-xl transition-all duration-300 group ${isActive
                                                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100/50 dark:border-indigo-500/20'
                                                : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <div className="min-w-[48px] h-12 flex items-center justify-center shrink-0 relative">
                                                <item.icon className={cn(
                                                    "w-[18px] h-[18px] transition-all duration-300",
                                                    isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(79,70,229,0.3)]' : 'group-hover:scale-110',
                                                    !isActive && plan === 'global' ? 'text-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : ''
                                                )} />

                                                {/* Notification Badge for Community */}
                                                {item.label === 'Community' && hasUnreadCommunityMessages && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                                                    />
                                                )}
                                            </div>
                                            <AnimatePresence mode="wait">
                                                {isSidebarHovered && (
                                                    <motion.span
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -10 }}
                                                        transition={{ duration: 0.1 }}
                                                        className={`text-[10px] font-black uppercase tracking-[0.05em] whitespace-nowrap overflow-hidden origin-left ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}
                                                    >
                                                        {item.label}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>

                                            {/* Active Indicator Strip */}
                                            {isActive && (
                                                <motion.div
                                                    layoutId="active-indicator"
                                                    className="absolute left-0 w-1 h-6 bg-indigo-600 rounded-r-full shadow-[0_0_10px_rgba(79,70,229,0.4)]"
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Bottom Utility */}
                            <div className="mt-auto w-full px-3">
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="w-full flex items-center h-12 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all group"
                                >
                                    <div className="min-w-[48px] h-12 flex items-center justify-center shrink-0">
                                        <Settings className={cn(
                                            "w-[18px] h-[18px] group-hover:rotate-45 transition-transform duration-500",
                                            plan === 'global' ? 'text-amber-500/80' : ''
                                        )} />
                                    </div>
                                    {isSidebarHovered && (
                                        <span className="text-[10px] font-black uppercase tracking-[0.05em]">Settings</span>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </motion.nav>
            )}

            <div className={cn(
                "flex-1 w-full flex flex-col transition-all duration-300 ease-out",
                !isMobile && showHeader && !isAdminPath && !isEditMode && !location.pathname.startsWith('/community') 
                    ? 'ml-[72px]' 
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
                                            {navItems.find(i => i.path === location.pathname)?.label || 'Protocol'}
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

                                            <DropdownMenu>
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

                                    {isExplorer && (
                                        <Button
                                            onClick={() => openPricingModal()}
                                            variant="default"
                                            className="h-10 rounded-full px-5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-black uppercase text-[10px] tracking-widest transition-all group active:scale-95 shadow-md border-0"
                                        >
                                            <Crown className="w-3.5 h-3.5 mr-2 text-white group-hover:rotate-12 transition-transform" />
                                            {isSubscriptionExpired ? 'Renew Premium' : 'Explore Premium'}
                                        </Button>
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

                                    <DropdownMenu>
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
                    isGlobal={profile?.selected_plan === 'global'} 
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
                        {navItems.map((item) => (
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
                                {item.isSoon && (
                                    <span className="bg-indigo-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full tracking-widest">SOON</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}