import { useState, useEffect } from 'react';
import { Wifi } from 'lucide-react';

export default function NetworkStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showReconnected, setShowReconnected] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowReconnected(true);
            setTimeout(() => setShowReconnected(false), 4000); // Auto remove after 4s
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowReconnected(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Full Screen Offline Animation
    if (!isOnline) {
        return (
            <div className="fixed top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md text-white py-3 px-4 text-center z-[10000] animate-in slide-in-from-top duration-500 shadow-xl border-b border-white/10">
                <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
                    <div className="relative flex items-center justify-center">
                        <Wifi className="w-5 h-5 text-red-400" />
                        <div className="absolute inset-0 bg-red-400 blur-lg opacity-20 animate-pulse"></div>
                    </div>
                    <div className="flex flex-col items-start md:flex-row md:items-center gap-1 md:gap-3">
                        <span className="font-black text-[10px] md:text-xs uppercase tracking-[0.2em] text-red-400">Offline Mode</span>
                        <span className="text-[11px] md:text-sm font-medium text-slate-300">You can still view cached content and continue your session.</span>
                    </div>
                </div>
            </div>
        );
    }

    // Reconnected Success Toaster
    if (showReconnected) {
        return (
            <div className="fixed bottom-0 left-0 right-0 bg-emerald-600 text-white py-3 px-4 text-center z-[100] animate-in slide-in-from-bottom-10 fade-in duration-500 shadow-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                <Wifi className="w-4 h-4" />
                <span className="font-black">Status:</span> Connection Restored
            </div>
        );
    }

    return null;
}
