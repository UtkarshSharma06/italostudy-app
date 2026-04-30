import { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface SectionTimerProps {
    durationMinutes: number;
    onTimeExpired: () => void;
    onWarning?: () => void;
    warningMinutes?: number;
    secondsLeft?: number;
}

export function SectionTimer({
    durationMinutes,
    onTimeExpired,
    onWarning,
    warningMinutes = 5,
    secondsLeft: externalSeconds
}: SectionTimerProps) {
    const [internalSeconds, setInternalSeconds] = useState(durationMinutes * 60);
    const secondsLeft = externalSeconds !== undefined ? externalSeconds : internalSeconds;
    const [hasWarned, setHasWarned] = useState(false);

    useEffect(() => {
        if (externalSeconds !== undefined) return;

        const timer = setInterval(() => {
            setInternalSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onTimeExpired();
                    return 0;
                }

                if (!hasWarned && prev <= (warningMinutes * 60) && onWarning) {
                    setHasWarned(true);
                    onWarning();
                }

                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onTimeExpired, onWarning, warningMinutes, hasWarned, externalSeconds]);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const isWarning = secondsLeft <= (warningMinutes * 60);

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
