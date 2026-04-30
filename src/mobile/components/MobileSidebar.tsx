import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
    GraduationCap, Target, Globe, ChevronDown, BookOpen, FileText, Crown,
    ShoppingBag, History, Bookmark, ShieldCheck, LogOut, Settings, MessageCircle, ChevronRight,
    ClipboardList
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetClose,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { usePricing } from '@/context/PricingContext';
import { useExam } from '@/context/ExamContext';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
// EXAMS import removed
import { cn } from '@/lib/utils';

interface MobileSidebarProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({ isOpen, onOpenChange }) => {
    const { user, profile, signOut } = useAuth() as any;
    const { activeExam, setActiveExam, allExams } = useExam();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { openPricingModal } = usePricing();
    const [isExamSwitcherOpen, setIsExamSwitcherOpen] = useState(false);

    const handleNav = (path: string) => {
        if (path.startsWith('http') || path === '/store' || path === '/blog' || path === '/resources' || path === '/syllabus') {
            let url = path;
            if (path === '/store') url = 'https://store.italostudy.com';
            else if (path === '/blog') url = 'https://italostudy.com/blog';
            else if (path === '/resources') url = 'https://italostudy.com/resources';
            else if (path === '/syllabus') url = 'https://italostudy.com/syllabus';
            
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            navigate(path);
        }
        onOpenChange(false);
    };

    const handleExamSwitch = async (examId: string) => {
        await setActiveExam(examId);
        setIsExamSwitcherOpen(false);
        onOpenChange(false);
        navigate('/mobile/dashboard');
    };

    const mainActions = [
        { icon: FileText, label: 'Resources', path: '/resources', color: 'bg-pink-500/10 text-pink-600' },
        { icon: Target, label: t('menu.mock'), path: '/mobile/mock-exams', color: 'bg-rose-500/10 text-rose-600' },
        { icon: ShoppingBag, label: 'Store', path: '/store', color: 'bg-emerald-500/10 text-emerald-600' },
    ];

    const secondActions = [
        { icon: BookOpen, label: 'Subjects', path: '/mobile/subjects' },
        { icon: ClipboardList, label: 'Syllabus', path: '/mobile/syllabus' },
        { icon: History, label: t('menu.history'), path: '/mobile/history' },
        { icon: Bookmark, label: t('menu.bookmarks'), path: '/mobile/bookmarks' },
    ];

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="w-[310px] p-0 border-r-0 bg-[#FBFCFF] dark:bg-slate-950 flex flex-col gap-0 overflow-hidden">
                <SheetHeader className="sr-only">
                    <SheetTitle>{t('menu.main')}</SheetTitle>
                </SheetHeader>

                {/* --- TOP PROFILE SECTION --- */}
                <div className="p-5 pb-4 pt-12 border-b border-slate-100/80 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                            <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-800 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
                                <AvatarImage src={getOptimizedImageUrl(profile?.avatar_url, 64)} />
                                <AvatarFallback className="bg-slate-900 dark:bg-slate-800 text-white font-black text-xs">
                                    {profile?.display_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-black text-base tracking-tight text-slate-900 dark:text-white truncate">
                                {profile?.display_name || "Student"}
                            </h3>
                            <button 
                                onClick={() => handleNav('/mobile/settings')}
                                className="text-[10px] font-black text-primary/70 uppercase tracking-widest hover:text-primary transition-colors"
                            >
                                View Profile
                            </button>
                        </div>
                    </div>

                    {/* Compact Exam Switcher */}
                    <button
                        onClick={() => setIsExamSwitcherOpen(!isExamSwitcherOpen)}
                        className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-800 active:scale-95 transition-all"
                    >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            <Globe size={14} className="text-slate-400 shrink-0" />
                            <span className="text-[11px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-300 truncate">
                                {activeExam?.name || 'Loading...'}
                            </span>
                        </div>
                        <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-300", isExamSwitcherOpen && "rotate-180")} />
                    </button>

                    {isExamSwitcherOpen && (
                        <div className="mt-2 p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                            {Object.values(allExams)
                                .sort((a, b) => (a.isSoon === b.isSoon ? 0 : a.isSoon ? 1 : -1))
                                .slice(0, 5) // Limit visible list
                                .map((exam: any) => (
                                    <button
                                        key={exam.id}
                                        disabled={exam.isSoon}
                                        onClick={() => handleExamSwitch(exam.id)}
                                        className={cn(
                                            "w-full px-3 py-2 rounded-lg text-left transition-all flex items-center justify-between",
                                            activeExam?.id === exam.id ? "bg-white dark:bg-slate-700 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600 text-primary" : "hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400"
                                        )}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-tight">{exam.name}</span>
                                        {exam.isSoon && <span className="text-[7px] font-black px-1.5 py-0.5 bg-slate-200 rounded-full tracking-widest">SOON</span>}
                                    </button>
                                ))}
                        </div>
                    )}
                </div>

                {/* --- NAVIGATION AREA --- */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scrollbar-hide">
                    {/* Main Quick Actions Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        {mainActions.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => handleNav(item.path)}
                                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm active:scale-95 transition-all gap-1.5"
                            >
                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", item.color)}>
                                    <item.icon size={18} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Secondary Navigation List */}
                    <div className="space-y-1">
                        <p className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2">Learning Experience</p>
                        {secondActions.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => handleNav(item.path)}
                                className="w-full flex items-center justify-between p-2.5 px-3 rounded-xl hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:ring-1 hover:ring-slate-100 dark:hover:ring-slate-800 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                        <item.icon size={16} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item.label}</span>
                                </div>
                                <ChevronRight size={14} className="text-slate-300" />
                            </button>
                        ))}
                    </div>

                    {/* Admin/Restricted (If needed) */}
                    {(profile?.role === 'admin' || (profile?.role === 'sub_admin')) && (
                        <div className="space-y-1">
                            <p className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2">Management</p>
                            <button
                                onClick={() => handleNav('/admin')}
                                className="w-full flex items-center gap-3 p-2.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                                <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white">
                                    <ShieldCheck size={16} />
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Admin Control</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* --- BOTTOM SECTION --- */}
                <div className="p-4 mt-auto border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    {/* Upgrade CTA */}
                    {profile?.selected_plan === 'explorer' && (
                        <button
                            onClick={() => { onOpenChange(false); openPricingModal(); }}
                            className="w-full p-3 bg-slate-900 rounded-xl flex items-center justify-between mb-3 shadow-lg shadow-slate-900/10 active:scale-95 transition-all overflow-hidden relative"
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-slate-900">
                                    <Crown size={16} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-white tracking-tight uppercase">Elite Access</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Unlock All Features</p>
                                </div>
                            </div>
                            <ChevronRight size={14} className="text-white/50" />
                        </button>
                    )}

                    <div className="flex items-center justify-between px-2">
                        <button 
                            onClick={() => signOut()}
                            className="text-[11px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity"
                        >
                            <LogOut size={14} />
                            Sign Out
                        </button>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">v2.0.4</p>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default MobileSidebar;

function Check(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 6 9 17l-5-5" />
        </svg>
    )
}
