import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PremiumOverlayProps {
    onUpgrade: () => void;
    title?: string;
    description?: string;
    className?: string;
    showIcon?: boolean;
}

const PremiumOverlay: React.FC<PremiumOverlayProps> = ({
    onUpgrade,
    title = "Unlock Surgical Intelligence",
    description = "Get 24/7 background tracking, deep behavioral diagnostics, and your personalized 7-day protocol.",
    className,
    showIcon = true
}) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
                "fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-white/10 dark:bg-slate-900/20 backdrop-blur-xl saturate-[1.8] transition-all duration-700 pointer-events-auto",
                className
            )}
        >
            <motion.div
                initial={{ y: 100, opacity: 0, scale: 0.95 }}
                animate={{ y: 60, opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
                className="w-full max-w-sm bg-white/95 dark:bg-slate-900/95 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 relative overflow-hidden text-center group"
            >
                {/* Animated Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 opacity-50 pointer-events-none" />

                {/* Glowing Decorative Ring */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                <div className="relative z-10 flex flex-col items-center">
                    {showIcon && (
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/20 rotate-3 group-hover:rotate-0 transition-transform duration-500"
                        >
                            <Sparkles className="w-8 h-8 text-white drop-shadow-lg" />
                        </motion.div>
                    )}

                    <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3 leading-tight">
                        {title}
                    </h4>

                    <div className="h-px w-12 bg-indigo-500/30 mb-4" />

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-8 leading-relaxed max-w-[240px] mx-auto">
                        {description}
                    </p>

                    <Button
                        onClick={onUpgrade}
                        className="w-full h-14 bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-2xl flex items-center justify-center gap-2 group/btn transition-all duration-300 shadow-xl shadow-slate-900/10 active:scale-95 border-none"
                    >
                        <span className="text-xs font-black uppercase tracking-[0.2em]">UPGRADE TO GLOBAL PLAN</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>

                    <p className="mt-4 text-[9px] font-black text-indigo-500/60 uppercase tracking-widest flex items-center gap-1.5 cursor-default">
                        <span className="w-1.5 h-1.5 bg-indigo-500/40 rounded-full animate-pulse" />
                        Join 12,000+ Premium Scholars
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default PremiumOverlay;
