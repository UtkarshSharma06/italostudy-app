import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IsolatedTimerProps {
  targetTimeRef: React.MutableRefObject<number | null>;
  onTimeUp: () => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const IsolatedTimer = React.memo(({ targetTimeRef, onTimeUp }: IsolatedTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(() => {
    return targetTimeRef.current ? Math.max(0, Math.floor((targetTimeRef.current - Date.now()) / 1000)) : 0;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (!targetTimeRef.current) return;
      const remaining = Math.max(0, Math.floor((targetTimeRef.current - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onTimeUp();
      }
    }, 1000);

    // Initial sync just in case
    if (targetTimeRef.current) {
        const remaining = Math.max(0, Math.floor((targetTimeRef.current - Date.now()) / 1000));
        setTimeRemaining(remaining);
        if (remaining <= 0) onTimeUp();
    }

    return () => clearInterval(interval);
  }, [targetTimeRef, onTimeUp]);

  return (
    <div className="flex items-center gap-3 px-3 lg:px-4 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-border">
      <Clock className={cn("w-4 h-4", timeRemaining < 300 ? "text-destructive animate-pulse" : "text-indigo-600")} />
      <div className="flex flex-col">
        <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">Time Left</span>
        <span className={cn("font-mono text-xs lg:text-base font-black tabular-nums leading-none", timeRemaining < 300 ? "text-destructive" : "text-slate-900 dark:text-white")}>
          {formatTime(timeRemaining)}
        </span>
      </div>
    </div>
  );
});
