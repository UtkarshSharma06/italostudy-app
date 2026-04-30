import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useExam } from '@/context/ExamContext';
import { MathText } from '@/components/MathText';
import DiagramRenderer from '@/components/DiagramRenderer';
import {
    Clock, ChevronLeft, ChevronRight, Flag, X, Loader2,
    Bookmark, CheckCircle2, AlertCircle, Maximize2, AlertTriangle, Lock
} from 'lucide-react';
import { ImpactStyle, Haptics } from '@capacitor/haptics';
import { cn } from '@/lib/utils';
import { ActionSheet } from '@capacitor/action-sheet';
import QuestionMedia from '@/components/QuestionMedia';
import { MediaContent } from '@/types/test';
import { ReportQuestionDialog } from '@/components/ReportQuestionDialog';

interface Question {
    id: string;
    question_number: number;
    question_text: string;
    options: string[];
    correct_index: number;
    user_answer: number | null;
    is_marked_for_review: boolean;
    diagram: any;
    media?: MediaContent | null;
    topic: string | null;
    subject?: string | null;
    is_saved?: boolean;
    practice_question_id?: string | null;
    is_reported_by_user?: boolean;
    is_corrected?: boolean;
    master_question_id?: string | null;
    session_question_id?: string | null;
    source_table?: string;
    passage?: string; // Added passage to Question interface
    difficulty?: string;
}

export default function MobileTest() {
    const { testId } = useParams<{ testId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { activeExam } = useExam();

    const [test, setTest] = useState<any>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);


    const questionStartTime = useRef<number>(Date.now());

    useEffect(() => {
        if (testId && user) {
            fetchTestData();
        }
    }, [testId, user]);

    const fetchTestData = async () => {
        setIsLoading(true);
        try {
            // 1. Parallel fetch Test and Questions (Core roundtrip)
            const [testRes, questionsRes] = await Promise.all([
                supabase.from('tests').select('*').eq('id', testId).maybeSingle(),
                supabase.from('questions').select('*').eq('test_id', testId).order('question_number')
            ]);

            if (testRes.error || !testRes.data) {
                toast({ title: 'Test not found', variant: 'destructive' });
                navigate('/mobile/dashboard');
                return;
            }

            const testData = testRes.data;
            if (testData.status === 'completed') {
                navigate(`/results/${testId}`);
                return;
            }

            setTest(testData);

            // Timer calculation (same as web)
            if (testData.time_remaining_seconds !== null && testData.time_remaining_seconds !== undefined) {
                setTimeRemaining(testData.time_remaining_seconds);
            } else {
                const startTime = new Date(testData.started_at).getTime();
                const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
                
                if ((testData as any).is_proctored && elapsedSeconds < 120) {
                    setTimeRemaining(testData.time_limit_minutes * 60);
                } else {
                    const endTime = startTime + testData.time_limit_minutes * 60 * 1000;
                    setTimeRemaining(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
                }
            }

            if (testData.current_question_index !== null && testData.current_question_index !== undefined) {
                setCurrentIndex(testData.current_question_index);
            }

            if (testData.current_section_index !== null && testData.current_section_index !== undefined) {
                setCurrentSectionIndex(testData.current_section_index);
            }

            const qData = questionsRes.data || [];

            if (qData.length > 0) {
                // 2. Parallel fetch secondary data (Bookmarks, Reports, Master Order)
                const masterIds = qData.map((q: any) => q.master_question_id).filter(Boolean);
                const questionIds = qData.map((q: any) => q.id);

                const [masterOrderRes, bookmarksRes, reportsRes] = await Promise.all([
                    masterIds.length > 0 
                        ? supabase.from('session_questions').select('id, order_index').in('id', masterIds)
                        : Promise.resolve({ data: [] }),
                    user?.id && questionIds.length > 0
                        ? supabase.from('bookmarked_questions').select('question_id, is_reported_by_user').eq('user_id', user.id).in('question_id', questionIds)
                        : Promise.resolve({ data: [] }),
                    user?.id && masterIds.length > 0
                        ? supabase.from('question_reports').select('master_question_id').eq('user_id', user.id).in('master_question_id', masterIds)
                        : Promise.resolve({ data: [] })
                ]);

                // Process Master Order
                let sortedData = [...qData];
                if (masterOrderRes.data && masterOrderRes.data.length > 0) {
                    const orderMap = new Map<string, number>(
                        masterOrderRes.data.map((m: any) => [m.id, m.order_index ?? 9999] as [string, number])
                    );
                    sortedData = sortedData.sort((a: any, b: any) => {
                        const oa = orderMap.get(a.master_question_id) ?? 9999;
                        const ob = orderMap.get(b.master_question_id) ?? 9999;
                        return oa - ob;
                    });
                }

                // Process Bookmarks and Reports
                const bookmarkMap = new Map<string, any>(
                    (bookmarksRes.data?.map(b => [b.question_id, b as any]) || []) as [string, any][]
                );
                const reportedMasterIds = new Set(reportsRes.data?.map((r: any) => r.master_question_id));

                const processedQuestions = sortedData.map((q: any) => ({
                    ...q,
                    passage: q.passage,
                    media: q.media as unknown as MediaContent | null,
                    options: q.options as string[],
                    diagram: q.diagram as any,
                    is_saved: bookmarkMap.has(q.id),
                    is_reported_by_user: (bookmarkMap.get(q.id) as any)?.is_reported_by_user || reportedMasterIds.has(q.master_question_id || q.id)
                }));

                setQuestions(processedQuestions);
                setIsLoading(false); // INTERACTIVE ASAP

                // 3. BACKGROUND FALLBACKS (Passages/Media)
                // We run this AFTER setting the main questions so the UI unblocks
                const missingPassageIds = processedQuestions
                    .filter((q: any) => !q.passage && (q.master_question_id || q.practice_question_id || q.session_question_id))
                    .map((q: any) => q.master_question_id || q.practice_question_id || q.session_question_id);

                if (missingPassageIds.length > 0) {
                    Promise.all([
                        supabase.from('practice_questions').select('id, passage').in('id', missingPassageIds),
                        supabase.from('session_questions').select('id, passage').in('id', missingPassageIds),
                        supabase.from('learning_quiz_questions').select('id, passage').in('id', missingPassageIds)
                    ]).then(([pRes, sRes, lRes]) => {
                        const passageMap = new Map();
                        pRes.data?.forEach((m: any) => { if (m.passage) passageMap.set(m.id, m.passage); });
                        sRes.data?.forEach((m: any) => { if (m.passage) passageMap.set(m.id, m.passage); });
                        lRes.data?.forEach((m: any) => { if (m.passage) passageMap.set(m.id, m.passage); });
                        
                        if (passageMap.size > 0) {
                            setQuestions(prev => prev.map(q => {
                                const mid = q.master_question_id || q.practice_question_id || q.session_question_id;
                                if (!q.passage && mid && passageMap.has(mid)) return { ...q, passage: passageMap.get(mid) };
                                return q;
                            }));
                        }
                    });
                }

                const missingMediaIds = processedQuestions
                    .filter((q: any) => {
                        const m = q.media as any;
                        const hasMedia = m && (m.url || m.imageUrl || m.image_url || m.image?.url || m.table || m.data);
                        return !hasMedia && (q.master_question_id || q.practice_question_id || q.session_question_id);
                    })
                    .map((q: any) => q.master_question_id || q.practice_question_id || q.session_question_id);

                if (missingMediaIds.length > 0) {
                    Promise.all([
                        supabase.from('practice_questions').select('id, media').in('id', missingMediaIds),
                        supabase.from('session_questions').select('id, media').in('id', missingMediaIds)
                    ]).then(([pRes, sRes]) => {
                        const mediaMap = new Map();
                        pRes.data?.forEach((m: any) => { if (m.media) mediaMap.set(m.id, m.media); });
                        sRes.data?.forEach((m: any) => { if (m.media) mediaMap.set(m.id, m.media); });
                        
                        if (mediaMap.size > 0) {
                            setQuestions(prev => prev.map(q => {
                                const mid = q.master_question_id || q.practice_question_id || q.session_question_id;
                                if (!q.media && mid && mediaMap.has(mid)) return { ...q, media: mediaMap.get(mid) };
                                return q;
                            }));
                        }
                    });
                }
                setIsLoading(false); // FINISH LOADING
            } else if (testData.total_questions > 0) {
                // Quick retry if questions are missing (likely consistency lag)
                setTimeout(async () => {
                    const { data: retryData } = await supabase
                        .from('questions')
                        .select('*')
                        .eq('test_id', testId)
                        .order('question_number');
                    if (retryData && retryData.length > 0) {
                        setQuestions(retryData.map((rq: any) => ({
                            ...rq,
                            passage: rq.passage,
                            media: rq.media as unknown as MediaContent | null,
                            options: rq.options as string[],
                            diagram: rq.diagram as any,
                            is_saved: false,
                            is_reported_by_user: false
                        })));
                    }
                    setIsLoading(false);
                }, 1000);
            } else {
                setIsLoading(false);
            }
        } catch (error: any) {
            console.error('Error fetching test data:', error);
            toast({ title: 'Error loading test', description: error.message, variant: 'destructive' });
            setIsLoading(false);
            navigate('/mobile/dashboard');
        }
    };

    // Auto-save progress function
    const saveProgress = useCallback(async () => {
        if (!testId || !test || test.status !== 'in_progress') return;

        try {
            await supabase
                .from('tests')
                .update({
                    current_question_index: currentIndex,
                    time_remaining_seconds: timeRemaining,
                    current_section_index: currentSectionIndex
                })
                .eq('id', testId);
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    }, [testId, test, currentIndex, timeRemaining, currentSectionIndex]);

    // Auto-save progress every 5 seconds (only for non-ranked tests)
    useEffect(() => {
        if (!test || test.status !== 'in_progress' || test.is_ranked) return;

        const interval = setInterval(() => {
            saveProgress();
        }, 5000); // Save every 5 seconds

        return () => clearInterval(interval);
    }, [test, saveProgress]);

    // Save progress when navigating or answering (only for non-ranked tests)
    useEffect(() => {
        if (test && test.status === 'in_progress' && !test.is_ranked) {
            saveProgress();
        }
    }, [currentIndex, test, saveProgress]);

    useEffect(() => {
        if (!test) return;
        // If there was a showProctoringSetup here it would be checked, but there isn't.
        if (timeRemaining <= 0) {
            submitTest('time_up');
            return;
        }
        const timer = setInterval(() => setTimeRemaining(p => Math.max(0, p - 1)), 1000);
        return () => clearInterval(timer);
    }, [timeRemaining, test]);

    const handleSelectAnswer = async (optionIndex: number) => {
        const question = questions[currentIndex];
        if (!question) return;

        // Native feedback (non-blocking)
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });

        setQuestions(prev => prev.map((q, i) => i === currentIndex ? { ...q, user_answer: optionIndex } : q));

        await supabase.from('questions').update({
            user_answer: optionIndex,
            answered_at: new Date().toISOString(),
        }).eq('id', question.id);

        // Sync with user_practice_responses for real-time dashboard updates
        if (question.practice_question_id && user) {
            await (supabase as any)
                .from('user_practice_responses')
                .upsert({
                    user_id: user.id,
                    question_id: question.practice_question_id,
                    exam_type: activeExam?.id || 'standard',
                    subject: question.subject || test?.subject || 'General',
                    topic: question.topic,
                    is_correct: optionIndex === question.correct_index,
                    created_at: new Date().toISOString()
                }, { onConflict: 'user_id,question_id' });
        }
    };

    const handleMarkForReview = async () => {
        const question = questions[currentIndex];
        if (!question) return;
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { });
        const newMarked = !question.is_marked_for_review;
        setQuestions(prev => prev.map((q, i) => i === currentIndex ? { ...q, is_marked_for_review: newMarked } : q));
        // Note: is_marked_for_review is local-only as it doesn't exist in the questions table schema
        // If permanent persistence is needed, consider adding the column or using a different one.
    };

    const handleBookmark = async () => {
        if (!user || !currentQuestion) return;

        // Prevent unbookmarking if reported and not fixed
        if (currentQuestion.is_saved && currentQuestion.is_reported_by_user && !currentQuestion.is_corrected) {
            toast({
                title: "Mandatory Bookmark",
                description: "This question is reported and cannot be removed until fixed.",
                variant: "destructive"
            });
            return;
        }

        const newSavedState = !currentQuestion.is_saved;
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { });

        setQuestions(prev => prev.map((q, i) => i === currentIndex ? { ...q, is_saved: newSavedState } : q));

        if (newSavedState) {
            try {
                const { error } = await (supabase as any).from('bookmarked_questions').insert({
                    user_id: user.id,
                    question_id: currentQuestion.id,
                    master_question_id: currentQuestion.master_question_id || currentQuestion.practice_question_id || currentQuestion.session_question_id,
                    source_table: currentQuestion.source_table || (test?.test_type === 'practice' ? 'practice_questions' : 'session_questions'),
                    exam_type: activeExam?.id || 'standard'
                });

                if (error) throw error;
                toast({ title: "Question Saved" });
            } catch (err: any) {
                console.error("Bookmark Error:", err);
                toast({ title: "Save Failed", description: err.message, variant: "destructive" });
                // Revert state on failure
                setQuestions(prev => prev.map((q, i) => i === currentIndex ? { ...q, is_saved: false } : q));
            }
        } else {
            try {
                const { error } = await (supabase as any).from('bookmarked_questions').delete().eq('question_id', currentQuestion.id).eq('user_id', user.id);
                if (error) throw error;
                toast({ title: "Bookmark Removed" });
            } catch (err: any) {
                console.error("Unbookmark Error:", err);
                toast({ title: "Remove Failed", description: err.message, variant: "destructive" });
                // Revert state on failure
                setQuestions(prev => prev.map((q, i) => i === currentIndex ? { ...q, is_saved: true } : q));
            }
        }
    };

    const handleReport = async (reason: string) => {
        if (!user || !currentQuestion || !reason) return;

        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => { });

        const { error } = await (supabase as any).from('question_reports').insert({
            user_id: user.id,
            question_id: currentQuestion.id,
            master_question_id: currentQuestion.master_question_id || currentQuestion.practice_question_id,
            source_table: test?.test_type === 'practice' ? 'practice_questions' : 'session_questions',
            reason: reason,
            details: reason.includes(':') ? reason.split(':').slice(1).join(':') : undefined,
            status: 'pending'
        });

        if (!error) {
            // Automatically bookmark if reported
            setQuestions(prev => prev.map((q, i) =>
                i === currentIndex ? { ...q, is_reported_by_user: true, is_saved: true } : q
            ));

            await (supabase as any).from('bookmarked_questions').upsert({
                user_id: user.id,
                question_id: currentQuestion.id,
                master_question_id: currentQuestion.master_question_id || currentQuestion.practice_question_id,
                source_table: test?.test_type === 'practice' ? 'practice_questions' : 'session_questions',
                exam_type: activeExam?.id || 'standard',
                is_reported_by_user: true
            }, { onConflict: 'user_id,question_id' });

            toast({ title: "Report Submitted", description: "Question has been bookmarked for tracking." });
        }
    };

    const handleNavigate = (dir: 'next' | 'prev') => {
        if (dir === 'next' && currentIndex < questions.length - 1) setCurrentIndex(c => c + 1);
        if (dir === 'prev' && currentIndex > 0) setCurrentIndex(c => c - 1);
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
    };

    const submitTest = async (reason = 'manual') => {
        if (!test || !testId) return;
        
        if (reason === 'disqualified') {
            setIsSubmitting(true);
            await supabase.from('tests').delete().eq('id', testId);
            setIsSubmitting(false);
            navigate('/dashboard');
            return;
        }

        setIsSubmitting(true);
        toast({
            title: 'Submitting Results...',
            description: 'Please wait while we calculate your score.',
        });
        let correct = 0;
        questions.forEach(q => { if (q.user_answer === q.correct_index) correct++; });

        const scorePercentage = Math.round((correct / questions.length) * 100);

        await supabase.from('tests').update({
            status: 'completed',
            score: scorePercentage,
            correct_answers: correct,
            completed_at: new Date().toISOString(),
        }).eq('id', testId);

        // Update topic performance for analytics
        const topicGroups: Record<string, { correct: number; total: number; subject: string }> = {};

        questions.forEach(q => {
            const subject = q.subject || test?.subject || 'General';
            const topic = q.topic || subject;
            const key = `${subject}:${topic}`;

            if (!topicGroups[key]) {
                topicGroups[key] = { correct: 0, total: 0, subject };
            }
            topicGroups[key].total++;
            if (q.user_answer === q.correct_index) {
                topicGroups[key].correct++;
            }
        });

        await Promise.all(Object.entries(topicGroups).map(async ([key, data]) => {
            const [subject, topic] = key.split(':');
            const { data: existing } = await (supabase.from('topic_performance') as any)
                .select('*')
                .eq('user_id', user!.id)
                .eq('subject', data.subject)
                .eq('topic', topic)
                .eq('exam_type', activeExam?.id || test?.exam_type)
                .maybeSingle();

            if (existing) {
                await supabase
                    .from('topic_performance')
                    .update({
                        total_questions: (existing.total_questions || 0) + data.total,
                        correct_answers: (existing.correct_answers || 0) + data.correct,
                        accuracy_percentage: (((existing.correct_answers || 0) + data.correct) / ((existing.total_questions || 0) + data.total)) * 100,
                        last_attempted_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('topic_performance')
                    .insert({
                        user_id: user!.id,
                        exam_type: activeExam?.id || test?.exam_type,
                        subject: data.subject,
                        topic,
                        total_questions: data.total,
                        correct_answers: data.correct,
                        accuracy_percentage: (data.correct / data.total) * 100,
                        last_attempted_at: new Date().toISOString(),
                    });
            }
        }));

        navigate(`/results/${testId}`);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-center p-8">
                <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
                    <Loader2 className="w-8 h-8 text-slate-600 dark:text-slate-400 animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Preparing Assessment</h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[260px] leading-relaxed">
                    Loading your exam environment and securing the session. Please wait.
                </p>
            </div>
        );
    }

    if (!test || questions.length === 0) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-background p-8 text-center text-slate-900 dark:text-slate-100">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-6">
                    <AlertTriangle className="w-10 h-10 text-slate-400" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Mission Unavailable</h2>
                <p className="text-sm font-bold text-muted-foreground mb-8 max-w-xs">
                    {questions.length === 0
                        ? "This mission has no data and may be corrupted. Please start a fresh one."
                        : "We couldn't find the mission you're looking for."}
                </p>
                <Button onClick={() => navigate('/mobile/dashboard')} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
                    Return to HQ
                </Button>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
            {/* Top Header - Focused */}
            <header className="p-4 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Time Remaining</span>
                    <span className={`font-mono text-lg font-black ${timeRemaining < 300 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                        {formatTime(timeRemaining)}
                    </span>
                </div>
                <Button variant="outline" size="sm" onClick={() => submitTest()} className="rounded-full text-[10px] font-black uppercase tracking-widest border-primary/30">
                    Finish
                </Button>
            </header>

            {/* Progress Line */}
            <div className="h-1.5 w-full bg-secondary">
                <div className="h-full bg-primary transition-all duration-500 shadow-[0_0_10px_rgba(var(--primary),0.5)]" style={{ width: `${progress}%` }} />
            </div>

            {/* Question Content */}
            <main className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
                {/* Passage Area (Full Width Top) */}
                {currentQuestion?.passage && (
                    <div className="space-y-4 mb-6">
                        <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border-2 border-indigo-100 dark:border-indigo-500/20 rounded-[2.5rem] relative overflow-hidden pt-10 shadow-sm">
                            <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-[7px] font-black uppercase tracking-widest rounded-bl-lg">
                                Reading Passage
                            </div>
                            <MathText
                                content={currentQuestion.passage}
                                className="text-sm text-slate-700 dark:text-slate-300 leading-[1.7] font-medium prose dark:prose-invert max-w-none break-words overflow-x-auto max-w-full"
                            />
                        </div>
                    </div>
                )}

                {/* Unified Question Card */}
                <div className="bg-white dark:bg-card rounded-[2.5rem] border-2 border-slate-300 dark:border-border p-8 shadow-sm">
                      {/* Illustrative Media (Image/Chart/Diagram) */}
                    {(() => {
                        const m = currentQuestion?.media as any;
                        const hasDiagram = !!currentQuestion?.diagram;
                        
                        // Robust check: Render if anything looks like media
                        const hasRenderableMedia = m && (
                            ['image', 'chart', 'graph', 'pie', 'bar', 'line', 'scatter', 'diagram'].includes(m.type) ||
                            m.url || m.imageUrl || m.image_url || m.image || m.data || m.table
                        );

                        if (!hasDiagram && !hasRenderableMedia) return null;

                        return (
                            <div className="mb-6">
                                {hasRenderableMedia ? (
                                    <QuestionMedia media={currentQuestion.media} />
                                ) : (
                                    <div className="rounded-3xl border border-border/50 overflow-hidden bg-secondary/10 p-4">
                                        <DiagramRenderer diagram={currentQuestion.diagram} />
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    <div className="flex items-center justify-between mb-6">
                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-lg">
                                Question {currentIndex + 1}
                            </span>
                            <span className="px-3 py-1 bg-slate-50 dark:bg-muted text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-slate-100 dark:border-border">
                                {currentQuestion.difficulty || 'Standard'}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={handleMarkForReview} className={`rounded-xl px-2 h-8 ${currentQuestion?.is_marked_for_review ? 'bg-orange-500/10 text-orange-500' : 'text-muted-foreground'}`}>
                                <Flag className={`w-3.5 h-3.5 ${currentQuestion?.is_marked_for_review ? 'fill-current' : ''}`} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleBookmark} disabled={currentQuestion?.is_saved && currentQuestion?.is_reported_by_user && !currentQuestion?.is_corrected} className={`rounded-xl px-2 h-8 ${currentQuestion?.is_saved ? 'bg-indigo-500/10 text-indigo-500' : 'text-muted-foreground'}`}>
                                <Bookmark className={`w-3.5 h-3.5 ${currentQuestion?.is_saved ? 'fill-current' : ''}`} />
                            </Button>
                        </div>
                    </div>

                    <MathText
                        content={currentQuestion?.question_text || ''}
                        className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight mb-8 block overflow-x-auto max-w-full"
                    />

                    {/* Options Integrated into the Card */}
                    <div className="space-y-3">
                        {currentQuestion?.options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSelectAnswer(idx)}
                                className={`w-full p-5 border-2 rounded-2xl text-left transition-all flex gap-4 ${currentQuestion.user_answer === idx
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400'
                                    }`}
                            >
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 ${currentQuestion.user_answer === idx ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-border'
                                    }`}>
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                <MathText content={option} className={cn("text-xs font-semibold overflow-x-auto max-w-full")} />
                            </button>
                        ))}
                    </div>
                </div>
            </main>

            {/* Navigation Footer */}
            <footer className="p-4 bg-background border-t border-border/50 flex gap-3 h-20 items-center">
                <Button
                    variant="secondary"
                    className="flex-1 h-12 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest"
                    onClick={() => handleNavigate('prev')}
                    disabled={currentIndex === 0}
                >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                {currentIndex === questions.length - 1 && test?.test_type === 'practice' ? (
                    <Button
                        className="flex-1 h-12 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => submitTest()}
                    >
                        Submit
                    </Button>
                ) : (
                    <Button
                        className="flex-1 h-12 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20"
                        onClick={() => handleNavigate('next')}
                        disabled={currentIndex === questions.length - 1}
                    >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                )}
            </footer>

        </div>
    );
}
