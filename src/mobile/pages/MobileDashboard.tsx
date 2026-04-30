
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Play, BookOpen, Trophy, ArrowRight, Zap, Target,
    Loader2, Sparkles, Clock, Clock as HistoryIcon, User,
    BarChart3, Bookmark, FlaskConical, GraduationCap,
    Award, ChevronRight, Bell, Dna, Brain, Calculator, FileText,
    Languages, Database, Microscope, ClipboardList,
    Headphones, PenTool, Mic, MessageSquare, MessageCircle, CheckCircle2, X, ShieldCheck, Flame, Crown, Calendar
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useExam } from '@/context/ExamContext';
// EXAMS import removed
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import MobileLayout from '../components/MobileLayout';
import { useActiveTest } from '@/hooks/useActiveTest';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { lazy, Suspense } from 'react';

const UpgradeModal = lazy(() => import('@/components/UpgradeModal').then(mod => ({ default: mod.UpgradeModal })));
const SeatTrackerModal = lazy(() => import('@/components/SeatTrackerModal').then(mod => ({ default: mod.SeatTrackerModal })));
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
// import { NotificationPrompt } from '@/components/NotificationPrompt';
import { DashboardSkeleton } from '@/mobile/components/DashboardSkeleton';
import { useToast } from '@/hooks/use-toast';
import { PWAPrompt } from '@/components/PWAPrompt';
import StudyPlannerWidget from '@/components/StudyPlannerWidget';

interface SubjectMastery {
    subject: string;
    solved: number;
    total: number;
    accuracy: number;
}

interface TopStudent {
    id: string;
    display_name: string;
    total_score: number; // This is questions_solved
    exam_total: number;
    avatar_url?: string | null;
    accuracy?: number;
}


const COLORS = [
    "bg-red-200 text-red-700",
    "bg-orange-200 text-orange-700",
    "bg-amber-200 text-amber-700",
    "bg-yellow-200 text-yellow-700",
    "bg-lime-200 text-lime-700",
    "bg-green-200 text-green-700",
    "bg-emerald-200 text-emerald-700",
    "bg-teal-200 text-teal-700",
    "bg-cyan-200 text-cyan-700",
    "bg-sky-200 text-sky-700",
    "bg-blue-200 text-blue-700",
    "bg-indigo-200 text-indigo-700",
    "bg-violet-200 text-violet-700",
    "bg-purple-200 text-purple-700",
    "bg-fuchsia-200 text-fuchsia-700",
    "bg-pink-200 text-pink-700",
    "bg-rose-200 text-rose-700",
];

const generateAvatarColor = (name: string) => {
    if (!name) return COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
};

const MobileDashboard: React.FC = () => {
    const { user, profile, loading } = useAuth();

    const displayName = React.useMemo(() => {
        return profile?.display_name ||
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            user?.user_metadata?.given_name ||
            user?.email?.split('@')[0] ||
            "Student";
    }, [profile, user]);

    const firstName = React.useMemo(() => displayName.split(' ')[0], [displayName]);

    const { activeExam, allExams } = useExam();
    const { activeTest, refreshActiveTest } = useActiveTest();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { isExplorer, isGlobal } = usePlanAccess();
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
    const [isTestNotificationDismissed, setIsTestNotificationDismissed] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/auth');
        } else if (!loading && user && profile && (!profile.selected_exam || !profile.selected_plan)) {
            navigate('/onboarding');
        }
    }, [user, loading, profile, navigate]);

    const getSubjectIcon = (subject: string) => {
        const s = subject.toLowerCase();
        if (s.includes('biol')) return <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg"><Dna size={16} /></div>;
        if (s.includes('chem')) return <div className="p-2 bg-rose-500/20 text-rose-500 rounded-lg"><FlaskConical size={16} /></div>;
        if (s.includes('phys')) return <div className="p-2 bg-cyan-500/20 text-cyan-500 rounded-lg"><Database size={16} /></div>;
        if (s.includes('math')) return <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg"><Calculator size={16} /></div>;
        if (s.includes('logic')) return <div className="p-2 bg-indigo-500/20 text-indigo-500 rounded-lg"><Brain size={16} /></div>;

        // IELTS Specific Colorful Icons
        if (s.includes('read')) return <div className="p-2 bg-sky-500/20 text-sky-500 rounded-lg"><BookOpen size={16} /></div>;
        if (s.includes('listen')) return <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg"><Headphones size={16} /></div>;
        if (s.includes('writ')) return <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg"><PenTool size={16} /></div>;
        if (s.includes('speak')) return <div className="p-2 bg-rose-500/20 text-rose-500 rounded-lg"><Mic size={16} /></div>;
        if (s.includes('comm')) return <div className="p-2 bg-violet-500/20 text-violet-500 rounded-lg"><MessageSquare size={16} /></div>;

        if (s.includes('read') || s.includes('listen') || s.includes('writ') || s.includes('speak')) return <div className="p-2 bg-violet-500/20 text-violet-500 rounded-lg"><Languages size={16} /></div>;
        return <div className="p-2 bg-slate-500/20 text-slate-500 rounded-lg"><BookOpen size={16} /></div>;
    };

    const [stats, setStats] = useState({
        solved: 0,
        accuracy: 0,
        streak: 0,
        bestStreak: 0,
        totalActiveDays: 0,
        totalQuestions: 0,
        mockSolved: 0,
        avgTime: 0,
        todayPracticeMinutes: 0
    });

    const [subjectMastery, setSubjectMastery] = useState<SubjectMastery[]>([]);
    const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
    const [platformTotalQuestions, setPlatformTotalQuestions] = useState(0);

    const [ieltsStats, setIeltsStats] = useState({
        reading: 0,
        listening: 0,
        writing: 0,
        avgBand: 0
    });
    // ── Mobile Dashboard Cache (stale-while-revalidate) ──
    const MOBILE_DASH_CACHE_KEY = user?.id ? `mobile_dash_cache_${user.id}` : null;
    const readMobileDashCache = () => {
        if (!MOBILE_DASH_CACHE_KEY) return null;
        try { const r = localStorage.getItem(MOBILE_DASH_CACHE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
    };
    const writeMobileDashCache = (data: any) => {
        if (!MOBILE_DASH_CACHE_KEY) return;
        try { localStorage.setItem(MOBILE_DASH_CACHE_KEY, JSON.stringify(data)); } catch {}
    };

    const [isLoading, setIsLoading] = useState(() => {
        // If we have a cached profile and exam, check for dashboard cache
        if (user?.id && activeExam?.id) {
            try {
                const key = `mobile_dash_cache_${user.id}`;
                const cached = localStorage.getItem(key);
                if (cached) return false; // instant — no skeleton for returning users
            } catch {}
        }
        return true;
    });
    const [rankingView, setRankingView] = useState<'all-time' | 'live'>('all-time');
    const [liveRankings, setLiveRankings] = useState<TopStudent[]>([]);
    const [activeDates, setActiveDates] = useState<Set<string>>(new Set());
    const [latestBlogPost, setLatestBlogPost] = useState<any>(null);
    const [upcomingSession, setUpcomingSession] = useState<any>(null);

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
                        avatar_url: item.avatar_url,
                        total_score: rawScore,
                        exam_total: 1, // Placeholder
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
            const interval = setInterval(fetchLiveRankings, 30000);
            return () => clearInterval(interval);
        }
    }, [rankingView, activeExam?.id]);

    const fetchLatestBlog = async () => {
        try {
            const { data, error } = await supabase
                .from('blog_posts')
                .select('id, title, slug, excerpt, featured_image, published_at, created_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                setLatestBlogPost(data);
            }
        } catch (err) {
            console.error("Error fetching latest blog:", err);
        }
    };

    const fetchUpcomingSession = async () => {
        try {
            if (!activeExam) return;
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from('mock_sessions')
                .select('*')
                .eq('exam_type', activeExam.id)
                .gt('start_time', now)
                .order('start_time', { ascending: true })
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                setUpcomingSession(data);
            }
        } catch (err) {
            console.error("Error fetching upcoming session:", err);
        }
    };

    useEffect(() => {
        fetchLatestBlog();
    }, []);

    useEffect(() => {
        if (activeExam) {
            fetchUpcomingSession();
        }
    }, [activeExam?.id]);



    const [lastProgress, setLastProgress] = useState<any>(null);
    const [resolvedReports, setResolvedReports] = useState<any[]>([]);

    const getLastProgress = async () => {
        try {
            const { data: progresses, error } = await supabase
                .from('learning_progress')
                .select(`
                    id, 
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
                .eq('user_id', user?.id)
                .order('last_accessed_at', { ascending: false })
                .limit(5);

            if (error || !progresses || progresses.length === 0) return null;

            if (!activeExam) return null;
            const brand = activeExam.id.split('-')[0].toLowerCase();

            for (const progress of progresses) {
                const c = progress.content as any;
                if (!c) continue;

                let courseInfo = null;
                if (c.subunit?.unit?.topic?.course) {
                    courseInfo = c.subunit.unit.topic.course;
                } else if (c.unit?.topic?.course) {
                    courseInfo = c.unit.topic.course;
                } else if (c.topic?.course) {
                    courseInfo = c.topic.course;
                }

                if (courseInfo && courseInfo.learning_exams) {
                    const examName = courseInfo.learning_exams.name.toLowerCase();
                    if (examName.includes(brand)) {
                        let courseId = null;
                        if (c.subunit?.unit?.topic?.course_id) courseId = c.subunit.unit.topic.course_id;
                        else if (c.unit?.topic?.course_id) courseId = c.unit.topic.course_id;
                        else if (c.topic?.course_id) courseId = c.topic.course_id;

                        return { ...progress, courseId };
                    }
                }
            }
            return null;
        } catch (err) {
            console.error("Error fetching progress:", err);
            return null;
        }
    };

    const fetchResolvedReports = async () => {
        if (!user) return;
        const { data, error } = await (supabase as any)
            .from('question_reports')
            .select('*')
            .eq('user_id', user.id)
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

    const fetchDashboardData = async () => {
        if (!user || !activeExam?.id) return;

        // Apply cached data instantly (stale-while-revalidate)
        const cached = readMobileDashCache();
        if (cached) {
            setStats(cached.stats);
            setSubjectMastery(cached.subjectMastery || []);
            setIsLoading(false); // hide skeleton immediately with cached data
        } else {
            setIsLoading(true);
        }

        try {
            // Stage 1: Parallel Fetch (Optimized RPCs)
            const [testsRes, mockSubmissionsRes, learningProgressRes, summaryStatsRes, subjectStatsRes] = await Promise.all([
                (supabase as any).from('tests').select('total_questions, correct_answers, created_at, test_type, status, is_mock').eq('exam_type', activeExam.id).eq('user_id', user.id),
                supabase.from('mock_exam_submissions').select('id').eq('user_id', user.id),
                supabase.from('learning_progress').select('last_accessed_at').eq('user_id', user.id),
                (supabase as any).rpc('get_student_summary_stats_secure', {
                    user_uuid: String(user.id),
                    exam_type_id: String(activeExam.id)
                }),
                (supabase as any).rpc('get_analytics_subjects_secure', {
                    user_uuid: String(user.id),
                    exam_type_id: String(activeExam.id)
                })
            ]);

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

            // ── FETCH TODAY'S PRACTICE SPECIFICALLY ──
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            
            const { count: todayPracticeCount } = await supabase
                .from('user_practice_responses')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('created_at', todayStart.toISOString());

            setStats({
                streak: streak,
                bestStreak: bestStreak,
                totalActiveDays: activeDatesSet.size,
                mockSolved: mockSolved,
                accuracy: globalAccuracy,
                totalQuestions: totalQuestionsIncludingSkipped,
                solved: practiceTotal,
                avgTime: summary.time_spent_hours || 0,
                todayPracticeMinutes: todayPracticeCount || 0
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

            // ✅ Write fresh data to cache for next reload (stale-while-revalidate)
            writeMobileDashCache({
                stats: {
                    streak, bestStreak, totalActiveDays: activeDatesSet.size,
                    mockSolved, accuracy: globalAccuracy, totalQuestions: totalQuestionsIncludingSkipped,
                    solved: practiceTotal, avgTime: summary.time_spent_hours || 0,
                    todayPracticeMinutes: todayPracticeCount || 0
                },
                subjectMastery: mastery,
                cachedAt: Date.now(),
            });

            // Hide skeleton as late as possible to prevent flicker
            setIsLoading(false);
            await refreshActiveTest();

            // Stage 2: Parallel Fetch for non-critical data
            const [
                progressData,
                totalPlatformRes,
                championsRes,
                ieltsExtraRes
            ] = await Promise.all([
                getLastProgress(),
                (supabase as any).from('practice_questions').select('*', { count: 'exact', head: true }).eq('exam_type', activeExam.id),
                (supabase as any).rpc('get_champions_by_questions_solved', { target_exam_id: activeExam.id }),
                activeExam?.id === 'ielts-academic' ? Promise.all([
                    supabase.from('reading_submissions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('listening_submissions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('writing_submissions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('writing_submissions').select('writing_feedback(overall_score)').eq('user_id', user.id).eq('status', 'completed')
                ]) : Promise.resolve(null)
            ]);

            setLastProgress(progressData);
            setPlatformTotalQuestions(totalPlatformRes.count || 0);

            if (championsRes.data) {
                const mappedChampions = championsRes.data.slice(0, 10).map((c: any) => ({
                    id: c.user_id,
                    display_name: c.display_name || 'Student',
                    avatar_url: c.avatar_url,
                    total_score: c.questions_solved,
                    exam_total: c.total_questions,
                    accuracy: c.accuracy
                }));
                setTopStudents(mappedChampions);
            }

            if (ieltsExtraRes) {
                const [rC, lC, wC, wScores] = ieltsExtraRes;
                const scores = (wScores.data as any[])?.flatMap(w => w.writing_feedback).map((f: any) => f.overall_score).filter(s => !!s) || [];
                const avgBand = scores.length > 0 ? Number((scores.reduce((a: any, b: any) => a + b, 0) / scores.length).toFixed(1)) : 0;
                setIeltsStats({
                    reading: rC.count || 0,
                    listening: lC.count || 0,
                    writing: wC.count || 0,
                    avgBand
                });
            }
        } catch (e) {
            console.error("Dashboard Sync Error:", e);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user && activeExam) {
            fetchDashboardData();
            fetchResolvedReports();
        }
    }, [user, activeExam?.id]);


    // Removed: if (isLoading) return <DashboardSkeleton />;

    return (
        <MobileLayout isLoading={isLoading}>
            <div className="flex flex-col min-h-full bg-background animate-in fade-in duration-700 overflow-y-auto">
            {/* Active Test Notification Banner - Dismissible */}
            {activeTest && !isTestNotificationDismissed && (
                <div className="sticky top-0 z-50 bg-primary/95 backdrop-blur-sm border-b border-primary/20 shadow-lg">
                    <div className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Clock className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black uppercase tracking-tight text-white truncate">
                                    {activeTest.subject}
                                </p>
                                {activeTest.is_mock && activeTest.current_section && (
                                    <p className="text-[9px] font-bold text-white/90 uppercase tracking-widest mt-0.5">
                                        Resuming: {(() => {
                                            const cfg = allExams[activeTest.exam_type];
                                            return cfg?.sections[activeTest.current_section - 1]?.name || `Section ${activeTest.current_section} `;
                                        })()}
                                    </p>
                                )}
                                <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mt-0.5">
                                    {Math.floor(activeTest.time_remaining_seconds / 60)}m remaining
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                                onClick={() => {
                                    const examConfig = allExams[activeTest.exam_type];
                                    const isSectioned = !!(examConfig && examConfig.sections && examConfig.sections.length > 1);
                                    navigate(isSectioned ? `/mobile/sectioned-test/${activeTest.id}` : `/mobile/test/${activeTest.id}`);
                                }}
                                size="sm"
                                className="h-9 bg-white text-primary hover:bg-white/90 font-black text-[9px] uppercase tracking-widest rounded-lg px-3"
                            >
                                <Play size={12} className="mr-1.5 fill-current" />
                                Resume
                            </Button>
                            <button
                                onClick={() => setIsTestNotificationDismissed(true)}
                                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resolved Question Notifications */}
            {resolvedReports.length > 0 && (
                <div className="px-6 pt-6 space-y-3">
                    {resolvedReports.length === 1 ? (
                        resolvedReports.map((report) => (
                            <div
                                key={report.id}
                                className="group relative bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-amber-500 shadow-xl shadow-amber-500/10 animate-in slide-in-from-top-4 duration-700 overflow-hidden"
                            >
                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 animate-pulse" />
                                <div className="relative z-10 flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative shrink-0">
                                            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm">
                                                <ShieldCheck size={24} className="animate-bounce" />
                                            </div>
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-md">Urgent Alert</span>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Intelligence Update</p>
                                            </div>
                                            <h3 className="text-sm font-black tracking-tight leading-tight text-slate-900 dark:text-white">Reported Question Resolved</h3>
                                            {report.admin_message && (
                                                <p className="text-[11px] font-bold mt-1 text-slate-500 dark:text-slate-400 leading-tight line-clamp-2 italic">
                                                    "{report.admin_message}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <Button
                                            onClick={() => navigate('/mobile/bookmarks')}
                                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest h-12 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                                        >
                                            Inspect Fix
                                        </Button>
                                        <button
                                            onClick={() => dismissAllReports()}
                                            className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors shrink-0 border border-slate-100 dark:border-slate-800"
                                        >
                                            <X size={18} className="text-slate-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="group relative bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-amber-500 shadow-xl shadow-amber-500/10 animate-in slide-in-from-top-4 duration-700 overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 animate-pulse" />
                            <div className="relative z-10 flex flex-col gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative shrink-0">
                                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100">
                                            <ShieldCheck size={24} className="animate-bounce" />
                                        </div>
                                        <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-lg border-2 border-white dark:border-slate-900 shadow-sm">
                                            {resolvedReports.length}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 bg-amber-600 text-white text-[8px] font-black uppercase tracking-widest rounded-md animate-pulse">Bulk Update</span>
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Intelligence Success</p>
                                        </div>
                                        <h3 className="text-sm font-black tracking-tight leading-tight text-slate-900 dark:text-white">
                                            {resolvedReports.length} Questions Fixed
                                        </h3>
                                        <p className="text-[11px] font-bold mt-1 text-slate-500 dark:text-slate-400 leading-tight italic opacity-80">
                                            Admins have processed your recent reports.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <Button
                                        onClick={() => navigate('/bookmarks')}
                                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-widest h-12 rounded-xl shadow-lg shadow-amber-600/20 active:scale-95 transition-all"
                                    >
                                        Inspect All
                                    </Button>
                                    <button
                                        onClick={() => dismissAllReports()}
                                        className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors shrink-0 border border-slate-100 dark:border-slate-800"
                                    >
                                        <X size={18} className="text-slate-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Reference-Matched Hero Section */}
            <motion.header 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative w-full bg-[#FBFCFF] dark:bg-background px-6 pt-10 pb-4 overflow-hidden transition-colors duration-500"
            >
                <div className="max-w-lg mx-auto relative">
                    {/* Greeting & Character Row */}
                    <div className="flex justify-between items-start mb-8">
                        <div className="space-y-1 relative z-10">
                            <p className="text-slate-400 dark:text-slate-500 text-base font-medium">Good morning,</p>
                            <h1 className="text-5xl font-extrabold text-[#1A1F36] dark:text-white flex items-center gap-2 tracking-tight">
                                {firstName.split(' ')[0]} 
                                <motion.span 
                                    animate={{ rotate: [0, 20, 0, 20, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                                >
                                    👋
                                </motion.span>
                            </h1>
                            <p className="text-slate-400 text-sm font-medium mt-2">Let's continue your learning journey!</p>
                        </div>
                        
                        {/* 3D Character Image */}
                        <div className="absolute -right-4 -top-4 w-48 h-48 pointer-events-none">
                            <img 
                                src="/kid-with-laptop.webp" 
                                alt="Student"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>

                    {/* Next Lesson Card (Large) */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-6"
                    >
                        <button
                            onClick={() => toast({
                                title: "Under Development",
                                description: "The Learning Portal is currently under development.",
                            })}
                            className="w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-[0_15px_45px_rgba(0,0,0,0.04)] border border-slate-50 dark:border-slate-800 flex items-center justify-between active:scale-[0.98] transition-all group"
                        >
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-[#EEF2FF] dark:bg-indigo-950/30 flex items-center justify-center">
                                    <Play size={24} className="text-[#4F46E5] dark:text-indigo-400 fill-[#4F46E5] dark:fill-indigo-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-[#4F46E5] uppercase tracking-widest mb-1">Next Lesson</p>
                                    <p className="text-lg font-bold text-[#1A1F36] dark:text-white leading-tight">
                                        {lastProgress?.content?.title || 'Converting repeating decimals'}
                                    </p>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">Up next in your learning path</p>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-[#F8FAFF] dark:bg-black flex items-center justify-center">
                                <ChevronRight size={20} className="text-indigo-600 dark:text-white" />
                            </div>
                        </button>
                    </motion.div>

                    {/* Bottom Two Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Daily Goal Card */}
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            onClick={() => navigate('/mobile/practice')}
                            className="bg-[#FFFBEB] dark:bg-amber-950/40 rounded-[2.2rem] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.03)] border border-amber-100/50 dark:border-amber-900/30 flex flex-col items-start gap-4 active:scale-[0.98] transition-all text-left relative overflow-hidden"
                        >
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                <Zap size={18} className="text-amber-600 dark:text-amber-400 fill-current" />
                            </div>
                            
                            <div className="space-y-0.5">
                                <p className="text-base font-bold text-slate-900 dark:text-white">Daily Goal</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">15 min session</p>
                            </div>

                            {/* Real Progress Bar */}
                            <div className="w-full mt-2">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[10px] font-bold text-slate-400">
                                        {Math.min(15, stats.todayPracticeMinutes)} / 15 min
                                    </span>
                                    {stats.todayPracticeMinutes >= 15 && (
                                        <div className="bg-emerald-500 rounded-full p-0.5">
                                            <CheckCircle2 size={10} className="text-white font-black" />
                                        </div>
                                    )}
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (stats.todayPracticeMinutes / 15) * 100)}%` }}
                                        className={`h-full rounded-full ${stats.todayPracticeMinutes >= 15 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    />
                                </div>
                            </div>
                            
                            {/* Subtle background decoration */}
                            <div className="absolute -right-2 -bottom-2 opacity-[0.03] scale-150 rotate-12">
                                <Zap size={60} />
                            </div>
                            
                            <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#F8FAFF] dark:bg-black flex items-center justify-center">
                                <ChevronRight size={14} className="text-slate-300 dark:text-white" />
                            </div>
                        </motion.button>

                        {/* Exam Mode Card */}
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            onClick={() => navigate('/mock-exams')}
                            className="bg-[#FFF1F2] dark:bg-rose-950/40 rounded-[2.2rem] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.03)] border border-rose-100/50 dark:border-rose-900/30 flex flex-col items-start gap-4 active:scale-[0.98] transition-all text-left relative overflow-hidden"
                        >
                            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                                <Trophy size={18} className="text-rose-600 dark:text-rose-400" />
                            </div>
                            
                            <div className="space-y-0.5">
                                <p className="text-base font-bold text-slate-900 dark:text-white">Exam Mode</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Practice Simulation</p>
                            </div>

                            <div className="mt-auto pt-4 opacity-10">
                                <FileText size={40} />
                            </div>

                            <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#F8FAFF] dark:bg-black flex items-center justify-center">
                                <ChevronRight size={14} className="text-slate-300 dark:text-white" />
                            </div>
                        </motion.button>
                    </div>
                </div>
            </motion.header>

            {/* Quick Stats Row - Softened design */}
            <div className="px-5 mt-4 relative z-30 space-y-6">
                <div className="flex items-center justify-between gap-2">
                    <MiniStat icon={Target} val={`${stats.accuracy}%`} label="Acc" color="text-emerald-500" />
                    <MiniStat icon={Zap} val={`${stats.streak}d`} label="Streak" color="text-amber-500" />
                    <MiniStat icon={Play} val={stats.solved} label="Solved" color="text-indigo-500" />
                    <MiniStat icon={ClipboardList} val={stats.mockSolved} label="Mocks" color="text-rose-500" />
                    <MiniStat icon={HistoryIcon} val={stats.totalQuestions} label="Total" color="text-cyan-500" />
                </div>

                {/* Seat Tracker / IMAT Updates Card - Refined */}
                <button
                    onClick={() => {
                        if (activeExam?.id === 'imat-prep' || activeExam?.id === 'imat') {
                            window.open('https://chat.whatsapp.com/CfVh7u9L6vT7ZFpZwwVa4A', '_blank');
                        } else {
                            setIsTrackerModalOpen(true);
                        }
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-5 flex items-center justify-between group active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-[1.2rem] flex items-center justify-center",
                            (activeExam?.id === 'imat-prep' || activeExam?.id === 'imat') ? "bg-emerald-50" : "bg-cyan-50"
                        )}>
                            {(activeExam?.id === 'imat-prep' || activeExam?.id === 'imat') ? (
                                <MessageCircle className="w-6 h-6 text-emerald-600" />
                            ) : (
                                <Zap className="w-6 h-6 text-cyan-600" />
                            )}
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                {(activeExam?.id === 'imat-prep' || activeExam?.id === 'imat') ? "IMAT Updates" : "Live Tracker"}
                            </p>
                                <p className="text-sm font-bold text-slate-800 dark:text-white">
                                    {(activeExam?.id === 'imat-prep' || activeExam?.id === 'imat') ? "Join Student Group" : "CENT-S Seat Monitor"}
                            </p>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-black flex items-center justify-center">
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white" />
                    </div>
                </button>

                {/* Weekly Streak Calendar */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Weekly Streak</h3>
                        </div>
                    </div>

                    <div className="flex justify-between gap-1 mb-5">
                        {(() => {
                            return Array.from({ length: 7 }, (_, i) => {
                                const d = new Date();
                                d.setDate(d.getDate() - (6 - i));
                                const dateStr = format(d, 'yyyy-MM-dd');
                                const label = ['S','M','T','W','T','F','S'][d.getDay()];
                                const isToday = i === 6;
                                const didPractice = activeDates.has(dateStr);
                                return (
                                    <div key={i} className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">{label}</span>
                                        <div className={cn(
                                            "aspect-square w-full max-w-[36px] rounded-2xl flex items-center justify-center text-xs font-black transition-all",
                                            isToday
                                                ? didPractice
                                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900'
                                                    : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900'
                                                : didPractice
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                                    : 'bg-red-100 dark:bg-red-900/20 text-red-400'
                                        )}>
                                            {didPractice ? '✓' : '✗'}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2 border-t border-slate-50 dark:border-slate-800">
                        <div className="text-center">
                            <p className="text-base font-black text-slate-900 dark:text-white">{stats.streak}</p>
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Streak</p>
                        </div>
                        <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
                        <div className="text-center">
                            <p className="text-base font-black text-slate-900 dark:text-white">{stats.bestStreak}</p>
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em]">Best Streak</p>
                        </div>
                    </div>
                </div>

                {/* Upcoming Exam Card - Refined */}
                {upcomingSession && (
                    <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
                            <Bell size={80} className="text-indigo-600" />
                        </div>
                        <div className="relative z-10 flex flex-col gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center">
                                    <Calendar className="w-7 h-7 text-indigo-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Live Event</p>
                                    <h3 className="text-base font-bold text-slate-900 tracking-tight leading-tight truncate">{upcomingSession.title || 'Mock Exam Session'}</h3>
                                    <p className="text-[11px] font-medium text-slate-400 mt-1">
                                        {format(new Date(upcomingSession.start_time), 'MMM d · h:mm a')}
                                    </p>
                                </div>
                            </div>
                            <Button 
                                onClick={() => navigate('/mock-exams')}
                                className="w-full bg-slate-900 text-white hover:bg-slate-800 font-bold text-[11px] uppercase tracking-widest h-14 rounded-2xl active:scale-95 transition-all shadow-lg"
                            >
                                View Details
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Suspense fallback={null}>
                <SeatTrackerModal
                    isOpen={isTrackerModalOpen}
                    onClose={() => setIsTrackerModalOpen(false)}
                    isGlobal={isGlobal}
                />
            </Suspense>
            {/* Horizontal Scroll: Trending / Champions */}
            <section className="mt-10 space-y-4">
                <div className="px-6 flex items-center justify-between">
                    <h2 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <Trophy size={14} className="text-amber-500" /> Top Performers
                    </h2>

                    {/* View Toggle */}
                    <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-full border border-slate-200 dark:border-white/5">
                        <button
                            onClick={() => setRankingView('all-time')}
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${rankingView === 'all-time'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            All Time
                        </button>
                        <button
                            onClick={() => setRankingView('live')}
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${rankingView === 'live'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            Mock
                            <div className={cn(
                                "flex items-center gap-1 px-1 py-0.5 rounded-[4px] transition-colors",
                                rankingView === 'live' ? "bg-white/20 border border-white/30" : "bg-rose-500/10 border border-rose-500/20"
                            )}>
                                <div className={cn("w-1 h-1 rounded-full animate-pulse", rankingView === 'live' ? "bg-white" : "bg-rose-500")} />
                                <span className={cn("text-[6px] font-black", rankingView === 'live' ? "text-white" : "text-rose-500")}>LIVE</span>
                            </div>
                        </button>
                    </div>
                </div>

                <style>{`
                    @keyframes dash {
                        to {
                            stroke-dashoffset: -160;
                        }
                    }
                `}</style>
                <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 pb-4 snap-x items-center relative">
                    {(rankingView === 'all-time' ? topStudents : liveRankings).length > 0 ? (
                        (rankingView === 'all-time' ? topStudents : liveRankings).map((student, i) => {
                            const isMock = rankingView === 'live';
                            const isTop3 = i < 3;
                            const isTop1 = i === 0;

                            // Minimalistic theme for top 3
                            const rankStyle = i === 0 ? "border-amber-400 bg-amber-500" : 
                                            i === 1 ? "border-slate-300 bg-slate-400" : 
                                            i === 2 ? "border-orange-400 bg-orange-500" : 
                                            "border-transparent bg-slate-700";

                            return (
                                <div
                                    key={student.id}
                                    onClick={() => navigate(`/mobile/student/${student.id}`)}
                                    className="snap-start shrink-0 w-28 aspect-square rounded-2xl relative group overflow-hidden border border-border/10 active:scale-95 transition-all shadow-sm"
                                >
                                    <div className="w-full h-full relative">
                                        <StudentAvatar student={student} />
                                        
                                        {/* Rank Badge */}
                                        <div className={cn(
                                            "absolute top-1.5 left-1.5 w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black text-white z-20 border border-white/20 shadow-lg",
                                            rankStyle
                                        )}>
                                            {i + 1}
                                        </div>

                                        {/* Score Tag */}
                                        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded-md border border-white/10 z-20">
                                            <span className="text-[8px] font-black text-white">{student.total_score} pts</span>
                                        </div>

                                        {/* Name Overlay */}
                                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
                                            <p className="text-[10px] font-bold text-white truncate leading-none">
                                                {student.display_name}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="w-full py-8 text-center bg-card/50 rounded-[2rem] border border-dashed border-border/50">
                            {rankingView === 'live' ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-3 animate-pulse">
                                        <Clock className="w-6 h-6 text-rose-400" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">No Mock Session Active</p>
                                    <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Rankings appear during live mocks</p>
                                </div>
                            ) : (
                                <>
                                    <Sparkles className="w-8 h-8 mx-auto text-primary/30 mb-2 animate-pulse" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Data still calculating...</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Horizontal Scroll: Subject Mastery (Netflix Categories) */}
            <section className="mt-4 space-y-4">
                <div className="flex justify-between items-center px-6">
                    <h2 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Learning Progress</h2>
                    <button onClick={() => navigate('/mobile/subjects')} className="text-[9px] font-bold text-primary uppercase tracking-widest hover:text-primary/80 transition-colors">View All</button>
                </div>

                <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 pb-4 snap-x">
                    {subjectMastery.map((sub, i) => (
                        <div key={i} onClick={() => navigate('/mobile/subjects')} className="snap-start shrink-0 w-64 bg-card p-5 rounded-3xl border border-border/5 active:scale-95 transition-all relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                {getSubjectIcon(sub.subject)}
                                <span className={cn("text-xl font-black", sub.accuracy >= 80 ? "text-emerald-500" : sub.accuracy >= 50 ? "text-amber-500" : "text-rose-500")}>{sub.accuracy}%</span>
                            </div>
                            <h4 className="font-bold text-[13px] text-foreground uppercase tracking-tight mb-1 relative z-10">{sub.subject}</h4>
                            <div className="w-full bg-muted h-1 rounded-full overflow-hidden relative z-10">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${sub.accuracy}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut", delay: i * 0.1 }}
                                    className={cn("h-full", sub.accuracy >= 80 ? "bg-emerald-500" : sub.accuracy >= 50 ? "bg-amber-500" : "bg-rose-500")}
                                />
                            </div>
                            <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-2">{sub.solved} Solved</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Notification Request moved to header */}


            {/* Premium Upsell for Explorer Users */}
            {isExplorer && (
                <section className="mt-8 px-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all" onClick={() => setIsUpgradeModalOpen(true)}>
                        <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12"><Sparkles size={100} /></div>
                        <div className="relative z-10 space-y-4">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                                <Zap className="text-white w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight leading-none">Upgrade to <span className="text-amber-400">PRO</span></h3>
                                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-2">Unlock unlimited practice & expert insights.</p>
                            </div>
                            <Button className="w-full bg-white text-indigo-600 hover:bg-white/90 font-black text-[10px] uppercase tracking-widest h-12 rounded-xl">
                                Unlock Premium Access
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            {/* Latest Blog Post Section */}
            {latestBlogPost && (
                <section className="mt-10 px-6">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <BookOpen size={14} className="text-indigo-500" /> Latest Blog Post
                        </h2>
                        <a href="https://italostudy.com/blog" target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                            Browse All <ChevronRight size={12} />
                        </a>
                    </div>

                    <a href={`https://italostudy.com/blog/${latestBlogPost.slug}`} target="_blank" rel="noopener noreferrer" className="block group">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all">
                            {latestBlogPost.featured_image && (
                                <div className="aspect-[16/9] w-full relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                                    <img 
                                        src={latestBlogPost.featured_image} 
                                        alt={latestBlogPost.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute top-4 left-4">
                                        <span className="px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full text-[8px] font-black text-indigo-600 uppercase tracking-widest border border-white/20">
                                            Latest News
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div className="p-6 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {latestBlogPost.published_at ? format(new Date(latestBlogPost.published_at), 'MMM d, yyyy') : format(new Date(latestBlogPost.created_at), 'MMM d, yyyy')}
                                    </span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                    {latestBlogPost.title}
                                </h3>
                                <div className="flex items-center gap-2 text-indigo-600 pt-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Read Article</span>
                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </a>
                </section>
            )}

            {/* Quick Grid Tools */}
            <section className="mt-10 px-4 space-y-4">
                <h2 className="px-2 font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Tools</h2>
                <div className="grid grid-cols-2 gap-3">
                    <HubItem
                        icon={<HistoryIcon size={18} />}
                        label={t('menu.history')}
                        sub="Records"
                        onClick={() => navigate('/mobile/history')}
                        color="bg-emerald-500/20 text-emerald-500"
                    />
                    <HubItem
                        icon={<BarChart3 size={18} />}
                        label="Analytics"
                        sub="Data"
                        onClick={() => navigate('/mobile/analytics')}
                        color="bg-rose-500/20 text-rose-500"
                    />
                    <HubItem
                        icon={<FileText size={18} />}
                        label="Resources"
                        sub="Library"
                        onClick={() => window.open('https://italostudy.com/resources', '_blank')}
                        color="bg-cyan-500/20 text-cyan-500"
                    />
                    <HubItem
                        icon={<Bookmark size={18} />}
                        label={t('menu.bookmarks')}
                        sub="Saved"
                        onClick={() => navigate('/mobile/bookmarks')}
                        color="bg-amber-500/20 text-amber-500"
                    />
                </div>
            </section>

            {/* WhatsApp Community (Mobile) */}
            <section className="mt-10 px-4 pb-10">
                <div
                    onClick={() => window.open('https://chat.whatsapp.com/CfVh7u9L6vT7ZFpZwwVa4A', '_blank')}
                    className="group relative flex items-center justify-between p-5 rounded-3xl bg-[#25D366] text-white cursor-pointer shadow-xl shadow-emerald-900/10 active:scale-[0.98] transition-all border border-white/10 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 blur-2xl rounded-full -mr-12 -mt-12" />

                    <div className="relative z-10 flex items-center gap-4">
                        <div className="shrink-0 w-11 h-11 rounded-2xl bg-white text-[#25D366] flex items-center justify-center shadow-lg group-active:rotate-12 transition-transform">
                            <MessageCircle size={22} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <h4 className="text-sm font-black uppercase tracking-tight">WhatsApp Squad</h4>
                                <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                            </div>
                            <p className="text-[10px] font-bold text-emerald-100/60 uppercase tracking-widest truncate">
                                2000+ Students Preparing 🎒
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </section>

            {/* Study Planner Widget - Mobile End Position */}
            <div className="px-5 mb-10">
                <StudyPlannerWidget examType={activeExam?.id} />
            </div>

            <Suspense fallback={null}>
                <UpgradeModal
                    isOpen={isUpgradeModalOpen}
                    onClose={() => setIsUpgradeModalOpen(false)}
                    title="Premium Platform"
                    description="Your current access level is Explorer. Upgrade to PRO to access full performance analysis and unlimited practice sessions."
                    feature="Full Platform Access"
                />
            </Suspense>
            </div>
            <PWAPrompt />
        </MobileLayout>
    );
};

const MiniStat = ({ icon: Icon, val, label, color }: any) => (
    <div className="flex flex-col items-center justify-center p-3 rounded-[2rem] bg-white dark:bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex-1 min-w-0 border border-slate-50 dark:border-slate-800">
        <Icon size={14} className={cn("mb-2", color)} />
        <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">{val}</span>
        <span className="text-[8px] font-medium text-slate-400 mt-1 leading-none uppercase tracking-wider">{label}</span>
    </div>
);

const HubItem = ({ icon, label, sub, onClick, color }: { icon: any, label: string, sub: string, onClick: () => void, color: string }) => (
    <div
        onClick={onClick}
        className="p-3 bg-card/50 rounded-[1.5rem] border border-border/10 active:bg-secondary/20 transition-all flex items-center gap-2 group min-w-0"
    >
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-active:scale-90", color)}>
            {React.cloneElement(icon as React.ReactElement, { size: 16 })}
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-tight truncate text-foreground leading-tight">{label}</p>
            <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 truncate opacity-60 leading-tight">{sub}</p>
        </div>
        <ChevronRight size={10} className="ml-auto text-muted-foreground/20 group-hover:text-foreground transition-all shrink-0" />
    </div>
);

const StudentAvatar = ({ student }: { student: TopStudent }) => {
    const [hasError, setHasError] = useState(false);

    if (student.avatar_url && !hasError) {
        return (
            <img
                src={getOptimizedImageUrl(student.avatar_url, 64)}
                onError={() => setHasError(true)}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
        );
    }

    return (
        <div className={cn("w-full h-full flex items-center justify-center", generateAvatarColor(student.display_name))}>
            <span className="font-black text-2xl uppercase opacity-80">{(student.display_name || 'Student').charAt(0)}</span>
        </div>
    );
};

export default MobileDashboard;
