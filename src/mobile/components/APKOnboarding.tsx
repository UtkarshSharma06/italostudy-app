import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Rocket, Target, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';

interface APKOnboardingProps {
    onComplete: () => void;
}

export const APKOnboarding: React.FC<APKOnboardingProps> = ({ onComplete }) => {
    const [page, setPage] = useState(0);

    const handleNext = () => setPage(1);

    const handleFinish = async () => {
        await Preferences.set({ key: 'onboarding_completed', value: 'true' });
        onComplete();
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.8
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.8
        })
    };

    const pages = [
        {
            icon: <Rocket className="w-16 h-16 text-indigo-400" />,
            title: "UNLIMITED",
            accent: "PRACTICE",
            desc: "Access a world-class study system for IMAT, SAT, and IELTS with no restrictions.",
            buttonText: "Start Learning",
            onClick: handleNext,
            badge: "Essential"
        },
        {
            icon: <Target className="w-16 h-16 text-emerald-400" />,
            title: "EXPERT",
            accent: "ANALYSIS",
            desc: "Real-time performance tracking and AI-guided strategies to secure your admission.",
            buttonText: "Open Dashboard",
            onClick: handleFinish,
            badge: "Smart Guidance"
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] bg-[#030014] flex flex-col items-center justify-center p-8 overflow-hidden">
            {/* Background Glows - Simplified for performance */}
            <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-indigo-500/10 rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-600/10 rounded-full" />

            <AnimatePresence initial={false} custom={page}>
                <motion.div
                    key={page}
                    custom={page}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        x: { type: "spring", stiffness: 500, damping: 40 },
                        opacity: { duration: 0.15 },
                        scale: { duration: 0.2 }
                    }}
                    className="flex flex-col items-center text-center w-full"
                >
                    <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center mb-12 shadow-2xl relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full" />
                        {pages[page].icon}
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-6">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{pages[page].badge}</span>
                    </div>

                    <h1 className="text-4xl font-black text-white italic tracking-tighter leading-none mb-6">
                        {pages[page].title} <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400">
                            {pages[page].accent}
                        </span>
                    </h1>

                    <p className="text-sm font-bold text-white/40 leading-relaxed max-w-[280px] mb-16">
                        {pages[page].desc}
                    </p>

                    <Button
                        onClick={pages[page].onClick}
                        className="w-full h-18 bg-white text-black font-black uppercase text-sm tracking-[0.2em] rounded-3xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 group"
                    >
                        {pages[page].buttonText}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </motion.div>
            </AnimatePresence>

            {/* Pagination Dots */}
            <div className="flex gap-3 mt-12">
                {[0, 1].map((i) => (
                    <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${page === i ? 'w-8 bg-indigo-500' : 'w-2 bg-white/20'
                            }`}
                    />
                ))}
            </div>

            <div className="absolute bottom-10 opacity-20">
                <p className="text-[8px] font-black text-white uppercase tracking-[0.5em]">Italostudy Platform • Mobile App</p>
            </div>
        </div>
    );
};
