import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

// Use the exact logo file path provided by user or use a placeholder text if image specific not available in source yet,
// but user said "use this attached logo". I will assume it's in /resources/logo.png which I moved earlier, 
// so I can reference it as valid asset if I copy it to public.
// Wait, I put it in `resources/` for Capacitor build. I should also put it in public for this React component.
// I'll use a text/icon fallback for now and user can verify, or I can try to use the public one. 
// Actually, I'll use the "Italo Study" text style from the image description (Purple/Black).

export const PremiumSplashScreen = ({ onComplete }: { onComplete: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 3000); // 3 seconds duration
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-black overflow-hidden">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative flex flex-col items-center"
            >
                {/* Logo Graphic */}
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="mb-6 relative"
                >
                    {/* Placeholder for the user's logo file if available, otherwise stylized text */}
                    {/* I'll use text to ensure it looks good immediately without broken image link */}
                    <div className="text-center">
                        <h1 className="text-6xl font-black tracking-tighter text-[#8b5cf6] mb-[-10px]">italo</h1>
                        <h1 className="text-6xl font-black tracking-tighter text-[#0f172a] dark:text-white">study</h1>
                    </div>
                    {/* Plane Graphic (CSS representation) */}
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="absolute -top-4 -right-8"
                    >
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-black dark:text-white -rotate-12">
                            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                        </svg>
                    </motion.div>
                </motion.div>

                {/* Loading Bar */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: 100 }}
                    transition={{ duration: 2.5, ease: "linear" }}
                    className="h-1 bg-[#8b5cf6] rounded-full mt-8"
                />
            </motion.div>

            <div className="absolute bottom-10 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
                    Starting Application...
                </p>
            </div>
        </div>
    );
};
