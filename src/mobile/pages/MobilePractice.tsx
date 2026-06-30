import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useExam } from '@/context/ExamContext';
import { BookOpen, ChevronRight, Zap, Target, Clock, ArrowLeft, Trophy, Crown, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { UpgradeModal } from '@/components/UpgradeModal';
import { SubjectIcon } from '@/components/ui/SubjectIcon';
import { Card, CardContent } from '@/components/ui/card';
import { useActiveTest } from '@/hooks/useActiveTest';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { TestListSkeleton } from '@/components/SkeletonLoader';
import { useAuth } from '@/lib/auth';
import TrustpilotReviewModal from '@/components/TrustpilotReviewModal';
// EXAMS import removed
import MobileLayout from '../components/MobileLayout';

export default function MobilePractice() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { activeExam, allExams } = useExam();
    const { activeTest } = useActiveTest();
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [step, setStep] = useState(1);
    const [availableTests, setAvailableTests] = useState<any[]>([]);
    const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
    const [isLoadingTests, setIsLoadingTests] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const { hasReachedSubjectLimit, getRemainingQuestions, isExplorer, getSubjectCount, totalPracticeCount, practiceLimit, openPricingModal } = usePlanAccess();
    const { user, loading } = useAuth();
    const [isCollectorEnabled, setIsCollectorEnabled] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    // Safe calculation for remaining limit to avoid NaN
    const safeTotal = totalPracticeCount || 0;
    const safeLimit = practiceLimit || 15;
    const remaining = isExplorer ? Math.max(0, safeLimit - safeTotal) : 999;

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
        // Global Limit Check
        if (isExplorer && totalPracticeCount >= practiceLimit) {
            setIsUpgradeModalOpen(true);
            return;
        }

        setSelectedSubject(subject);

        if (activeExam.id === 'ielts-academic') {
            if (subject === 'Speaking') {
                navigate('/mobile/speaking');
                return;
            }

            if (subject === 'Academic Reading' || subject === 'Listening' || subject === 'Academic Writing') {
                setIsLoadingTests(true);
                setStep(3);
                const table = subject === 'Academic Reading' ? 'reading_tests' : subject === 'Listening' ? 'listening_tests' : 'writing_tasks';
                const subTable = subject === 'Academic Reading' ? 'reading_submissions' : subject === 'Listening' ? 'listening_submissions' : 'writing_submissions';
                const idKey = subject === 'Academic Writing' ? 'task_id' : 'test_id';

                const [testsRes, subsRes] = await Promise.all([
                    (supabase as any).from(table).select('*').eq('is_mock_only', false).order('created_at', { ascending: false }),
                    (supabase as any).from(subTable).select(`${idKey}, status`).eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                ]);

                if (testsRes.data) setAvailableTests(testsRes.data);
                if (subsRes.data) setUserSubmissions(subsRes.data);
                setIsLoadingTests(false);
                return;
            }
        }
        if (activeTest) {
            const examConfig = allExams[activeTest.exam_type];
            const isSectioned = !!(examConfig && examConfig.sections && examConfig.sections.length > 1);

            toast({
                title: "Active Mission Found",
                description: `Finish ${activeTest.subject} before starting another.`,
                variant: "destructive",
                action: (
                    <ToastAction
                        altText="Resume Test"
                        onClick={() => navigate(isSectioned ? `/mobile/sectioned-test/${activeTest.id}` : `/mobile/test/${activeTest.id}`)}
                    >
                        Resume
                    </ToastAction>
                ),
            });
            return;
        }
        setStep(2);
    };

    const handleTestSelect = (testId: string) => {
        handleActionWithReview(() => {
            if (activeTest) {
                const examConfig = allExams[activeTest.exam_type];
                const isSectioned = !!(examConfig && examConfig.sections && examConfig.sections.length > 1);

                toast({
                    title: "Active Test Found",
                    description: `Finish ${activeTest.subject} before starting new practice.`,
                    variant: "destructive",
                    action: (
                        <ToastAction
                            altText="Resume Test"
                            onClick={() => navigate(isSectioned ? `/mobile/sectioned-test/${activeTest.id}` : `/mobile/test/${activeTest.id}`)}
                        >
                            Resume
                        </ToastAction>
                    ),
                });
                return;
            }
            if (isExplorer && totalPracticeCount >= practiceLimit) {
                setIsUpgradeModalOpen(true);
                return;
            }
            let type = 'reading';
            if (selectedSubject === 'Listening') type = 'listening';
            if (selectedSubject === 'Academic Writing') type = 'writing';

            navigate(`/mobile/${type}/${testId}`);
        });
    };

    const handleStartPractice = (count: number) => {
        handleActionWithReview(() => {
            if (isExplorer && totalPracticeCount >= practiceLimit) {
                setIsUpgradeModalOpen(true);
                return;
            }

            const params = new URLSearchParams({
                subject: selectedSubject,
                count: count.toString(),
                mode: 'practice'
            });
            navigate(`/mobile/start-test?${params.toString()}`);
        });
    };

    const subjects = activeExam.sections.map(section => ({
        name: section.name,
        icon: section.icon,
        total: section.questionCount * 10
    }));

    return (
        <MobileLayout isLoading={loading || isLoadingTests}>
            <div className="flex flex-col min-h-full bg-background pb-10">
            {/* Step Indicator Integrated into page top */}
            <div className="px-6 py-4">
                <div className="flex gap-2">
                    <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]' : 'bg-secondary'}`} />
                    <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]' : 'bg-secondary'}`} />
                </div>
            </div>

            <div className="flex-1 px-4">
                {step === 1 ? (
                    <div className="space-y-6">
                        {/* Progress Bar Section */}
                        <div className="mb-4">
                            {isExplorer ? (
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                                    <div className="flex flex-col gap-3 w-full">
                                        <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                            Daily Practice Limit <Info className="w-3.5 h-3.5 text-indigo-400" />
                                        </span>
                                        
                                        <div className="flex items-center gap-4 w-full">
                                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
                                    <button onClick={openPricingModal} className="w-full bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors rounded-2xl px-6 py-3 flex items-center justify-center gap-4 group mt-2">
                                        <Zap className="w-5 h-5 text-orange-500 fill-orange-500 group-hover:scale-110 transition-transform" />
                                        <div className="flex flex-col text-left">
                                            <span className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">Remove Limits</span>
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Upgrade to Premium</span>
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full bg-indigo-50 dark:bg-indigo-500/10 rounded-[2rem] px-6 py-5 flex items-center gap-4">
                                    <Crown className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                                    <div className="flex flex-col text-left">
                                        <span className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight mb-0.5">Unlimited Practice</span>
                                        <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">You are a Premium User</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center mb-6 mt-4">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-500/20">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-black text-[#0f172a] dark:text-white tracking-tight text-center mb-1">Select a Subject</h2>
                            <p className="text-slate-500 font-medium text-sm text-center">Choose a subject to start practicing</p>
                        </div>

                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {subjects.map((subject) => {
                                const isLimitReached = isExplorer && totalPracticeCount >= practiceLimit;
                                return (
                                <button
                                    key={subject.name}
                                    onClick={() => handleSubjectSelect(subject.name)}
                                    className={`w-full p-4 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none active:scale-[0.98] transition-all duration-300 text-left flex items-center gap-4 group ${isLimitReached ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-secondary group-hover:scale-105 transition-transform duration-300 shadow-sm border border-white dark:border-transparent`}>
                                        <SubjectIcon subjectName={subject.name} fallbackIcon={subject.icon} className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-[#0f172a] dark:text-white text-[15px] mb-1 truncate">{subject.name}</h3>
                                        <p className="text-[11px] font-medium text-slate-400">
                                            <span className="text-[#0f172a] dark:text-slate-300 font-bold">{getSubjectCount(subject.name)}</span> / {subject.total} questions
                                        </p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0 group-hover:border-indigo-100 group-hover:bg-indigo-50 transition-colors">
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </div>
                                </button>
                                );
                            })}
                        </div>
                    </div>
                ) : step === 2 ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 py-6">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
                                <Zap className="w-8 h-8 text-primary fill-primary animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Practice length</h2>
                            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest opacity-60">Targeting {selectedSubject}</p>
                        </div>

                        <div className="flex flex-col gap-4 max-w-sm mx-auto">
                            {[5, 10, 15, 20].map((num) => {
                                const isDisabled = isExplorer && num > remaining;
                                let iconContent;
                                let colorCls;
                                if (num === 5) {
                                    colorCls = "bg-purple-50 dark:bg-purple-500/10";
                                    iconContent = <span className="text-[32px] drop-shadow-sm leading-none">📝</span>;
                                } else if (num === 10) {
                                    colorCls = "bg-green-50 dark:bg-green-500/10";
                                    iconContent = <span className="text-[32px] drop-shadow-sm leading-none">📖</span>;
                                } else if (num === 15) {
                                    colorCls = "bg-orange-50 dark:bg-orange-500/10";
                                    iconContent = <span className="text-[32px] drop-shadow-sm leading-none">🎯</span>;
                                } else {
                                    colorCls = "bg-purple-50 dark:bg-purple-500/10";
                                    iconContent = <span className="text-[32px] drop-shadow-sm leading-none">🏆</span>;
                                }

                                return (
                                    <button
                                        key={num}
                                        onClick={() => handleStartPractice(num)}
                                        disabled={isDisabled}
                                        className={`relative w-full p-5 rounded-[1.5rem] border bg-white dark:bg-slate-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none active:scale-[0.98] transition-all duration-300 text-left flex items-center justify-between overflow-hidden ${
                                            isDisabled
                                                ? 'border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed'
                                                : 'border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:shadow-[0_8px_30px_-4px_rgba(99,102,241,0.15)]'
                                        }`}
                                    >
                                        {/* Left Content */}
                                        <div className="flex flex-col relative z-10">
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-3xl font-black text-[#0f172a] dark:text-white tracking-tighter">{num}</span>
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">QUESTIONS</span>
                                            
                                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                                <Clock className="w-3.5 h-3.5 text-green-500" />
                                                Est. {num} mins
                                            </div>
                                        </div>

                                        {/* Right Icon Radial Background */}
                                        <div className={`absolute right-[-20px] w-28 h-28 rounded-full flex items-center justify-center shrink-0 ${colorCls} transition-transform duration-500`}>
                                            <div className="mr-2">
                                                {iconContent}
                                            </div>
                                        </div>

                                        {/* Premium Overlay */}
                                        {isDisabled && (
                                            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
                                                <Crown className="w-5 h-5 text-yellow-500 mb-1.5" />
                                                <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest text-center">Premium</span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {isExplorer && (
                            <div className="text-center px-6">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                                    Remaining Daily Limit: <span className="text-primary">{remaining}</span> / 15
                                </p>
                            </div>
                        )}

                        <div className="flex justify-center pt-4">
                            <div className="inline-flex items-center gap-3 px-6 py-3 bg-secondary/30 rounded-full border border-border/50">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                    EST. Time: {selectedSubject === 'Mathematics' ? '25 mins' : '15 mins'}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex flex-col items-center text-center p-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20 text-primary">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Select Test</h2>
                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-60">Available {selectedSubject} Tasks</p>
                        </div>

                        {isLoadingTests ? (
                            <div className="py-10">
                                <TestListSkeleton />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {availableTests.map((test) => {
                                    const testSubs = userSubmissions.filter(s => (s.test_id || s.task_id) === test.id);
                                    const isCompleted = testSubs.some(s => s.status === 'completed');
                                    const isInProgress = !isCompleted && testSubs.some(s => s.status === 'in-progress');

                                    return (
                                        <Card
                                            key={test.id}
                                            onClick={() => handleTestSelect(test.id)}
                                            className="bg-secondary/30 border-border/50 rounded-3xl overflow-hidden active:scale-[0.98] transition-all cursor-pointer group"
                                        >
                                            <CardContent className="p-5 flex items-center gap-4">
                                                <div className="w-12 h-12 bg-background rounded-2xl flex items-center justify-center border border-border/50 group-hover:border-primary/30 transition-colors">
                                                    <Trophy className={`w-6 h-6 ${isCompleted ? 'text-yellow-500' : 'text-primary opacity-40'}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-sm truncate uppercase tracking-tight">
                                                        {test.title || `Task Type: ${test.task_type}`}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {isCompleted ? (
                                                            <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Mastered</span>
                                                        ) : isInProgress ? (
                                                            <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">In Progress</span>
                                                        ) : (
                                                            <span className="text-[8px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Available</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                                {availableTests.length === 0 && (
                                    <div className="text-center py-20 bg-secondary/20 rounded-[3rem] border border-dashed border-border">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">No matching questions found</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <UpgradeModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                title="Limit Reached"
                description="You've reached your daily practice limit. Upgrade to PRO for unlimited practice sessions."
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
            </div>
        </MobileLayout>
    );
}
