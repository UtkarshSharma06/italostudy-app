import { useState, useEffect, useRef } from 'react';
import { X, Zap, ArrowRight } from 'lucide-react';

interface LaunchCountdownBannerProps {
    message?: string;
    ctaText?: string;
    onCtaClick?: () => void;
    /** Minutes for rolling urgency timer. Defaults to 30. */
    urgencyMinutes?: number;
}

const STORAGE_KEY = 'italostudy_banner_start';
const DISMISS_KEY = 'italostudy_banner_dismissed';

function getOrCreateEndTime(minutes: number): Date {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
        const end = new Date(stored);
        if (end > new Date()) return end;
    }
    const end = new Date(Date.now() + minutes * 60 * 1000);
    sessionStorage.setItem(STORAGE_KEY, end.toISOString());
    return end;
}

export default function LaunchCountdownBanner({
    message = '🔥 Early bird special — this price won\'t last!',
    ctaText = 'Enroll Now',
    onCtaClick,
    urgencyMinutes = 30,
}: LaunchCountdownBannerProps) {
    const [timeLeft, setTimeLeft] = useState<{ m: number; s: number } | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [mounted, setMounted] = useState(false);
    const endRef = useRef<Date | null>(null);

    useEffect(() => {
        if (sessionStorage.getItem(DISMISS_KEY)) { setDismissed(true); return; }
        endRef.current = getOrCreateEndTime(urgencyMinutes);
        const update = () => {
            const now = new Date();
            const diff = endRef.current!.getTime() - now.getTime();
            if (diff <= 0) {
                // Reset timer for next session
                sessionStorage.removeItem(STORAGE_KEY);
                endRef.current = getOrCreateEndTime(urgencyMinutes);
                return;
            }
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft({ m, s });
        };
        update();
        setMounted(true);
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [urgencyMinutes]);

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem(DISMISS_KEY, '1');
    };

    const pad = (n: number) => String(n).padStart(2, '0');

    if (dismissed || !timeLeft || !mounted) return null;

    return (
        <div
            className="w-full relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 40%, #b91c1c 70%, #9a3412 100%)' }}
        >
            {/* Animated glow orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-4 left-1/4 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl animate-pulse" />
                <div className="absolute -top-4 right-1/3 w-24 h-24 bg-red-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
                {/* Shimmer sweep */}
                <div
                    className="absolute inset-0 opacity-[0.1]"
                    style={{
                        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.8) 50%, transparent 60%)',
                        animation: 'bannerShimmer 4s linear infinite',
                        backgroundSize: '200% 100%',
                    }}
                />
            </div>

            <div className="relative max-w-[1200px] mx-auto px-4 py-2 flex items-center gap-3 sm:gap-4">

                {/* Left: Zap badge */}
                <div className="hidden sm:flex items-center gap-1.5 bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
                    <Zap className="w-3 h-3 fill-yellow-300" />
                    Limited Time
                </div>

                {/* Message */}
                <p className="flex-1 text-white text-[11px] sm:text-sm font-bold min-w-0 truncate">
                    {message}
                </p>

                {/* Timer */}
                <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center gap-0.5">
                        {/* Minutes box */}
                        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-md px-2 py-1 min-w-[36px] text-center">
                            <span className="text-white font-black text-base tabular-nums leading-none">{pad(timeLeft.m)}</span>
                        </div>
                        <span className="text-white/60 font-black text-sm mx-0.5">:</span>
                        {/* Seconds box */}
                        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-md px-2 py-1 min-w-[36px] text-center">
                            <span className="text-white font-black text-base tabular-nums leading-none">{pad(timeLeft.s)}</span>
                        </div>
                    </div>
                    <span className="text-white/40 text-[9px] font-bold uppercase tracking-wider ml-1 hidden sm:block">left</span>
                </div>

                {/* CTA button */}
                {onCtaClick && (
                    <button
                        onClick={onCtaClick}
                        className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-black font-black text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full transition-all shadow-lg shadow-yellow-500/20 shrink-0 whitespace-nowrap active:scale-95"
                    >
                        {ctaText}
                        <ArrowRight className="w-3 h-3" />
                    </button>
                )}

                {/* Dismiss */}
                <button
                    onClick={handleDismiss}
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0 text-white/60 hover:text-white"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            <style>{`
                @keyframes bannerShimmer {
                    0%   { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
            `}</style>
        </div>
    );
}
