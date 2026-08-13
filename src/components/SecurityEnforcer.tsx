import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSystemSettings } from '@/context/SystemSettingsContext';
import {
    Shield,
    Settings2,
    Sparkles,
    AlertTriangle,
    Clock,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { isPublicRoute } from '@/lib/routes';

// How long (in seconds) users have to save their work after maintenance is enabled.
const GRACE_PERIOD_S = 30;

/**
 * Parse the raw `maintenance_mode` DB value.
 * Supports both the legacy `boolean` format and the new `{ active, started_at }` format.
 */
function parseMaintenance(raw: any): { active: boolean; startedAt: number | null } {
    if (raw === true) return { active: true, startedAt: null };
    if (raw === false || raw == null) return { active: false, startedAt: null };
    if (typeof raw === 'object' && raw.active === true) {
        const startedAt = raw.started_at ? new Date(raw.started_at).getTime() : null;
        return { active: true, startedAt };
    }
    return { active: false, startedAt: null };
}

export default function SecurityEnforcer() {
    const location = useLocation();
    const { profile, loading: authLoading } = useAuth();
    const { getSetting, loading: settingsLoading } = useSystemSettings();

    const [isMaintenance, setIsMaintenance] = useState(false);
    // isInitialized is only true once BOTH auth and settings have loaded from DB
    const [isInitialized, setIsInitialized] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [showWarning, setShowWarning] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastActiveRef = useRef<boolean | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // ── Maintenance logic ────────────────────────────────────────────────────
    useEffect(() => {
        // Wait until BOTH auth and settings are fully loaded from DB.
        // This prevents the "refresh shows overlay then disappears" bug:
        // without this guard, the effect fires with empty settings (maintenance=false),
        // sets isInitialized=true with lastActive=false, then when real data arrives
        // it incorrectly triggers the transition countdown instead of immediate overlay.
        if (settingsLoading || authLoading) return;

        const rawMaintenance = getSetting('maintenance_mode');
        const { active: maintenanceActive, startedAt } = parseMaintenance(rawMaintenance);
        const isAdmin = profile?.role === 'admin' || profile?.role === 'sub_admin';

        const startCountdown = (remainingSeconds: number) => {
            if (timerRef.current) clearInterval(timerRef.current);
            setCountdown(remainingSeconds);
            setShowWarning(true);

            timerRef.current = setInterval(() => {
                if (!isMounted.current) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    return;
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
        };

        if (maintenanceActive && !isAdmin) {
            // Calculate how much of the grace period has already elapsed globally.
            // All users — regardless of when they open the page — share the SAME
            // started_at timestamp, so the countdown is synchronized globally.
            const elapsedS = startedAt
                ? Math.floor((Date.now() - startedAt) / 1000)
                : GRACE_PERIOD_S; // No timestamp → treat grace as already expired

            const remainingS = Math.max(0, GRACE_PERIOD_S - elapsedS);

            if (remainingS <= 0) {
                // Grace period already over — show overlay immediately (handles refresh too)
                if (timerRef.current) clearInterval(timerRef.current);
                setCountdown(null);
                setShowWarning(false);
                setIsMaintenance(true);
            } else if (!isMaintenance && !showWarning) {
                // Grace period still running — start/resume countdown with the
                // actual remaining time (not a fresh 30s for every user)
                startCountdown(remainingS);
            }
        } else {
            // Maintenance OFF or user is admin → clear everything
            if (timerRef.current) clearInterval(timerRef.current);
            setCountdown(null);
            setShowWarning(false);
            setIsMaintenance(false);
        }

        lastActiveRef.current = maintenanceActive;
        setIsInitialized(true);

    // getSetting returns a stable ref when the value hasn't changed,
    // so spreading the raw value as a dep is safe here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSetting('maintenance_mode'), profile?.role, settingsLoading, authLoading]);

    // ── Security key/mouse guards ────────────────────────────────────────────
    useEffect(() => {
        const isAdmin = profile?.role === 'admin' || profile?.role === 'sub_admin';
        const isWhitelisted =
            location.pathname.startsWith('/admin') ||
            (location.pathname.startsWith('/store-admin') && isAdmin) ||
            location.pathname.startsWith('/consultant') ||
            isPublicRoute(location.pathname);

        if (isWhitelisted) return;

        const handleContextMenu = (e: MouseEvent) => {
            if (profile?.role !== 'admin') e.preventDefault();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (profile?.role === 'admin') return;
            if (e.key === 'F12') { e.preventDefault(); return; }
            if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
                e.preventDefault(); return;
            }
            if (e.ctrlKey && ['U', 'u'].includes(e.key)) { e.preventDefault(); return; }
        };

        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [location.pathname, profile?.role]);

    // ── Loading gate ─────────────────────────────────────────────────────────
    if (!isInitialized) {
        return (
            <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-slate-200" />
            </div>
        );
    }

    const isBlockedPath =
        !location.pathname.startsWith('/admin') &&
        !location.pathname.startsWith('/consultant') &&
        !isPublicRoute(location.pathname);

    return (
        <>
            {/* ── 30-Second Warning Banner ── */}
            <AnimatePresence>
                {showWarning && countdown !== null && isBlockedPath && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-[10000] bg-white border border-amber-100 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center justify-between overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-amber-50/50 -z-10" />
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-amber-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-amber-600">
                                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-black text-[10px] sm:text-[11px] uppercase tracking-widest text-amber-900 truncate">
                                    System Maintenance Incoming
                                </h4>
                                <p className="text-[9px] sm:text-[10px] font-bold text-amber-700/70 truncate">
                                    Please save your work now.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 bg-amber-100/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-amber-200/50 shrink-0 ml-2">
                            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
                            <span className="text-xs sm:text-sm font-black text-amber-900 tabular-nums">
                                {countdown}s
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Full Maintenance Overlay ── */}
            <AnimatePresence>
                {isMaintenance && isBlockedPath && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[9999] bg-white flex items-center justify-center p-4 sm:p-6"
                    >
                        {/* Background blobs */}
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
                            className="max-w-sm sm:max-w-md w-full relative z-10 text-center space-y-6 sm:space-y-10"
                        >
                            {/* Logo */}
                            <div className="relative inline-block">
                                <motion.div
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                                    className="h-16 sm:h-20 px-6 sm:px-8 bg-indigo-50/50 rounded-2xl sm:rounded-3xl flex items-center justify-center border border-indigo-100/50 shadow-sm overflow-hidden"
                                >
                                    <img
                                        src="/logo.webp"
                                        alt="ItaloStudy Logo"
                                        className="h-8 sm:h-10 w-auto object-contain"
                                    />
                                </motion.div>
                                <div className="absolute -bottom-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100">
                                    <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 animate-spin-slow" />
                                </div>
                            </div>

                            {/* Text */}
                            <div className="space-y-3 sm:space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 animate-pulse">
                                    <Sparkles className="w-3 h-3" />
                                    Simulator Refining
                                </div>
                                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                                    Scheduled<br />Maintenance
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-500 font-bold max-w-xs mx-auto leading-relaxed px-2">
                                    We're polishing the details to bring you a smoother, faster, and more effective study experience.
                                </p>
                            </div>

                            {/* Info cards */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2 sm:pt-4">
                                <div className="p-3 sm:p-4 bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl space-y-1.5 sm:space-y-2">
                                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 mx-auto" />
                                    <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Security</div>
                                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-800">Protected Core</div>
                                </div>
                                <div className="p-3 sm:p-4 bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl space-y-1.5 sm:space-y-2">
                                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 mx-auto" />
                                    <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Status</div>
                                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-800">Active Tuning</div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="pt-4 sm:pt-8 flex flex-col items-center gap-2 sm:gap-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">
                                    ItaloStudy AI System
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">Live Calibration in Progress</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
