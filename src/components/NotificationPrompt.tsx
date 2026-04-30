import React, { useEffect, useState } from 'react';
import { Bell, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export function NotificationPrompt() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [isVisible, setIsVisible] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        // OneSignal Removed - Prompt Disabled
        setIsVisible(false);
    }, []);

    const handleEnable = async () => {
        toast({ title: "Notifications", description: "Push notifications are currently disabled." });
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('onboarding_notifications_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="relative group animate-in fade-in slide-in-from-top-4 duration-700 mb-8">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 p-6 sm:p-8 rounded-[2rem] shadow-2xl overflow-hidden">

                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700" />

                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    <div className="shrink-0 relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-bounce-subtle">
                            <Bell className="w-8 h-8 text-white animate-pulse" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                            <Sparkles className="w-3 h-3 text-white" />
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                            CEnT-S Seat Radar Active
                        </h3>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                            Don't miss the next CASA date. Enable web push to receive <span className="text-indigo-600 dark:text-indigo-400">instant alerts</span> the second seats become available, even when you're not on the site.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <Button
                            onClick={handleEnable}
                            className="w-full sm:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 active:scale-95 transition-all h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px]"
                        >
                            Enable Alerts
                        </Button>
                        <button
                            onClick={handleDismiss}
                            className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            Not Now
                        </button>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-center md:justify-start gap-4 opacity-60">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Scholarship Tracking</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TOLC/CEnT-S Updates</span>
                    </div>
                </div>

                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
