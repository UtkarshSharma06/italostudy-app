import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

const notifications = [
    { name: 'David M.', location: 'Toronto, Canada', action: 'just purchased the Global Plan', time: '2 min ago', flag: '🇨🇦' },
    { name: 'Aisha K.', location: 'Dubai, UAE', action: 'pre-registered for a new course', time: '5 min ago', flag: '🇦🇪' },
    { name: 'Sarah J.', location: 'Sydney, Australia', action: 'just purchased the Global Plan', time: '8 min ago', flag: '🇦🇺' },
    { name: 'Ravi P.', location: 'New York, USA', action: 'pre-registered for a new course', time: '12 min ago', flag: '🇺🇸' },
    { name: 'Priya S.', location: 'London, UK', action: 'just purchased the Global Plan', time: '3 min ago', flag: '🇬🇧' },
    { name: 'Michael T.', location: 'Melbourne, Australia', action: 'pre-registered for a new course', time: '15 min ago', flag: '🇦🇺' },
    { name: 'Elena G.', location: 'Berlin, Germany', action: 'just purchased the Global Plan', time: '7 min ago', flag: '🇩🇪' },
    { name: 'Amit D.', location: 'Kathmandu, Nepal', action: 'pre-registered for a new course', time: '20 min ago', flag: '🇳🇵' },
    { name: 'Hassan A.', location: 'Riyadh, Saudi Arabia', action: 'just purchased the Global Plan', time: '4 min ago', flag: '🇸🇦' },
    { name: 'Emma W.', location: 'Auckland, NZ', action: 'pre-registered for a new course', time: '9 min ago', flag: '🇳🇿' },
    { name: 'Rajesh K.', location: 'Singapore', action: 'just purchased the Global Plan', time: '11 min ago', flag: '🇸🇬' },
    { name: 'Sophie L.', location: 'Paris, France', action: 'pre-registered for a new course', time: '6 min ago', flag: '🇫🇷' },
];

const STORAGE_KEY = 'italostudy_sp_dismissed';

export default function SocialProofToast() {
    const location = useLocation();
    const isPlayerPage = location.pathname.includes('/courses/');
    
    const [current, setCurrent] = useState<typeof notifications[0] | null>(null);
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const indexRef = useRef(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isDismissedSession = useCallback(() => {
        return sessionStorage.getItem(STORAGE_KEY) === '1';
    }, []);

    const showNext = useCallback(() => {
        if (isDismissedSession()) return;
        const shuffled = [...notifications].sort(() => 0.5 - Math.random());
        const idx = indexRef.current % shuffled.length;
        setCurrent(shuffled[idx]);
        indexRef.current++;
        setVisible(true);
        setTimeout(() => setVisible(false), 5000);
    }, [isDismissedSession]);

    useEffect(() => {
        if (dismissed || isDismissedSession()) return;
        // First notification after 8s
        const t = setTimeout(() => {
            showNext();
            // Then every 14s
            intervalRef.current = setInterval(showNext, 14000);
        }, 8000);
        return () => {
            clearTimeout(t);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [dismissed, showNext, isDismissedSession]);

    const handleDismiss = () => {
        setVisible(false);
        setDismissed(true);
        sessionStorage.setItem(STORAGE_KEY, '1');
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    if (!current || dismissed) return null;

    return (
        <div
            className={`fixed bottom-5 left-4 z-[9990] max-w-[300px] sm:max-w-[320px] ${isPlayerPage ? 'hidden md:block' : ''}`}
            style={{
                transform: visible ? 'translateX(0) translateY(0)' : 'translateX(-110%)',
                opacity: visible ? 1 : 0,
                transition: 'all 0.45s cubic-bezier(0.34,1.4,0.64,1)',
                pointerEvents: visible ? 'auto' : 'none',
            }}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-100 dark:border-slate-800 p-3 flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                    {current.flag}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight">
                        <span className="text-indigo-600">{current.name}</span>
                        {' '}
                        <span className="font-medium text-slate-600 dark:text-slate-400">{current.action}</span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <p className="text-[10px] text-slate-400 font-medium">{current.location} · {current.time}</p>
                    </div>
                </div>

                {/* Close */}
                <button
                    onClick={handleDismiss}
                    className="text-slate-300 hover:text-slate-500 transition-colors shrink-0 mt-0.5"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Verified badge */}
            <div className="absolute -bottom-2 left-4 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <span>✓</span> Verified Purchase
            </div>
        </div>
    );
}
