import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PremiumSuccessAnimationProps {
    show: boolean;
    onComplete: () => void;
}

export const PremiumSuccessAnimation: React.FC<PremiumSuccessAnimationProps> = ({ show, onComplete }) => {
    const [animationStage, setAnimationStage] = useState<'none' | 'sparkle' | 'crown' | 'fly'>('none');

    useEffect(() => {
        if (show) {
            setAnimationStage('sparkle');

            // Trigger confetti
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            // Stage timers
            setTimeout(() => setAnimationStage('crown'), 500);
            setTimeout(() => setAnimationStage('fly'), 2500);
            setTimeout(() => {
                onComplete();
                setAnimationStage('none');
            }, 3500);
        }
    }, [show, onComplete]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black/40 backdrop-blur-md">
            <AnimatePresence>
                {animationStage === 'sparkle' || animationStage === 'crown' ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5, y: -100 }}
                        className="relative flex flex-col items-center"
                    >
                        <motion.div
                            animate={{
                                rotate: [0, 5, -5, 0],
                                scale: [1, 1.1, 1]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="relative"
                        >
                            <div className="absolute inset-0 bg-amber-400/30 blur-[60px] rounded-full animate-pulse" />
                            <div className="w-32 h-32 bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.5)] border-4 border-white/20">
                                <Crown className="w-16 h-16 text-white drop-shadow-lg" />
                            </div>

                            {/* Orbiting sparkles */}
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        rotate: 360,
                                        scale: [1, 1.5, 1],
                                        opacity: [0.5, 1, 0.5]
                                    }}
                                    transition={{
                                        rotate: { duration: 3 + i, repeat: Infinity, ease: "linear" },
                                        scale: { duration: 2, repeat: Infinity },
                                        opacity: { duration: 2, repeat: Infinity }
                                    }}
                                    className="absolute"
                                    style={{
                                        top: '50%',
                                        left: '50%',
                                        marginLeft: -8,
                                        marginTop: -8,
                                        transform: `rotate(${i * 60}deg) translateX(80px)`
                                    }}
                                >
                                    <Sparkles className="w-4 h-4 text-amber-300" />
                                </motion.div>
                            ))}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mt-10 text-center"
                        >
                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 drop-shadow-md">
                                Premium Activated
                            </h2>
                            <p className="text-amber-200 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Welcome to the Elite Circle
                            </p>
                        </motion.div>
                    </motion.div>
                ) : null}

                {animationStage === 'fly' && (
                    <motion.div
                        initial={{
                            opacity: 1,
                            scale: 1,
                            x: 0,
                            y: 0
                        }}
                        animate={{
                            scale: 0.2,
                            x: "calc(50vw - 80px)", // Towards top right profile
                            y: "calc(-50vh + 40px)",
                            opacity: 0
                        }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed z-[201]"
                    >
                        <div className="w-32 h-32 bg-gradient-to-br from-amber-300 to-amber-600 rounded-full flex items-center justify-center shadow-2xl">
                            <Crown className="w-16 h-16 text-white" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
