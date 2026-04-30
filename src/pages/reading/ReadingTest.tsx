import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MultipleChoiceQuestion, TrueFalseQuestion, GapFillQuestion, MultiSelectQuestion } from "@/components/reading/QuestionTypes";
import { Loader2, Timer, ChevronLeft, ChevronRight, Save, Bookmark, AlertTriangle, Lock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/lib/auth';

export default function ReadingTest({
    overrideId,
    onComplete,
    isMockSession = false,
    mockSubmissionId
}: {
    overrideId?: string;
    onComplete?: () => void;
    isMockSession?: boolean;
    mockSubmissionId?: string | null;
}) {
    const { testId: paramTestId } = useParams();
    const testId = overrideId || paramTestId;
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();
    const [test, setTest] = useState<any>(null);
    const [passages, setPassages] = useState<any[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
    const [submissionId, setSubmissionId] = useState<string | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async () => {
        if (!testId || !user) return;
        try {
            // Calculate score
            let score = 0;
            questions.forEach(q => {
                const userAns = answers[q.id];
                const correctAns = q.correct_answer || '';

                if (!userAns) return;

                if (Array.isArray(userAns)) {
                    // Multi-select or multi-part answer
                    const userSorted = [...userAns].map(s => s.trim().toLowerCase()).sort().join(',');
                    const correctSorted = correctAns.split(',').map(s => s.trim().toLowerCase()).sort().join(',');
                    if (userSorted === correctSorted) score++;
                } else {
                    if (userAns.trim().toLowerCase() === correctAns.trim().toLowerCase()) {
                        score++;
                    }
                }
            });

            let submissionResult;
            if (submissionId) {
                const { data, error } = await supabase.from('reading_submissions').update({
                    answers,
                    score,
                    status: 'completed'
                }).eq('id', submissionId).select().single();

                if (error && error.message.includes('column "status" of relation "reading_submissions" does not exist')) {
                    console.warn("Schema mismatch: 'status' column missing. Retrying without it...");
                    const { data: retryData, error: retryError } = await supabase.from('reading_submissions').update({
                        answers,
                        score
                    }).eq('id', submissionId).select().single();
                    if (retryError) throw retryError;
                    submissionResult = retryData;
                } else if (error) {
                    throw error;
                } else {
                    submissionResult = data;
                }
            } else {
                const { data, error } = await supabase.from('reading_submissions').insert({
                    user_id: user.id,
                    test_id: testId,
                    answers,
                    score,
                    status: 'completed'
                }).select().single();

                if (error && error.message.includes('column "status" of relation "reading_submissions" does not exist')) {
                    console.warn("Schema mismatch: 'status' column missing. Retrying without it...");
                    const { data: retryData, error: retryError } = await supabase.from('reading_submissions').insert({
                        user_id: user.id,
                        test_id: testId,
                        answers,
                        score
                    }).select().single();
                    if (retryError) throw retryError;
                    submissionResult = retryData;
                } else if (error) {
                    throw error;
                } else {
                    submissionResult = data;
                }
            }

            // Link back to mock exam submission if applicable
            if (submissionResult && mockSubmissionId) {
                await (supabase as any)
                    .from('mock_exam_submissions')
                    .update({ reading_submission_id: submissionResult.id })
                    .eq('id', mockSubmissionId);
            }

            toast({ title: "Success", description: "Reading section completed." });

            if (isMockSession && onComplete) {
                onComplete();
            } else {
                navigate(`/reading/results/${submissionResult.id}`);
            }

        } catch (error: any) {
            console.error('Submit error:', error);
            toast({ title: "Error", description: "Failed to submit test.", variant: "destructive" });
        }
    };

    useEffect(() => {
        if (!testId) return;
        fetchData();
    }, [testId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Test Details
            const { data: testData } = await supabase.from('reading_tests').select('*').eq('id', testId).single();
            setTest(testData);

            // Fetch Passages
            const { data: passageData } = await supabase
                .from('reading_passages')
                .select('*')
                .eq('test_id', testId)
                .order('order_index');

            if (passageData) {
                setPassages(passageData);

                // Fetch Questions for ALL passages
                const passageIds = passageData.map(p => p.id);
                const { data: qData } = await supabase
                    .from('reading_questions')
                    .select('*')
                    .in('passage_id', passageIds)
                    .order('order_index');

                if (qData) {
                    // Fetch user's bookmarks for these questions
                    const questionIds = qData.map(q => q.id);
                    const { data: bookmarksData } = await supabase
                        .from('bookmarked_questions')
                        .select('question_id, is_reported_by_user')
                        .eq('user_id', user.id)
                        .in('question_id', questionIds);

                    const bookmarkInfo = new Map(bookmarksData?.map(b => [b.question_id, b]) || []);
                    setQuestions(qData.map(q => {
                        const b = bookmarkInfo.get(q.id);
                        return {
                            ...q,
                            is_saved: !!b,
                            is_reported_by_user: b?.is_reported_by_user || false,
                            is_corrected: q.is_corrected || false
                        };
                    }));
                }

                // Create in-progress submission
                if (user) {
                    const { data: subData, error: subError } = await supabase.from('reading_submissions').insert({
                        user_id: user.id,
                        test_id: testId,
                        status: 'in-progress',
                        answers: {}
                    }).select().single();

                    if (subError && subError.message.includes('column "status" of relation "reading_submissions" does not exist')) {
                        console.warn("Schema mismatch: 'status' column missing. Retrying without it...");
                        const { data: retryData } = await supabase.from('reading_submissions').insert({
                            user_id: user.id,
                            test_id: testId,
                            answers: {}
                        }).select().single();
                        if (retryData) setSubmissionId(retryData.id);
                    } else if (subData) {
                        setSubmissionId(subData.id);
                    }
                }
            }

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load reading test.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerChange = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleBookmark = async (question: any) => {
        if (!user) {
            toast({ title: "Auth Required", description: "Log in to bookmark items." });
            return;
        }

        if (question.is_saved) {
            if (question.is_reported_by_user && !question.is_corrected) {
                toast({
                    title: "Action Restricted",
                    description: "This bookmark is mandatory until the reported issue is resolved.",
                    variant: "destructive"
                });
                return;
            }
            toast({ title: "Already Saved", description: "This question is already in your bookmarks." });
            return;
        }

        try {
            const { error } = await supabase.from('bookmarked_questions').insert({
                user_id: user.id,
                question_id: question.id
            });

            if (error) throw error;

            // Update local state
            setQuestions(prev => prev.map(q =>
                q.id === question.id ? { ...q, is_saved: true } : q
            ));

            toast({ title: "Saved", description: "Added to your bookmarks." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save bookmark.", variant: "destructive" });
        }
    };

    const handleReport = async (question: any) => {
        const reason = window.prompt("Why are you reporting this question?");
        if (!reason || !user) return;

        try {
            const { error: reportError } = await (supabase as any)
                .from('question_reports')
                .insert({
                    user_id: user.id,
                    question_id: question.id,
                    master_question_id: question.id,
                    source_table: 'reading_questions',
                    reason: reason
                });

            if (reportError) throw reportError;

            // Auto-bookmark
            if (!question.is_saved) {
                await supabase.from('bookmarked_questions').insert({
                    user_id: user.id,
                    question_id: question.id,
                    is_reported_by_user: true
                });

                setQuestions(prev => prev.map(q =>
                    q.id === question.id ? { ...q, is_saved: true, is_reported_by_user: true } : q
                ));
            } else {
                await supabase.from('bookmarked_questions')
                    .update({ is_reported_by_user: true })
                    .eq('user_id', user.id)
                    .eq('question_id', question.id);

                setQuestions(prev => prev.map(q =>
                    q.id === question.id ? { ...q, is_reported_by_user: true } : q
                ));
            }

            toast({ title: "Report Submitted", description: "Thank you for helping us improve." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to submit report.", variant: "destructive" });
        }
    };

    const currentPassage = passages[currentPassageIndex];
    const currentQuestions = questions.filter(q => q.passage_id === currentPassage?.id);

    if (isLoading) return (
        isMockSession ?
            <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div> :
            <Layout><div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div></Layout>
    );

    if (!passages.length) return (
        isMockSession ?
            <div className="p-10 text-center">No content found for this test.</div> :
            <Layout><div className="p-10 text-center">No content found for this test.</div></Layout>
    );

    const Container: any = isMockSession ? ({ children }: { children: React.ReactNode }) => <>{children}</> : Layout;

    return (
        <Container showFooter={false}>
            <div className="h-[calc(100vh-4.5rem)] flex flex-col bg-slate-50 dark:bg-muted dark:bg-muted">
                {/* Header / Toolbar */}
                <div className="h-16 border-b border-slate-200 dark:border-border bg-white dark:bg-card px-6 flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">{test?.title}</h1>
                        <p className="text-xs text-slate-500">Passage {currentPassageIndex + 1} of {passages.length}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md font-mono text-sm font-bold">
                            <Timer className="w-4 h-4" /> {formatTime(timeLeft)}
                        </div>
                        <Button variant="default" size="sm" className="gap-2" onClick={handleSubmit}>
                            <Save className="w-4 h-4" /> Submit Test
                        </Button>
                    </div>
                </div>

                {/* Split Screen Content */}
                <div className="flex-1 overflow-hidden">
                    <ResizablePanelGroup direction="horizontal">

                        {/* LEFT: Passage */}
                        <ResizablePanel defaultSize={50} minSize={30}>
                            <ScrollArea className="h-full">
                                <div className="p-8 lg:p-12 prose prose-slate max-w-none">
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-8">{currentPassage?.title}</h2>
                                    {currentPassage?.image_url && (
                                        <img src={currentPassage.image_url} alt="Passage" className="w-full rounded-lg mb-8" />
                                    )}
                                    <div
                                        dangerouslySetInnerHTML={{ __html: currentPassage?.content || '' }}
                                        className="whitespace-pre-wrap leading-relaxed text-lg"
                                    />
                                </div>
                            </ScrollArea>
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        {/* RIGHT: Questions */}
                        <ResizablePanel defaultSize={50} minSize={30}>
                            <ScrollArea className="h-full bg-slate-50/50">
                                <div className="p-8 lg:p-12 space-y-12">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">Questions</h3>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline" size="icon"
                                                disabled={currentPassageIndex === 0}
                                                onClick={() => setCurrentPassageIndex(p => p - 1)}
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="outline" size="icon"
                                                disabled={currentPassageIndex === passages.length - 1}
                                                onClick={() => setCurrentPassageIndex(p => p + 1)}
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-10">
                                        {currentQuestions.map((q, i) => (
                                            <div key={q.id} className="bg-white dark:bg-card p-6 rounded-xl border border-slate-200 dark:border-border shadow-sm">
                                                <div className="flex gap-4">
                                                    <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:text-slate-400 font-bold text-sm">
                                                        {i + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex-1">
                                                                {q.question_type === 'mcq' && <MultipleChoiceQuestion question={q} value={answers[q.id] || ''} onChange={(v) => handleAnswerChange(q.id, v)} />}
                                                                {q.question_type === 'bool' && <TrueFalseQuestion question={q} value={answers[q.id] || ''} onChange={(v) => handleAnswerChange(q.id, v)} />}
                                                                {(q.question_type === 'gap' || q.question_type === 'short_answer') && <GapFillQuestion question={q} value={answers[q.id] || ''} onChange={(v) => handleAnswerChange(q.id, v)} />}
                                                                {q.question_type === 'multi_select' && <MultiSelectQuestion question={q} value={answers[q.id] || []} onChange={(v) => handleAnswerChange(q.id, v)} />}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleReport(q)}
                                                                    className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 border border-slate-100"
                                                                    title="Report Issue"
                                                                >
                                                                    <AlertTriangle className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleBookmark(q)}
                                                                    disabled={q.is_saved && q.is_reported_by_user && !q.is_corrected}
                                                                    className={`transition-all border shadow-sm ${q.is_saved
                                                                        ? q.is_reported_by_user && !q.is_corrected
                                                                            ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                                                                            : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                                                        : 'bg-white dark:bg-card border-slate-200 dark:border-border text-slate-500 hover:text-indigo-600 hover:border-indigo-100 hover:bg-slate-50'}`}
                                                                >
                                                                    {q.is_saved && q.is_reported_by_user && !q.is_corrected ? (
                                                                        <Lock className="w-4 h-4" />
                                                                    ) : (
                                                                        <Bookmark className={`w-4 h-4 ${q.is_saved ? 'fill-indigo-600' : ''}`} />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {currentQuestions.length === 0 && (
                                            <div className="text-center text-slate-400 py-10">No questions for this passage.</div>
                                        )}
                                    </div>
                                </div>
                            </ScrollArea>
                        </ResizablePanel>

                    </ResizablePanelGroup>
                </div>
            </div>
        </Container>
    );
}
