import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie, ChevronDown, ChevronUp, X, Shield, BarChart2, Megaphone, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────
interface CookiePreferences {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
}

const STORAGE_KEY = 'italostudy_cookie_consent';

function loadPreferences(): CookiePreferences | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as CookiePreferences;
    } catch {
        return null;
    }
}

function savePreferences(prefs: CookiePreferences) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: prefs }));
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled = false }: {
    checked: boolean;
    onChange?: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange?.(!checked)}
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent',
                'transition-colors duration-150 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                checked ? 'bg-indigo-600' : 'bg-slate-200',
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            )}
        >
            <span
                className={cn(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm',
                    'transition-transform duration-150 ease-out',
                    checked ? 'translate-x-5' : 'translate-x-0'
                )}
            />
        </button>
    );
}

// ─── Collapse panel using max-height trick (GPU-friendly) ─────────────────────
function CollapsePanel({ open, children }: { open: boolean; children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={ref}
            style={{
                maxHeight: open ? '500px' : '0px',
                overflow: 'hidden',
                transition: 'max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            {children}
        </div>
    );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function CookieConsent() {
    const [visible, setVisible] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [prefs, setPrefs] = useState<CookiePreferences>({
        necessary: true,
        analytics: false,
        marketing: false,
    });

    useEffect(() => {
        const saved = loadPreferences();
        if (!saved) {
            const t = setTimeout(() => setVisible(true), 900);
            return () => clearTimeout(t);
        }
        setPrefs(saved);
    }, []);

    const dismiss = (newPrefs: CookiePreferences) => {
        setSaving(true);
        savePreferences(newPrefs);
        setTimeout(() => {
            setVisible(false);
            setSaving(false);
        }, 220);
    };

    const categories = [
        {
            key: 'necessary' as const,
            Icon: Shield,
            title: 'Necessary',
            desc: 'Core site functions. Always active.',
            locked: true,
        },
        {
            key: 'analytics' as const,
            Icon: BarChart2,
            title: 'Analytics',
            desc: 'Helps us understand site usage.',
            locked: false,
        },
        {
            key: 'marketing' as const,
            Icon: Megaphone,
            title: 'Marketing',
            desc: 'Personalised ads across websites.',
            locked: false,
        },
    ];

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key="cookie"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    // Use transform-only animation — GPU accelerated, no layout thrash
                    transition={{ type: 'tween', duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed bottom-3 inset-x-3 sm:bottom-5 sm:left-auto sm:right-5 sm:inset-x-auto z-[9999] sm:w-[420px]"
                    style={{ willChange: 'transform, opacity' }}
                >
                    <div className="rounded-2xl sm:rounded-3xl bg-white border border-slate-150 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.18)] overflow-hidden">

                        {/* Gradient bar */}
                        <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />

                        <div className="p-5">

                            {/* Header */}
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                        <Cookie className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-tight">
                                            Cookie Preferences
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-semibold">GDPR · EU Standard</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => dismiss({ necessary: true, analytics: false, marketing: false })}
                                    aria-label="Reject optional cookies and close"
                                    className="p-1.5 rounded-xl text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Body text */}
                            <p className="text-[12px] text-slate-500 font-medium leading-relaxed mb-4">
                                We use cookies to improve your experience and personalise content. You can manage your choices below.{' '}
                                <a href="/privacy" className="text-indigo-600 hover:underline font-bold">
                                    Privacy Policy
                                </a>
                            </p>

                            {/* Collapsible granular section — max-height trick, no layout paint */}
                            <CollapsePanel open={expanded}>
                                <div className="flex flex-col gap-2 pb-4">
                                    {categories.map(({ key, Icon, title, desc, locked }) => (
                                        <div
                                            key={key}
                                            className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-100"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0">
                                                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-wide truncate">
                                                        {title}
                                                        {locked && (
                                                            <span className="ml-1.5 px-1 py-0.5 bg-slate-100 text-slate-400 text-[8px] rounded font-black uppercase">
                                                                Required
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{desc}</p>
                                                </div>
                                            </div>
                                            <Toggle
                                                checked={prefs[key]}
                                                onChange={locked ? undefined : (v) => setPrefs(p => ({ ...p, [key]: v }))}
                                                disabled={locked}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </CollapsePanel>

                            {/* Action buttons */}
                            <div className="grid grid-cols-2 gap-2">
                                {/* Accept All */}
                                <button
                                    onClick={() => dismiss({ necessary: true, analytics: true, marketing: true })}
                                    disabled={saving}
                                    className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-[11px] font-black uppercase tracking-widest transition-[background-color,transform] duration-100"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    Accept All Cookies
                                </button>

                                {/* Reject optional */}
                                <button
                                    onClick={() => dismiss({ necessary: true, analytics: false, marketing: false })}
                                    disabled={saving}
                                    className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-600 text-[10px] font-black uppercase tracking-wider transition-[background-color,transform] duration-100"
                                >
                                    Reject Optional
                                </button>

                                {/* Manage / Save */}
                                {expanded ? (
                                    <button
                                        onClick={() => dismiss(prefs)}
                                        disabled={saving}
                                        className="py-2.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 active:scale-[0.98] text-slate-600 text-[10px] font-black uppercase tracking-wider transition-[background-color,color,transform] duration-100"
                                    >
                                        Save Choices
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setExpanded(true)}
                                        className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-600 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-[background-color,transform] duration-100"
                                    >
                                        Manage <ChevronDown className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default CookieConsent;
