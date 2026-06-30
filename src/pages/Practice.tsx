import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useExam } from '@/context/ExamContext';
import { BookOpen, ChevronRight, Zap, Target, Clock, ArrowLeft, Loader2, Crown, Info, Layers, ShieldCheck } from 'lucide-react';
// EXAMS import removed

import { supabase } from '@/integrations/supabase/client';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useAuth } from '@/lib/auth';
import TrustpilotReviewModal from '@/components/TrustpilotReviewModal';
import { TestListSkeleton } from '@/components/SkeletonLoader';
import { SubjectIcon, getSubjectColorClass } from '@/components/ui/SubjectIcon';

export default function Practice() {
    const navigate = useNavigate();
    const { activeExam, setActiveExam } = useExam();
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [step, setStep] = useState(1);
    const [availableTests, setAvailableTests] = useState<any[]>([]);
    const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
    const [isLoadingTests, setIsLoadingTests] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const { user, loading } = useAuth();
    const [isCollectorEnabled, setIsCollectorEnabled] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const { hasReachedSubjectLimit, refreshLimit, isExplorer, getRemainingQuestions, totalPracticeCount, practiceLimit, openPricingModal } = usePlanAccess();

    const remaining = getRemainingQuestions(selectedSubject);

    // Using totalPracticeCount renamed from totalCount
    const isLimitReached = isExplorer && totalPracticeCount >= practiceLimit;

    useEffect(() => {
        const fetchCollectorSettings = async () => {
            if (!user || loading) return;
            
            const { data: settings } = await supabase
                .from('system_settings')
                .select('*')
                .eq('key', 'is_review_collector_enabled')
                .maybeSingle();

            const { data: profile } = await supabase
                .from('profiles')
                .select('has_submitted_review')
                .eq('id', user.id)
                .maybeSingle();
            
            setIsCollectorEnabled(settings?.value === true);
            setUserProfile(profile as any);
        };

        fetchCollectorSettings();
    }, [user, loading]);

    const handleActionWithReview = (action: () => void) => {
        if (isCollectorEnabled && !userProfile?.has_submitted_review) {
            setPendingAction(() => action);
            setShowReviewModal(true);
            return;
        }
        action();
    };

    const handleSubjectSelect = async (subject: string) => {
        if (isLimitReached) {
            setIsUpgradeModalOpen(true);
            return;
        }

        setSelectedSubject(subject);

        if (activeExam?.id === 'ielts-academic') {
            if (subject === 'Speaking') {
                navigate('/speaking');
                return;
            }

            // For Reading and Listening, we now show a selection list
            if (subject === 'Academic Reading' || subject === 'Listening') {
                setIsLoadingTests(true);
                setStep(3);
                const table = subject === 'Academic Reading' ? 'reading_tests' : 'listening_tests';
                const subTable = subject === 'Academic Reading' ? 'reading_submissions' : 'listening_submissions';

                const [testsRes, subsRes] = await Promise.all([
                    (supabase as any).from(table).select('*').eq('is_mock_only', false).order('created_at', { ascending: false }),
                    (supabase as any).from(subTable).select('test_id, status').eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                ]);

                if (testsRes.data) setAvailableTests(testsRes.data);
                if (subsRes.data) setUserSubmissions(subsRes.data);
                setIsLoadingTests(false);
                return;
            }

            if (subject === 'Academic Writing') {
                setIsLoadingTests(true);
                setStep(3);
                const [tasksRes, subsRes] = await Promise.all([
                    (supabase as any).from('writing_tasks').select('*').eq('is_mock_only', false).order('created_at', { ascending: false }),
                    (supabase as any).from('writing_submissions').select('task_id, status').eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                ]);

                if (tasksRes.data) setAvailableTests(tasksRes.data);
                if (subsRes.data) setUserSubmissions(subsRes.data);
                setIsLoadingTests(false);
                return;
            }
        }
        setStep(2);
    };

    const handleTestSelect = (testId: string) => {
        handleActionWithReview(() => {
            if (isLimitReached || hasReachedSubjectLimit(selectedSubject)) {
                setIsUpgradeModalOpen(true);
                return;
            }
            let type = 'reading';
            if (selectedSubject === 'Listening') type = 'listening';
            if (selectedSubject === 'Academic Writing') type = 'writing';

            navigate(`/${type}/${testId}`);
        });
    };

    const handleStartPractice = (count: number) => {
        handleActionWithReview(() => {
            if (isLimitReached || hasReachedSubjectLimit(selectedSubject)) {
                setIsUpgradeModalOpen(true);
                return;
            }

            const params = new URLSearchParams({
                subject: selectedSubject,
                count: count.toString(),
                mode: 'practice'
            });
            navigate(`/start-test?${params.toString()}`);
        });
    };

    const subjects = activeExam?.sections?.map(section => ({
        name: section.name,
        icon: section.icon,
        total: section.questionCount * 10
    })) || [];

    return (
        <Layout isLoading={loading}>
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
                {/* Header Section Removed & Replaced with Progress/Premium Status */}
                {/* Header Section Removed & Replaced with Progress/Premium Status */}
                <div className="mb-10">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        {/* Left: Daily Practice Limit */}
                        <div className="flex items-center gap-6 flex-1 w-full pl-2 sm:pl-4">
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                                <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 shrink-0">
                                    Daily Practice Limit <Info className="w-3.5 h-3.5 text-indigo-400" />
                                </span>
                                
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="h-2 w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (totalPracticeCount / practiceLimit) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-[13px] font-bold text-slate-900 dark:text-white shrink-0">
                                        <span className="text-indigo-600 dark:text-indigo-400">{totalPracticeCount}</span> <span className="text-slate-400 font-medium">/ {practiceLimit}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Remove Limits */}
                        {isExplorer ? (
                            <button onClick={openPricingModal} className="w-full sm:w-auto bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors rounded-2xl px-6 py-3 sm:py-3.5 flex items-center justify-center gap-4 group shrink-0">
                                <Zap className="w-5 h-5 text-orange-500 fill-orange-500 group-hover:scale-110 transition-transform" />
                                <div className="flex flex-col text-left">
                                    <span className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">Remove Limits</span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Upgrade to Premium</span>
                                </div>
                            </button>
                        ) : (
                            <div className="w-full sm:w-auto bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl px-6 py-3 sm:py-3.5 flex items-center justify-center gap-4 shrink-0">
                                <Crown className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                <div className="flex flex-col text-left">
                                    <span className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">Unlimited Practice</span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">You are a Premium User</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className={step === 1 ? "relative overflow-visible" : "bg-white dark:bg-card p-5 sm:p-8 md:p-12 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 border-slate-100 dark:border-border border-b-[8px] shadow-xl shadow-slate-200/50 relative overflow-hidden group"}>
                    {step !== 1 && <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-50 rounded-full blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-1000" />}

                    {step === 1 ? (
                        <div className="relative z-10 animate-in fade-in slide-in-from-left-4 duration-500 w-full max-w-5xl mx-auto">
                            {/* Decorative dots */}
                            <div className="absolute top-10 left-0 opacity-20 pointer-events-none hidden md:block text-slate-400">
                                <svg width="40" height="40" viewBox="0 0 40 40">
                                    <pattern id="dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                                        <circle fill="currentColor" cx="2" cy="2" r="1.5"></circle>
                                    </pattern>
                                    <rect x="0" y="0" width="40" height="40" fill="url(#dots)"></rect>
                                </svg>
                            </div>
                            {/* Decorative blur */}
                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-100 dark:bg-indigo-900/10 rounded-full blur-[80px] opacity-60 pointer-events-none -z-10" />

                            <div className="flex flex-col items-center mb-10 sm:mb-12 relative">
                                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-5 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-500/20">
                                    <Layers className="w-7 h-7" />
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-black text-[#0f172a] dark:text-white tracking-tight text-center mb-2">Select a Subject</h2>
                                <div className="text-slate-500 font-medium text-[15px] sm:text-[16px] text-center relative inline-block">
                                    Choose a subject to <span className="text-indigo-600 dark:text-indigo-400 font-bold border-b-2 border-indigo-200 dark:border-indigo-500/30 pb-0.5">start practicing</span>
                                    
                                    {/* Hand-drawn arrow pointing down right */}
                                    <svg className="absolute -right-[72px] top-1 w-12 h-12 text-indigo-300 dark:text-indigo-600/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 5c4 2 8 6 8 12M13 13l-1.5 4 4-1" />
                                    </svg>
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 w-full">
                                {subjects.map((subject) => {
                                    const colorCls = getSubjectColorClass(subject.name);

                                    return (
                                        <button
                                            key={subject.name}
                                            onClick={() => handleSubjectSelect(subject.name)}
                                            className={`w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] min-w-[280px] p-5 sm:p-6 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 text-left flex items-center gap-5 group ${isLimitReached ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:-translate-y-1'}`}
                                        >
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${colorCls} group-hover:scale-110 transition-transform duration-300 shadow-sm border border-white dark:border-transparent`}>
                                                <SubjectIcon subjectName={subject.name} fallbackIcon={subject.icon} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-[#0f172a] dark:text-white text-[15px] sm:text-[16px] mb-1 truncate">{subject.name}</h3>
                                                <p className="text-[12px] font-medium text-slate-400">
                                                    <span className="text-[#0f172a] dark:text-slate-300 font-bold">0</span> / {subject.total} questions
                                                </p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0 group-hover:border-indigo-100 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-colors">
                                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Bottom Progress Banner */}
                            <div className="mt-8 sm:mt-12 bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-500/20">
                                        <ShieldCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-[#0f172a] dark:text-white text-[15px] sm:text-[16px] mb-1">Track your progress and improve every day!</h3>
                                        <p className="text-[13px] font-medium text-slate-500">Consistent practice is the key to success.</p>
                                    </div>
                                </div>
                                
                                <div className="relative h-16 w-48 shrink-0 hidden md:block">
                                    <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible">
                                        <rect x="25" y="45" width="10" height="15" fill="currentColor" className="text-slate-100 dark:text-slate-800" rx="2" />
                                        <rect x="55" y="30" width="10" height="30" fill="currentColor" className="text-slate-100 dark:text-slate-800" rx="2" />
                                        <rect x="85" y="25" width="10" height="35" fill="currentColor" className="text-slate-100 dark:text-slate-800" rx="2" />
                                        <rect x="115" y="40" width="10" height="20" fill="currentColor" className="text-slate-100 dark:text-slate-800" rx="2" />
                                        <rect x="155" y="15" width="10" height="45" fill="currentColor" className="text-slate-100 dark:text-slate-800" rx="2" />
                                        <rect x="185" y="10" width="10" height="50" fill="currentColor" className="text-slate-200 dark:text-slate-700" rx="2" />
                                        
                                        <path d="M0,50 L30,40 L60,45 L90,20 L120,35 L160,10 L200,5" fill="none" stroke="currentColor" className="text-indigo-500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                        <circle cx="160" cy="10" r="4" fill="currentColor" className="text-indigo-500" />
                                        <circle cx="90" cy="20" r="4" fill="currentColor" className="text-indigo-500" />
                                    </svg>
                                    
                                    <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg border-2 border-white dark:border-slate-900">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : step === 2 ? (
                        <div className="relative z-10 animate-in fade-in slide-in-from-right-4 duration-500 w-full max-w-4xl mx-auto">
                            {/* Top Left Back Button */}
                            <button
                                onClick={() => setStep(1)}
                                className="flex items-center gap-2 text-[12px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors mb-6 sm:mb-8 group"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Subjects
                            </button>

                            {/* Center Header */}
                            <div className="flex flex-col items-center mb-10 sm:mb-12 relative">
                                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-5 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-500/20">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-black text-[#0f172a] dark:text-white tracking-tight text-center mb-2">Practice Length</h2>
                                <p className="text-slate-500 font-medium text-[15px] sm:text-[16px] text-center">Targeted practice to improve your accuracy and speed</p>
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-10">
                                {[5, 10, 15, 20].map((num) => {
                                    let iconContent;
                                    let colorCls;
                                    if (num === 5) {
                                        colorCls = "bg-purple-50 dark:bg-purple-500/10";
                                        iconContent = <span className="text-[40px] drop-shadow-sm leading-none">📝</span>;
                                    } else if (num === 10) {
                                        colorCls = "bg-green-50 dark:bg-green-500/10";
                                        iconContent = <span className="text-[40px] drop-shadow-sm leading-none">📖</span>;
                                    } else if (num === 15) {
                                        colorCls = "bg-orange-50 dark:bg-orange-500/10";
                                        iconContent = <span className="text-[40px] drop-shadow-sm leading-none">🎯</span>;
                                    } else {
                                        colorCls = "bg-purple-50 dark:bg-purple-500/10";
                                        iconContent = <span className="text-[40px] drop-shadow-sm leading-none">🏆</span>;
                                    }

                                    return (
                                        <button
                                            key={num}
                                            onClick={() => handleStartPractice(num)}
                                            disabled={isExplorer && num > remaining}
                                            className={`relative w-full p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border bg-white dark:bg-slate-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none transition-all duration-300 text-left flex items-center justify-between group overflow-hidden ${
                                                isExplorer && num > remaining
                                                    ? 'border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed'
                                                    : 'border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:shadow-[0_8px_30px_-4px_rgba(99,102,241,0.15)] active:scale-95'
                                            }`}
                                        >
                                            {/* Left Content */}
                                            <div className="flex flex-col relative z-10">
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className="text-4xl sm:text-5xl font-black text-[#0f172a] dark:text-white tracking-tighter">{num}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">QUESTIONS</span>
                                                
                                                <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
                                                    <Clock className="w-3.5 h-3.5 text-green-500" />
                                                    Est. {num} mins
                                                </div>
                                            </div>

                                            {/* Right Icon Radial Background */}
                                            <div className={`absolute right-[-20px] w-36 h-36 rounded-full flex items-center justify-center shrink-0 ${colorCls} transition-transform duration-500 group-hover:scale-110`}>
                                                <div className="mr-4">
                                                    {iconContent}
                                                </div>
                                            </div>

                                            {/* Hover Checkmark Badge */}
                                            {!(isExplorer && num > remaining) && (
                                                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-sm z-20">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                </div>
                                            )}

                                            {/* Premium Overlay */}
                                            {isExplorer && num > remaining && (
                                                <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center justify-center z-20">
                                                    <Crown className="w-6 h-6 text-yellow-500 mb-2" />
                                                    <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest text-center">Premium<br/>Only</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Bottom Info Pills */}
                            <div className="flex flex-col items-center gap-3 w-full pb-8">
                                <div className="flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)]">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <span className="text-[13px] font-medium text-slate-500">
                                        Remaining Daily Limit: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{remaining}</span> / {practiceLimit} Questions
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-full text-slate-500 dark:text-slate-400 text-[12px] font-medium border border-slate-100 dark:border-slate-800">
                                    <Clock className="w-3.5 h-3.5" />
                                    Estimated Duration will vary based on your pace
                                </div>
                            </div>
                        </div>
                    ) : step === 3 ? (
                        <div className="relative z-10 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex flex-col items-center mb-10 sm:mb-12">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] hover:text-indigo-700 transition-colors mb-6 sm:mb-8 group"
                                >
                                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Back to Subjects
                                </button>
                                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 mb-6 text-indigo-600">
                                    <BookOpen className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight text-center">Select Test</h2>
                                <p className="text-slate-400 font-bold text-[11px] sm:text-sm mt-3 uppercase tracking-widest opacity-60 mb-6">Available {selectedSubject} Tests</p>

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        const type = selectedSubject.toLowerCase().includes('writing') ? 'writing' :
                                            selectedSubject.toLowerCase().includes('reading') ? 'reading' :
                                                selectedSubject.toLowerCase().includes('listening') ? 'listening' : 'speaking';
                                        navigate(`/${type}/history`);
                                    }}
                                    className="rounded-xl border-2 border-indigo-100 text-indigo-600 font-black text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-indigo-50 h-auto py-2 px-4"
                                >
                                    <Clock className="w-3 h-3 mr-2 shrink-0" /> View My {selectedSubject} History
                                </Button>
                            </div>

                            {isLoadingTests ? (
                                <TestListSkeleton />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                                    {availableTests.map((test) => {
                                        const testSubs = userSubmissions.filter(s => (s.test_id || s.task_id) === test.id);
                                        const isCompleted = testSubs.some(s => s.status === 'completed');
                                        const isInProgress = !isCompleted && testSubs.some(s => s.status === 'in-progress');

                                        return (
                                            <button
                                                key={test.id}
                                                onClick={() => handleTestSelect(test.id)}
                                                className="p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-100 dark:border-border border-b-[6px] bg-slate-50/30 hover:bg-white dark:bg-card shadow-lg hover:border-slate-900 hover:-translate-y-1 transition-all duration-300 text-left group"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="p-3 bg-white dark:bg-card rounded-xl border border-slate-100 group-hover:border-indigo-100 transition-colors">
                                                        <BookOpen className="w- w-5 h-5 text-indigo-600" />
                                                    </div>
                                                    {isCompleted ? (
                                                        <span className="text-[9px] sm:text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">Completed</span>
                                                    ) : isInProgress ? (
                                                        <span className="text-[9px] sm:text-[10px] font-black text-amber-500 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-widest">Midway</span>
                                                    ) : (
                                                        <span className="text-[9px] sm:text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-widest">New</span>
                                                    )}
                                                </div>
                                                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 mb-2 group-hover:text-indigo-600 transition-colors leading-tight">{test.title || `Writing Task: ${test.task_type}`}</h3>
                                                <p className="text-[11px] sm:text-sm text-slate-500 font-medium line-clamp-2 md:line-clamp-none">{test.description || test.prompt || 'Practice your skills with this specialized IELTS test module.'}</p>
                                            </button>
                                        );
                                    })}
                                    {availableTests.length === 0 && (
                                        <div className="col-span-full text-center py-20 text-slate-400 font-bold">
                                            No tests found for this subject.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="relative z-10 text-center animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex flex-col items-center mb-10 sm:mb-12">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] hover:text-indigo-700 transition-colors mb-6 sm:mb-8 group"
                                >
                                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Back to Subjects
                                </button>
                                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50 mb-6 text-orange-600">
                                    <Zap className="w-8 h-8 fill-orange-600 animate-pulse" />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Practice Length</h2>
                                <p className="text-slate-400 font-bold text-[11px] sm:text-sm mt-3 uppercase tracking-widest">Targeting {selectedSubject}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-md mx-auto mb-12 sm:mb-8">
                                {[5, 10, 15, 20].map((count) => {
                                    const isDisabled = isExplorer && count > remaining;
                                    return (
                                        <button
                                            key={count}
                                            disabled={isDisabled}
                                            onClick={() => handleStartPractice(count)}
                                            className={`p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 border-b-[6px] shadow-lg shadow-slate-200/20 dark:shadow-none transition-all duration-300 font-black text-3xl sm:text-4xl group/btn overflow-hidden relative ${isDisabled
                                                ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700'
                                                : 'border-slate-100 dark:border-slate-700 hover:border-slate-900 dark:hover:border-indigo-500 bg-slate-50/30 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xl hover:-translate-y-1 active:border-b-2 active:translate-y-1 text-slate-900 dark:text-slate-100'
                                                }`}
                                        >
                                            <div className="relative z-10">
                                                {count}
                                                <span className="block text-[8px] sm:text-[10px] text-slate-300 font-black uppercase tracking-[0.2em] mt-2 group-hover/btn:text-orange-500 transition-colors">Questions</span>
                                            </div>
                                            {!isDisabled && (
                                                <div className="absolute top-0 right-0 w-12 h-12 bg-orange-50 rounded-bl-[2rem] opacity-0 group-hover/btn:opacity-100 transition-all duration-500 scale-150 rotate-12" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {isExplorer && (
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-12">
                                    Remaining Daily Limit: <span className="text-orange-600">{remaining}</span> / 15 Questions
                                </p>
                            )}

                            <div className="p-4 sm:p-6 bg-slate-50 dark:bg-muted rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-border inline-flex items-center gap-3">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Duration: {selectedSubject === 'Mathematics' ? '25 mins' : '15 mins'}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <UpgradeModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                title={isLimitReached ? "Daily Practice Limit Reached" : "Daily Practice Limit Reached"}
                description={isLimitReached ? "You've reached your daily limit of 15 questions. Upgrade to PRO for unlimited practice or come back in 24 hours." : "You've used your 15 daily questions for the Explorer Plan. Upgrade to PRO for unlimited practice or come back in 24 hours."}
                feature="Unlimited Practice"
            />

            <TrustpilotReviewModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                onSuccess={() => {
                    setShowReviewModal(false);
                    setUserProfile({ ...userProfile, has_submitted_review: true });
                    if (pendingAction) {
                        pendingAction();
                        setPendingAction(null);
                    }
                }}
            />
        </Layout>
    );
}
