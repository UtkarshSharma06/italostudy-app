
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

interface LogoProps {
    className?: string; // For sizing the wrapper
    iconClassName?: string; // For sizing/coloring the icon specifically if needed
    textClassName?: string; // For coloring the text
    showText?: boolean;
    variant?: 'light' | 'dark' | 'colored';
}

export default function Logo({
    className = "h-10",
    iconClassName = "w-8 h-8",
    textClassName,
    showText = true,
    variant = 'colored'
}: LogoProps) {

    // Determine colors based on variant
    const iconColor = variant === 'colored' ? 'text-indigo-600' : 'text-white';
    const textColor = variant === 'colored' ? 'text-slate-900 group-hover:text-indigo-600' : 'text-white';

    // Specific override for dark mode text if needed, but 'text-white' usually covers dark backgrounds.

    return (
        <div className={`flex items-center gap-2.5 font-sans select-none ${className}`}>
            <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`relative flex items-center justify-center`}
            >
                {/* Background glow for depth */}
                <div className={`absolute inset-0 bg-indigo-500/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                {/* Icon Container */}
                <div className={`${variant === 'colored' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white/10 text-white border border-white/20 shadow-black/5'} p-2 rounded-xl shadow-lg backdrop-blur-sm transition-all duration-300`}>
                    <GraduationCap className={`${variant === 'light' ? 'text-white' : 'text-current'} w-6 h-6`} strokeWidth={2.5} />
                </div>
            </motion.div>

            {showText && (
                <div className={`flex flex-col leading-none ${textClassName || ''}`}>
                    <span className={`text-xl font-black tracking-tight ${textColor} transition-colors duration-300`}>
                        ItaloStudy
                    </span>
                    {/* <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${variant === 'colored' ? 'text-indigo-400' : 'text-white/60'}`}>
                        Education
                    </span> */}
                </div>
            )}
        </div>
    );
}
