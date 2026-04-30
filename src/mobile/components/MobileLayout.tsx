
import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, BarChart3, Settings, Menu, Bell, Search, Play, Users, MessageCircle, Sun, Moon, Crown, ArrowRight, Bug, Target } from 'lucide-react';
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

interface NavButtonProps {
  to: string;
  icon: React.ReactNode;
  badge?: boolean;
  isSoon?: boolean;
  onClick?: () => void;
}

const NavButton: React.FC<NavButtonProps & { isGlobal?: boolean }> = ({ to, icon, badge, isGlobal, isSoon, onClick }) => {
  const location = useLocation();
  const { theme } = useTheme();

  // Use a more predictable matching logic
  const currentPath = location.pathname;
  const isActive = currentPath === to ||
    (to !== '/mobile/dashboard' && to !== '/' && currentPath.startsWith(to + '/')) ||
    (to === '/mobile/practice' && currentPath.startsWith('/mobile/practice')) ||
    (to === '/mobile/mock-exams' && currentPath.startsWith('/mobile/mock-exams'));

  if (isSoon) {
    return (
      <button
        onClick={onClick}
        className="flex-1 flex flex-col items-center justify-center h-full relative"
      >
        <div className="flex items-center justify-center w-full h-full relative">
          <motion.div
            className={cn(
              "relative p-3.5 rounded-2xl transition-all duration-300 z-10 text-muted-foreground"
            )}
          >
            {React.cloneElement(icon as React.ReactElement, { size: 24 })}
            <div className="absolute -top-1 -right-1 bg-indigo-600 text-[6px] font-black px-1 py-0.5 rounded-full text-white tracking-widest uppercase shadow-sm">SOON</div>
          </motion.div>
        </div>
      </button>
    );
  }

  return (
    <NavLink
      to={to}
      className="flex-1 flex flex-col items-center justify-center h-full relative"
    >
      <div className="flex items-center justify-center w-full h-full relative">
        <motion.div
          animate={{
            y: isActive ? -4 : 0,
            scale: isActive ? 1.2 : 1,
            color: isActive ? "#ffffff" : (theme === 'dark' ? "#94a3b8" : "#64748b")
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={cn(
            "relative p-3.5 rounded-2xl transition-all duration-300 z-10",
            isActive
              ? (isGlobal
                ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/40 ring-1 ring-amber-300/50"
                : "bg-primary text-white shadow-lg shadow-primary/30")
              : "text-slate-400 dark:text-slate-500"
          )}
          style={{ willChange: "transform" }}
        >
          {React.cloneElement(icon as React.ReactElement, { size: 24 })}
          {badge && (
            <div className="absolute top-2 right-2 w-3 h-3 bg-rose-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-pulse z-20" />
          )}
        </motion.div>
      </div>
    </NavLink>
  );
};

interface MobileLayoutProps {
  children?: React.ReactNode;
  isLoading?: boolean;
  hideHeader?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, isLoading, hideHeader = false }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNative, setIsNative] = useState<boolean | null>(null);
  const [hasUnreadCommunity, setHasUnreadCommunity] = useState(false);
  const [hasUnreadAnnouncement, setHasUnreadAnnouncement] = useState(false);
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
    return 'ITALOSTUDY';
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'sub_admin';

  // Global Page Visibility Enforcement (for public/unprotected routes)
  const isProtectedPath = ['/mobile/dashboard', '/mobile/community', '/mobile/subjects', '/mobile/practice', '/mobile/mock-exams', '/mobile/analytics', '/mobile/history', '/mobile/settings', '/mobile/learning'].some(p => location.pathname.startsWith(p));
  
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
              <Menu className="w-6 h-6" />
            </Button>
            <div className="flex flex-col">
              <h1 className="text-sm font-black tracking-tight uppercase leading-none truncate max-w-[120px] sm:max-w-[200px]">
                {getPageTitle(location.pathname)}
              </h1>
              <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mt-1 opacity-60">Student Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
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
      <main className={cn("flex-1 overflow-y-auto pb-32 safe-area-bottom relative", !isStorePage && !hideHeader && "h-[calc(100vh-140px)]")}>
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

      {/* Premium Floating Bottom Dock */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom,16px))] z-50 pointer-events-none">
        <nav className="max-w-md mx-auto h-[68px] bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border border-white/20 dark:border-slate-800/50 rounded-[2rem] flex items-center justify-around px-2 shadow-[0_20px_50px_rgba(0,0,0,0.3)] pointer-events-auto relative overflow-visible">
          <NavButton to="/mobile/practice" icon={<ClipboardList />} isGlobal={isGlobal} />
          <NavButton to="/mobile/mock-exams" icon={<Target />} isGlobal={isGlobal} />
          
          {/* Center Home Button - Elevated */}
          <div className="relative -top-3">
             <NavLink
               to="/mobile/dashboard"
               className={cn(
                 "flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500 shadow-xl",
                 location.pathname === '/mobile/dashboard'
                  ? "bg-primary text-white scale-110 shadow-primary/40 -translate-y-1" 
                  : "bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800"
               )}
             >
               <Home size={26} strokeWidth={2.5} />
             </NavLink>
          </div>

          <NavButton to="/mobile/learning" icon={<Play />} isGlobal={isGlobal} />
          <NavButton
            to="/mobile/community"
            icon={<MessageCircle />}
            badge={hasUnreadCommunity}
            isGlobal={isGlobal}
          />
        </nav>
      </div>

      <PremiumSuccessAnimation show={showPremiumAnimation} onComplete={() => setShowPremiumAnimation(false)} />
    </div>
  );
};

export default MobileLayout;
