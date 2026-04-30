import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import {
    BarChart3,
    TrendingUp,
    Target,
    Clock,
    Calendar,
    Award,
    ChevronRight,
    Bot,
    ArrowRight,
    Sparkles,
    Brain,
    Calculator,
    FileText,
    Microscope,
    FlaskConical,
    Atom,
    PenTool,
    Mic,
    BookOpen,
    Headphones,
    ListChecks,
    RefreshCw,
    Dribbble,
    Medal,
    Globe
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useEffect, useState, useMemo, lazy, Suspense, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { usePricing } from '@/context/PricingContext';
import { cn } from '@/lib/utils';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useIsMobile } from '@/hooks/use-mobile';
import CountUp from '@/components/CountUp';
import { useToast } from '@/hooks/use-toast';
import PenaltyAnalysis from '@/components/analytics/PenaltyAnalysis';
import TimeEfficiencyScatter from '@/components/analytics/TimeEfficiencyScatter';
import MockPerformanceTrends from '@/components/analytics/MockPerformanceTrends';
import SectionFatigueChart from '@/components/analytics/SectionFatigueChart';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumOverlay from '@/components/analytics/PremiumOverlay';
import PremiumLockedGrid from '@/components/analytics/PremiumLockedGrid';
import ReportDownloadDialog from '@/components/analytics/ReportDownloadDialog';
import { Download } from 'lucide-react';

const VelocityChart = lazy(() => import('@/components/VelocityChart'));
import { AnalyticsSkeleton } from '@/components/SkeletonLoader';
import MobileLayout from '@/mobile/components/MobileLayout';

interface AnalyticsDashboardProps {
    userId?: string;
    isMobile?: boolean;
    hideLayout?: boolean;
}

export default function AnalyticsDashboard({ userId: propUserId, isMobile: propIsMobile, hideLayout = false }: AnalyticsDashboardProps) {
    const { user: authUser, profile: authProfile } = useAuth();
    const { activeExam, allExams } = useExam();
    const { openPricingModal } = usePricing();
    const { toast } = useToast();
    const navigate = useNavigate();
    const isMobileFromHook = useIsMobile();
    const isMobile = propIsMobile ?? isMobileFromHook;

    // Use propUserId if provided, otherwise fallback to logged in user
    const targetUserId = propUserId || authUser?.id;

    const [subjectData, setSubjectData] = useState<any[]>([]);
    const [stats, setStats] = useState({
        accuracy: '0%',
        timeSpent: '0h',
        verifiedSkills: '0%',
        percentile: '50%'
    });
    const [points, setPoints] = useState(0);
    const [rank, setRank] = useState(0);
    const [velocityData, setVelocityData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<'7d' | '30d' | '6m'>('7d');
    const [projection, setProjection] = useState({ score: 0, target: 60, confidence: 0, trajectory: 'Stable' });
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [targetProfile, setTargetProfile] = useState<any>(null);
    const [advancedData, setAdvancedData] = useState<{
        latestTest: any;
        latestQuestions: any[];
        mockHistory: any[];
        topicMastery: any[];
    }>({
        latestTest: null,
        latestQuestions: [],
        mockHistory: [],
        topicMastery: []
    });

    const { hasPremiumAccess: authHasPremium, isAdmin: authIsAdmin, plan: authPlan } = usePlanAccess();
    const isConsultant = authProfile?.is_consultant || authProfile?.role === 'consultant';

    // Premium access for the VIEWER: 
    // They see full data if they are Admin, Consultant, or have an active Premium plan.
    const isPremiumViewer = authIsAdmin || authHasPremium || isConsultant;

    const isSelfView = !propUserId || (String(propUserId) === String(authUser?.id));

    // For upsell logic: we blur if the viewer is NOT premium AND it's not their own profile.
    const shouldShowBlur = !isPremiumViewer && !isSelfView;
    const effectiveExamId = targetProfile?.selected_exam || (targetProfile as any)?.selected_exam_id || activeExam?.id;
    
    // Determine the relevant exam configuration for the target student
    const examObj = useMemo(() => {
        if (!effectiveExamId) return activeExam;
        return allExams[effectiveExamId] || activeExam;
    }, [effectiveExamId, allExams, activeExam]);

    // Dummy data for "Teaser" view (prevents bypass by Inspect Element)
    const dummyStats = {
        accuracy: '0%',
        timeSpent: '0h',
        verifiedSkills: '0%',
        percentile: '99%'
    };
    const dummySubjectData = [
        { subject: 'Subject A', accuracy: 0, total: 0, correct: 0, icon: Brain, color: '#6366f1' },
        { subject: 'Subject B', accuracy: 0, total: 0, correct: 0, icon: FlaskConical, color: '#10b981' }
    ];

    const displayStats = shouldShowBlur ? dummyStats : stats;
    const displaySubjectData = shouldShowBlur ? dummySubjectData : subjectData;
    const bestMockScore = useMemo(() => {
        if (!advancedData.mockHistory.length) return 0;
        const isImat = effectiveExamId === 'imat-prep';
        const corrPts = isImat ? 1.5 : (examObj?.scoring?.correct || 1);
        const incorrPts = isImat ? 0.4 : Math.abs(examObj?.scoring?.incorrect || 0);
        
        return Math.max(...advancedData.mockHistory.map(m => {
            const score = (m.correct_answers || 0) * corrPts - (m.wrong_answers || 0) * incorrPts;
            return Number(score.toFixed(1));
        }), 0);
    }, [advancedData.mockHistory, effectiveExamId, examObj]);

    const displayPoints = shouldShowBlur ? 0 : (effectiveExamId === 'imat-prep' && bestMockScore > 0 ? bestMockScore : points);
    const displayRank = shouldShowBlur ? 999 : rank;

    // Fetch target profile first to stabilize effectiveExamId
    useEffect(() => {
        const fetchTargetProfile = async () => {
            if (!targetUserId) return;
            if (isSelfView && authProfile) {
                setTargetProfile(authProfile);
                return;
            }
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', targetUserId)
                    .single();
                if (data) setTargetProfile(data);
            } catch (err) {
                console.error("Profile fetch error:", err);
            }
        };
        fetchTargetProfile();
    }, [targetUserId, authProfile, isSelfView]);

    const lastFetchRef = useRef<string>("");

    useEffect(() => {
        let isMounted = true;
        let timeoutId: any;

        const fetchAnalytics = async () => {
            // Guard: If we don't have the target ID yet, or we're already fetching this specific combination
            if (!targetUserId || !effectiveExamId) {
                if (isMounted) setIsLoading(false);
                return;
            }

            const fetchKey = `${targetUserId}-${effectiveExamId}-${timeframe}`;
            if (lastFetchRef.current === fetchKey) return; // Already have/loading this data
            
            lastFetchRef.current = fetchKey;
            setIsLoading(true);
            try {
                const examObj = allExams[effectiveExamId] || activeExam;
                // Include legacy exam ID aliases
                const examIds = [effectiveExamId];
                if (effectiveExamId === 'cent-s-prep') examIds.push('cent-s');
                if (effectiveExamId === 'imat-prep') examIds.push('imat');

                // ============================================================
                // Fetch all data in parallel using proven working queries
                // (same pattern as Dashboard.tsx)
                // ============================================================
                const [practiceRes, testsRes, championsRes, velocityRes, summaryRes] = await Promise.all([
                    // Practice responses - Use the secure RPC for ALL views to ensure 100% consistency
                    // (The RPC now queries raw user_practice_responses for real-time accuracy)
                    (supabase as any).rpc('get_analytics_subjects_secure', {
                        user_uuid: String(targetUserId),
                        exam_type_id: String(effectiveExamId)
                    }),
                    // Test history - Use the secure RPC for ALL views
                    (supabase as any).rpc('get_tests_secure', {
                        user_uuid: String(targetUserId),
                        exam_type_id: String(effectiveExamId)
                    }),
                    // Leaderboard position
                    (supabase as any).rpc('get_champions_by_questions_solved', {
                        target_exam_id: String(effectiveExamId)
                    }),
                    // Growth velocity data
                    (supabase as any).rpc('get_student_activity_velocity_secure', {
                        user_uuid: String(targetUserId),
                        exam_type_id: String(effectiveExamId),
                        lookback_days: timeframe === '30d' ? 30 : timeframe === '6m' ? 180 : 7
                    }),
                    // ALL-TIME SUMMARY STATS (Accuracy, Time, Skills, Percentile)
                    (supabase as any).rpc('get_student_summary_stats_secure', {
                        user_uuid: String(targetUserId),
                        exam_type_id: String(effectiveExamId)
                    })
                ]);

                if (practiceRes.error) console.error("Practice data error:", practiceRes.error);
                if (testsRes.error) console.warn("Tests error:", testsRes.error?.message);
                if (summaryRes.error) console.error("Summary stats error:", summaryRes.error);
                if ((velocityRes as any)?.error) console.error("Velocity data error:", (velocityRes as any).error);

                // ============================================================
                // 1. Process Subject Accuracy from Syllabus + Practice
                // ============================================================
                const subjectMap = new Map<string, any>();
                let colorIdx = 0;
                const subjectColors = ['bg-indigo-600', 'bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600'];

                // Initialize from syllabus if available
                const sections = (examObj as any)?.sections || [];
                sections.forEach((s: any) => {
                    const subj = s.name;
                    const key = subj.toLowerCase().trim();
                    const subjLower = subj.toLowerCase();
                    const Icon = subjLower.includes('math') ? Calculator :
                        subjLower.includes('biol') ? Microscope :
                        subjLower.includes('chem') ? FlaskConical :
                        subjLower.includes('phys') ? Atom :
                        subjLower.includes('reason') || subjLower.includes('logic') ? Target :
                        subjLower.includes('writing') ? PenTool :
                        subjLower.includes('reading') ? BookOpen :
                        subjLower.includes('listening') ? Headphones :
                        subjLower.includes('speaking') ? Mic :
                        subjLower.includes('general') ? Globe : BookOpen;

                    subjectMap.set(key, {
                        subject: subj,
                        accuracy: 0,
                        score: 0,
                        total: 0,
                        correct: 0,
                        color: s.color === 'indigo' ? 'bg-indigo-600' :
                            s.color === 'violet' ? 'bg-violet-600' :
                                s.color === 'blue' ? 'bg-blue-600' :
                                    s.color === 'emerald' ? 'bg-emerald-600' :
                                        s.color === 'rose' ? 'bg-rose-600' :
                                            s.color === 'amber' ? 'bg-amber-600' :
                                                subjectColors[colorIdx++ % subjectColors.length],
                        icon: Icon,
                        status: 'NOT STARTED'
                    });
                });

                const rawPracticeData = (practiceRes.data as any[]) || [];
                rawPracticeData.forEach((r: any) => {
                    const subj = (r.subject || 'Other').trim();
                    const key = subj.toLowerCase().trim();
                    if (!key || key === 'all subjects' || key === 'all') return;

                        const subjLower = subj.toLowerCase();
                        const Icon = subjLower.includes('math') ? Calculator :
                            subjLower.includes('biol') ? Microscope :
                            subjLower.includes('chem') ? FlaskConical :
                            subjLower.includes('phys') ? Atom :
                            subjLower.includes('reason') || subjLower.includes('logic') ? Target :
                            subjLower.includes('writing') ? PenTool :
                            subjLower.includes('reading') ? BookOpen :
                            subjLower.includes('listening') ? Headphones :
                            subjLower.includes('speaking') ? Mic :
                            subjLower.includes('general') ? Globe : BookOpen;

                        subjectMap.set(key, {
                            subject: subj, accuracy: 0, score: 0, total: 0, correct: 0,
                            color: subjectColors[colorIdx++ % subjectColors.length],
                            icon: Icon, status: 'NOT STARTED'
                        });

                    const entry = subjectMap.get(key)!;

                    // IF it's an RPC summary result, it will have 'total' or 'total_questions'
                    // IF it's a direct row result, we just increment total by 1
                    if (r.total_questions !== undefined || r.total !== undefined) {
                        entry.total += (r.total_questions || r.total || 0);
                        entry.correct += (r.correct_answers || r.correct || 0);
                    } else {
                        entry.total++;
                        if (r.is_correct) entry.correct++;
                    }
                });

                let subjectArr = Array.from(subjectMap.values()).map(entry => {
                    if (entry.total > 0) {
                        entry.accuracy = Math.round((entry.correct / entry.total) * 100);
                        entry.score = entry.accuracy;
                        entry.status = entry.accuracy >= 90 ? 'MASTERED' : entry.accuracy >= 70 ? 'STRONG' : entry.accuracy >= 40 ? 'IMPROVING' : 'WEAK';
                    }
                    return entry;
                });

                const filteredDisplaySubjects = subjectArr.filter(s =>
                    s.subject &&
                    s.subject.toLowerCase() !== 'all subjects' &&
                    s.subject.toLowerCase() !== 'all' &&
                    !s.subject.toLowerCase().includes('mock')
                ).sort((a, b) => {
                    const subjA = a.subject.toLowerCase();
                    const subjB = b.subject.toLowerCase();
                    if (subjA === 'physics') return 1;
                    if (subjB === 'physics') return -1;
                    return 0;
                });

                setSubjectData(filteredDisplaySubjects);

                if (filteredDisplaySubjects.length > 0 && !selectedSubject) {
                    const mathIdx = filteredDisplaySubjects.findIndex(s => s.subject.toLowerCase().includes('math'));
                    if (mathIdx !== -1) {
                        setSelectedSubject(filteredDisplaySubjects[mathIdx].subject);
                    } else {
                        setSelectedSubject(filteredDisplaySubjects[0].subject);
                    }
                }

                const totalCorrect = subjectArr.reduce((acc, curr) => acc + curr.correct, 0);
                const totalSolved = subjectArr.reduce((acc, curr) => acc + curr.total, 0);

                // ============================================================
                // 6. Refined Stats (Accuracy, Time Spent, Verified Skills, Percentile)
                // ============================================================
                const summaryData = summaryRes.data?.[0] || summaryRes.data || {};
                const refinedAccuracy = summaryData.accuracy_percent || 0;
                const totalHours = summaryData.time_spent_hours || 0;
                const verifiedPercentage = Math.round(summaryData.verified_skills_percent || 0);
                const percentileTop = Math.round(summaryData.percentile_top || 100);
                const totalSolvedCount = summaryData.total_solved || 0;
                const absoluteRank = summaryData.global_rank || 0;

                setStats(prev => ({
                    ...prev,
                    accuracy: `${Math.round(refinedAccuracy)}%`,
                    timeSpent: `${totalHours}h`,
                    verifiedSkills: `${verifiedPercentage}%`,
                    percentile: `${percentileTop}%`
                }));

                // Leaderboard & Rank
                const champions = (championsRes?.data as any[]) || [];
                const myRankIdx = champions.findIndex((c: any) => c.user_id === targetUserId);
                
                // Use global rank from summary stats (which counts all users) if available, 
                // otherwise fallback to champion position or percentile estimate
                let rankNum = absoluteRank > 0 ? Number(absoluteRank) : (myRankIdx !== -1 ? myRankIdx + 1 : Math.max(1, percentileTop));
                let pointsNum = myRankIdx !== -1 ? (champions[myRankIdx]?.questions_solved || totalSolvedCount) : totalSolvedCount;

                setRank(rankNum);
                setPoints(pointsNum);

                // ============================================================
                // 7. Velocity Data (From secure RPC)
                // ============================================================
                // Fix Growth Velocity mapping - velocityRes is the RPC response containing .data
                const rawVelocity = (velocityRes as any)?.data || (velocityRes as any) || [];
                // Handle case where velocityRes might be the array itself or the wrapper
                const velocityArray = Array.isArray(rawVelocity) ? rawVelocity : (rawVelocity.data || []);

                const velocity = velocityArray.map((v: any) => ({
                    day: format(new Date(v.activity_date), 'MMM d'),
                    score: Number(v.score) || 0,
                    questions: Number(v.questions) || 0,
                    accuracy: Number(v.accuracy) || 0
                }));
                setVelocityData(velocity);

                // ============================================================
                // 8. Advanced Mock Data
                // ============================================================
                const allTests = (testsRes.data as any[]) || [];
                const mockHistory = allTests.filter((t: any) => t.test_type === 'mock' || t.is_mock === true);

                if (isPremiumViewer) {
                    const latestMock = mockHistory.length > 0 ? mockHistory[0] : null;
                    const fetchedMockHistory = mockHistory.map((t: any) => ({
                        ...t,
                        id: t.id,
                        test_id: t.id,
                        completed_at: t.created_at
                    }));

                    const mockIds = mockHistory.map((m: any) => m.id);
                    const { data: qData, error: qError } = await (mockIds.length > 0
                        ? (isSelfView
                            ? supabase.from('questions').select('*').in('test_id', mockIds)
                            : (supabase as any).rpc('get_questions_secure', { target_test_ids: mockIds }))
                        : Promise.resolve({ data: [] }));

                    if (qError) console.error("Questions fetch error:", qError);
                    setAdvancedData(prev => ({
                        ...prev,
                        latestTest: latestMock,
                        latestQuestions: qData || [],
                        mockHistory: fetchedMockHistory
                    }));
                }

                // ============================================================
                // 9. Topic Mastery (Always fetch for self or premium)
                // ============================================================
                const { data: tData, error: tError } = await ((targetUserId && effectiveExamId)
                    ? (supabase as any).rpc('get_topic_performance_secure', {
                        target_user_id: String(targetUserId),
                        target_exam_id: String(effectiveExamId)
                    })
                    : Promise.resolve({ data: [], error: null }));

                if (tError) console.error("Topic performance fetch error:", tError);
                if (isMounted) {
                    setAdvancedData(prev => ({
                        ...prev,
                        topicMastery: tData || []
                    }));
                }
            } catch (err) {
                console.error("Critical error in fetchAnalytics:", err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchAnalytics();

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [targetUserId, effectiveExamId, timeframe, isPremiumViewer, isSelfView]);

    const mockTrendData = useMemo(() => {
        if (!advancedData.mockHistory || advancedData.mockHistory.length === 0) return [];
        const isImat = effectiveExamId === 'imat-prep';
        const corrPts = isImat ? 1.5 : (examObj?.scoring?.correct || 1);
        const incorrPts = isImat ? 0.4 : Math.abs(examObj?.scoring?.incorrect || 0);

        return advancedData.mockHistory.map(m => {
            const rawScore = (m.correct_answers || 0) * corrPts - (m.wrong_answers || 0) * incorrPts;
            return {
                date: format(new Date(m.completed_at), 'MMM d'),
                score: isImat ? Number(rawScore.toFixed(1)) : (m.total_questions > 0 ? Math.round((m.correct_answers / m.total_questions) * 100) : 0)
            };
        });
    }, [advancedData.mockHistory, effectiveExamId, examObj]);

    const fatigueData = useMemo(() => {
        if (!advancedData.latestQuestions || advancedData.latestQuestions.length === 0) return [];

        // Group questions by their test_id so we can normalize position within each test
        const questionsByTest = new Map<string, any[]>();
        advancedData.latestQuestions.forEach(q => {
            if (!questionsByTest.has(q.test_id)) questionsByTest.set(q.test_id, []);
            questionsByTest.get(q.test_id)!.push(q);
        });

        // Normalized pool of questions with relative positions [0, 1]
        const normalizedPool: { percentPos: number; isCorrect: boolean; timeSpent: number }[] = [];

        questionsByTest.forEach(qs => {
            const sorted = [...qs].sort((a, b) => (a.question_number || 0) - (b.question_number || 0));
            const total = sorted.length;
            sorted.forEach((q, idx) => {
                normalizedPool.push({
                    percentPos: (idx + 1) / total,
                    isCorrect: q.user_answer !== null && q.user_answer !== undefined && Number(q.user_answer) === Number(q.correct_index),
                    timeSpent: q.time_spent_seconds || 0
                });
            });
        });

        const segments = [
            { label: 'Start', min: 0, max: 0.25 },
            { label: 'Middle', min: 0.25, max: 0.5 },
            { label: 'Late', min: 0.5, max: 0.75 },
            { label: 'Final', min: 0.75, max: 1.01 }
        ];

        return segments.map(seg => {
            const chunk = normalizedPool.filter(p => p.percentPos >= seg.min && p.percentPos < seg.max);
            const total = chunk.length;
            if (total === 0) return { segment: seg.label, accuracy: 0, avgTime: 0 };

            const correct = chunk.filter(p => p.isCorrect).length;
            // Filter out noise (<= 1s) for "Real" average time
            const validTimes = chunk.filter(p => p.timeSpent > 1).map(p => p.timeSpent);
            const avgTime = validTimes.length > 0
                ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
                : 0;

            return {
                segment: seg.label,
                accuracy: Math.round((correct / total) * 100),
                avgTime
            };
        });
    }, [advancedData.latestQuestions]);


    const allMockStats = useMemo(() => {
        const stats = { gross: 0, penalty: 0, net: 0, skipped: 0, wrong: 0, correct: 0, totalQuestions: 0 };
        advancedData.mockHistory.forEach(m => {
            // Precise Scoring Detection
            const examId = (m.exam_type || '').toLowerCase();
            const isImat = examId.includes('imat');
            const isCents = examId.includes('cent-s');

            // IMAT: +1.5 / -0.4
            // CEnT-S: +1.0 / -0.25
            // Default: +1.0 / 0 (if unrecognized)
            const corrPts = isImat ? 1.5 : (isCents ? 1.0 : (examObj?.scoring?.correct || 1));
            const incorrPts = isImat ? 0.4 : (isCents ? 0.25 : Math.abs(examObj?.scoring?.incorrect || 0));

            const currentGross = (m.correct_answers || 0) * corrPts;
            const currentPenalty = (m.wrong_answers || 0) * incorrPts;

            stats.gross += currentGross;
            stats.penalty += currentPenalty;
            stats.net += (currentGross - currentPenalty);
            stats.skipped += m.skipped_answers || 0;
            stats.wrong += m.wrong_answers || 0;
            stats.correct += m.correct_answers || 0;
            stats.totalQuestions += m.total_questions || 0;
        });
        return stats;
    }, [advancedData.mockHistory, examObj]);

    const allMockQuestionsSorted = useMemo(() => {
        const testDates = new Map(advancedData.mockHistory.map(m => [m.id, new Date(m.completed_at).getTime()]));
        return [...advancedData.latestQuestions].sort((a, b) => {
            const dateA = testDates.get(a.test_id) || 0;
            const dateB = testDates.get(b.test_id) || 0;
            if (dateA !== dateB) return dateA - dateB;
            return (a.question_number || 0) - (b.question_number || 0);
        });
    }, [advancedData.latestQuestions, advancedData.mockHistory]);

    const filteredTopics = useMemo(() => {
        if (!selectedSubject || !examObj?.syllabus) return [];
        const selected = selectedSubject.toLowerCase().trim();
        const officialTopics: { name: string }[] = [];

        Object.entries(examObj.syllabus).forEach(([category, topics]) => {
            const catLower = category.toLowerCase().trim();
            let isMatch = false;

            // Direct match
            if (catLower === selected) isMatch = true;
            // Fuzzy match for combined categories (e.g. "Physics & Mathematics")
            else if (catLower.includes(selected) || selected.includes(catLower)) isMatch = true;
            // Special cases
            else if (selected.includes('&') && selected.split('&').some(p => catLower.includes(p.trim()))) isMatch = true;
            else if (selected === 'general knowledge' && catLower === 'general') isMatch = true;
            else if (selected === 'reasoning on texts and data' && catLower.includes('reasoning')) isMatch = true;

            if (isMatch) (topics as any[]).forEach(t => officialTopics.push({ name: t.name }));
        });

        const masteryMap = new Map<string, any>();
        advancedData.topicMastery.forEach(m => {
            const key = m.topic?.toLowerCase().trim();
            if (key && !masteryMap.has(key)) masteryMap.set(key, m);
        });

        return officialTopics.map(t => {
            const key = t.name.toLowerCase().trim();
            let mastery = masteryMap.get(key);

            // Fallback: try mapping if many-to-one or substring
            if (!mastery) {
                const altMatch = Array.from(masteryMap.values()).find(m => {
                    const mk = (m.topic || m.name || '').toLowerCase().trim();
                    return mk.includes(key) || key.includes(mk);
                });
                if (altMatch) mastery = altMatch;
            }

            const total = mastery?.total_answered || mastery?.total_questions || 0;
            const accuracy = mastery?.accuracy_percentage || mastery?.accuracy || 0;

            if (!mastery || total === 0) {
                return {
                    topic: t.name,
                    subject: selectedSubject,
                    accuracy_percentage: 0,
                    total_answered: 0,
                    status: 'NOT STARTED'
                };
            }

            return {
                topic: t.name,
                subject: selectedSubject,
                accuracy_percentage: Math.round(accuracy),
                total_answered: total,
                status: accuracy >= 80 ? 'MASTERED' : accuracy >= 50 ? 'STRONG' : 'IMPROVING'
            };
        });
    }, [selectedSubject, advancedData.topicMastery, examObj]);

    const pageContent = (
        <div className={cn(
            "container mx-auto py-6 sm:py-8 relative",
            hideLayout ? "w-full max-w-none px-0" : "px-4 sm:px-6 max-w-7xl"
        )}>
            {isLoading ? (
                <AnalyticsSkeleton />
            ) : (
                <>
                    {/* Premium Blur Overlay */}
                    {shouldShowBlur && (
                <PremiumOverlay
                    onUpgrade={openPricingModal}
                    title="Unlock Your Analytics"
                    description="Get deep insights into your learning velocity, topic mastery, and detailed performance breakdown."
                />
            )}

            <div className={cn(
                "transition-all duration-700",
                shouldShowBlur && "blur-[6px] opacity-60 pointer-events-none select-none"
            )}>
                {/* Header omitted when embedded in profile based on hideLayout or logic */}
                {/* Header matches reference screenshot - clean & minimalistic */}
                {!hideLayout && (
                    isMobile ? (
                        <div className="rounded-[2.5rem] relative overflow-hidden mb-6 p-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 shadow-2xl shadow-indigo-900/50">
                            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                            <div className="absolute -bottom-8 -left-4 w-28 h-28 bg-violet-400/20 rounded-full blur-2xl" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
                                            <BarChart3 className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h1 className="text-lg font-black text-white leading-tight">
                                                {isSelfView ? 'Your Progress' : `${targetProfile?.display_name || targetProfile?.full_name || (targetProfile as any)?.display_name || 'Student'}'s Progress`}
                                            </h1>
                                            <p className="text-[11px] text-indigo-200 font-semibold mt-0.5">{isSelfView ? "Here's how you're doing 👋" : "Performance Metrics"}</p>
                                        </div>
                                    </div>
 
                                    {(authPlan === 'global' || authPlan === 'elite' || authIsAdmin) ? (
                                        <ReportDownloadDialog 
                                            userData={{
                                                name: targetProfile?.display_name || targetProfile?.full_name || authProfile?.display_name || 'Student',
                                                exam: effectiveExamId || 'General',
                                                stats: {
                                                    ...stats,
                                                    rank: rank,
                                                    points: points
                                                },
                                                subjectData: subjectData,
                                                mockHistory: advancedData.mockHistory,
                                                topicMastery: advancedData.topicMastery
                                            }}
                                            syllabus={examObj?.syllabus}
                                            trigger={
                                                <Button size="icon" className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20">
                                                    <Download className="w-4 h-4 text-white" />
                                                </Button>
                                            }
                                        />
                                    ) : (
                                        <Button 
                                            size="icon" 
                                            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15"
                                            onClick={() => {
                                                toast({
                                                    title: "Premium Feature",
                                                    description: "Upgrade to Premium",
                                                });
                                                openPricingModal();
                                            }}
                                        >
                                            <Download className="w-4 h-4 text-white/50" />
                                        </Button>
                                    )}
                                </div>
                                <div className="flex items-stretch gap-0 bg-white/10 rounded-2xl overflow-hidden border border-white/15">
                                    <div className="flex-1 flex flex-col items-center py-4 px-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200/70 mb-1.5">Rank</p>
                                        <p className="text-3xl font-black text-white leading-none">#<CountUp to={displayRank} /></p>
                                    </div>
                                    <div className="w-px bg-white/15" />
                                    <div className="flex-1 flex flex-col items-center py-4 px-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200/70 mb-1.5">Points</p>
                                        <p className="text-3xl font-black text-white leading-none"><CountUp to={displayPoints} precision={effectiveExamId === 'imat-prep' ? 1 : 0} /></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between mb-10 px-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2.5rem] shadow-sm transition-all duration-700">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-[1.2rem] bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                    <BarChart3 className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-none uppercase">
                                        {'Your Progress'}
                                    </h1>
                                    <div className="text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-[0.2em] mt-2">
                                        {"HERE'S HOW YOU'RE PERFORMING"}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-10">
                                <div className="flex flex-col items-end group cursor-default">
                                    <p className="text-[9px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-[0.2em] mb-1 group-hover:text-indigo-400 transition-colors">Global Rank</p>
                                    <div className="text-xl font-black text-indigo-600 flex items-baseline leading-none">
                                        <span className="text-xs mr-0.5 opacity-50">#</span>
                                        {isLoading ? <div className="h-5 w-12 bg-indigo-50 dark:bg-indigo-900/20 animate-pulse rounded-lg ml-1" /> : (
                                            <CountUp to={displayRank} />
                                        )}
                                    </div>
                                </div>
                                    <div className="flex flex-col items-end group cursor-default">
                                    <p className="text-[9px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-[0.2em] mb-1 group-hover:text-indigo-400 transition-colors">Points</p>
                                    <div className="text-xl font-black text-slate-900 dark:text-slate-100 leading-none">
                                        <CountUp to={displayPoints} precision={effectiveExamId === 'imat-prep' ? 1 : 0} />
                                    </div>
                                </div>
                                <div className="w-px h-10 bg-slate-100 dark:bg-white/5 mx-2" />
                                
                                {(authPlan === 'global' || authPlan === 'elite' || authIsAdmin) ? (
                                    <ReportDownloadDialog 
                                        userData={{
                                            name: targetProfile?.display_name || targetProfile?.full_name || authProfile?.display_name || 'Student',
                                            exam: effectiveExamId || 'General',
                                            stats: {
                                                ...stats,
                                                rank: rank,
                                                points: points
                                            },
                                            subjectData: subjectData,
                                            mockHistory: advancedData.mockHistory,
                                            topicMastery: advancedData.topicMastery
                                        }}
                                        syllabus={examObj?.syllabus}
                                    />
                                ) : (
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="w-10 h-10 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400"
                                        onClick={() => {
                                            toast({
                                                title: "Premium Feature",
                                                description: "Upgrade to Premium",
                                            });
                                            openPricingModal();
                                        }}
                                    >
                                        <Download className="w-5 h-5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )
                )}

                <div className={cn("grid gap-4 mb-8", isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4")}>
                    {[
                        { label: 'ACCURACY', value: displayStats.accuracy, icon: Dribbble, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10', dotColor: 'bg-orange-500' },
                        { label: 'TIME SPENT', value: displayStats.timeSpent, icon: Clock, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10', dotColor: 'bg-pink-500' },
                        { label: 'VERIFIED SKILLS', value: displayStats.verifiedSkills, icon: Medal, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10', dotColor: 'bg-red-500' },
                        { label: 'PERCENTILE', value: displayStats.percentile, prefix: '', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', dotColor: 'bg-emerald-500' },
                    ].map((stat: any, i) => (
                        <div
                            key={i}
                            className={cn(
                                "relative overflow-hidden border p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl group bg-white dark:bg-slate-900",
                                "border-slate-100 dark:border-white/5",
                                isMobile ? "rounded-[2.2rem]" : "rounded-[2.5rem]"
                            )}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border", stat.bg, "border-white dark:border-white/10 shadow-sm")}>
                                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                                </div>
                                <div className={cn("w-1.5 h-1.5 rounded-full", stat.dotColor)} />
                            </div>
                            <div className="flex flex-col">
                                <div className={cn("font-black tracking-tighter leading-none text-slate-900 dark:text-white", isMobile ? "text-2xl" : "text-3xl")}>
                                    {isLoading ? (
                                        <div className="h-8 w-24 bg-slate-100 dark:bg-white/5 animate-pulse rounded-xl" />
                                    ) : (
                                        stat.label === 'PERCENTILE' ? (
                                            <span className="flex items-baseline">
                                                <span className="text-base font-black mr-1 uppercase text-slate-400">Top</span>
                                                <CountUp to={parseFloat(stat.value) || 0} suffix="%" />
                                            </span>
                                        ) : (
                                            <CountUp
                                                to={parseFloat(stat.value) || 0}
                                                prefix={stat.prefix || ''}
                                                suffix={stat.value.replace(/[0-9.]/g, '')}
                                                precision={stat.value.includes('.') ? 1 : 0}
                                            />
                                        )
                                    )}
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-l-4 border-indigo-600 pl-6 sm:pl-8 mb-6 sm:mb-10 mt-8 sm:mt-16">
                    <div>
                        <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-none uppercase">
                            Subject <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">Breakdown</span>
                        </h2>
                        <p className="text-[10px] text-slate-300 font-bold tracking-[0.2em] uppercase mt-2">SEE HOW WELL YOU KNOW EACH SUBJECT</p>
                    </div>
                    {!isPremiumViewer && isSelfView && (
                        <Button onClick={openPricingModal} className="h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl px-8 shadow-lg shadow-indigo-500/20">
                            UPGRADE TO GLOBAL PLAN
                        </Button>
                    )}
                </div>

                {isMobile ? (
                    <div className="space-y-8 mb-20">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={isLoading ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <div className="flex justify-between items-center px-2 mb-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Pick a Subject</h3>
                                <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Swipe →</span>
                            </div>
                            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x px-1 pb-4 scroll-smooth">
                                {displaySubjectData.map((item, index) => (
                                    <motion.button key={index} whileTap={{ scale: 0.95 }} onClick={() => setSelectedSubject(item.subject)} className={cn("snap-start shrink-0 w-48 p-5 rounded-[2.2rem] border transition-all duration-300 relative overflow-hidden group text-left", selectedSubject === item.subject ? "bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-600/30 text-white" : "bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border-slate-100 dark:border-white/5 shadow-sm")}>
                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner", selectedSubject === item.subject ? "bg-white/20" : "bg-slate-50 dark:bg-white/5")}>
                                                <item.icon className={cn("w-4 h-4", selectedSubject === item.subject ? "text-white" : "")} style={selectedSubject !== item.subject ? { color: item.color } : {}} />
                                            </div>
                                            <span className={cn("text-sm font-black", selectedSubject === item.subject ? "text-white" : (item.status === 'MASTERED' ? 'text-emerald-500' : 'text-indigo-600 dark:text-indigo-400'))}>{item.accuracy}%</span>
                                        </div>
                                        <h4 className={cn("font-black text-[12px] uppercase tracking-tight mb-2 relative z-10 truncate", selectedSubject === item.subject ? "text-white" : "text-slate-900 dark:text-slate-100")}>{item.subject}</h4>
                                        <div className={cn("w-full h-1 rounded-full overflow-hidden relative z-10", selectedSubject === item.subject ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800")}>
                                            <motion.div 
                                                initial={{ width: 0 }} 
                                                animate={{ width: `${item.accuracy}%` }} 
                                                transition={{ duration: 1.5, ease: "easeOut", delay: index * 0.1 }}
                                                className={cn("h-full", selectedSubject === item.subject ? "bg-white" : "")} 
                                                style={{ backgroundColor: selectedSubject === item.subject ? undefined : item.color }} 
                                            />
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                        <div className="bg-white dark:bg-slate-900 p-0 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col min-h-[400px] overflow-hidden relative rounded-[2.5rem]">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-8 h-8 bg-indigo-50 dark:bg-muted rounded-xl flex items-center justify-center border border-indigo-100 dark:border-border">
                                    <Target className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase">{selectedSubject ? `${selectedSubject.toUpperCase()} TOPICS` : 'TOPICS'}</h3>
                            </div>
                            <div className="flex-1">
                                <AnimatePresence mode="wait">
                                    {!selectedSubject ? (
                                        <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-muted rounded-full flex items-center justify-center mb-2"><ChevronRight className="w-8 h-8 text-slate-300" /></div>
                                            <div><h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Pick a subject above</h4></div>
                                        </motion.div>
                                    ) : (
                                        <motion.div key={selectedSubject} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                            <div className="flex items-center justify-between px-2 text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] mb-4 border-b border-slate-50 dark:border-white/5 pb-4">
                                                <span>Topic Domain</span>
                                                <span>Mastery</span>
                                            </div>
                                            <div className="space-y-3 pt-2 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
                                                {filteredTopics.map((topic, i) => {
                                                    const acc = Number(topic.accuracy_percentage);
                                                    const barColor = acc >= 80 ? '#10b981' : acc >= 50 ? '#f59e0b' : acc > 0 ? '#f43f5e' : '#94a3b8';
                                                    const statusLabel = acc >= 80 ? 'STRONG' : acc >= 50 ? 'IMPROVING' : acc > 0 ? 'WEAK' : 'NEW';
                                                    const bgCol = acc >= 80 ? 'bg-emerald-500/10 text-emerald-500' : acc >= 50 ? 'bg-amber-500/10 text-amber-500' : acc > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500';

                                                    return (
                                                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100/50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors group">
                                                            <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
                                                                <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight truncate">{topic.topic}</span>
                                                                <span className={cn("px-1.5 py-0.5 rounded text-[7px] font-black tracking-widest shrink-0", bgCol)}>{statusLabel}</span>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-50 dark:border-white/5">
                                                                    <motion.div 
                                                                        initial={{ width: 0 }} 
                                                                        animate={{ width: `${acc}%` }} 
                                                                        transition={{ duration: 1.2, ease: "easeOut", delay: i * 0.05 }} 
                                                                        className="h-full rounded-full" 
                                                                        style={{ backgroundColor: barColor }} 
                                                                    />
                                                                </div>
                                                                <span className="text-[11px] font-black w-10 text-right" style={{ color: barColor }}>
                                                                    <CountUp to={acc} suffix="%" />
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-2 gap-8 items-stretch mb-20">
                        <div
                            className="bg-white dark:bg-slate-900 p-0 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col min-h-[480px] overflow-hidden relative rounded-[2.5rem]"
                        >
                            {!isPremiumViewer ? <PremiumLockedGrid className="h-full" /> : (
                                <div className="p-8 overflow-hidden flex flex-col h-full">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-white/5 shadow-sm">
                                            <Brain className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase">Module Proficiency</h3>
                                    </div>
                                    <div className="flex-1 overflow-hidden flex flex-col">
                                        <div className="grid grid-cols-12 px-8 py-4 text-[9px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-slate-50 dark:border-white/5">
                                            <div className="col-span-6">Component</div>
                                            <div className="col-span-3 text-center">Completion</div>
                                            <div className="col-span-3 text-right">Accuracy</div>
                                        </div>
                                        <div className="space-y-4 p-4 overflow-y-auto custom-scrollbar flex-1">
                                            {isLoading ? (
                                                Array.from({ length: 5 }).map((_, i) => (
                                                    <div key={i} className="grid grid-cols-12 items-center px-4 py-4 rounded-[1.8rem] border border-slate-50 dark:border-white/5 animate-pulse">
                                                        <div className="col-span-6 flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 shadow-sm" />
                                                            <div className="space-y-2">
                                                                <div className="h-4 w-24 bg-slate-100 dark:bg-white/5 rounded" />
                                                                <div className="h-2 w-16 bg-slate-100 dark:bg-white/5 rounded" />
                                                            </div>
                                                        </div>
                                                        <div className="col-span-3 px-4">
                                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full" />
                                                        </div>
                                                        <div className="col-span-3 text-right">
                                                            <div className="h-4 w-12 bg-slate-100 dark:bg-white/5 rounded ml-auto" />
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                subjectData.map((item, index) => (
                                                    <div key={index} onClick={() => setSelectedSubject(item.subject)} className={cn(
                                                        "grid grid-cols-12 items-center px-4 py-4 rounded-[1.8rem] transition-all group border cursor-pointer",
                                                        selectedSubject === item.subject
                                                            ? "bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-600/30"
                                                            : "bg-white dark:bg-white/5 border-transparent hover:border-slate-100 dark:hover:border-white/10"
                                                    )}>
                                                        <div className="col-span-6 flex items-center gap-4">
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                                                                selectedSubject === item.subject ? "bg-white/20" : "bg-slate-50 dark:bg-slate-800"
                                                            )}>
                                                                <item.icon className={cn("w-4 h-4", selectedSubject === item.subject ? "text-white" : "")} style={selectedSubject !== item.subject ? { color: item.color } : {}} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className={cn("text-[11px] font-black truncate uppercase tracking-tight", selectedSubject === item.subject ? "text-white" : "text-slate-900 dark:text-white")}>
                                                                    {item.subject}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={cn("text-[8px] font-black uppercase tracking-widest", selectedSubject === item.subject ? "text-white/70" : "text-slate-400")}>
                                                                        {item.total} SOLVED
                                                                    </span>
                                                                    <span className={cn(
                                                                        "px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest",
                                                                        selectedSubject === item.subject
                                                                            ? "bg-white/20 text-white"
                                                                            : (item.status === 'MASTERED' ? 'bg-indigo-500/10 text-indigo-500' :
                                                                                item.status === 'STRONG' ? 'bg-emerald-500/10 text-emerald-500' :
                                                                                    item.status === 'IMPROVING' ? 'bg-amber-500/10 text-amber-500' :
                                                                                        'bg-rose-500/10 text-rose-500')
                                                                    )}>
                                                                        {item.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                                <div className={cn(
                                                                    "h-1.5 w-full rounded-full overflow-hidden relative",
                                                                    selectedSubject === item.subject ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"
                                                                )}>
                                                                    <motion.div 
                                                                        initial={{ width: 0 }} 
                                                                        animate={{ width: `${item.accuracy}%` }} 
                                                                        transition={{ duration: 1.5, ease: "easeOut", delay: index * 0.1 }}
                                                                        className="h-full rounded-full" 
                                                                        style={{ backgroundColor: selectedSubject === item.subject ? 'white' : item.color }} 
                                                                    />
                                                                </div>
                                                        <div className="col-span-3 text-right">
                                                            <span className={cn("text-base font-black", selectedSubject === item.subject ? "text-white" : "text-slate-900 dark:text-white")}>
                                                                <CountUp to={item.accuracy} suffix="%" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div
                            className="bg-white dark:bg-slate-900 p-0 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col min-h-[480px] overflow-hidden relative rounded-[2.5rem]"
                        >
                            {!isPremiumViewer ? <PremiumLockedGrid className="h-full" /> : (
                                <div className="p-8 h-full flex flex-col">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-white/5 shadow-sm">
                                            <Target className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase">
                                            {selectedSubject ? `${selectedSubject.toUpperCase()} TOPICS` : 'TOPICS'}
                                        </h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                                        {isLoading ? (
                                            <div className="space-y-4">
                                                {Array.from({ length: 6 }).map((_, i) => (
                                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100/50 dark:border-white/5 animate-pulse">
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <div className="w-2 h-2 rounded-full bg-slate-100 dark:bg-white/5" />
                                                            <div className="h-4 w-32 bg-slate-100 dark:bg-white/5 rounded" />
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-32 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full" />
                                                            <div className="h-4 w-10 bg-slate-100 dark:bg-white/5 rounded" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <AnimatePresence mode="wait">
                                                {!selectedSubject ? (
                                                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                                                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
                                                            <ChevronRight className="w-10 h-10 text-slate-300" />
                                                        </div>
                                                        <p className="text-sm font-black text-slate-400 uppercase tracking-tight">Select a subject for topic analysis</p>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div key={selectedSubject} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
                                                        <div className="flex items-center justify-between px-2 text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] mb-2 sticky top-0 bg-white dark:bg-slate-900 z-10 py-2">
                                                            <span>Topic Domain</span>
                                                            <span>Mastery</span>
                                                        </div>
                                                        {filteredTopics.map((topic, i) => {
                                                            const acc = Number(topic.accuracy_percentage);
                                                            const barColor = acc >= 80 ? '#10b981' : acc >= 50 ? '#f59e0b' : acc > 0 ? '#f43f5e' : '#94a3b8';
                                                            const statusLabel = acc >= 80 ? 'STRONG' : acc >= 50 ? 'IMPROVING' : acc > 0 ? 'WEAK' : 'NEW';
                                                            const bgCol = acc >= 80 ? 'bg-emerald-500/10 text-emerald-500' : acc >= 50 ? 'bg-amber-500/10 text-amber-500' : acc > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500';

                                                            return (
                                                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100/50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors group">
                                                                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                                                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
                                                                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight truncate">{topic.topic}</span>
                                                                        <span className={cn("px-1.5 py-0.5 rounded text-[7px] font-black tracking-widest shrink-0", bgCol)}>{statusLabel}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-6">
                                                                        <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-50 dark:border-white/5">
                                                                            <motion.div 
                                                                                initial={{ width: 0 }} 
                                                                                animate={{ width: `${acc}%` }} 
                                                                                transition={{ duration: 1.2, ease: "easeOut", delay: i * 0.05 }} 
                                                                                className="h-full rounded-full" 
                                                                                style={{ backgroundColor: barColor }} 
                                                                            />
                                                                        </div>
                                                                        <span className="text-[11px] font-black w-10 text-right" style={{ color: barColor }}>
                                                                            <CountUp to={acc} suffix="%" />
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex flex-col border-l-4 border-indigo-600 pl-6 sm:pl-8 mb-6 sm:mb-10 mt-8 sm:mt-16">
                    <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-none uppercase">
                        Mock <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">Results</span>
                    </h2>
                    <p className="text-[10px] text-slate-300 font-bold tracking-[0.2em] uppercase mt-2">SEE HOW YOUR MOCK EXAMS ADD UP</p>
                </div>

                {!isPremiumViewer ? (
                    <div className="grid lg:grid-cols-2 gap-4 sm:gap-8 mb-10 sm:mb-20">
                        <PremiumLockedGrid 
                            className="h-[400px]" 
                            title="Unlock Performance Diagnostics" 
                            description="Deep behavioral analysis and penalty tracking for your mock sessions."
                        />
                        <PremiumLockedGrid 
                            className="h-[400px]" 
                            title="Efficiency Insights" 
                            description="See exactly where you lose time and identify fatigue patterns."
                        />
                    </div>
                ) : (
                    <>
                        <div className="grid lg:grid-cols-2 gap-4 sm:gap-8 mb-10 sm:mb-20">
                            <PenaltyAnalysis grossScore={allMockStats.gross} penalty={allMockStats.penalty} netScore={allMockStats.net} skippedCount={allMockStats.skipped} wrongCount={allMockStats.wrong} correctCount={allMockStats.correct} attemptedCount={allMockStats.correct + allMockStats.wrong} totalQuestions={allMockStats.totalQuestions} isMobile={isMobile} />
                            <TimeEfficiencyScatter
                                data={allMockQuestionsSorted.map(q => ({
                                    id: q.id,
                                    topic: q.topic || 'Unknown',
                                    time_spent: q.time_spent_seconds || 0,
                                    is_correct: q.user_answer !== null && q.user_answer !== undefined && Number(q.user_answer) === Number(q.correct_index),
                                    difficulty: q.difficulty || 'medium',
                                    subject: q.subject
                                }))}
                                isMobile={isMobile}
                            />
                        </div>

                        <div className="grid lg:grid-cols-2 gap-4 sm:gap-8 mb-10 sm:mb-20">
                            <SectionFatigueChart data={fatigueData} isMobile={isMobile} />
                            <MockPerformanceTrends 
                                data={mockTrendData} 
                                subjects={examObj?.sections?.map((s: any) => s.name) || []} 
                                isMobile={isMobile} 
                                unit={effectiveExamId === 'imat-prep' ? 'pts' : '%'}
                                maxScore={effectiveExamId === 'imat-prep' ? 90 : 100}
                            />
                        </div>
                    </>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 mt-16 px-2">
                    <div className="flex flex-col border-l-4 border-indigo-600 pl-6 sm:pl-8">
                        <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-none uppercase">
                            Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">Growth</span>
                        </h2>
                        <p className="text-[10px] text-slate-300 font-bold tracking-[0.2em] uppercase mt-2">CONTINUOUS IMPROVEMENT VELOCITY TRACKING</p>
                    </div>
                    {isPremiumViewer && (
                        <div className="flex bg-slate-100/50 dark:bg-muted/30 p-1.5 rounded-2xl self-end sm:self-auto">
                            {(['7d', '30d', '6m'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTimeframe(t)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        timeframe === t ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    )}
                                >
                                    {t === '7d' ? '7 DAYS' : t === '30d' ? '30 DAYS' : '6 MONTHS'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm rounded-[2.5rem] overflow-hidden mb-20">
                    {!isPremiumViewer ? (
                        <div className="p-8"><PremiumLockedGrid className="h-[400px]" /></div>
                    ) : (
                        <div className="p-8">
                            <div className="h-[400px] w-full">
                                <Suspense fallback={<div className="h-full flex items-center justify-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Loading Growth Data...</div>}>
                                    <VelocityChart data={velocityData} />
                                </Suspense>
                            </div>
                        </div>
                    )}
                </div>
                </div>
            </>
            )}
        </div >
    );

    if (hideLayout) return pageContent;
    if (isMobile) return <MobileLayout isLoading={isLoading}>{pageContent}</MobileLayout>;
    return <Layout>{pageContent}</Layout>;
}
