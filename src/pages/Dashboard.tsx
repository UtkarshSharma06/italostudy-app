import { useEffect, useState, memo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    Zap,
    Clock,
    Trophy,
    Play,
    Users,
    CreditCard,
    ChevronRight,
    Search,
    BookOpen,
    TrendingUp,
    GraduationCap,
    Brain,
    Sparkles,
    BarChart3,
    Award,
    Bookmark,
    FlaskConical,
    FileText,
    ClipboardList,
    MessageCircle,
    ArrowRight,
    LayoutGrid,
    Target,
    History,
    Gamepad2,
    Calendar,
    MessageSquare,
    ExternalLink,
    Crown,
    Bell,
    CheckCircle2,
    X,
    ShieldCheck,
    Globe,
    Flame,
    Pencil
} from 'lucide-react';
import { subDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useExam } from '@/context/ExamContext';
// EXAMS import removed
import { ToastAction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { lazy, Suspense } from 'react';
const LatestNotificationPopup = lazy(() => import('@/components/LatestNotificationPopup'));
const FeedbackDialog = lazy(() => import('@/components/FeedbackDialog').then(m => ({ default: m.FeedbackDialog })));
const TrustpilotReviewModal = lazy(() => import('@/components/TrustpilotReviewModal'));
const SeatTrackerModal = lazy(() => import('@/components/SeatTrackerModal').then(m => ({ default: m.SeatTrackerModal })));

import { useActiveTest } from '@/hooks/useActiveTest';
import { usePlanAccess } from '@/hooks/usePlanAccess';
// import { NotificationPrompt } from '@/components/NotificationPrompt';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
import CountUp from '@/components/CountUp';
import StudyPlannerWidget from '@/components/StudyPlannerWidget';
import { DesktopDashboardSkeleton } from '@/components/DesktopDashboardSkeleton';
import { readDashboardCache, invalidateDashboardCache, writeDashboardCache } from '@/hooks/useDashboardPrefetch';
import { PWAPrompt } from '@/components/PWAPrompt';


interface SubjectMastery {
    subject: string;
    solved: number;
    total: number;
    accuracy: number;
}

interface TopStudent {
    id: string;
    display_name: string;
    email: string | null;
    total_score: number;
    tests_taken: number;
    avatar_url?: string | null;
    accuracy?: number;
}

// --- Memoized Sub-Components ---

const StatCard = memo(({ label, value, icon: Icon, color, bg, border }: any) => (
    <div className={`relative group overflow-hidden ${bg || 'bg-white dark:bg-slate-900'} ${border || 'border-slate-100 dark:border-slate-800'} backdrop-blur-xl border-2 p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-500 hover:-translate-y-1 h-full flex flex-col justify-center`}>
        <div className="relative z-10">
            <div className="flex items-center justify-center mb-3">
                <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{label}</p>
                <Icon className={`w-4 h-4 ${color} opacity-80`} />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter text-center">
                <CountUp
                    to={typeof value === 'string' ? parseFloat(value) : value}
                    suffix={typeof value === 'string' && value.includes('%') ? '%' : ''}
                />
            </div>
        </div>
    </div>
));

const SubjectMasteryItem = memo(({ subject, index = 0 }: { subject: SubjectMastery, index?: number }) => {
    // Determine subject icon and color scheme based on the subject name
    const getSubjectConfig = (name: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('math')) return {
            colors: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z"/></svg>
        }; // Infinity symbol for math
        if (lowerName.includes('bio')) return {
            colors: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m8.5 4 7 16"/><path d="m15.5 4-7 16"/><path d="M14 6h-4"/><path d="M13 18h-2"/><path d="M15 10H9"/><path d="M14.5 14h-5"/></svg>
        }; // DNA structure for biology
        if (lowerName.includes('chem')) return {
            colors: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
            icon: <FlaskConical className="w-5 h-5 stroke-[2.5px]" />
        };
        if (lowerName.includes('reasoning') || lowerName.includes('logic')) return {
            colors: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600',
            icon: <Brain className="w-5 h-5 stroke-[2.5px]" />
        };
        return {
            colors: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600',
            icon: <BookOpen className="w-5 h-5 stroke-[2.5px]" />
        };
    };

    const config = getSubjectConfig(subject.subject);

    return (
        <div className="group relative">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", config.colors)}>
                        {config.icon}
                    </div>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{subject.subject}</span>
                </div>
                <div className="text-right">
                    <span className="text-base font-black text-slate-900 dark:text-white leading-none">
                        <CountUp to={subject.accuracy} suffix="%" />
                    </span>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Accuracy</p>
                </div>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-50 dark:border-white/5 relative">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${subject.accuracy}%` }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: index * 0.1 }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                />
            </div>
        </div>
    );
});

const ChampionItem = memo(({ student, index }: { student: TopStudent, index: number }) => {
    const { t } = useTranslation();
    const isTop3 = index < 3;
    const [hasError, setHasError] = useState(false);

    const royalTheme = index === 0 ? {
        container: "bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white dark:from-amber-900/20 dark:via-slate-900/50 dark:to-slate-900 border-amber-200/50 dark:border-amber-500/20 shadow-amber-500/10",
        badge: "bg-gradient-to-br from-amber-400 to-amber-600 text-white border-amber-300 shadow-amber-500/30",
        title: "Supreme Champion",
        titleColor: "text-amber-600 dark:text-amber-400",
        icon: <Crown className="w-4 h-4 text-amber-500 animate-pulse" />,
        accent: "bg-amber-400"
    } : index === 1 ? {
        container: "bg-gradient-to-br from-slate-400/10 via-slate-50/50 to-white dark:from-slate-700/20 dark:via-slate-900/50 dark:to-slate-900 border-slate-200/50 dark:border-slate-500/20 shadow-slate-500/10",
        badge: "bg-gradient-to-br from-slate-300 to-slate-500 text-white border-slate-200 shadow-slate-400/20",
        title: "Elite Prince",
        titleColor: "text-slate-500 dark:text-slate-400",
        icon: <Trophy className="w-3.5 h-3.5 text-slate-400" />,
        accent: "bg-slate-400"
    } : index === 2 ? {
        container: "bg-gradient-to-br from-orange-700/10 via-orange-50/50 to-white dark:from-orange-900/20 dark:via-slate-900/50 dark:to-slate-900 border-orange-200/50 dark:border-orange-500/20 shadow-orange-500/10",
        badge: "bg-gradient-to-br from-orange-600 to-orange-800 text-white border-orange-500 shadow-orange-700/20",
        title: "Noble Knight",
        titleColor: "text-orange-700 dark:text-orange-400",
        icon: <Award className="w-3.5 h-3.5 text-orange-600" />,
        accent: "bg-orange-700"
    } : {
        container: "bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 shadow-sm",
        badge: "bg-blue-50 border-blue-100 text-blue-600",
        title: `@${(student.display_name || 'student').toLowerCase().replace(/\s+/g, '')}`,
        titleColor: "text-slate-400",
        icon: null,
        accent: "bg-blue-400"
    };

    return (
        <Link
            to={`/student/${student.id}`}
            className="group flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-200"
        >
            {/* Rank */}
            <div className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0",
                index === 0 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" :
                index === 1 ? "bg-slate-100 dark:bg-slate-800 text-slate-500" :
                index === 2 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600" :
                "bg-slate-50 dark:bg-slate-800/50 text-slate-400"
            )}>
                {index === 0 ? <Crown size={10} className="fill-amber-500 text-amber-500" /> : index + 1}
            </div>

            {/* Avatar */}
            <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden border flex-shrink-0 bg-white dark:bg-slate-800",
                index === 0 ? "border-amber-300/50" : index === 1 ? "border-slate-200" : index === 2 ? "border-orange-200" : "border-slate-100 dark:border-slate-700"
            )}>
                {student.avatar_url && !hasError ? (
                    <img src={getOptimizedImageUrl(student.avatar_url, 64)} alt={student.display_name} className="w-full h-full object-cover" onError={() => setHasError(true)} />
                ) : (
                    <span className={cn("text-xs font-black", index === 0 ? "text-amber-500" : index === 1 ? "text-slate-400" : index === 2 ? "text-orange-500" : "text-slate-300")}>
                        {(student.display_name || 'S').slice(0, 1).toUpperCase()}
                    </span>
                )}
            </div>

            {/* Name + Title */}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{student.display_name.split(' ')[0]}</p>
                {index < 3 && (
                    <p className={cn("text-[8px] font-black uppercase tracking-widest",
                        index === 0 ? "text-amber-500" : index === 1 ? "text-slate-400" : "text-orange-500"
                    )}>
                        {index === 0 ? 'Supreme' : index === 1 ? 'Elite' : 'Noble'}
                    </p>
                )}
            </div>

            {/* Score */}
            <div className="text-right flex-shrink-0">
                <p className={cn("text-sm font-black leading-none", index === 0 ? "text-amber-600" : "text-slate-900 dark:text-white")}>
                    <CountUp to={student.total_score} />
                </p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight">pts</p>
            </div>
        </Link>
    );
});

const MockChampionItem = memo(({ student, index }: { student: TopStudent, index: number }) => {
    const isTopSpot = index === 0;
    const [hasError, setHasError] = useState(false);

    return (
        <Link
            to={`/student/${student.id}`}
            className="group flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-200"
        >
            {/* Rank */}
            <div className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0",
                isTopSpot ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600" : "bg-slate-50 dark:bg-slate-800/50 text-slate-400"
            )}>
                {isTopSpot ? <Zap size={10} className="fill-rose-500 text-rose-500" /> : index + 1}
            </div>

            {/* Avatar */}
            <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden border flex-shrink-0 bg-white dark:bg-slate-800",
                isTopSpot ? "border-rose-300/50" : "border-slate-100 dark:border-slate-700"
            )}>
                {student.avatar_url && !hasError ? (
                    <img src={getOptimizedImageUrl(student.avatar_url, 64)} alt={student.display_name} className="w-full h-full object-cover" onError={() => setHasError(true)} />
                ) : (
                    <span className={cn("text-xs font-black", isTopSpot ? "text-rose-500" : "text-slate-300")}>
                        {(student.display_name || 'S').slice(0, 1).toUpperCase()}
                    </span>
                )}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-rose-600 transition-colors">{student.display_name.split(' ')[0]}</p>
                {isTopSpot && <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Mock Leader</p>}
            </div>

            {/* Score */}
            <div className="text-right flex-shrink-0">
                <p className={cn("text-sm font-black leading-none", isTopSpot ? "text-rose-600" : "text-slate-900 dark:text-white")}>
                    <CountUp to={student.total_score} />
                </p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight">pts</p>
            </div>
        </Link>
    );
});

export default function Dashboard() {
    const { t } = useTranslation();
    const { user, loading, profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const { activeExam, allExams } = useExam();
    const { activeTest, refreshActiveTest } = useActiveTest();
    const [isTestNotificationDismissed, setIsTestNotificationDismissed] = useState(false);

    // ── Check for Personal Study Plan ──
    const [hasStudyPlan, setHasStudyPlan] = useState(false);
    useEffect(() => {
        if (!user || !activeExam?.id) return;
        let shouldShowPlan = false;
        
        const planRaw = localStorage.getItem(`study_plan_${activeExam.id}_${user.id}`);
        if (planRaw) {
            try {
                const plan = JSON.parse(planRaw);
                if (activeExam.id.includes(plan.exam)) {
                    shouldShowPlan = true;
                }
            } catch (_) {}
        }
        
        setHasStudyPlan(shouldShowPlan);
    }, [user, activeExam?.id]);

    const [stats, setStats] = useState<{
        totalQuestions: number;
        solved: number;
        streak: number;
        bestStreak: number;
        totalActiveDays: number;
        avgTime: number;
        mockExams: number;
        accuracy: number;
        lastExamScore: number | null;
        gettingStartedProgress: number;
    }>({
        totalQuestions: 0,
        solved: 0,
        streak: 0,
        bestStreak: 0,
        totalActiveDays: 0,
        avgTime: 0,
        mockExams: 0,
        accuracy: 0,
        lastExamScore: null,
        gettingStartedProgress: 5,
    });
    const [subjectMastery, setSubjectMastery] = useState<SubjectMastery[]>([]);
    const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
    const [ieltsStats, setIeltsStats] = useState({
        reading: 0,
        listening: 0,
        writing: 0,
        avgBand: 0
    });
    const [recentEvaluations, setRecentEvaluations] = useState<any[]>([]);
    const [isDashboardLoading, setIsDashboardLoading] = useState(() => {
        // If prefetched data exists, skip loading state entirely
        if (user?.id && profile?.selected_exam) {
            const cached = readDashboardCache(user.id, profile.selected_exam);
            if (cached) return false;
        }
        return true;
    });
    const [resolvedReports, setResolvedReports] = useState<any[]>([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
    const [activeDates, setActiveDates] = useState<Set<string>>(new Set());
    const [upcomingSession, setUpcomingSession] = useState<any>(null);
    const { hasPremiumAccess, isAdmin } = usePlanAccess();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/auth');
        } else if (!loading && user && profile && !isAdmin && (!profile.selected_exam || !profile.selected_plan || !profile.phone_number || !profile.study_hours) && location.pathname !== '/onboarding') {
            navigate('/onboarding');
        }
    }, [user, loading, profile, navigate, location.pathname]);

    const dataLoadedRef = useRef({ userId: '', examId: '' });
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (user && activeExam?.id && profile) {
            // Prevent double fetching if user/exam hasn't changed
            if (dataLoadedRef.current.userId === user.id && dataLoadedRef.current.examId === activeExam.id) {
                return;
            }

            // Cancel any pending requests
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            // Update ref to current state
            dataLoadedRef.current = { userId: user.id, examId: activeExam.id };

            loadAllDashboardData(abortControllerRef.current.signal);
            checkReviewEligibility();
            fetchResolvedReports(); // Moved here to be part of the main data fetch
        }

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [user?.id, activeExam?.id]); // Tightened dependencies to prevent re-fetches on minor profile changes

    const checkReviewEligibility = async () => {
        if (!user || !profile) return;

        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const now = new Date().getTime();

        try {
            // 1. Check account age (2 days)
            const createdAt = new Date(profile.created_at).getTime();
            const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;

            if (now - createdAt < twoDaysInMs) return;

            // 2. Check tracking status
            const { data: tracking } = await (supabase as any)
                .from('user_review_tracking')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (tracking) {
                // If they already reviewed or were prompted recently, skip
                const lastPrompt = (tracking as any).last_review_prompt_at ? new Date((tracking as any).last_review_prompt_at).getTime() : 0;
                const lastSubmitted = (tracking as any).last_review_submitted_at ? new Date((tracking as any).last_review_submitted_at).getTime() : 0;
                const dashboardShown = (tracking as any).dashboard_popup_shown;

                if (dashboardShown && (now - lastPrompt < thirtyDaysInMs)) return;
                if (lastSubmitted && (now - lastSubmitted < thirtyDaysInMs)) return;
            }

            // Show modal and mark dashboard as shown
            setShowReviewModal(true);

            // Mark dashboard as shown in DB
            await (supabase as any)
                .from('user_review_tracking')
                .upsert({
                    user_id: user.id,
                    dashboard_popup_shown: true,
                    last_review_prompt_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

        } catch (error) {
            console.error('Error checking dashboard review eligibility:', error);
            // Fallback for local dev/missing table
            const lastPrompt = localStorage.getItem('trustpilot_last_prompt_dashboard');
            if (!lastPrompt || (now - parseInt(lastPrompt) > thirtyDaysInMs)) {
                setShowReviewModal(true);
            }
        }
    };

    const fetchResolvedReports = async () => {
        const { data, error } = await (supabase as any)
            .from('question_reports')
            .select('id, created_at, status, is_seen_by_user')
            .eq('user_id', user?.id)
            .eq('status', 'resolved')
            .eq('is_seen_by_user', false);

        if (!error && data && data.length > 0) {
            setResolvedReports(data);

            // Mark as "seen" immediately so they don't reappear on refresh
            await (supabase as any)
                .from('question_reports')
                .update({ is_seen_by_user: true })
                .in('id', data.map((r: any) => r.id));
        }
    };

    const dismissAllReports = async () => {
        const reportIds = resolvedReports.map(r => r.id);
        const { error } = await (supabase as any)
            .from('question_reports')
            .update({ is_seen_by_user: true })
            .in('id', reportIds);

        if (!error) {
            setResolvedReports([]);
        }
    };

    const fetchLastProgress = async () => {
        try {
            if (!user || !activeExam) return null;
            const { data: progresses, error } = await supabase
                .from('learning_progress')
                .select(`
                    id,
                    content_id,
                    last_accessed_at,
                    content:learning_content(
                        title,
                        subunit:learning_subunits(
                            unit:learning_units(
                                topic:learning_topics(
                                    course_id,
                                    course:learning_courses(
                                        learning_exams(name)
                                    )
                                )
                            )
                        )
                    )
                `)
                .eq('user_id', user.id)
                .order('last_accessed_at', { ascending: false })
                .limit(10);

            if (error || !progresses || progresses.length === 0) return null;

            const brand = activeExam.id.split('-')[0].toLowerCase();
            for (const progress of progresses) {
                const c = progress.content as any;
                if (!c) continue;

                let courseInfo = c.subunit?.unit?.topic?.course || c.unit?.topic?.course || c.topic?.course;
                if (courseInfo && courseInfo.learning_exams) {
                    const examName = courseInfo.learning_exams.name.toLowerCase();
                    if (examName.includes(brand)) {
                        let courseId = c.subunit?.unit?.topic?.course_id || c.unit?.topic?.course_id || c.topic?.course_id;
                        return { ...progress, courseId, contentId: (progress as any).content_id };
                    }
                }
            }
            return null;
        } catch (err) {
            console.error("Error fetching progress:", err);
            return null;
        }
    };

    const loadAllDashboardData = async (signal?: AbortSignal) => {
        if (!user || !activeExam?.id) return;

        // ── Read from prefetch cache first (instant load for returning users) ──
        const cached = readDashboardCache(user.id, activeExam.id);
        const testsData        = cached?.tests ?? null;
        const mockData         = cached?.mockSubmissions ?? null;
        const learningData     = cached?.learningProgress ?? null;
        const hasCachedData    = !!(testsData && (cached?.practiceResponses !== undefined));

        // Only show loading if we have no cached data to show
        if (!hasCachedData) setIsDashboardLoading(true);

        try {
            // Stage 1: Fetch fresh in parallel (using optimized RPCs)
            const [testsRes, mockSubmissionsRes, learningProgressRes, summaryStatsRes, subjectStatsRes] = await Promise.all([
                (supabase as any).from('tests').select('total_questions, correct_answers, created_at, test_type, status, is_mock').eq('exam_type', activeExam.id).eq('user_id', user.id).abortSignal(signal),
                supabase.from('mock_exam_submissions').select('id').eq('user_id', user.id).abortSignal(signal),
                supabase.from('learning_progress').select('last_accessed_at').eq('user_id', user.id).abortSignal(signal),
                (supabase as any).rpc('get_student_summary_stats_secure', {
                    user_uuid: String(user.id),
                    exam_type_id: String(activeExam.id)
                }),
                (supabase as any).rpc('get_analytics_subjects_secure', {
                    user_uuid: String(user.id),
                    exam_type_id: String(activeExam.id)
                })
            ]);

            if (signal?.aborted) return;

            // ── PROCESS DATES & STREAK ──
            const learningProgress = learningProgressRes.data || [];
            const tests = testsRes.data || [];
            const getUTCDateString = (date: Date) => date.toISOString().split('T')[0];

            const activeDatesSet = new Set([
                ...tests.map((t: any) => getUTCDateString(new Date(t.created_at))),
                ...learningProgress.map((p: any) => getUTCDateString(new Date(p.last_accessed_at)))
            ]);
            setActiveDates(activeDatesSet);

            let streak = 0;
            const now = new Date();
            const today = getUTCDateString(now);
            const yesterdayDate = new Date(now);
            yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
            const yesterday = getUTCDateString(yesterdayDate);

            if (activeDatesSet.has(today)) {
                let check = new Date(now);
                while (activeDatesSet.has(getUTCDateString(check))) {
                    streak++;
                    check.setUTCDate(check.getUTCDate() - 1);
                }
            } else if (activeDatesSet.has(yesterday)) {
                let check = new Date(yesterdayDate);
                while (activeDatesSet.has(getUTCDateString(check))) {
                    streak++;
                    check.setUTCDate(check.getUTCDate() - 1);
                }
            }

            let bestStreak = 0;
            if (activeDatesSet.size > 0) {
                const sorted = Array.from(activeDatesSet).sort();
                let current = 1;
                bestStreak = 1;
                for (let i = 1; i < sorted.length; i++) {
                    const d1 = new Date(sorted[i - 1]);
                    const d2 = new Date(sorted[i]);
                    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
                    if (diff === 1) {
                        current++;
                        bestStreak = Math.max(bestStreak, current);
                    } else {
                        current = 1;
                    }
                }
            }
            bestStreak = Math.max(bestStreak, streak);

            // ── PROCESS STATS ──
            const summary = (summaryStatsRes.data as any[])?.[0] || {};
            const subjectStats = (subjectStatsRes.data as any[]) || [];
            const mockSubmissions = mockSubmissionsRes?.data || [];
            const mockSolved = tests.filter((t: any) => t.is_mock || t.test_type === 'mock').length + mockSubmissions.length;
            
            const practiceTotal = summary.total_solved || 0;
            const globalAccuracy = Math.round(summary.accuracy_percent || 0);
            const totalQuestionsInTests = tests.reduce((acc: number, t: any) => acc + (t.total_questions || 0), 0);
            const totalQuestionsIncludingSkipped = practiceTotal + totalQuestionsInTests;
            
            const lastExam = tests.filter(t => t.status === 'completed').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            const lastExamScore = lastExam ? Math.round((lastExam.correct_answers / lastExam.total_questions) * 100) : 0;

            // Calculate "Getting Started" progress
            let progressScore = 0;
            if (practiceTotal > 0) progressScore += 25;
            if (streak > 0) progressScore += 25;
            if (mockSolved > 0) progressScore += 25;
            if (learningProgress.length > 0) progressScore += 25;
            if (progressScore === 0) progressScore = 5;

            setStats({
                totalQuestions: totalQuestionsIncludingSkipped,
                solved: practiceTotal,
                streak: streak,
                bestStreak: bestStreak,
                totalActiveDays: activeDatesSet.size,
                avgTime: summary.time_spent_hours || 0,
                mockExams: mockSolved,
                accuracy: globalAccuracy,
                lastExamScore: lastExamScore,
                gettingStartedProgress: progressScore
            });

            // ── PROCESS MASTERY ──
            const mastery = (activeExam.sections || []).map((section: any) => {
                const sectionName = section.name || '';
                const subjStat = subjectStats.find(s => (s.subject || '').toLowerCase() === sectionName.toLowerCase());
                return {
                    subject: sectionName,
                    solved: subjStat?.total || 0,
                    total: section.questionsPerExam || 20,
                    accuracy: Math.round(subjStat?.accuracy || 0)
                };
            });
            setSubjectMastery(mastery);

            // Stage 2: Parallel Fetch for non-critical data
            const [championsRes, progressData] = await Promise.all([
                fetchTopStudents(),
                fetchLastProgress()
            ]);
            setLastProgress(progressData);

            // IELTS Extras
            if (activeExam?.id === 'ielts-academic') {
                const [rC, lC, wC, wScores] = await Promise.all([
                    supabase.from('reading_submissions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('listening_submissions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('writing_submissions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('writing_submissions').select('writing_feedback(overall_score)').eq('user_id', user.id).eq('status', 'completed')
                ]);
                const scores = (wScores.data as any[])?.flatMap(w => w.writing_feedback).map((f: any) => f.overall_score).filter(s => !!s) || [];
                const avgBand = scores.length > 0 ? Number((scores.reduce((a: any, b: any) => a + b, 0) / scores.length).toFixed(1)) : 0;
                setIeltsStats({
                    reading: rC.count || 0,
                    listening: lC.count || 0,
                    writing: wC.count || 0,
                    avgBand
                });

                const { data: userWritingScores } = await supabase
                    .from('writing_submissions')
                    .select('id, created_at, status, writing_feedback(overall_score)')
                    .eq('user_id', user.id)
                    .in('status', ['pending', 'completed'])
                    .order('created_at', { ascending: false })
                    .limit(3);
                setRecentEvaluations(userWritingScores || []);
            }

        } catch (error) {
            console.error("Dashboard Sync Error:", error);
        } finally {
            await refreshActiveTest();
            setIsDashboardLoading(false);
            // Invalidate the prefetch cache so the next visit triggers a fresh prefetch
            invalidateDashboardCache();
        }
    };

    const fetchTopStudents = async () => {
        try {
            if (!activeExam?.id) return;
            const { data: championsData, error } = await supabase
                .rpc('get_champions_by_questions_solved', { target_exam_id: activeExam.id });

            if (error) {
                console.error("Error fetching champions:", error);
                return;
            }

            console.log("Champions data received:", championsData);

            if (!championsData || (championsData as any[]).length === 0) {
                console.log("No champions data available");
                setTopStudents([]);
                return;
            }

            const studentsWithScores: TopStudent[] = (championsData as any[]).map((champion: any) => ({
                id: champion.user_id,
                display_name: champion.display_name || 'Student',
                email: null,
                avatar_url: champion.avatar_url,
                total_score: champion.questions_solved, // Questions solved
                tests_taken: champion.total_questions, // Total available questions
                accuracy: champion.accuracy, // Real accuracy percentage
            }));

            setTopStudents(studentsWithScores.slice(0, 10)); // Increased to 10 for scrollable view
        } catch (err) {
            console.error("Failed to load champions", err);
        }
    };

    // --- Live Ranking Logic ---
    const [rankingView, setRankingView] = useState<'all-time' | 'live'>('all-time');
    const [liveRankings, setLiveRankings] = useState<TopStudent[]>([]);

    const fetchLiveRankings = async () => {
        if (!activeExam?.id) return;

        try {
            // 1. Find ACTIVE session for this exam
            const now = new Date().toISOString();
            const { data: activeSession } = await (supabase as any)
                .from('mock_sessions')
                .select('id')
                .eq('exam_type', activeExam.id)
                .lte('start_time', now)
                .gte('end_time', now)
                .maybeSingle();

            if (!activeSession) {
                setLiveRankings([]);
                return;
            }

            // 2. Call RPC to fetch deduplicated leaderboard with raw metrics
            const { data: leaderboard, error } = await supabase.rpc('get_mock_leaderboard', {
                target_session_id: activeSession.id
            });

            if (error) {
                console.error("Error fetching mock leaderboard:", error);
                return;
            }

            if (leaderboard) {
                // Group by user and take best attempt (highest score, then fastest time)
                const bestAttemptsMap = new Map<string, any>();
                (leaderboard as any[]).forEach(item => {
                    const existing = bestAttemptsMap.get(item.user_id);
                    const currentScore = item.percentage_score || 0;
                    const existingScore = existing?.percentage_score || 0;

                    const currentTime = item.time_taken_seconds || 999999;
                    const existingTime = existing?.time_taken_seconds || 999999;

                    if (!existing || currentScore > existingScore || (currentScore === existingScore && currentTime < existingTime)) {
                        bestAttemptsMap.set(item.user_id, item);
                    }
                });

                const sortedData = Array.from(bestAttemptsMap.values())
                    .sort((a, b) => {
                        const scoreDiff = (b.percentage_score || 0) - (a.percentage_score || 0);
                        if (scoreDiff !== 0) return scoreDiff;
                        return (a.time_taken_seconds || 0) - (b.time_taken_seconds || 0);
                    });

                const liveData: TopStudent[] = sortedData.map((item: any) => {
                    // Calculate raw score using exam config
                    let rawScore = item.percentage_score || 0;

                    const configId = activeExam.id === 'cent-s' ? 'cent-s-prep' :
                        (activeExam.id === 'imat' ? 'imat-prep' :
                            (activeExam.id === 'sat' ? 'sat-prep' :
                                (activeExam.id === 'tolc-e' ? 'tolc-e' :
                                    (activeExam.id === 'til-i' ? 'til-i' : activeExam.id))));

                    const examConfig = allExams[configId];

                    if (examConfig && examConfig.scoring) {
                        const correct = item.correct_answers || 0;
                        const wrong = item.wrong_answers || 0;
                        const skipped = item.skipped_answers || 0;

                        // Use raw point formula from config
                        rawScore = (correct * examConfig.scoring.correct) +
                            (wrong * examConfig.scoring.incorrect) +
                            (skipped * examConfig.scoring.skipped);

                        rawScore = Math.round(rawScore * 100) / 100;
                    }

                    return {
                        id: item.user_id,
                        display_name: item.display_name,
                        email: null,
                        avatar_url: item.avatar_url,
                        total_score: rawScore,
                        tests_taken: 1,
                        accuracy: item.percentage_score,
                    };
                });
                setLiveRankings(liveData);
            }
        } catch (err) {
            console.error("Error fetching live rankings:", err);
        }
    };

    useEffect(() => {
        if (rankingView === 'live') {
            fetchLiveRankings();
            // Optional: Poll every 60s
            const interval = setInterval(fetchLiveRankings, 60000);
            return () => clearInterval(interval);
        }
    }, [rankingView, activeExam?.id]);


    const [lastProgress, setLastProgress] = useState<any>(null);
    const [latestBlogPost, setLatestBlogPost] = useState<any>(null);

    useEffect(() => {
        supabase
            .from('blog_posts')
            .select('id, title, slug, excerpt, featured_image, published_at, created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
            .then(({ data }) => { if (data) setLatestBlogPost(data); });
    }, []);

    // Fetch upcoming mock session
    useEffect(() => {
        if (!activeExam?.id) return;
        const now = new Date().toISOString();
        (supabase as any)
            .from('mock_sessions')
            .select('id, title, start_time, end_time, exam_type')
            .eq('exam_type', activeExam.id)
            .gte('start_time', now)
            .order('start_time', { ascending: true })
            .limit(1)
            .maybeSingle()
            .then(({ data }: any) => { if (data) setUpcomingSession(data); });
    }, [activeExam?.id]);



    const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Student';

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        if (hour < 21) return 'Good Evening';
        return 'Good Night';
    };

    // Calculate Dynamic Insights
    const weakestSubject = subjectMastery.length > 0
        ? [...subjectMastery].sort((a, b) => a.accuracy - b.accuracy)[0]
        : null;

    const overallAccuracy = stats.accuracy;
    const oracleProjection = overallAccuracy.toString();

    const practiceText = weakestSubject && weakestSubject.solved > 0
        ? (
            <>
                Focus on <span className="underline decoration-indigo-300 underline-offset-4 decoration-2">{weakestSubject.subject}</span>.
                Recent data suggests a {100 - weakestSubject.accuracy}% logic gap in this sector.
            </>
        ) : (
            "Complete 3 practice sessions to unlock advanced performance insights."
        );

    const handleStartPractice = useCallback(() => {
        if (activeTest) {
            const examConfig = allExams[activeTest.exam_type];
            const isSectioned = !!(examConfig && examConfig.sections && examConfig.sections.length > 1);

            toast({
                title: "Active Mission Found",
                description: `Complete ${activeTest.subject} before starting new intel collection.`,
                variant: "destructive",
                action: (
                    <ToastAction
                        altText="Resume Test"
                        onClick={() => navigate(`/test/${activeTest.id}`)}
                    >
                        Resume
                    </ToastAction>
                ),
            });
            return;
        }

        if (!weakestSubject) return;

        const params = new URLSearchParams({
            subject: weakestSubject.subject,
            count: '10',
            mode: 'practice',
            auto: 'true'
        });

        const url = `/start-test?${params.toString()}`;
        const width = 1200;
        const height = 800;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        window.open(
            url,
            'ItalostudyMissionWindow',
            `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
        );

        toast({
            title: 'Italostudy Practice Setup',
            description: `Preparing targeted practice for ${weakestSubject.subject}.`,
        });
    }, [weakestSubject, toast]);

    // The Dashboard now returns a stable Layout that stays mounted throughout the loading process.
    // This prevents the Sidebar/Header from flickering between Auth Loading and Data Loading.
    return (
        <Layout isLoading={loading || isDashboardLoading}>
            {!(loading || isDashboardLoading) && (
                <>
                    <LatestNotificationPopup />


                    {/* Active Test Resume Strip */}
            {activeTest && !isTestNotificationDismissed && (
                <div className="sticky top-0 z-50 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 shadow-lg shadow-indigo-900/20 border-b border-white/10">
                    <div className="max-w-7xl mx-auto px-4 md:px-6">
                        <div className="flex items-center gap-3 py-2.5">
                            {/* Pulsing dot + icon */}
                            <div className="relative flex-shrink-0">
                                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center border border-white/20">
                                    <Play className="w-3.5 h-3.5 text-white fill-white" />
                                </div>
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-indigo-600 animate-pulse" />
                            </div>

                            {/* Labels */}
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-[9px] font-black text-white/50 uppercase tracking-widest hidden sm:block flex-shrink-0">In Progress</span>
                                <span className="text-[9px] text-white/30 hidden sm:block">·</span>
                                <p className="text-sm font-black text-white truncate">{activeTest.subject}</p>
                                <span className="text-[9px] text-white/30 hidden md:block">·</span>
                                <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider hidden md:block flex-shrink-0">
                                    {activeTest.is_mock && activeTest.current_section
                                        ? (() => { const cfg = allExams[activeTest.exam_type]; return cfg?.sections[activeTest.current_section - 1]?.name || `Sec ${activeTest.current_section}`; })()
                                        : ''
                                    }
                                    {' '}{Math.floor(activeTest.time_remaining_seconds / 60)}m left
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => { const url = `/test/${activeTest.id}`; const width = 1200; const height = 800; const left = (window.screen.width - width) / 2; const top = (window.screen.height - height) / 2; window.open(url, 'ItalostudyMissionWindow', `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`); }}
                                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white font-black text-[10px] uppercase tracking-widest px-3.5 py-1.5 rounded-lg border border-white/25 transition-all backdrop-blur-sm"
                                >
                                    <Play size={9} className="fill-white" /> Resume
                                </button>
                                <button onClick={() => setIsTestNotificationDismissed(true)} className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                                    <X size={13} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Resolved Question Reports Banner */}
            {resolvedReports.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-500/30">
                    <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4 text-amber-600 animate-bounce" />
                            </div>
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                                <span className="font-black">{resolvedReports.length}</span> reported question{resolvedReports.length > 1 ? 's' : ''} resolved by our team!
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={() => navigate('/bookmarks')} size="sm" className="h-8 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest rounded-lg px-3">
                                Review
                            </Button>
                            <button onClick={() => dismissAllReports()} className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors text-amber-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
                {/* â”€â”€ HERO GREETING BANNER â”€â”€ */}
                <div className="relative overflow-hidden bg-gradient-to-r from-orange-400 via-rose-500 to-purple-600 dark:from-orange-600 dark:via-rose-700 dark:to-purple-800">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.08),transparent_60%)]" />
                    <div className="absolute top-0 right-0 w-96 h-full opacity-10 bg-[radial-gradient(circle_at_center,white,transparent_70%)]" />
                    <div className="max-w-7xl mx-auto px-4 md:px-6 py-7 relative z-10">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <p className="text-white/70 text-sm font-semibold mb-1 flex items-center gap-2">
                                    <span className="text-lg">
                                        {new Date().getHours() < 12 ? 'ðŸŒ…' : new Date().getHours() < 17 ? 'â˜€ï¸' : new Date().getHours() < 21 ? 'ðŸŒ†' : 'ðŸŒ™'}
                                    </span>
                                    {getGreeting()}, <span className="text-white font-bold capitalize">{displayName.split(' ')[0]}</span>!
                                </p>
                                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight flex items-center gap-3">
                                    {hasStudyPlan ? (
                                        <>
                                            Your study plan is active
                                            <span className="inline-flex items-center gap-1 text-indigo-400 font-bold bg-indigo-900/40 border border-indigo-500/30 px-2.5 py-1 rounded-lg text-sm uppercase tracking-widest shadow-inner">
                                                <Target className="w-4 h-4" /> On Track
                                            </span>
                                        </>
                                    ) : (
                                        "Great things never come from comfort zones."
                                    )}
                                </h1>
                            </div>
                            {/* Stats Pills */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
                                    <Zap className="w-4 h-4 text-yellow-300" />
                                    <span className="text-white font-black text-sm"><CountUp to={stats.solved} /> <span className="text-white/60 font-medium text-xs">XP</span></span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
                                    <Trophy className="w-4 h-4 text-amber-300" />
                                    <span className="text-white font-black text-sm"><CountUp to={stats.mockExams} /> <span className="text-white/60 font-medium text-xs">Stars</span></span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
                                    <Flame className="w-4 h-4 text-orange-300" />
                                    <span className="text-white font-black text-sm"><CountUp to={stats.streak} /> <span className="text-white/60 font-medium text-xs">Days</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── MAIN CONTENT ── */}
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
                    <div className="grid lg:grid-cols-12 gap-6">

                        {/* ── LEFT MAIN COLUMN ── */}
                        <div className="lg:col-span-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

                            {/* Getting Started / Guided Path */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                                            <span className="text-lg">🌟</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Getting started</p>
                                            <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">Your guided path to mastering ItaloStudy</h2>
                                        </div>
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stats.gettingStartedProgress}%` }}
                                            transition={{ duration: 1.2, ease: 'easeOut' }}
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                                        />
                                    </div>
                                    <span className="text-xs font-black text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                        {stats.gettingStartedProgress}%
                                    </span>
                                </div>
                                {/* Quick Action Buttons */}
                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={() => navigate('/practice')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest h-9 px-4 rounded-xl">
                                        Start Practice
                                    </Button>
                                    <Button onClick={() => navigate('/mock-exams')} variant="outline" className="font-black text-xs uppercase tracking-widest h-9 px-4 rounded-xl border-slate-200 dark:border-slate-700">
                                        Take a Mock
                                    </Button>
                                </div>
                            </div>


                            {/* Quick Navigation Icons */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                                <div className="flex items-center overflow-x-auto gap-4 pb-1 scrollbar-none">
                                    {[
                                        { label: 'Learning', icon: GraduationCap, path: '/learning', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600', isSoon: true },
                                        { label: 'Practice', icon: Pencil, path: '/practice', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' },
                                        { label: 'Mocks', icon: ClipboardList, path: '/mock-exams', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' },
                                        { label: 'Bookmarks', icon: Bookmark, path: '/bookmarks', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' },
                                        { label: 'Resources', icon: FileText, path: '/resources', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600' },
                                        { label: 'History', icon: History, path: '/history', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600' },
                                        { label: 'Analytics', icon: BarChart3, path: '/analytics', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' },
                                        { label: 'Chat', icon: MessageCircle, path: '/community', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' },
                                        { label: 'Blogs', icon: BookOpen, path: '/blog', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' },
                                    ]
                                    .map((item) => {
                                        const isExternalStatic = ['/resources', '/blog'].includes(item.path);
                                        const externalUrl = item.path === '/blog' ? 'https://italostudy.com/blog' : 'https://italostudy.com/resources';
                                        const content = (
                                            <>
                                                <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all`}>
                                                    <item.icon className="w-6 h-6" />
                                                </div>
                                                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center leading-tight">{item.label}</span>
                                            </>
                                        );

                                        if (isExternalStatic) {
                                            return (
                                                <a key={item.label} href={externalUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 min-w-[60px] group">
                                                    {content}
                                                </a>
                                            );
                                        }

                                        return (
                                            <button key={item.label} onClick={() => {
                                                navigate(item.path);
                                            }} className="flex flex-col items-center gap-2 min-w-[60px] group">
                                                {content}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                {[
                                    { label: 'Total Solved', value: stats.solved, icon: Search, gradient: 'from-indigo-500 to-indigo-700' },
                                    { label: 'Mock Exams', value: stats.mockExams, icon: ClipboardList, gradient: 'from-rose-500 to-rose-700' },
                                    { label: 'Streak', value: stats.streak, icon: Zap, suffix: 'd', gradient: 'from-orange-500 to-orange-700' },
                                    { label: 'Avg Time', value: stats.avgTime, icon: Clock, suffix: 's', gradient: 'from-cyan-500 to-cyan-700' },
                                    { label: 'Accuracy', value: stats.accuracy, icon: Trophy, suffix: '%', gradient: 'from-pink-500 to-pink-700' },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm text-center group hover:-translate-y-0.5 transition-all">
                                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mx-auto mb-2 shadow-sm`}>
                                            <stat.icon className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="text-xl font-black text-slate-900 dark:text-white leading-none mb-1">
                                            <CountUp to={stat.value} suffix={stat.suffix || ''} />
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* IELTS Mission Stats (conditional) */}
                            {activeExam?.id === 'ielts-academic' && (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                                            <Award className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">IELTS Mission Stats</h2>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Completion Breakdown</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Reading', count: ieltsStats.reading, icon: 'ðŸ“–' },
                                            { label: 'Listening', count: ieltsStats.listening, icon: 'ðŸŽ§' },
                                            { label: 'Writing', count: ieltsStats.writing, icon: 'âœï¸' },
                                            { label: 'Avg Band', count: ieltsStats.avgBand || 'â€”', icon: 'ðŸ†' },
                                        ].map((stat, i) => (
                                            <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700">
                                                <div className="text-2xl mb-1">{stat.icon}</div>
                                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.count}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Continue Learning + Your Progress */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                {/* Continue Learning - Video */}
                                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 p-5 shadow-lg">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full -mr-10 -mt-10" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Play className="w-4 h-4 text-white fill-white" />
                                            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Continue Learning</span>
                                            <span className="ml-auto text-[8px] bg-white/20 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Video</span>
                                        </div>
                                        <h3 className="text-white font-black text-base leading-tight mb-1 truncate">
                                            {lastProgress?.content?.title || (weakestSubject ? weakestSubject.subject : 'Start Video Lessons')}
                                        </h3>
                                        <p className="text-white/70 text-xs font-bold mb-4">
                                            {lastProgress ? 'Pick up where you left off' : weakestSubject ? `Weakest area · ${weakestSubject.accuracy}% accuracy` : 'Jump into your first video lesson'}
                                        </p>
                                        <button
                                            onClick={() => {
                                                toast({
                                                    title: "Under Development",
                                                    description: "The Learning Portal is currently under development. Stay tuned for exciting updates!",
                                                });
                                            }}
                                            className="flex items-center gap-2 bg-white text-orange-600 font-black text-xs uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-orange-50 transition-colors"
                                        >
                                            {lastProgress ? 'Resume Lecture' : 'Start Learning'} <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                {/* Your Progress â€” Last Exam Score */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Progress</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 h-[calc(100%-40px)]">
                                        {/* Last Exam Score */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex flex-col items-center justify-center text-center border border-slate-100 dark:border-slate-700">
                                            <BarChart3 className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-2" />
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Exam</p>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white">
                                                {stats.lastExamScore !== null ? <><CountUp to={stats.lastExamScore} suffix="%" /></> : '—'}
                                            </p>
                                            {stats.lastExamScore === null && <p className="text-[8px] text-slate-400 mt-1 leading-tight">No exam history yet</p>}
                                        </div>
                                        {/* Next Best Action */}
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 flex flex-col border border-indigo-100 dark:border-indigo-500/20">
                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Next Action</p>
                                            <p className="text-xs font-black text-slate-700 dark:text-slate-200 leading-tight mb-3 flex-1">
                                                {weakestSubject ? <>Focus on <span className="text-indigo-600">{weakestSubject.subject}</span></> : 'Take your diagnostic exam'}
                                            </p>
                                            <Button
                                                onClick={() => navigate(weakestSubject ? '/practice' : '/mock-exams')}
                                                size="sm"
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-widest h-7 px-3 rounded-lg"
                                            >
                                                {weakestSubject ? 'Practice Now' : 'Start Now'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* IELTS Recent Evaluations (conditional) */}
                            {activeExam?.id === 'ielts-academic' && recentEvaluations.length > 0 && (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                                                <Sparkles className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Evaluations</h3>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Writing Feedback</p>
                                            </div>
                                        </div>
                                        <Link to="/writing/history" className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest">View All →</Link>
                                    </div>
                                    <div className="space-y-3">
                                        {recentEvaluations.map((evalItem: any) => (
                                            <div key={evalItem.id} className="group p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 transition-all cursor-pointer flex items-center gap-3" onClick={() => navigate(`/writing/results/${evalItem.id}`)}>
                                                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">âœï¸</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase">Writing Task</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <div className={`h-1.5 w-1.5 rounded-full ${evalItem.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{evalItem.status}</p>
                                                    </div>
                                                </div>
                                                {evalItem.status === 'completed' && evalItem.writing_feedback?.[0] && (
                                                    <div className="text-right shrink-0">
                                                        <p className="text-xl font-black text-indigo-600 leading-none">{evalItem.writing_feedback[0].overall_score}</p>
                                                        <p className="text-[7px] font-black text-slate-300 uppercase mt-0.5">Band</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Subject Mastery */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm mt-5">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                                            <GraduationCap className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Subject Mastery</h2>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Competency Breakdown</p>
                                        </div>
                                    </div>
                                    <Link to="/subjects" className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest">
                                        Expand →
                                    </Link>
                                </div>
                                <div className="space-y-5">
                                    {subjectMastery.slice(0, 5).map((subject, i) => (
                                        <SubjectMasteryItem key={i} subject={subject} index={i} />
                                    ))}
                                    {subjectMastery.length === 0 && (
                                        <div className="text-center py-8 text-slate-400">
                                            <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                            <p className="text-xs font-bold">Complete practice sessions to see your mastery breakdown.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT SIDEBAR ── */}
                        <div className="lg:col-span-4 space-y-5 animate-in fade-in slide-in-from-right-4 duration-700">

                            {/* Weekly Streak Calendar */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white">Weekly Streak</h3>
                                    </div>
                                </div>

                                <div className="flex justify-between gap-1 mb-4">
                                    {(() => {
                                        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                                        return Array.from({ length: 7 }, (_, i) => {
                                            const d = new Date();
                                            d.setDate(d.getDate() - (6 - i));
                                            const dateStr = format(d, 'yyyy-MM-dd');
                                            const label = ['S','M','T','W','T','F','S'][d.getDay()];
                                            const isToday = i === 6;
                                            const didPractice = activeDates.has(dateStr);
                                            return (
                                                <div key={i} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase truncate">{label}</span>
                                                    <div className={`aspect-square w-full max-w-[32px] rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                                        isToday
                                                            ? didPractice
                                                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900'
                                                                : 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900'
                                                            : didPractice
                                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                                                : 'bg-red-100 dark:bg-red-900/20 text-red-400'
                                                    }`}>
                                                        {didPractice ? '✓' : '✗'}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>

                                {/* Streak Stats */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-lg font-black text-slate-900 dark:text-white"><CountUp to={stats.streak} /></p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Current</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-slate-900 dark:text-white"><CountUp to={stats.bestStreak} /></p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Best</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-slate-900 dark:text-white"><CountUp to={stats.totalActiveDays} /></p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                                    </div>
                                </div>
                                <p className="text-center text-[9px] text-slate-400 font-bold mt-2">
                                    {stats.streak > 0 ? `🔥 ${stats.streak} day streak — keep it up!` : 'Start practicing to build your streak!'}
                                </p>
                            </div>

                            {/* Upcoming Exams / Mock Sessions */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-7 h-7 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                                        <Bell className="w-4 h-4 text-violet-600" />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Upcoming Exams</h3>
                                </div>
                                {upcomingSession ? (
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                                                <Calendar className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-900 dark:text-white truncate">{upcomingSession.title || 'Mock Exam'}</p>
                                                <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">
                                                    {format(new Date(upcomingSession.start_time), 'MMM d · h:mm a')}
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-bold mt-1">{upcomingSession.exam_type?.toUpperCase()}</p>
                                            </div>
                                        </div>
                                        <Button onClick={() => navigate('/mock-exams', { state: { tab: 'upcoming' } })} size="sm" className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-widest h-8 rounded-xl">
                                            View Exam →
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-4 text-center">
                                        <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3 border border-slate-100 dark:border-slate-700">
                                            <Calendar className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <p className="text-xs font-black text-slate-400 mb-3">No upcoming exams</p>
                                        <Button onClick={() => navigate('/mock-exams', { state: { tab: 'upcoming' } })} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-widest h-8 px-4 rounded-xl">
                                            Browse Exams →
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Latest Blog Post */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/30 rounded-md flex items-center justify-center">
                                            <BookOpen className="w-3 h-3 text-indigo-600" />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latest Blog Post</p>
                                    </div>
                                    <a href="https://italostudy.com/blog" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest flex items-center gap-1">
                                        View All <ChevronRight className="w-3 h-3" />
                                    </a>
                                </div>
                                {latestBlogPost ? (
                                    <a href={`https://italostudy.com/blog/${latestBlogPost.slug}`} target="_blank" rel="noopener noreferrer" className="group flex gap-3 items-start hover:opacity-95 transition-opacity">
                                        {latestBlogPost.featured_image && (
                                            <div className="w-20 h-16 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                                                <img
                                                    src={latestBlogPost.featured_image}
                                                    alt={latestBlogPost.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">
                                                {latestBlogPost.published_at ? format(new Date(latestBlogPost.published_at), 'MMM d, yyyy') : format(new Date(latestBlogPost.created_at), 'MMM d, yyyy')}
                                            </p>
                                            <h3 className="text-xs font-black text-slate-900 dark:text-white leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors mb-1">
                                                {latestBlogPost.title}
                                            </h3>
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-600 group-hover:text-indigo-700 uppercase tracking-widest">
                                                Read Now <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                            </span>
                                        </div>
                                    </a>
                                ) : (
                                    <div className="flex gap-3 items-center animate-pulse">
                                        <div className="w-20 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                                            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-4/5" />
                                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Top Students Leaderboard */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm ${rankingView === 'live' ? 'bg-rose-500' : 'bg-gradient-to-br from-orange-400 to-orange-600'}`}>
                                            {rankingView === 'live' ? <Zap className="w-4 h-4 text-white" /> : <Trophy className="w-4 h-4 text-white" />}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-900 dark:text-white">{rankingView === 'live' ? 'Mock Ranking' : 'Top Students'}</h3>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{rankingView === 'live' ? 'Mock Session' : 'Champions League'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {rankingView === 'live' && liveRankings.length > 0 && (
                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest">Live</span>
                                            </div>
                                        )}
                                        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                            <button onClick={() => setRankingView('all-time')} className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${rankingView === 'all-time' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>All Time</button>
                                            <button onClick={() => setRankingView('live')} className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${rankingView === 'live' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400'}`}>Mock</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-y-auto max-h-[280px] space-y-2 custom-scrollbar">
                                    {rankingView === 'all-time' ? (
                                        <>
                                            {topStudents.slice(0, 10).map((student, i) => (
                                                <ChampionItem key={student.id} student={student} index={i} />
                                            ))}
                                            {topStudents.length === 0 && (
                                                <div className="flex flex-col items-center justify-center text-center py-8 grayscale opacity-50">
                                                    <Trophy className="w-12 h-12 text-slate-200 dark:text-slate-800 mb-3" />
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Champions Yet</p>
                                                    <p className="text-[10px] text-slate-400/80 mt-1">Solve practice questions to claim the throne!</p>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {liveRankings.length > 0 ? (
                                                liveRankings.map((student, i) => (
                                                    <MockChampionItem key={student.id} student={student} index={i} />
                                                ))
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-center py-8 opacity-70">
                                                    <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-3 animate-pulse">
                                                        <Clock className="w-6 h-6 text-rose-400" />
                                                    </div>
                                                    <p className="text-xs font-black text-rose-400 uppercase tracking-widest">No Mock Ranking</p>
                                                    <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">Rankings appear during scheduled mock sessions.</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* WhatsApp Community */}
                            <div
                                onClick={() => window.open('https://chat.whatsapp.com/CfVh7u9L6vT7ZFpZwwVa4A', '_blank')}
                                className="group relative p-5 rounded-2xl bg-[#25D366] text-white cursor-pointer shadow-lg hover:-translate-y-0.5 transition-all border border-white/10 overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-400/10 blur-2xl rounded-full -mr-10 -mt-10 group-hover:bg-emerald-400/20 transition-colors" />
                                <div className="relative z-10 flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-xl bg-white text-[#25D366] flex items-center justify-center shadow-md group-hover:rotate-12 transition-transform">
                                            <MessageCircle className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-tight leading-none">WhatsApp Squad</h4>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                <p className="text-[8px] font-bold text-emerald-100/60 uppercase tracking-widest">Global Hub</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="relative z-10 text-[10px] font-bold text-emerald-100/80 leading-snug mb-3">
                                        Prep tips & live updates from <span className="text-white font-black">2000+ Students</span>. 📚✨
                                </p>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="w-6 h-6 rounded-full border-2 border-[#25D366] bg-slate-800 overflow-hidden shadow-md">
                                                <img src={`https://i.pravatar.cc/100?img=${i + 20}`} alt="User" className="w-full h-full object-cover opacity-90" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1 text-white/60 group-hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest">
                                        <span>Join Now</span>
                                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </div>



                        </div>
                        <div className="lg:col-span-12 mt-8">
                             <StudyPlannerWidget examType={activeExam?.id} />
                        </div>
                    </div>
                </div>
                </div>
                </>
            )}

            <SeatTrackerModal isOpen={isTrackerModalOpen} onClose={() => setIsTrackerModalOpen(false)} isGlobal={hasPremiumAccess} />
            <TrustpilotReviewModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                onSuccess={() => {
                    setShowReviewModal(false);
                }}
            />
            <PWAPrompt />
        </Layout>
    );
}
