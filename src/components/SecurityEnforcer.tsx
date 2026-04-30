import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
    Shield, 
    BookOpen, 
    HeadphonesIcon, 
    Settings2, 
    Sparkles, 
    AlertTriangle, 
    Clock, 
    CheckCircle2 
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { isPublicRoute } from '@/lib/routes';

export default function SecurityEnforcer() {
    const location = useLocation();
    const { profile, loading: authLoading } = useAuth();
    const [isMaintenance, setIsMaintenance] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [showWarning, setShowWarning] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastStatus = useRef<boolean | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkMaintenance = async (payload?: any) => {
            let maintenanceActive = false;

            if (payload) {
                maintenanceActive = payload.new.value === true;
            } else {
                const { data } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'maintenance_mode')
                    .maybeSingle();
                maintenanceActive = data?.value === true;
            }

            const isAdmin = profile?.role === 'admin' || profile?.role === 'sub_admin';

            // Handle transition false -> true
            if (lastStatus.current === false && maintenanceActive && !isAdmin) {
                // Start a 30 second warning
                setCountdown(30);
                setShowWarning(true);

                if (timerRef.current) clearInterval(timerRef.current);
                timerRef.current = setInterval(() => {
                    if (!isMounted.current) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        return null;
                    }
                    setCountdown(prev => {
                        if (prev !== null && prev <= 1) {
                            if (timerRef.current) clearInterval(timerRef.current);
                            setIsMaintenance(true);
                            setShowWarning(false);
                            return null;
                        }
                        return prev !== null ? prev - 1 : null;
                    });
                }, 1000);
            }
            // Handle initial load or already active
            else if (lastStatus.current === null && maintenanceActive && !isAdmin) {
                setIsMaintenance(true);
            }
            // Handle turning OFF OR user is Admin
            else if (!maintenanceActive || isAdmin) {
                if (timerRef.current) clearInterval(timerRef.current);
                setCountdown(null);
                setShowWarning(false);
                setIsMaintenance(false);
            }

            lastStatus.current = maintenanceActive;
            setIsInitialized(true);
        };

        checkMaintenance();

        // Subscription for real-time maintenance toggle
        const channel = supabase
            .channel('maintenance_check')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'system_settings',
                filter: 'key=eq.maintenance_mode'
            }, (payload) => checkMaintenance(payload))
            .subscribe();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            supabase.removeChannel(channel);
        };
    }, [profile?.role]);

    useEffect(() => {
        // WHITELIST CHECK (Routes that NEVER get blocked or security enforced)
        const isWhitelisted =
            location.pathname.startsWith('/admin') ||
            location.pathname.startsWith('/store-admin') ||
            location.pathname.startsWith('/consultant') ||
            isPublicRoute(location.pathname);

        if (isWhitelisted) return;

        const handleContextMenu = (e: MouseEvent) => {
            // Disable right click unless on dev/admin or specifically allowed
            if (profile?.role !== 'admin') {
                e.preventDefault();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (profile?.role === 'admin') return;

            // Disable F12
            if (e.key === 'F12') {
                e.preventDefault();
                return;
            }

            // Disable Inspect keys
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
                e.preventDefault();
                return;
            }

            // Disable View Source
            if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
                e.preventDefault();
                return;
            }
        };

        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [location.pathname, profile?.role]);

    if (!isInitialized || authLoading) return null;

    return (
        <>
            {/* 30-Second Warning Banner */}
            <AnimatePresence>
                {showWarning && countdown !== null && (
                    <motion.div
                        initial={{ y: -100 }}
                        animate={{ y: 0 }}
                        exit={{ y: -100 }}
                        className="fixed top-4 left-4 right-4 z-[10000] bg-white border border-amber-100 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center justify-between overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-amber-50/50 -z-10" />
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                                <AlertTriangle className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                                <h4 className="font-black text-[11px] uppercase tracking-widest text-amber-900">System Maintenance Incoming</h4>
                                <p className="text-[10px] font-bold text-amber-700/70">Simulator refining in progress. Please save your work.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-amber-100/50 px-4 py-2 rounded-2xl border border-amber-200/50">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-sm font-black text-amber-900 tabular-nums">{countdown}s</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Full Maintenance Screen */}
            <AnimatePresence>
                {isMaintenance && 
                 !location.pathname.startsWith('/admin') && 
                 !location.pathname.startsWith('/consultant') && 
                 !isPublicRoute(location.pathname) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[9999] bg-white flex items-center justify-center p-6"
                    >
                        {/* Clean Academic Background Pattern */}
                        <div className="fixed inset-0 overflow-hidden pointer-events-none select-none -z-10">
                            <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-indigo-500/5 blur-[120px] rounded-full" />
                            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-600/5 blur-[120px] rounded-full" />
                            <div className="absolute inset-0 opacity-[0.4]">
                                <svg className="w-full h-full text-indigo-100">
                                    <pattern id="maintenance-grid" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                                        <circle cx="2" cy="2" r="1" fill="currentColor" />
                                    </pattern>
                                    <rect width="100%" height="100%" fill="url(#maintenance-grid)" />
                                </svg>
                            </div>
                        </div>
 
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="max-w-md w-full relative z-10 text-center space-y-10"
                        >
                            <div className="relative inline-block">
                                <motion.div
                                    animate={{ 
                                        scale: [1, 1.05, 1],
                                    }}
                                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                    className="h-20 px-8 bg-indigo-50/50 rounded-3xl flex items-center justify-center border border-indigo-100/50 shadow-sm overflow-hidden"
                                >
                                    <img 
                                        src="/logo.webp" 
                                        alt="ItaloStudy Logo" 
                                        className="h-10 w-auto object-contain"
                                    />
                                </motion.div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100">
                                    <Settings2 className="w-4 h-4 text-indigo-500 animate-spin-slow" />
                                </div>
                            </div>
 
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 animate-pulse">
                                    <Sparkles className="w-3 h-3" />
                                    Simulator Refining
                                </div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                                    Scheduled <br/> Maintenance
                                </h1>
                                <p className="text-sm text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                                    We're polishing the details to bring you a smoother, faster, and more effective study experience.
                                </p>
                            </div>
 
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl space-y-2">
                                    <Shield className="w-5 h-5 text-indigo-400 mx-auto" />
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security</div>
                                    <div className="text-[10px] font-bold text-slate-800">Protected Core</div>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl space-y-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</div>
                                    <div className="text-[10px] font-bold text-slate-800">Active Tuning</div>
                                </div>
                            </div>
 
                            <div className="pt-8 flex flex-col items-center gap-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">
                                    ItaloStudy AI System
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                                    <span className="text-[10px] font-bold text-slate-400">Live Calibration in Progress</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

            </AnimatePresence>
        </>
    );
}
