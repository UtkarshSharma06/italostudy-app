import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
    BookOpen, Clock, ShieldX, CheckCircle, Calendar,
    ChevronRight, Target, Headphones, FileText, Mic,
    Award, Filter, History as HistoryIcon, Search, Sparkles, ArrowRight
} from 'lucide-react';
import { MobilePageSkeleton } from '@/components/SkeletonLoader';
import { useExam } from '@/context/ExamContext';
import { usePricing } from '@/context/PricingContext';
import { Card, CardContent } from "@/components/ui/card";
import MobileLayout from '../components/MobileLayout';
import { SubjectIcon, getSubjectColorClass } from '@/components/ui/SubjectIcon';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from 'lucide-react';

export default function MobileHistory() {
    const { user, profile, loading } = useAuth();
    const { activeExam, allExams } = useExam();
    const { openPricingModal } = usePricing();
    const navigate = useNavigate();
    const [tests, setTests] = useState<any[]>([]);
    const isIELTS = activeExam?.id === 'ielts-academic';
    const [activeTab, setActiveTab] = useState<string>(isIELTS ? 'writing' : 'practice');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState<string>('All Subjects');
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 10;

    useEffect(() => {
        if (isIELTS) setActiveTab('writing');
        else setActiveTab('practice');
    }, [isIELTS]);

    useEffect(() => {
        if (user && activeExam) fetchTests();
    }, [user, activeExam?.id]);

    const fetchTests = async () => {
        if (!activeExam?.id) return;
        setIsLoading(true);

        const examIds = [activeExam.id];
        if (activeExam.id === 'cent-s-prep') examIds.push('cent-s');
        if (activeExam.id === 'imat-prep') examIds.push('imat');
        if (activeExam.id === 'til-i-prep') examIds.push('til-i');

        const { data: testsData } = await (supabase as any)
            .from('tests')
            .select('*, mock_sessions(title)')
            .eq('user_id', user?.id)
            .in('exam_type', examIds)
            .neq('status', 'in_progress')
            .or('proctoring_status.is.null,proctoring_status.not.in.(disqualified,failed)')
            .order('completed_at', { ascending: false });

        let writingData = null;
        let readingData = null;
        let listeningData = null;
        let speakingData = null;
        let mockData = null;

        if (isIELTS) {
            const [writingRes, readingRes, listeningRes, speakingRes, mockRes] = await Promise.all([
                (supabase as any).from('writing_submissions').select('id, content, word_count, created_at, writing_feedback(overall_score)').eq('user_id', user?.id).order('created_at', { ascending: false }),
                (supabase as any).from('reading_submissions').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
                (supabase as any).from('listening_submissions').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
                (supabase as any).from('speaking_sessions').select('id, started_at, speaking_scores(overall_score)').eq('candidate_id', user?.id).order('started_at', { ascending: false }),
                (supabase as any).from('mock_exam_submissions').select('*, mock_sessions(title), reading_submissions(score, status), listening_submissions(score, status)').eq('user_id', user?.id).order('created_at', { ascending: false })
            ]);
            writingData = writingRes.data;
            readingData = readingRes.data;
            listeningData = listeningRes.data;
            speakingData = speakingRes.data;
            mockData = mockRes.data;
        }

        let unified: any[] = [];

        if (testsData) {
            unified = [...unified, ...testsData.map((t: any) => {
                let rawScore = undefined;
                let maxScore = undefined;
                
                if (t.exam_type) {
                    const examConfig = allExams[t.exam_type] || activeExam || Object.values(allExams)[0];

                    if (examConfig) {
                        const correct = t.correct_answers || 0;
                        const wrong = t.wrong_answers || 0;
                        const skipped = t.skipped_answers || 0;
                        const total = t.total_questions || (correct + wrong + skipped);

                        maxScore = total * examConfig.scoring.correct;
                        rawScore = (correct * examConfig.scoring.correct) +
                            (wrong * examConfig.scoring.incorrect) +
                            (skipped * examConfig.scoring.skipped);
                        rawScore = Number(rawScore.toFixed(2));
                    }
                }

                const examConfig = allExams[t.exam_type] || activeExam || Object.values(allExams)[0];
                const examName = examConfig?.name || t.exam_type?.toUpperCase() || 'Exam';
                let displaySubject = t.subject || 'Test';

                if (t.is_mock) {
                    const sessionData = Array.isArray(t.mock_sessions) ? t.mock_sessions[0] : t.mock_sessions;
                    const sessionTitle = sessionData?.title;
                    if (sessionTitle) {
                        const isGenericSubject = !t.subject || t.subject === 'All Subjects' || t.subject === 'International Mock' || t.subject.toLowerCase() === examName.toLowerCase() || sessionTitle.toLowerCase().includes(t.subject.toLowerCase());
                        displaySubject = isGenericSubject ? sessionTitle : `${sessionTitle} - ${t.subject}`;
                    } else if (!t.subject || t.subject === 'All Subjects' || t.subject === 'International Mock') {
                        displaySubject = `${examName} Mock Test`;
                    }
                }

                return {
                    ...t,
                    subject: displaySubject,
                    type: t.is_mock ? 'mock' : (t.test_type || (t.is_manual ? 'Writing' : 'Practice')),
                    date: t.completed_at || t.started_at,
                    raw_score: rawScore,
                    max_score: maxScore,
                    exam_type: t.exam_type
                };
            })];
        }

        if (writingData) unified = [...unified, ...writingData.map((w: any) => ({ id: w.id, subject: 'IELTS Writing', type: 'Writing', score: w.writing_feedback?.[0]?.overall_score || null, status: w.writing_feedback?.[0] ? 'completed' : 'pending', date: w.created_at, is_manual: true }))];
        if (readingData) unified = [...unified, ...readingData.map((r: any) => ({ id: r.id, subject: 'IELTS Reading', type: 'Reading', score: r.score, status: r.status, date: r.created_at, is_manual: true }))];
        if (listeningData) unified = [...unified, ...listeningData.map((l: any) => ({ id: l.id, subject: 'IELTS Listening', type: 'Listening', score: l.score, status: l.status, date: l.created_at, is_manual: true }))];
        if (speakingData) unified = [...unified, ...speakingData.map((s: any) => ({ id: s.id, subject: 'IELTS Speaking', type: 'Speaking', score: s.speaking_scores?.[0] ? Math.round((parseFloat(s.speaking_scores[0].fluency_score) + parseFloat(s.speaking_scores[0].vocabulary_score) + parseFloat(s.speaking_scores[0].grammar_score) + parseFloat(s.speaking_scores[0].pronunciation_score)) / 4 * 2) / 2 : null, status: s.speaking_scores?.[0] ? 'completed' : 'pending', date: s.started_at || s.created_at, is_manual: true }))];
        if (mockData) unified = [...unified, ...mockData.map((m: any) => {
            const rScore = m.reading_submissions?.[0]?.score || 0;
            const lScore = m.listening_submissions?.[0]?.score || 0;
            return {
                id: m.id,
                subject: m.mock_sessions?.title || 'IELTS Mock Exam',
                type: 'Full Mock',
                score: m.overall_band || null,
                reading_band: m.reading_band,
                listening_band: m.listening_band,
                writing_band: m.writing_band,
                correct_answers: rScore + lScore,
                status: m.status,
                date: m.started_at,
                is_manual: true,
                is_full_mock: true
            };
        })];

        const cleanupHistory = async () => {
            if (!user?.id) return;
            const { data: oldTests } = await (supabase as any)
                .from('tests')
                .select('id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .range(10, 50);

            if (oldTests && oldTests.length > 0) {
                const ids = oldTests.map((t: any) => t.id);
                await (supabase as any).from('questions').delete().in('test_id', ids);
                await (supabase as any).from('tests').delete().in('id', ids);
            }

            const { data: oldMocks } = await (supabase as any)
                .from('mock_exam_submissions')
                .select('id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .range(10, 50);

            if (oldMocks && oldMocks.length > 0) {
                const ids = oldMocks.map((m: any) => m.id);
                await (supabase as any).from('mock_exam_submissions').delete().in('id', ids);
            }
        };

        cleanupHistory();

        const rawMocks = unified.filter(t => t.type === 'mock' || t.type === 'Full Mock' || (isIELTS && t.subject.includes('IELTS')));
        const dedupedMocks = (() => {
            const seen = new Map<string, any>();
            for (const t of rawMocks) {
                const key = t.subject || t.id;
                if (!seen.has(key)) {
                    seen.set(key, t);
                } else {
                    const existing = seen.get(key)!;
                    if (!existing.session_id && t.session_id) {
                        seen.set(key, t);
                    }
                }
            }
            return Array.from(seen.values());
        })();

        const practicePool = unified.filter(t => t.type !== 'mock' && t.type !== 'Full Mock' && !t.subject.includes('IELTS'));
        const mockPool = dedupedMocks;
        const finalUnified = [...practicePool, ...mockPool].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const isExplorer = profile?.selected_plan === 'explorer';
        if (isExplorer) {
            if (isIELTS) {
                const reading = finalUnified.filter(t => t.type === 'Reading').slice(0, 2);
                const listening = finalUnified.filter(t => t.type === 'Listening').slice(0, 2);
                const writing = finalUnified.filter(t => t.type === 'Writing').slice(0, 2);
                const speaking = finalUnified.filter(t => t.type === 'Speaking').slice(0, 2);
                const mocks = finalUnified.filter(t => t.is_full_mock).slice(0, 2);
                setTests([...reading, ...listening, ...writing, ...speaking, ...mocks]);
            } else {
                const practice = finalUnified.filter(t => t.type !== 'mock' && !t.subject.includes('IELTS')).slice(0, 2);
                const official = finalUnified.filter(t => t.type === 'mock' || t.subject.includes('IELTS')).slice(0, 2);
                setTests([...practice, ...official]);
            }
        } else {
            setTests(finalUnified);
        }
        setIsLoading(false);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const uniqueSubjects = Array.from(new Set(tests.filter(t => t.type !== 'mock' && t.type !== 'Full Mock' && !t.subject.includes('IELTS')).map(t => t.subject))).filter(Boolean);

    const currentTests = tests.filter(t => {
        if (activeTab === 'practice') {
            if (t.type === 'mock' || t.subject.includes('IELTS')) return false;
            if (selectedSubject !== 'All Subjects' && t.subject !== selectedSubject) return false;
            return true;
        }
        if (activeTab === 'mock') return t.type === 'mock' || t.is_full_mock;
        return t.type.toLowerCase() === activeTab;
    });

    const totalPages = Math.ceil(currentTests.length / PAGE_SIZE);
    const pagedTests = currentTests.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // Derived Stats
    const totalCompleted = tests.filter(t => t.status === 'completed').length;
    const totalTimeSeconds = tests.reduce((acc, t) => acc + (t.time_taken_seconds || 0), 0);
    const totalTimeHours = Math.floor(totalTimeSeconds / 3600);
    const totalTimeMins = Math.floor((totalTimeSeconds % 3600) / 60);
    const totalTimeStr = totalTimeHours > 0 ? `${totalTimeHours}h ${totalTimeMins}m` : `${totalTimeMins}m`;
    
    const testsWithScores = tests.filter(t => t.score !== null && !t.is_manual);
    const avgScore = testsWithScores.length > 0 
        ? Math.round(testsWithScores.reduce((acc, t) => acc + t.score, 0) / testsWithScores.length)
        : 0;
    
    const totalMocks = tests.filter(t => t.is_full_mock || t.type === 'mock' || t.type === 'Full Mock').length;

    return (
        <MobileLayout isLoading={isLoading}>
            <div className="flex flex-col min-h-full bg-background pb-20 animate-in fade-in duration-500">
            {/* Modern Tab System */}
            <div className="px-4 mb-6">
                <div className="flex bg-secondary/30 p-1 rounded-2xl border border-border/50 overflow-x-auto no-scrollbar gap-1">
                    {(isIELTS ? ['writing', 'reading', 'listening', 'speaking', 'mock'] : ['practice', 'mock']).map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setSelectedSubject('All Subjects');
                                setPage(0);
                            }}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === tab ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Stats Row */}
                <div className="mt-4 flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                    <div className="flex-none bg-white dark:bg-[#151515] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 w-[140px]">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight mb-0.5">Completed</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{totalCompleted}</p>
                        </div>
                    </div>
                    
                    <div className="flex-none bg-white dark:bg-[#151515] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 w-[140px]">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Target className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight mb-0.5">Avg Score</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{avgScore}%</p>
                        </div>
                    </div>

                    <div className="flex-none bg-white dark:bg-[#151515] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 w-[160px]">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight mb-0.5">Time Spent</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight truncate">{totalTimeStr}</p>
                        </div>
                    </div>

                    <div className="flex-none bg-white dark:bg-[#151515] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 w-[160px]">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Award className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight mb-0.5">Mocks</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight truncate">{totalMocks}</p>
                        </div>
                    </div>
                </div>

                {/* Filter Dropdown */}
                {activeTab === 'practice' && !isIELTS && uniqueSubjects.length > 0 && (
                    <div className="mt-4 flex items-center justify-start">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-white/5 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 shrink-0 text-xs">
                                    <Filter className="w-3 h-3 mr-1.5 opacity-50" />
                                    {selectedSubject}
                                    <ChevronDown className="w-3 h-3 ml-1.5 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48 rounded-xl">
                                <DropdownMenuItem onClick={() => { setSelectedSubject('All Subjects'); setPage(0); }} className="font-bold cursor-pointer rounded-lg text-xs">
                                    All Subjects
                                </DropdownMenuItem>
                                {uniqueSubjects.map(sub => (
                                    <DropdownMenuItem key={sub} onClick={() => { setSelectedSubject(sub); setPage(0); }} className="font-bold cursor-pointer rounded-lg text-xs">
                                        {sub}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            <div className="flex-1 px-4 space-y-4">
                {isLoading ? (
                    <div className="py-6">
                        <MobilePageSkeleton />
                    </div>
                ) : pagedTests.length > 0 ? (
                    pagedTests.map((test, i) => {
                        const isFailed = test.proctoring_status === 'disqualified' || test.proctoring_status === 'failed';
                        const isPending = test.status === 'pending' || test.status === 'evaluating';
                        const scoreText = isPending ? '...' : (
                        test.score === null ? '—' : (
                            test.raw_score !== undefined && test.max_score !== undefined
                            ? `${test.raw_score}/${test.max_score}`
                            : `${test.score}${test.is_manual ? '' : '%'}`
                        )
                        );
                        const accuracyText = test.score !== null && !test.is_manual ? `${test.score}%` : '—';
                        const subjectColor = getSubjectColorClass(test.subject).match(/text-[a-z]+-[0-9]+/)?.[0]?.replace('text-', 'border-t-') || 'border-t-purple-600';

                        return (
                            <div
                                key={i}
                                onClick={() => navigate(test.is_full_mock ? `/mobile/mock-results/${test.id}` : (test.is_manual ? `/mobile/${test.type.toLowerCase()}/results/${test.id}` : `/mobile/results/${test.id}`))}
                                className={`bg-white dark:bg-card p-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 border-t-[3px] ${subjectColor} shadow-sm active:scale-[0.98] transition-all flex flex-col items-start gap-4 mb-4 relative overflow-hidden`}
                            >
                                <div className="flex w-full items-start gap-4 min-w-0">
                                    <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 ${getSubjectColorClass(test.subject)}`}>
                                        <SubjectIcon subjectName={test.subject} className="w-6 h-6" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className="font-black text-base text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate max-w-full">
                                                {test.subject.length > 25 ? test.subject.substring(0, 25) + '...' : test.subject}
                                                </h3>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-widest">
                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                {formatDate(test.date)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4 pt-1">
                                            {test.is_full_mock ? (
                                                <>
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Reading</p>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white tracking-tighter">{test.reading_band || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Listening</p>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white tracking-tighter">{test.listening_band || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Writing</p>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white tracking-tighter">{test.writing_band || '—'}</p>
                                                </div>
                                                </>
                                            ) : (
                                                <>
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Score</p>
                                                    <p className={`text-sm font-black tracking-tighter ${isFailed ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>{scoreText}</p>
                                                </div>
                                                {test.time_taken_seconds && (
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Time</p>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white tracking-tighter">{Math.floor(test.time_taken_seconds/60)}m {test.time_taken_seconds%60}s</p>
                                                    </div>
                                                )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 w-full mt-1">
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                        test.status === 'completed' && !isFailed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                        isFailed ? 'bg-red-50 text-red-600 border-red-100' :
                                        'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                        {test.status}
                                    </span>
                                    
                                    <div className="w-8 h-8 rounded-[8px] border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 bg-white dark:bg-slate-800 shadow-sm">
                                        <ChevronRight className="w-4 h-4 text-purple-600" />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-20 bg-secondary/10 rounded-[3rem] border border-dashed border-border px-8">
                        <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 border border-border/50">
                            <HistoryIcon className="w-8 h-8 text-muted-foreground opacity-20" />
                        </div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">No field observations recorded</p>
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && profile?.selected_plan !== 'explorer' && (
                    <div className="flex items-center justify-between gap-4 mt-8 pb-4">
                        <Button
                            variant="outline"
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="h-12 flex-1 rounded-2xl font-black text-[10px] uppercase tracking-widest border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        >
                            ← Prev
                        </Button>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                            {page + 1} / {totalPages}
                        </span>
                        <Button
                            variant="default"
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="h-12 flex-1 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-widest"
                        >
                            Next →
                        </Button>
                    </div>
                )}

                {/* Upgrade Banner for Explorer */}
                {profile?.selected_plan === 'explorer' && (
                    <div className="mt-6 p-6 bg-primary rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-primary/20">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-20 h-20 text-white" /></div>
                        <h3 className="text-white font-black text-lg uppercase tracking-tight relative z-10 leading-tight">Unlock Full Logs</h3>
                        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-2 relative z-10">You're seeing 2 recent entries only</p>
                        <Button onClick={openPricingModal} className="mt-4 w-full bg-white text-primary hover:bg-white/90 font-black text-[10px] uppercase tracking-widest rounded-xl">Upgrade Protocol</Button>
                    </div>
                )}
            </div>
            </div>
        </MobileLayout>
    );
}
