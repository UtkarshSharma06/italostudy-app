import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Zap, Clock, Tag, ArrowRight, Sparkles } from 'lucide-react';
import { usePlanAccess } from '@/hooks/usePlanAccess';

interface ExitIntentPopupProps {
    discountCode?: string;
    discountPercent?: number;
    courseName?: string;
    onApplyCode?: (code: string) => void;
    onClaim?: () => void;
    delaySeconds?: number;
}

const STORAGE_KEY = 'italostudy_exit_popup_dismissed';

export default function ExitIntentPopup({
    discountCode = 'NEW10',
    discountPercent = 10,
    courseName,
    onApplyCode,
    onClaim,
    delaySeconds = 15,
}: ExitIntentPopupProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState({ h: 0, m: 29, s: 59 });
    const triggered = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { isGlobal } = usePlanAccess();

    // Check if already dismissed recently
    const isDismissed = useCallback(() => {
        return sessionStorage.getItem(STORAGE_KEY) === 'true';
    }, []);

    const show = useCallback(() => {
        if (triggered.current || isDismissed() || isGlobal) return;
        triggered.current = true;
        setIsVisible(true);
        // Countdown timer (30 mins)
        let h = 0, m = 29, s = 59;
        timerRef.current = setInterval(() => {
            if (s > 0) s--;
            else if (m > 0) { m--; s = 59; }
            else if (h > 0) { h--; m = 59; s = 59; }
            setTimeLeft({ h, m, s });
        }, 1000);
    }, [isDismissed, isGlobal]);

    const dismiss = useCallback(() => {
        setIsVisible(false);
        sessionStorage.setItem(STORAGE_KEY, 'true');
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    // Desktop: mouse exits toward top of screen OR after delaySeconds
    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        if (isMobile) return;

        const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 10) show();
        };
        document.addEventListener('mouseleave', handleMouseLeave);

        const t = setTimeout(show, delaySeconds * 1000);

        return () => {
            document.removeEventListener('mouseleave', handleMouseLeave);
            clearTimeout(t);
        };
    }, [show, delaySeconds]);

    // Mobile: show after delaySeconds of page view
    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        if (!isMobile) return;
        const t = setTimeout(show, delaySeconds * 1000);
        return () => clearTimeout(t);
    }, [show, delaySeconds]);

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(discountCode).catch(() => {});
        setCopied(true);
        if (onApplyCode) onApplyCode(discountCode);
        setTimeout(() => setCopied(false), 2000);
    };

    const pad = (n: number) => String(n).padStart(2, '0');

    if (!isVisible) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(15,15,25,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
            <div
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl"
                style={{ animation: 'exitPopupIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
                {/* Gradient top bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500" />

                {/* Close button */}
                <button
                    onClick={dismiss}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Content */}
                <div className="p-7 pt-6">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                        <Sparkles className="w-3 h-3" />
                        Wait — Don't Leave Yet!
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">
                        Get {discountPercent}% OFF Before You Go
                        {courseName && <span className="block text-indigo-600 text-xl mt-1 truncate">{courseName}</span>}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed">
                        This exclusive discount is <strong className="text-slate-700 dark:text-slate-300">only available right now</strong>. Hundreds of students are already enrolled — don't miss your spot at this price.
                    </p>

                    {/* Countdown */}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 mb-5">
                        <div className="flex items-center gap-2 text-rose-500 text-[11px] font-bold uppercase tracking-wider mb-3">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            Offer expires in
                        </div>
                        <div className="flex gap-3 justify-center">
                            {[
                                { val: timeLeft.h, label: 'Hours' },
                                { val: timeLeft.m, label: 'Min' },
                                { val: timeLeft.s, label: 'Sec' },
                            ].map(({ val, label }) => (
                                <div key={label} className="flex flex-col items-center">
                                    <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                        <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{pad(val)}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Coupon Code */}
                    <div className="border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 mb-5 bg-indigo-50/50 dark:bg-indigo-950/30">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <Tag className="w-4 h-4 text-indigo-500 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[10px] text-slate-500 font-medium">Your exclusive code</p>
                                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-widest">{discountCode}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCopy}
                                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-black transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                            >
                                {copied ? '✓ Copied!' : 'Copy Code'}
                            </button>
                        </div>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={() => {
                            if (onClaim) {
                                onClaim();
                            }
                            dismiss();
                        }}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 text-sm uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900 active:scale-[0.98]"
                    >
                        <Zap className="w-4 h-4" />
                        Claim My {discountPercent}% Discount
                        <ArrowRight className="w-4 h-4" />
                    </button>

                    <button onClick={dismiss} className="w-full text-center text-[10px] text-slate-400 hover:text-slate-500 mt-3 font-medium transition-colors">
                        No thanks, I'll pay full price →
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes exitPopupIn {
                    from { opacity: 0; transform: scale(0.88) translateY(20px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
