import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
    GraduationCap, Target, ChevronDown, BookOpen, Crown,
    ShoppingBag, Bookmark, LogOut, MessageCircle, ChevronRight,
    ClipboardList, Disc, BarChart3, TrendingUp, Trophy, X, History, FileText
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetClose,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from 'react-i18next';
import { usePricing } from '@/context/PricingContext';
import { useExam } from '@/context/ExamContext';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

interface MobileSidebarProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({ isOpen, onOpenChange }) => {
    const { user, profile, signOut } = useAuth() as any;
    const { activeExam, setActiveExam, allExams } = useExam();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { openPricingModal } = usePricing();
    const [isExamSwitcherOpen, setIsExamSwitcherOpen] = useState(false);

    const handleNav = (path: string) => {
        onOpenChange(false);
        
        // Defer heavy navigation logic to allow the Sheet animation to close smoothly
        // without dropping frames or freezing the UI thread.
        setTimeout(() => {
            if (path.startsWith('http') || path === '/store' || path === '/blog' || path === '/resources' || path === '/exams') {
                let url = path;
                if (path === '/store') url = 'https://store.italostudy.com';
                else if (path === '/blog') url = 'https://italostudy.com/blog';
                else if (path === '/resources') url = 'https://italostudy.com/resources';
                else if (path === '/exams') url = 'https://italostudy.com/exams';
                
                if (Capacitor.isNativePlatform()) {
                    Browser.open({ url });
                } else {
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            } else {
                navigate(path);
            }
        }, 300);
    };

    const handleExamSwitch = async (examId: string) => {
        await setActiveExam(examId);
        setIsExamSwitcherOpen(false);
        onOpenChange(false);
        
        // Defer navigation
        setTimeout(() => {
            navigate('/mobile/dashboard');
        }, 300);
    };

    const mainActions = [
        { icon: Disc, label: 'Practice', sub: 'Practice Questions', path: '/mobile/practice', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-500/20' },
        { icon: Target, label: 'Mock Exams', sub: 'Test your preparation', path: '/mobile/mock-exams', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-500/20' },
        { icon: FileText, label: 'Resources', sub: 'Study material', path: '/resources', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-500/20' },
        { icon: GraduationCap, label: 'Courses', sub: 'Video Lectures', path: '/courses', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20' },
    ];

    const learningActions = [
        { icon: BookOpen, label: 'Subjects', sub: 'Explore all topics', path: '/mobile/subjects', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-500/20' },
        { icon: ClipboardList, label: 'Exams', sub: 'Past year papers', path: '/exams', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-500/20' },
        { icon: History, label: 'History', sub: 'Your activity', path: '/mobile/history', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20' },
        { icon: Bookmark, label: 'Bookmarks', sub: 'Saved content', path: '/mobile/bookmarks', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20' },
    ];

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            {/* 340px width to match the beautiful spacious look */}
            <SheetContent hideClose={true} side="left" className="w-[340px] sm:w-[380px] p-0 border-none bg-[#f8f9fc] dark:bg-slate-950 flex flex-col gap-0 overflow-hidden shadow-2xl shadow-indigo-900/20">
                <SheetHeader className="sr-only">
                    <SheetTitle>{t('menu.main')}</SheetTitle>
                </SheetHeader>

                {/* --- HEADER SECTION --- */}
                <div className="relative bg-gradient-to-br from-[#1a0b38] via-[#21114a] to-[#160a35] pt-12 pb-8 px-6 rounded-br-[3rem] shrink-0">
                    {/* Decorative Stars */}
                    <div className="absolute top-12 right-24 w-1 h-1 bg-white rounded-full blur-[1px] animate-pulse" />
                    <div className="absolute top-20 right-10 w-1.5 h-1.5 bg-white rounded-full blur-[1px] animate-pulse delay-700" />
                    <div className="absolute top-32 right-32 w-1 h-1 bg-white/50 rounded-full blur-[1px]" />
                    <div className="absolute top-10 right-4 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                    {/* Top row: Logo & Close */}
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <img src="/logo-dark-full.webp" alt="ItaloStudy" className="h-6 object-contain" />
                        <SheetClose className="w-8 h-8 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-100 transition-colors focus:outline-none">
                            <X size={16} strokeWidth={2.5} />
                        </SheetClose>
                    </div>

                    {/* User Profile */}
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="relative">
                            <Avatar className="h-14 w-14 border border-white/20 shadow-lg bg-[#2d1b54]">
                                <AvatarImage src={getOptimizedImageUrl(profile?.avatar_url, 64)} />
                                <AvatarFallback className="bg-transparent text-white font-bold text-xl">
                                    {profile?.display_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#1a0b38] rounded-full" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h3 className="font-bold text-lg text-white truncate leading-tight">
                                {profile?.display_name || "Student"}
                            </h3>
                            <button 
                                onClick={() => handleNav('/mobile/settings')}
                                className="text-[9px] font-black text-white/70 uppercase tracking-widest mt-1 hover:text-white transition-colors flex items-center gap-1"
                            >
                                VIEW PROFILE <ChevronRight size={10} strokeWidth={3} />
                            </button>
                        </div>
                    </div>

                    {/* Exam Switcher */}
                    <div className="relative z-10">
                        <button
                            onClick={() => setIsExamSwitcherOpen(!isExamSwitcherOpen)}
                            className="w-full bg-white/10 hover:bg-white/20 transition-colors rounded-[14px] py-3.5 px-4 flex items-center justify-between border border-white/10 shadow-sm backdrop-blur-sm"
                        >
                            <div className="flex items-center gap-3">
                                <Trophy size={16} className="text-white/80" strokeWidth={2} />
                                <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                                    {activeExam?.name || 'CENT-S ENTRANCE EXAM'}
                                </span>
                            </div>
                            <ChevronDown size={16} className={cn("text-white/50 transition-transform duration-300", isExamSwitcherOpen && "rotate-180")} />
                        </button>

                        {isExamSwitcherOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-[#2d1b54] rounded-xl border border-white/10 shadow-xl z-50">
                                {Object.values(allExams)
                                    .sort((a, b) => (a.isSoon === b.isSoon ? 0 : a.isSoon ? 1 : -1))
                                    .slice(0, 5)
                                    .map((exam: any) => (
                                        <button
                                            key={exam.id}
                                            disabled={exam.isSoon}
                                            onClick={() => handleExamSwitch(exam.id)}
                                            className={cn(
                                                "w-full px-3 py-3 rounded-lg text-left transition-all flex items-center justify-between",
                                                activeExam?.id === exam.id ? "bg-white/20 text-white" : "hover:bg-white/10 text-white/70"
                                            )}
                                        >
                                            <span className="text-[11px] font-bold uppercase tracking-wider">{exam.name}</span>
                                            {exam.isSoon && <span className="text-[8px] font-black px-1.5 py-0.5 bg-white/10 rounded uppercase tracking-widest">SOON</span>}
                                        </button>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- CONTENT AREA --- */}
                <div className="flex-1 overflow-y-auto pb-8 scrollbar-hide">
                    
                    {/* MAIN SECTION */}
                    <div className="mt-4">
                        <h3 className="px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">MAIN</h3>
                        <div className="flex flex-col">
                            {mainActions.map((item) => (
                                <button
                                    key={item.label}
                                    onClick={() => handleNav(item.path)}
                                    className="flex items-center gap-4 px-6 py-3 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 active:scale-[0.98] transition-all duration-200 w-full text-left"
                                >
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", item.bg, item.color)}>
                                        <item.icon size={20} strokeWidth={2} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">{item.label}</h4>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.sub}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* LEARNING SECTION */}
                    <div className="mt-6">
                        <h3 className="px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">LEARNING</h3>
                        <div className="bg-white dark:bg-slate-900 rounded-[24px] p-2 mx-4 shadow-sm border border-slate-100 dark:border-slate-800">
                            {learningActions.map((item) => (
                                <button
                                    key={item.label}
                                    onClick={() => handleNav(item.path)}
                                    className="flex items-center gap-4 px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] rounded-[18px] transition-all duration-200 w-full text-left"
                                >
                                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", item.bg, item.color)}>
                                        <item.icon size={20} strokeWidth={2} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">{item.label}</h4>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.sub}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- FIXED BOTTOM ACTIONS --- */}
                <div className="shrink-0 pb-4 pt-1 bg-[#f8f9fc] dark:bg-slate-950 relative z-20">
                    {/* PREMIUM BANNER */}
                    {profile?.selected_plan === 'explorer' && (
                        <button
                            onClick={() => { onOpenChange(false); openPricingModal(); }}
                            className="bg-gradient-to-br from-[#1a0b38] to-[#2b1654] rounded-[20px] p-3 mx-8 shadow-xl shadow-indigo-900/10 flex items-center gap-3 text-left relative overflow-hidden group w-[calc(100%-4rem)]"
                        >
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                            
                            <div className="w-10 h-10 rounded-full bg-[#5b36f5] flex items-center justify-center shrink-0 shadow-inner relative z-10">
                                <Crown size={20} className="text-white" strokeWidth={2} />
                            </div>
                            <div className="flex-1 relative z-10">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className="text-white font-bold text-[13px]">Italo Premium</h4>
                                    <span className="bg-[#5b36f5] text-[8px] text-white font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm">ELITE</span>
                                </div>
                                <p className="text-slate-300 text-[10px] leading-tight">Unlock all features</p>
                            </div>
                            <ChevronRight size={14} className="text-white/50 relative z-10" />
                        </button>
                    )}

                    {/* SIGN OUT */}
                    <button 
                        onClick={() => signOut()}
                        className="bg-white dark:bg-slate-900 rounded-[18px] p-3 mx-8 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between mt-3 w-[calc(100%-4rem)] hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                                <LogOut size={14} className="text-rose-500" strokeWidth={2.5} />
                            </div>
                            <span className="text-rose-500 font-bold text-[13px]">Sign Out</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                    </button>

                    {/* FOOTER */}
                    <div className="px-6 pt-5 pb-2 flex justify-between items-end relative opacity-60">
                        <p className="text-[9px] font-bold text-slate-400">v2.0.4 &bull; You're all set!</p>
                        {/* Decorative mountain graphic */}
                        <svg width="80" height="32" viewBox="0 0 100 40" fill="none" className="absolute bottom-2 right-0 opacity-20">
                            <path d="M50 40L75 15L100 40H50Z" fill="#94a3b8"/>
                            <path d="M20 40L45 15L70 40H20Z" fill="#cbd5e1"/>
                            <path d="M0 40L25 15L50 40H0Z" fill="#e2e8f0"/>
                            <path d="M75 15V5M75 5H85V10H75" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round"/>
                        </svg>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default MobileSidebar;
