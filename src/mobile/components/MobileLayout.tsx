
import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, BarChart3, Settings, Menu, Bell, Search, Play, Users, MessageCircle, Sun, Moon, Crown, ArrowRight, Bug, Target, Radar, X, Store } from 'lucide-react';
import MobileSidebar from './MobileSidebar';
import { Button } from '@/components/ui/button';
import LatestNotificationPopup from '@/components/LatestNotificationPopup';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

import { usePlanAccess } from '@/hooks/usePlanAccess';
import { usePricing } from '@/context/PricingContext';
import { motion, AnimatePresence } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { MaintenanceOverlay } from '@/components/MaintenanceOverlay';
import { MobileHeaderSkeleton, MobileBottomBarSkeleton } from '@/components/SkeletonLoader';
import { getSkeletonForPath } from '@/lib/skeletons';

const AnnouncementBar = lazy(() => import('@/components/AnnouncementBar'));
const PremiumSuccessAnimation = lazy(() => import('@/components/PremiumSuccessAnimation').then(module => ({ default: module.PremiumSuccessAnimation })));
const FeedbackDialog = lazy(() => import('@/components/FeedbackDialog').then(m => ({ default: m.FeedbackDialog })));
const SeatTrackerModal = lazy(() => import('@/components/SeatTrackerModal').then(m => ({ default: m.SeatTrackerModal })));
const SupportWidget = lazy(() => import('@/components/SupportWidget'));
const tabs = [
  { id: 'courses', path: '/courses', icon: Play, label: 'Courses' },
  { id: 'chat', path: '/mobile/community', icon: MessageCircle, label: 'Chat' },
  { id: 'home', path: '/mobile/dashboard', icon: Home, label: 'Home' },
  { id: 'store', path: 'https://store.italostudy.com', icon: Store, label: 'Store', isExternal: true },
  { id: 'analytics', path: '/mobile/analytics', icon: BarChart3, label: 'Analytics' }
];

interface MobileLayoutProps {
  children?: React.ReactNode;
  isLoading?: boolean;
  hideHeader?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, isLoading, hideHeader = false }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNative, setIsNative] = useState<boolean | null>(null);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const lastScrollY = React.useRef(0);
  const [hasUnreadCommunity, setHasUnreadCommunity] = useState(false);
  const [hasUnreadAnnouncement, setHasUnreadAnnouncement] = useState(false);
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  const { user, profile } = useAuth() as any;
  const { activeExam } = useExam();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [showPremiumAnimation, setShowPremiumAnimation] = useState(false);
  const { isExplorer, isSubscriptionExpired } = usePlanAccess();
  const { toast } = useToast();
  const { isPageEnabled, getMaintenanceMessage } = usePageVisibility();
  const [isBypassed, setIsBypassed] = useState(false);
  const { openPricingModal } = usePricing();

  const isGlobal = profile?.selected_plan === 'global';

  const currentPath = location.pathname;
  const activeIndex = tabs.findIndex(t => currentPath.startsWith(t.path));
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 2;

  useEffect(() => {
    if (!user || !activeExam) return;

    const checkUnreadAnnouncements = async () => {
      try {
        // Fetch only active notification IDs for this exam
        const { data: activeNotifs } = await (supabase as any)
          .from('site_notifications')
          .select('id')
          .eq('is_active', true)
          .or(`exam_type.is.null,exam_type.eq.,exam_type.eq.${activeExam?.id}`);

        if (!activeNotifs || activeNotifs.length === 0) {
          setHasUnreadAnnouncement(false);
          return;
        }

        const activeIds = activeNotifs.map(n => n.id);

        // Check which of these have been read by the user
        const { data: readNotifs } = await supabase
          .from('user_notifications_read')
          .select('notification_id')
          .eq('user_id', user.id)
          .in('notification_id', activeIds);

        const readIds = new Set((readNotifs as any)?.map((n: any) => n.notification_id) || []);
        setHasUnreadAnnouncement(activeIds.length > readIds.size);
      } catch (err) {
        console.error('Error checking unread announcements:', err);
      }
    };

    checkUnreadAnnouncements();

    const notifChannel = supabase
      .channel('announcement_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_notifications' }, () => checkUnreadAnnouncements())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications_read', filter: `user_id=eq.${user.id}` }, () => checkUnreadAnnouncements())
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [user, activeExam?.id]);

  const checkGlobalUnread = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.rpc('has_unread_messages', { p_user_id: user.id });
      setHasUnreadCommunity(!!data);
    } catch (err) {
      console.error('Error fetching mobile global unread:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      checkGlobalUnread();
    }
  }, [user, location.pathname, checkGlobalUnread]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('mobile-global-chat-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages' }, () => checkGlobalUnread())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_read_status', filter: `user_id=eq.${user.id}` }, () => checkGlobalUnread())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, checkGlobalUnread]);

  // Listen for subscription upgrades to show animation
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('mobile-premium-check')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        const oldPlan = payload.old?.selected_plan || 'explorer';
        const newPlan = payload.new?.selected_plan;

        // Only trigger if plan actually CHANGED from explorer to something else
        if (oldPlan === 'explorer' && newPlan !== 'explorer') {
          setShowPremiumAnimation(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const checkPlatform = async () => {
      try {
        const { Device } = await import('@capacitor/device');
        const info = await Device.getInfo();
        setIsNative(info.platform === 'android' || info.platform === 'ios');
      } catch (e) {
        setIsNative(false);
      }
    };
    checkPlatform();
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // MOBILE SCROLL RECOVERY
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Standardized Scroll Recovery:
    // Ensures that if a modal or sidebar crashes/unmounts improperly, 
    // the user isn't stuck with a locked screen.
    const recover = () => {
      const hasOpenDialog = !!document.querySelector('[role="dialog"], [data-state="open"], .radix-scroll-lock');
      if (!hasOpenDialog && !isSidebarOpen) {
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
        document.documentElement.style.overflow = '';
      }
    };

    recover();
    window.addEventListener('resize', recover);
    return () => window.removeEventListener('resize', recover);
  }, [isSidebarOpen, location.pathname]);

  // Map path to title
  const getPageTitle = (path: string) => {
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('practice')) return 'Practice';
    if (path.includes('analytics')) return 'Analytics';
    if (path.includes('settings')) return 'Settings';
    if (path.includes('history')) return 'History';
    if (path.includes('learning')) return 'Study Portal';
    if (path.includes('labs')) return 'Virtual Labs';
    if (path.includes('community')) return 'Community';
    if (path.includes('mock-exams')) return 'Mock Exams';
    if (path.includes('store/orders')) return 'My Orders';
    if (path.includes('store/products')) return 'All Products';
    if (path.includes('store')) return 'Italostudy Store';
    if (path.includes('/courses') && path.includes('/subject/') && path.includes('/chapter/')) return 'Chapter';
    if (path.includes('/courses') && path.includes('/subject/')) return 'Subject';
    if (path.match(/\/courses\/[^/]+$/)) return 'Course';
    if (path.includes('/courses')) return 'Courses';
    if (path.includes('course-payment')) return 'Enrollment';
    return 'ITALOSTUDY';
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'sub_admin';

  // Global Page Visibility Enforcement (for public/unprotected routes)
  const isProtectedPath = [
    '/mobile/dashboard', '/mobile/community', '/mobile/subjects',
    '/mobile/practice', '/mobile/mock-exams', '/mobile/analytics',
    '/mobile/history', '/mobile/settings', '/mobile/learning',
    '/courses', '/course-payment',
  ].some(p => location.pathname.startsWith(p));
  
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

  const isStorePage = location.pathname.includes('/store');

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 z-[60] bg-background">
          <MobileHeaderSkeleton />
          <div className="flex-1 overflow-hidden p-6">
            {getSkeletonForPath(location.pathname)}
          </div>
          <MobileBottomBarSkeleton />
        </div>
      )}

      <Suspense fallback={null}>
        <AnnouncementBar />
      </Suspense>

      {/* Persistent Native Header */}
      {!isStorePage && !hideHeader && (
        <header className="pt-[env(safe-area-inset-top,20px)] h-auto flex flex-col justify-center px-4 bg-background/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-40 shrink-0">
          <div className="h-16 flex items-center justify-between w-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-full hover:bg-secondary active:scale-90 transition-transform h-10 w-10"
            >
              <Menu className="w-6 h-6" strokeWidth={3} />
            </Button>
              <div className="flex items-center ml-1">
                <img 
                  src={theme === 'dark' ? "/logo-dark-compact.webp" : "/sidebar-logo.webp"} 
                  alt="logo" 
                  loading="eager"
                  className="w-[52px] h-[52px] object-contain drop-shadow-sm" 
                />
              </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* CEnT-S Slot Tracker button — only for cent-s-prep exam */}
            {activeExam?.id === 'cent-s-prep' && (
              <button
                onClick={() => setIsTrackerModalOpen(true)}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 active:scale-95 transition-all shadow-sm"
              >
                <Radar className="h-4 w-4 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Slots</span>
              </button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full hover:bg-secondary active:scale-95 transition-transform h-10 w-10"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            <Suspense fallback={null}>
              <FeedbackDialog 
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600 active:scale-95 transition-all h-10 w-10 border border-rose-100 dark:border-rose-900/50 shadow-sm shadow-rose-500/10"
                  >
                    <Bug className="h-5 w-5" />
                    <span className="sr-only">Feedback / Bug</span>
                  </Button>
                }
              />
            </Suspense>

            {(profile?.role !== 'sub_admin' || (profile?.role === 'sub_admin' && (useAuth() as any).allowedTabs?.includes('notifications'))) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/mobile/notifications')}
                className="relative rounded-full hover:bg-secondary active:scale-95 transition-transform h-10 w-10"
              >
                <Bell className="w-5 h-5" />
                {hasUnreadAnnouncement && (
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-background animate-pulse" />
                )}
              </Button>
            )}
            <LatestNotificationPopup />
          </div>
        </div>
      </header>
      )}

      {/* Main Content Area */}
      <main 
        className={cn("flex-1 overflow-y-auto pb-32 safe-area-bottom relative", !isStorePage && !hideHeader && "h-[calc(100vh-140px)]")}
        onScroll={(e) => {
          const currentScrollY = e.currentTarget.scrollTop;
          if (currentScrollY > lastScrollY.current + 15) {
            setIsScrolledDown(true);
          } else if (currentScrollY < lastScrollY.current - 15 || currentScrollY < 10) {
            setIsScrolledDown(false);
          }
          lastScrollY.current = currentScrollY;
        }}
      >
        {isExplorer && !isStorePage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer shadow-md"
            onClick={openPricingModal}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-wider text-white leading-tight">
                  {isSubscriptionExpired ? 'Renew Premium' : 'Explore Premium'}
                </span>
                <span className="text-[8px] font-bold text-white/70 uppercase tracking-widest mt-0.5">
                  TAP TO UNLOCK EVERYTHING
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-white opacity-60 group-active:translate-x-1 transition-transform" />
          </motion.div>
        )}
        {children || <Outlet />}
      </main>

      <MobileSidebar isOpen={isSidebarOpen} onOpenChange={setIsSidebarOpen} />

      {/* CEnT-S Slot Tracker Modal */}
      <Suspense fallback={null}>
        <SeatTrackerModal
          isOpen={isTrackerModalOpen}
          onClose={() => setIsTrackerModalOpen(false)}
          isGlobal={profile?.selected_plan === 'global'}
        />
      </Suspense>

      {/* Exact Sliding Pop-Out Dock */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,12px))] z-[45] pointer-events-none">
        <motion.nav 
          animate={{ height: isScrolledDown ? 56 : 72 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="max-w-[380px] mx-auto w-[92%] relative flex items-end pointer-events-auto"
        >
          {/* Glassmorphic Dock Background */}
          <div className="absolute inset-0 w-full h-full rounded-[34px] bg-[#ebe0ff]/90 dark:bg-[#31225c]/70 backdrop-blur-2xl shadow-[0_20px_50px_rgba(110,50,220,0.25)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.6)] border-[1.5px] border-[#d4bfff] dark:border-[1px] dark:border-[#5f4994]/40 overflow-hidden" />

          {/* Sliding Orb and Dots */}
          <motion.div
            className="absolute w-[20%] h-[90px] pointer-events-none z-20 flex flex-col items-center"
            initial={false}
            animate={{ 
              left: `${safeActiveIndex * 20}%`,
              top: isScrolledDown ? -10 : -18 
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <motion.div 
              animate={{ scale: isScrolledDown ? 0.9 : 1 }}
              className="relative flex items-center justify-center w-[52px] h-[52px] rounded-full bg-white/5 backdrop-blur-md border-[1.5px] border-white/20 shadow-[0_0_30px_rgba(255,77,141,0.7)] group-active:scale-95 transition-transform duration-300"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent opacity-50" />
              <div className="absolute inset-[4px] rounded-full bg-gradient-to-b from-[#ff6b9d] to-[#8a3ffc] shadow-[inset_0_0_10px_rgba(255,255,255,0.4)]" />
              
              {(() => {
                const ActiveIcon = tabs[safeActiveIndex].icon;
                return <ActiveIcon size={24} className="text-white relative z-10 drop-shadow-md" fill={safeActiveIndex === 2 ? "currentColor" : "none"} strokeWidth={safeActiveIndex === 2 ? 1 : 2} />;
              })()}
            </motion.div>
            
            {/* 4 dots at the bottom */}
            <motion.div 
              animate={{ opacity: isScrolledDown ? 0 : 1, y: isScrolledDown ? 10 : 0 }}
              className="absolute bottom-[8px] flex gap-1"
            >
              <div className="w-[3px] h-[3px] rounded-full bg-[#ff4d8d] shadow-[0_0_4px_#ff4d8d]"></div>
              <div className="w-[3px] h-[3px] rounded-full bg-white/30"></div>
              <div className="w-[3px] h-[3px] rounded-full bg-white/30"></div>
              <div className="w-[3px] h-[3px] rounded-full bg-white/30"></div>
            </motion.div>
          </motion.div>

          {/* Nav Items */}
          <div className="flex w-full h-full justify-between items-end relative z-10">
            {tabs.map((tab, idx) => {
              const isActive = safeActiveIndex === idx;
              
              const innerContent = (
                  <>
                  <motion.div 
                    animate={{ top: isScrolledDown ? 18 : 16 }}
                    className={cn(
                      "absolute transition-all duration-300 flex flex-col items-center",
                      isActive ? "opacity-0 translate-y-4" : "opacity-100 text-[#73639e] hover:text-[#2d1b54] dark:text-[#a08dc7] dark:hover:text-white/90"
                    )}
                  >
                    <tab.icon size={22} strokeWidth={1.5} />
                  </motion.div>
                  <span className={cn(
                    "absolute bottom-[16px] text-[9px] font-bold tracking-widest transition-all duration-300 whitespace-nowrap",
                    isActive ? "text-[#2d1b54] dark:text-white opacity-100" : "text-[#73639e] dark:text-[#a08dc7] opacity-100",
                    isScrolledDown ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100"
                  )}>
                    {tab.label}
                  </span>
                  </>
              );

              if (tab.isExternal) {
                return (
                  <a key={tab.id} href={tab.path} className="flex-1 flex flex-col items-center h-full relative">
                    {innerContent}
                  </a>
                );
              }

              return (
                <NavLink key={tab.id} to={tab.path} className="flex-1 flex flex-col items-center h-full relative">
                  {innerContent}
                </NavLink>
              );
            })}
          </div>
        </motion.nav>
      </div>

      <Suspense fallback={null}>
        <SupportWidget />
      </Suspense>

      <PremiumSuccessAnimation show={showPremiumAnimation} onComplete={() => setShowPremiumAnimation(false)} />
    </div>
  );
};

export default MobileLayout;
