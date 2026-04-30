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
import { HistorySkeleton } from '@/components/SkeletonLoader';
import { useExam } from '@/context/ExamContext';
import { usePricing } from '@/context/PricingContext';
import { Card, CardContent } from "@/components/ui/card";
import MobileLayout from '../components/MobileLayout';

export default function MobileHistory() {
    const { user, profile, loading } = useAuth();
    const { activeExam, allExams } = useExam();
    const { openPricingModal } = usePricing();
    const navigate = useNavigate();
    const [tests, setTests] = useState<any[]>([]);
    const isIELTS = activeExam?.id === 'ielts-academic';
    const [activeTab, setActiveTab] = useState<string>(isIELTS ? 'writing' : 'practice');
    const [isLoading, setIsLoading] = useState(true);

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

        const practicePool = unified.filter(t => t.type !== 'mock' && t.type !== 'Full Mock' && !t.subject.includes('IELTS')).slice(0, 10);
        const mockPool = dedupedMocks.slice(0, 10);
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

    const currentTests = tests.filter(t => {
        if (activeTab === 'practice') return t.type !== 'mock' && !t.subject.includes('IELTS');
        if (activeTab === 'mock') return t.type === 'mock' || t.is_full_mock;
        return t.type.toLowerCase() === activeTab;
    });

    return (
        <MobileLayout isLoading={isLoading}>
            <div className="flex flex-col min-h-full bg-background pb-20 animate-in fade-in duration-500">
            {/* Modern Tab System */}
            <div className="px-4 mb-6">
                <div className="flex bg-secondary/30 p-1 rounded-2xl border border-border/50 overflow-x-auto no-scrollbar gap-1">
                    {(isIELTS ? ['writing', 'reading', 'listening', 'speaking', 'mock'] : ['practice', 'mock']).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === tab ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 px-4 space-y-4">
                {isLoading ? (
                    <div className="py-6">
                        <HistorySkeleton />
                    </div>
                ) : currentTests.length > 0 ? (
                    currentTests.map((test, i) => (
                        <Card
                            key={i}
                            onClick={() => navigate(test.is_full_mock ? `/mobile/mock-results/${test.id}` : (test.is_manual ? `/mobile/${test.type.toLowerCase()}/results/${test.id}` : `/mobile/results/${test.id}`))}
                            className="bg-secondary/20 border-border/40 rounded-[2rem] overflow-hidden active:scale-[0.98] transition-all border-b-4 hover:border-primary/30"
                        >
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center text-xl shadow-sm">
                                            {test.type === 'mock' || test.is_full_mock || test.subject.includes('Mock') ? '🏆' :
                                             test.subject.includes('Writing') ? '✍️' :
                                             test.subject.includes('Reading') ? '📖' :
                                             test.subject.includes('Listening') ? '🎧' :
                                             test.subject.includes('Speaking') ? '🗣️' :
                                             test.subject === 'Biology' ? '🧬' :
                                             test.subject === 'Chemistry' ? '⚗️' :
                                             test.subject === 'Physics' ? '⚛️' :
                                             test.subject === 'Mathematics' ? '📐' :
                                             test.subject === 'All Subjects' ? '🌍' : '🎯'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xs uppercase tracking-tight truncate max-w-[150px]">{test.subject}</h3>
                                            <div className="flex items-center gap-2 text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                                                <Calendar className="w-3 h-3" /> {formatDate(test.date)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${test.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                        }`}>
                                        {test.status}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/30 text-center col-span-1">
                                        <span className="block text-[7px] font-black text-muted-foreground uppercase opacity-40 mb-1">Score</span>
                                        <span className={`text-[11px] font-black leading-none ${test.score >= 7 || test.score >= 70 ? 'text-emerald-500' : 'text-primary'}`}>
                                            {test.raw_score !== undefined && test.max_score 
                                                ? `${test.raw_score} / ${test.max_score}` 
                                                : (test.score || '—') + (!test.is_manual && test.score ? '%' : '')
                                            }
                                        </span>
                                    </div>
                                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/30 text-center">
                                        <span className="block text-[7px] font-black text-muted-foreground uppercase opacity-40 mb-1">Type</span>
                                        <span className="text-[9px] font-black uppercase truncate">{test.type}</span>
                                    </div>
                                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/30 flex items-center justify-center group">
                                        <ChevronRight className="w-5 h-5 text-muted-foreground opacity-30 group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-20 bg-secondary/10 rounded-[3rem] border border-dashed border-border px-8">
                        <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 border border-border/50">
                            <HistoryIcon className="w-8 h-8 text-muted-foreground opacity-20" />
                        </div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">No field observations recorded</p>
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
