import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Section {
    id: string;
    label: string;
}

interface PageNavigationProps {
    sections: Section[];
    activeSection: string;
    setActiveSection: (id: string) => void;
    offset?: number;
}

export default function PageNavigation({
    sections,
    activeSection,
    setActiveSection,
    offset = 120
}: PageNavigationProps) {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);

            // Intersection tracking
            const scrollPosition = window.scrollY + offset + 20;
            for (const section of sections) {
                const element = document.getElementById(section.id);
                if (element &&
                    element.offsetTop <= scrollPosition &&
                    element.offsetTop + element.offsetHeight > scrollPosition) {
                    setActiveSection(section.id);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [sections, offset, setActiveSection]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            window.scrollTo({
                top: element.offsetTop - offset + 10,
                behavior: 'smooth'
            });
            setActiveSection(id);
        }
    };

    return (
        <nav className="flex items-center gap-6 md:gap-12 px-4 py-2 pointer-events-auto overflow-x-auto whitespace-nowrap no-scrollbar">
            {sections.map((section) => {
                const isActive = activeSection === section.id;
                return (
                    <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                            "relative py-1 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                            isActive
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                        )}
                    >
                        <span className="relative z-10">{section.label}</span>
                        {isActive && (
                            <motion.div
                                layoutId="active-nav-line"
                                className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-indigo-600 dark:bg-indigo-400"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                );
            })}
        </nav>
    );
}
