import { useEffect, useState, useRef } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface SectionTimerProps {
    durationMinutes: number;
    onTimeExpired: () => void;
    onWarning?: () => void;
    warningMinutes?: number;
    secondsLeft?: number;
    targetEndTimeRef?: React.MutableRefObject<number | null>;
}

export function SectionTimer({
    durationMinutes,
    onTimeExpired,
    onWarning,
    warningMinutes = 5,
    secondsLeft: externalSeconds,
    targetEndTimeRef
}: SectionTimerProps) {
    // Determine initial seconds to show
    const getInitialSeconds = () => {
        if (targetEndTimeRef && targetEndTimeRef.current) {
            return Math.max(0, Math.floor((targetEndTimeRef.current - Date.now()) / 1000));
        }
        if (externalSeconds !== undefined) return externalSeconds;
        return durationMinutes * 60;
    };

    const [internalSeconds, setInternalSeconds] = useState(getInitialSeconds());
    const secondsLeft = externalSeconds !== undefined && !targetEndTimeRef ? externalSeconds : internalSeconds;
    const [hasWarned, setHasWarned] = useState(false);
    
    // Stable ref to avoid re-triggering hooks on function identity change if possible, but safe to use.
    const onTimeExpiredRef = useRef(onTimeExpired);
    const onWarningRef = useRef(onWarning);
    
    useEffect(() => {
        onTimeExpiredRef.current = onTimeExpired;
        onWarningRef.current = onWarning;
    }, [onTimeExpired, onWarning]);

    useEffect(() => {
        // If we are given a targetEndTimeRef, poll the absolute time
        if (targetEndTimeRef) {
            const timer = setInterval(() => {
                if (!targetEndTimeRef.current) return;
                
                const remaining = Math.max(0, Math.floor((targetEndTimeRef.current - Date.now()) / 1000));
                setInternalSeconds(remaining);

                if (remaining <= 0) {
                    clearInterval(timer);
                    onTimeExpiredRef.current();
                    return;
                }

                if (!hasWarned && remaining <= (warningMinutes * 60) && onWarningRef.current) {
                    setHasWarned(true);
                    onWarningRef.current();
                }
            }, 1000);
            return () => clearInterval(timer);
        }

        // Fallback to older logic if no target time ref
        if (externalSeconds !== undefined) return;

        const timer = setInterval(() => {
            setInternalSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onTimeExpiredRef.current();
                    return 0;
                }

                if (!hasWarned && prev <= (warningMinutes * 60) && onWarningRef.current) {
                    setHasWarned(true);
                    onWarningRef.current();
                }

                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [warningMinutes, hasWarned, externalSeconds, targetEndTimeRef]);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const isWarning = secondsLeft > 0 && secondsLeft <= (warningMinutes * 60);

    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 ${isWarning
            ? 'bg-red-500/10 border-red-500/50 animate-pulse'
            : 'bg-secondary/20 border-border/40'
            }`}>
            {isWarning && <AlertCircle className="w-4 h-4 text-red-500" />}
            <Clock className={`w-4 h-4 ${isWarning ? 'text-red-500' : 'text-primary'}`} />
            <span className={`font-mono font-black text-sm tabular-nums ${isWarning ? 'text-red-500' : 'text-foreground'
                }`}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
        </div>
    );
}
