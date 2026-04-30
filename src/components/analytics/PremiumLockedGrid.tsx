import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePricing } from '@/context/PricingContext';
import { cn } from '@/lib/utils';

interface PremiumLockedGridProps {
    className?: string;
    title?: string;
    description?: string;
}

const PremiumLockedGrid: React.FC<PremiumLockedGridProps> = ({ 
    className,
    title = "Unlock Premium Intelligence",
    description = "Access advanced diagnostics and personalized growth tracking."
}) => {
    const { openPricingModal } = usePricing();

    return (
        <div className={cn(
            "relative w-full h-full overflow-hidden rounded-[2.5rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 group",
            className
        )}>
            {/* Abstract Decorative Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/20"
                >
                    <Lock className="w-8 h-8 text-white" />
                </motion.div>

                <motion.h4 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3"
                >
                    {title}
                </motion.h4>

                <motion.p 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-8 max-w-[280px] leading-relaxed"
                >
                    {description}
                </motion.p>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <Button
                        onClick={openPricingModal}
                        className="h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-2xl flex items-center gap-2 group/btn px-8 shadow-lg active:scale-95 transition-all border-none"
                    >
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">UPGRADE TO GLOBAL PLAN</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                </motion.div>

                <p className="mt-6 text-[8px] font-black text-indigo-500/60 uppercase tracking-widest flex items-center gap-1.5 grayscale opacity-50">
                    <span className="w-1.5 h-1.5 bg-indigo-500/40 rounded-full" />
                    Elite Access Only
                </p>
            </div>

            {/* Subtle Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        </div>
    );
};

export default PremiumLockedGrid;
