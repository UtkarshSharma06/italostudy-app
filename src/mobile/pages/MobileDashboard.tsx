
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
    Headphones, PenTool, Mic, MessageSquare, MessageCircle, CheckCircle2, X, ShieldCheck, Flame, Crown, Calendar, LayoutGrid, BookMarked, ExternalLink, Newspaper, Globe
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
import { DynamicStoreAd } from '@/components/store/DynamicStoreAd';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Helper: open external URL correctly on both web and native
const openExternalUrl = async (url: string) => {
    if (Capacitor.isNativePlatform()) {
        await Browser.open({ url });
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};

const UpgradeModal = lazy(() => import('@/components/UpgradeModal').then(mod => ({ default: mod.UpgradeModal })));
const SeatTrackerModal = lazy(() => import('@/components/SeatTrackerModal').then(mod => ({ default: mod.SeatTrackerModal })));
const LatestNotificationPopup = lazy(() => import('@/components/LatestNotificationPopup'));
const FeedbackDialog = lazy(() => import('@/components/FeedbackDialog').then(m => ({ default: m.FeedbackDialog })));
const TrustpilotReviewModal = lazy(() => import('@/components/TrustpilotReviewModal'));
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
    const { isExplorer, isGlobal, isElite, isSubscriptionExpired } = usePlanAccess();
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isTestNotificationDismissed, setIsTestNotificationDismissed] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/auth');
        } else if (!loading && user && profile && (!profile.selected_exam || !profile.selected_plan)) {
            navigate('/onboarding');
        }
    }, [user, loading, profile, navigate]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        if (hour < 21) return 'Good Evening';
        return 'Good Night';
    };

    const checkReviewEligibility = async () => {
        if (!user || !profile) return;

        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const now = new Date().getTime();

        try {
            const createdAt = new Date(profile.created_at).getTime();
            const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;

            if (now - createdAt < twoDaysInMs) return;

            const { data: tracking } = await (supabase as any)
                .from('user_review_tracking')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (tracking) {
                const lastPrompt = tracking.last_review_prompt_at ? new Date(tracking.last_review_prompt_at).getTime() : 0;
                const lastSubmitted = tracking.last_review_submitted_at ? new Date(tracking.last_review_submitted_at).getTime() : 0;
                const dashboardShown = tracking.dashboard_popup_shown;

                if (dashboardShown && (now - lastPrompt < thirtyDaysInMs)) return;
                if (lastSubmitted && (now - lastSubmitted < thirtyDaysInMs)) return;
            }

            // Only show Review Modal if no global LatestNotification is open (we delay its visibility)
            // But we will handle "one by one" inside the modal orchestrator or simple state check below.
            setShowReviewModal(true);

            await (supabase as any)
                .from('user_review_tracking')
                .upsert({
                    user_id: user.id,
                    dashboard_popup_shown: true,
                    last_review_prompt_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

        } catch (error) {
            console.error('Error checking dashboard review eligibility:', error);
            const lastPrompt = localStorage.getItem('trustpilot_last_prompt_dashboard');
            if (!lastPrompt || (now - parseInt(lastPrompt) > thirtyDaysInMs)) {
                setShowReviewModal(true);
            }
        }
    };

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
    // â”€â”€ Mobile Dashboard Cache (stale-while-revalidate) â”€â”€
    const MOBILE_DASH_CACHE_KEY = user?.id ? `mobile_dash_cache_${user.id}` : null;
    const readMobileDashCache = () => {
        if (!MOBILE_DASH_CACHE_KEY) return null;
        try { const r = localStorage.getItem(MOBILE_DASH_CACHE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
    };
    const writeMobileDashCache = (data: any) => {
        if (!MOBILE_DASH_CACHE_KEY) return;
        try { localStorage.setItem(MOBILE_DASH_CACHE_KEY, JSON.stringify(data)); } catch { }
    };

    const [isLoading, setIsLoading] = useState(() => {
        // If we have a cached profile and exam, check for dashboard cache
        if (user?.id && activeExam?.id) {
            try {
                const key = `mobile_dash_cache_${user.id}`;
                const cached = localStorage.getItem(key);
                if (cached) return false; // instant â€” no skeleton for returning users
            } catch { }
        }
        return true;
    });
    const [rankingView, setRankingView] = useState<'all-time' | 'live'>('all-time');
    const [liveRankings, setLiveRankings] = useState<TopStudent[]>([]);
    const [isWeeklyData, setIsWeeklyData] = useState(true);
    const [activeDates, setActiveDates] = useState<Set<string>>(new Set());
    const [latestBlogPost, setLatestBlogPost] = useState<any>(null);
    const [upcomingSession, setUpcomingSession] = useState<any>(null);

    // â”€â”€ Check for Personal Study Plan â”€â”€
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
            } catch (_) { }
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

            let interval: ReturnType<typeof setInterval> | null = null;

            const startPolling = () => {
                if (!interval) {
                    interval = setInterval(fetchLiveRankings, 30000);
                }
            };

            const stopPolling = () => {
                if (interval) {
                    clearInterval(interval);
                    interval = null;
                }
            };

            const handleVisibilityChange = () => {
                if (document.hidden) {
                    stopPolling();
                } else {
                    fetchLiveRankings();
                    startPolling();
                }
            };

            startPolling();
            document.addEventListener('visibilitychange', handleVisibilityChange);

            return () => {
                stopPolling();
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
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
            // Restore activeDates Set from cached array
            if (cached.activeDates) {
                setActiveDates(new Set(cached.activeDates));
            }
            setIsLoading(false); // hide skeleton immediately with cached data
        } else {
            setIsLoading(true);
        }

        try {
            // Stage 1: Parallel Fetch (Optimized RPCs)
            const { data: dashboardData, error } = await (supabase as any).rpc('get_full_dashboard_data', {
                p_user_uuid: String(user.id),
                p_exam_type_id: String(activeExam.id)
            });

            if (error || !dashboardData) {
                console.error("Error fetching consolidated dashboard data:", error);
                setIsLoading(false);
                return;
            }

            // Map the consolidated RPC output to the existing data structure format
            const testsRes = { data: dashboardData.tests };
            const mockSubmissionsRes = { data: dashboardData.mockSubmissions };
            const learningProgressRes = { data: dashboardData.learningProgress };
            const summaryStatsRes = { data: dashboardData.summaryStats };
            const subjectStatsRes = { data: dashboardData.subjectStats };

            // â”€â”€ PROCESS DATES & STREAK â”€â”€
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

            // â”€â”€ PROCESS STATS â”€â”€
            const summary = (summaryStatsRes.data as any[])?.[0] || {};
            const subjectStats = (subjectStatsRes.data as any[]) || [];
            const mockSubmissions = mockSubmissionsRes?.data || [];
            const mockSolved = tests.filter((t: any) => t.is_mock || t.test_type === 'mock').length + mockSubmissions.length;

            const practiceTotal = summary.total_solved || 0;
            const globalAccuracy = Math.round(summary.accuracy_percent || 0);
            const totalQuestionsInTests = tests.reduce((acc: number, t: any) => acc + (t.total_questions || 0), 0);
            const totalQuestionsIncludingSkipped = practiceTotal + totalQuestionsInTests;

            // â”€â”€ FETCH TODAY'S PRACTICE SPECIFICALLY â”€â”€
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


            // â”€â”€ PROCESS MASTERY â”€â”€
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
                // Serialize Set as array so cache restoration works
                activeDates: Array.from(activeDatesSet),
                cachedAt: Date.now(),
            });

            // Stage 2: Parallel Fetch for non-critical data
            const [
                progressData,
                totalPlatformRes,
                championsRes,
                ieltsExtraRes
            ] = await Promise.all([
                getLastProgress(),
                (supabase as any).from('practice_questions').select('*', { count: 'exact', head: true }).eq('exam_type', activeExam.id),
                (supabase as any).rpc('get_champions_by_questions_solved', { target_exam_id: activeExam.id, since_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }),
                activeExam?.id === 'ielts-academic' ? Promise.all([
                    supabase.from('reading_submissions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('listening_submissions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('writing_submissions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('writing_submissions').select('writing_feedback(overall_score)').eq('user_id', user.id).eq('status', 'completed')
                ]) : Promise.resolve(null)
            ]);

            setLastProgress(progressData);
            setPlatformTotalQuestions(totalPlatformRes.count || 0);

            // â”€â”€ Champions: weekly first, fallback to all-time if empty â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            let championsSource = championsRes.data || [];
            let weeklyActive = true;

            if (championsSource.length === 0) {
                weeklyActive = false;
                const { data: allTimeData } = await (supabase as any)
                    .rpc('get_champions_by_questions_solved', { target_exam_id: activeExam.id });
                championsSource = allTimeData || [];
            }

            setIsWeeklyData(weeklyActive);

            if (championsSource.length > 0) {
                const mappedChampions = championsSource.slice(0, 10).map((c: any) => ({
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
        } finally {
            // âœ… FIX: Always clear skeleton â€” refreshActiveTest cannot block this
            setIsLoading(false);
            refreshActiveTest().catch(() => { /* silent */ });
        }
    };

    useEffect(() => {
        if (user && activeExam) {
            fetchDashboardData();
            fetchResolvedReports();
        }
    }, [user, activeExam?.id]);


    // Removed: if (isLoading) return <DashboardSkeleton />;

    // Compute overall progress percentage (used in Getting Started card)
    const overallProgress = React.useMemo(() => {
        let progressScore = 0;
        if (stats.solved > 0) progressScore += 25;
        if (stats.streak > 0) progressScore += 25;
        if (stats.mockSolved > 0) progressScore += 25;
        if (lastProgress) progressScore += 25;
        return progressScore;
    }, [stats.solved, stats.streak, stats.mockSolved, lastProgress]);

    return (
        <MobileLayout isLoading={isLoading}>
            <div className="flex flex-col min-h-full bg-[#F4F6FB] dark:bg-background animate-in fade-in duration-700 overflow-y-auto">
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

                {/* ─── NEW HERO BANNER ─── */}
                <motion.section
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-4 mt-4 rounded-3xl overflow-hidden relative"
                    style={{ background: 'linear-gradient(135deg, #F97316 0%, #EC4899 50%, #7C3AED 100%)' }}
                >
                    {/* Decorative blobs */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-8 -translate-x-8" />

                    <div className="relative z-10 px-5 pt-5 pb-4">
                        {/* Greeting */}
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/80 mb-1">
                            {getGreeting()}, {firstName.toUpperCase()} 🌟
                        </p>
                        <h1 className="text-2xl font-black text-white leading-tight mb-4">
                            Great things never<br />come from comfort zones.
                        </h1>

                        {/* Stat Pills — same values as desktop hero */}
                        <div className="flex gap-2">
                            <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-2xl px-3 py-2 flex items-center gap-1.5 border border-white/20">
                                <span className="text-base">⚡</span>
                                <div>
                                    <p className="text-[9px] font-black text-white/70 uppercase tracking-wider">XP</p>
                                    <p className="text-sm font-black text-white leading-none">{stats.solved}</p>
                                </div>
                            </div>
                            <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-2xl px-3 py-2 flex items-center gap-1.5 border border-white/20">
                                <span className="text-base">🏆</span>
                                <div>
                                    <p className="text-[9px] font-black text-white/70 uppercase tracking-wider">Stars</p>
                                    <p className="text-sm font-black text-white leading-none">{stats.mockSolved}</p>
                                </div>
                            </div>
                            <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-2xl px-3 py-2 flex items-center gap-1.5 border border-white/20">
                                <span className="text-base">🔥</span>
                                <div>
                                    <p className="text-[9px] font-black text-white/70 uppercase tracking-wider">Days</p>
                                    <p className="text-sm font-black text-white leading-none">{stats.streak}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* ─── GETTING STARTED CARD ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mx-4 mt-3 bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xl">
                            🏅
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-primary uppercase tracking-widest">Getting Started</p>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">Your guided path to mastering ItaloStudy</h3>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mr-3">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${overallProgress}%` }}
                                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                                className="h-full rounded-full bg-primary"
                            />
                        </div>
                        <span className="text-xs font-black text-slate-600 dark:text-slate-300 shrink-0">{overallProgress}%</span>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => navigate('/mobile/practice')}
                            className="flex-1 bg-primary text-white font-black text-[11px] uppercase tracking-widest rounded-xl py-3 active:scale-95 transition-all"
                        >
                            Start Practice
                        </button>
                        <button
                            onClick={() => navigate('/mobile/mock-exams')}
                            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-black text-[11px] uppercase tracking-widest rounded-xl py-3 active:scale-95 transition-all"
                        >
                            Take a Mock
                        </button>
                    </div>
                </motion.div>

                {/* ─── WEEKLY STREAK + UPCOMING EXAMS (2-column) ─── */}
                <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
                    {/* Weekly Streak */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-3">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Weekly Streak</p>
                        </div>
                        {/* Days grid: S M T W T F S */}
                        <div className="flex justify-between gap-1 mb-3">
                            {Array.from({ length: 7 }, (_, i) => {
                                const d = new Date();
                                d.setDate(d.getDate() - (6 - i));
                                const dateStr = format(d, 'yyyy-MM-dd');
                                const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                                const label = dayLabels[d.getDay()];
                                const isToday = i === 6;
                                const didPractice = activeDates.has(dateStr);
                                return (
                                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase block text-center leading-none mb-0.5">{label}</span>
                                        <div className={`aspect-square w-full max-w-[22px] rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                                            isToday
                                                ? didPractice
                                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900'
                                                    : 'bg-primary text-white shadow-md shadow-primary/20'
                                                : didPractice
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                                    : 'bg-red-100 dark:bg-red-900/20 text-red-400'
                                        }`}>
                                            {didPractice ? '✓' : isToday ? '→' : '✗'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Stats */}
                        <div className="flex justify-between border-t border-slate-50 dark:border-slate-800 pt-3">
                            <div className="text-center flex-1">
                                <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{stats.streak}</p>
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider leading-none">Current</p>
                            </div>
                            <div className="text-center flex-1 border-x border-slate-50 dark:border-slate-800">
                                <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{stats.bestStreak}</p>
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider leading-none">Best</p>
                            </div>
                            <div className="text-center flex-1">
                                <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{stats.totalActiveDays}</p>
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider leading-none">Total</p>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Exams */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-1.5 mb-3">
                            <Bell className="w-4 h-4 text-primary" />
                            <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Upcoming Exams</p>
                        </div>

                        {upcomingSession ? (
                            <>
                                <div className="bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl p-3 mb-3">
                                    <div className="flex items-start gap-2">
                                        <div className="w-7 h-7 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                            <Calendar className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-[11px] font-black text-slate-900 dark:text-white leading-tight line-clamp-2">
                                                {upcomingSession.title || 'Mock Exam Session'}
                                            </h4>
                                            <p className="text-[9px] font-bold text-primary mt-0.5">
                                                {format(new Date(upcomingSession.start_time), 'MMM d · h:mm a')}
                                            </p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                                {activeExam?.id?.toUpperCase()?.replace('-PREP', '')} PREP
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/mobile/mock-exams')}
                                    className="w-full bg-primary text-white font-black text-[9px] uppercase tracking-widest rounded-xl py-2.5 active:scale-95 transition-all"
                                >
                                    View Exam →
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center flex-1 py-4">
                                <Bell className="w-8 h-8 text-slate-200 dark:text-slate-700 mb-2" />
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">No upcoming sessions</p>
                                <button
                                    onClick={() => navigate('/mobile/mock-exams')}
                                    className="mt-2 w-full bg-primary text-white font-black text-[9px] uppercase tracking-widest rounded-xl py-2 active:scale-95 transition-all"
                                >
                                    View Mocks →
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── RECOMMENDED FOR YOU (Store Products) ─── */}
                <section className="mt-5">
                    <div className="flex items-center justify-between px-4 mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Bookmark className="w-3 h-3 text-primary" />
                            </div>
                            <h2 className="text-sm font-black text-slate-900 dark:text-white">Recommended For You</h2>
                        </div>
                        <button
                            onClick={() => navigate('/mobile/store')}
                            className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-0.5"
                        >
                            View All <ChevronRight size={12} />
                        </button>
                    </div>
                    <DynamicStoreAd placementId="dashboard-bottom" />
                </section>



                {/* ─── LEADERBOARD ─── */}
                <section className="mt-6 px-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-50 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                                    <Trophy size={12} className="text-amber-500" />
                                </div>
                                <h2 className="text-sm font-black text-slate-900 dark:text-white">{isWeeklyData ? 'Weekly Top' : 'Top Students'}</h2>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-full">
                                <button
                                    onClick={() => setRankingView('all-time')}
                                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                                        rankingView === 'all-time'
                                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                            : 'text-slate-400'
                                    }`}
                                >
                                    {isWeeklyData ? 'This Week' : 'All Time'}
                                </button>
                                <button
                                    onClick={() => setRankingView('live')}
                                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${
                                        rankingView === 'live' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400'
                                    }`}
                                >
                                    Mock
                                    <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse ml-0.5", rankingView === 'live' ? 'bg-white' : 'bg-rose-400')} />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {(rankingView === 'all-time' ? topStudents : liveRankings).length > 0 ? (
                                (rankingView === 'all-time' ? topStudents : liveRankings).slice(0, 10).map((student, i) => (
                                    <div
                                        key={student.id}
                                        onClick={() => navigate(`/mobile/student/${student.id}`)}
                                        className="flex items-center gap-3 px-4 py-2.5 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
                                    >
                                        {/* Rank badge */}
                                        <div className={cn(
                                            "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
                                            i === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                                            i === 1 ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' :
                                            i === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' :
                                            'bg-slate-50 dark:bg-slate-800/50 text-slate-400'
                                        )}>
                                            {i === 0 ? '👑' : i + 1}
                                        </div>

                                        {/* Avatar */}
                                        <div className={cn(
                                            "w-8 h-8 rounded-xl overflow-hidden border shrink-0",
                                            i === 0 ? 'border-amber-300/50' : i === 1 ? 'border-slate-200' : i === 2 ? 'border-orange-200' : 'border-slate-100 dark:border-slate-700'
                                        )}>
                                            <StudentAvatar student={student} />
                                        </div>

                                        {/* Name */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-slate-900 dark:text-white truncate">{student.display_name.split(' ')[0]}</p>
                                            {i < 3 && (
                                                <p className={cn("text-[8px] font-black uppercase tracking-widest",
                                                    i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : 'text-orange-500'
                                                )}>
                                                    {i === 0 ? 'Supreme' : i === 1 ? 'Elite' : 'Noble'}
                                                </p>
                                            )}
                                        </div>

                                        {/* Score */}
                                        <div className="text-right shrink-0">
                                            <p className={cn("text-sm font-black leading-none", i === 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white')}>{student.total_score}</p>
                                            <p className="text-[8px] font-black text-slate-400 uppercase">pts</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center">
                                    {rankingView === 'live' ? (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-2 mx-auto animate-pulse">
                                                <Clock className="w-5 h-5 text-rose-400" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">No Mock Session Active</p>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-7 h-7 mx-auto text-primary/30 mb-2 animate-pulse" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No weekly champions yet</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ─── LEARNING PROGRESS ─── */}
                <section className="mt-5 px-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="flex justify-between items-center px-4 pt-4 pb-3 border-b border-slate-50 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                                    <BarChart3 size={12} className="text-indigo-500" />
                                </div>
                                <h2 className="text-sm font-black text-slate-900 dark:text-white">Learning Progress</h2>
                            </div>
                            <button onClick={() => navigate('/mobile/subjects')} className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-0.5">
                                View All <ChevronRight size={12} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {subjectMastery.length > 0 ? subjectMastery.map((sub, i) => (
                                <div key={i} onClick={() => navigate('/mobile/subjects')} className="group active:opacity-70 transition-opacity">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2.5">
                                            {getSubjectIcon(sub.subject)}
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{sub.subject}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-base font-black text-slate-900 dark:text-white leading-none">{sub.accuracy}%</span>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Accuracy</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${sub.accuracy}%` }}
                                            transition={{ duration: 1.5, ease: 'easeOut', delay: i * 0.1 }}
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                                        />
                                    </div>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">{sub.solved} solved</p>
                                </div>
                            )) : (
                                <div className="py-6 text-center">
                                    <BarChart3 className="w-8 h-8 mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start practicing to see progress</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ─── PREMIUM UPSELL ─── */}
                {isExplorer && (
                    <section className="mt-6 mx-4">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all" onClick={() => setIsUpgradeModalOpen(true)}>
                            <div className="absolute top-0 right-0 p-6 opacity-20 rotate-12"><Sparkles size={80} /></div>
                            <div className="relative z-10 space-y-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Zap className="text-white w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight leading-none">Upgrade to <span className="text-amber-400">PRO</span></h3>
                                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1">Unlock unlimited practice & expert insights.</p>
                                </div>
                                <Button className="w-full bg-white text-indigo-600 hover:bg-white/90 font-black text-[10px] uppercase tracking-widest h-11 rounded-xl">
                                    Unlock Premium Access
                                </Button>
                            </div>
                        </div>
                    </section>
                )}

                {/* ─── TOOLS GRID ─── */}
                <section className="mt-5 px-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-50 dark:border-slate-800">
                            <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
                                <LayoutGrid size={12} className="text-primary" />
                            </div>
                            <h2 className="text-sm font-black text-slate-900 dark:text-white">Tools</h2>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-y divide-slate-50 dark:divide-slate-800">
                            <HubItem icon={<GraduationCap size={18} />} label="Courses" sub="Video Learning" onClick={() => navigate('/mobile/learning')} color="bg-violet-500/20 text-violet-500" />
                            <HubItem icon={<Target size={18} />} label="Mock Exams" sub="Full Tests" onClick={() => navigate('/mobile/mock-exams')} color="bg-rose-500/20 text-rose-500" />
                            <HubItem icon={<Bookmark size={18} />} label={t('menu.bookmarks')} sub="Saved" onClick={() => navigate('/mobile/bookmarks')} color="bg-amber-500/20 text-amber-500" />
                            <HubItem icon={<FileText size={18} />} label="Resources" sub="Library" onClick={() => openExternalUrl('https://italostudy.com/resources')} color="bg-cyan-500/20 text-cyan-500" />
                            <HubItem icon={<HistoryIcon size={18} />} label={t('menu.history')} sub="Records" onClick={() => navigate('/mobile/history')} color="bg-emerald-500/20 text-emerald-500" />
                            <HubItem icon={<BarChart3 size={18} />} label="Analytics" sub="My Data" onClick={() => navigate('/mobile/analytics')} color="bg-indigo-500/20 text-indigo-500" />
                            <HubItem icon={<MessageCircle size={18} />} label="Community" sub="Chat" onClick={() => navigate('/mobile/community')} color="bg-sky-500/20 text-sky-500" />
                            <HubItem icon={<Globe size={18} />} label="Blogs" sub="Articles" onClick={() => openExternalUrl('https://italostudy.com/blog')} color="bg-pink-500/20 text-pink-500" />
                        </div>
                    </div>
                </section>

                {/* ─── STUDY PLANNER ─── */}
                <section className="mt-5 px-4 mb-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-50 dark:border-slate-800">
                            <div className="w-6 h-6 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                                <Calendar size={12} className="text-violet-500" />
                            </div>
                            <h2 className="text-sm font-black text-slate-900 dark:text-white">Create Your Study Plan</h2>
                        </div>
                        <div className="p-3">
                            <StudyPlannerWidget examType={activeExam?.id} />
                        </div>
                    </div>
                </section>

                {/* ─── LATEST BLOG & WHATSAPP (2-column) ─── */}
                <section className="mt-6 mx-4 pb-10 grid grid-cols-2 gap-3">
                    {/* Latest Blog Half */}
                    <div
                        onClick={() => openExternalUrl(latestBlogPost ? `https://italostudy.com/blog/${latestBlogPost.slug}` : 'https://italostudy.com/blog')}
                        className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between cursor-pointer active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <BookOpen className="w-4 h-4 text-indigo-500" />
                            <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Latest Blog</p>
                        </div>
                        {latestBlogPost ? (
                            <div>
                                <h4 className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">{latestBlogPost.title}</h4>
                                <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mt-2 flex items-center gap-0.5">Read Now <ChevronRight size={10} /></p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-2 opacity-50">
                                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mb-1" />
                                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Loading...</p>
                            </div>
                        )}
                    </div>

                    {/* WhatsApp Half */}
                    <div
                        onClick={() => openExternalUrl('https://chat.whatsapp.com/CfVh7u9L6vT7ZFpZwwVa4A')}
                        className="bg-[#25D366] text-white rounded-3xl p-4 shadow-sm flex flex-col justify-between cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 blur-xl rounded-full -mr-10 -mt-10" />
                        <div className="relative z-10 flex items-center gap-1.5 mb-2">
                            <MessageCircle className="w-4 h-4 text-white" />
                            <p className="text-[10px] font-black uppercase tracking-wider text-white">Join Squad</p>
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-[11px] font-bold text-white leading-tight">2000+ Students Preparing 🚀</h4>
                            <p className="text-[8px] font-black text-emerald-100 uppercase tracking-widest mt-2 flex items-center gap-0.5">Join Now <ArrowRight size={10} /></p>
                        </div>
                    </div>
                </section>

                <Suspense fallback={null}>
                    <UpgradeModal
                        isOpen={isUpgradeModalOpen}
                        onClose={() => setIsUpgradeModalOpen(false)}
                        title="Premium Platform"
                        description="Your current access level is Explorer. Upgrade to PRO to access full performance analysis and unlimited practice sessions."
                        feature="Full Platform Access"
                    />
                    <SeatTrackerModal isOpen={isTrackerModalOpen} onClose={() => setIsTrackerModalOpen(false)} isGlobal={isElite || isGlobal} isExpired={isSubscriptionExpired} />
                    <TrustpilotReviewModal
                        isOpen={showReviewModal}
                        onClose={() => setShowReviewModal(false)}
                        onSuccess={() => setShowReviewModal(false)}
                    />
                    <LatestNotificationPopup />
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
        className="p-4 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors flex items-center gap-3 group min-w-0"
    >
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-active:scale-90", color)}>
            {React.cloneElement(icon as React.ReactElement, { size: 16 })}
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-900 dark:text-white truncate leading-tight">{label}</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5 truncate leading-tight">{sub}</p>
        </div>
        <ChevronRight size={12} className="ml-auto text-slate-300 dark:text-slate-600 group-hover:text-slate-600 transition-all shrink-0" />
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
