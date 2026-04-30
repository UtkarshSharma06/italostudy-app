import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MultipleChoiceQuestion, TrueFalseQuestion, GapFillQuestion, MultiSelectQuestion } from "@/components/reading/QuestionTypes";
import { Slider } from "@/components/ui/slider";
import { Loader2, Play, Pause, Volume2, SkipForward, SkipBack, Save, Music, HelpCircle, Bookmark, AlertTriangle, Lock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/lib/auth';

export default function ListeningTest({
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
    const audioRef = useRef<HTMLAudioElement>(null);

    const [test, setTest] = useState<any>(null);
    const [parts, setParts] = useState<any[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentPartIndex, setCurrentPartIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [submissionId, setSubmissionId] = useState<string | null>(null);

    useEffect(() => {
        if (!testId) return;
        fetchData();
    }, [testId]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        let animationFrame: number;

        const updateProgress = () => {
            if (audio.duration && !isDragging) {
                setCurrentTime(audio.currentTime);
                if (duration !== audio.duration) setDuration(audio.duration);
            }
            if (isPlaying) {
                animationFrame = requestAnimationFrame(updateProgress);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            cancelAnimationFrame(animationFrame);
        };

        const handleLoaded = () => {
            setDuration(audio.duration);
            setCurrentTime(audio.currentTime);
        };

        audio.addEventListener('play', () => {
            animationFrame = requestAnimationFrame(updateProgress);
        });
        audio.addEventListener('pause', () => {
            cancelAnimationFrame(animationFrame);
        });
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('loadedmetadata', handleLoaded);
        audio.addEventListener('canplay', handleLoaded);

        // If audio is already loaded/playing (e.g. state change)
        if (audio.duration) handleLoaded();
        if (!audio.paused) animationFrame = requestAnimationFrame(updateProgress);

        return () => {
            cancelAnimationFrame(animationFrame);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('loadedmetadata', handleLoaded);
            audio.removeEventListener('canplay', handleLoaded);
        };
    }, [currentPartIndex, isDragging, isPlaying]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data: testData } = await supabase.from('listening_tests').select('*').eq('id', testId).single();
            setTest(testData);

            const { data: partData } = await supabase.from('listening_parts').select('*').eq('test_id', testId).order('order_index');

            if (partData) {
                setParts(partData);
                const partIds = partData.map(p => p.id);
                const { data: qData } = await supabase.from('listening_questions').select('*').in('part_id', partIds).order('order_index');
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
                            is_reported_by_user: (b as any)?.is_reported_by_user || false,
                            is_corrected: q.is_corrected || false
                        };
                    }));
                }

                if (user) {
                    const { data: subData, error: subError } = await supabase.from('listening_submissions').insert({
                        user_id: user.id,
                        test_id: testId,
                        status: 'in-progress',
                        answers: {}
                    }).select().single();

                    if (subError && subError.message.includes('column "status" of relation "listening_submissions" does not exist')) {
                        console.warn("Schema mismatch: 'status' column missing. Retrying without it...");
                        const { data: retryData } = await supabase.from('listening_submissions').insert({
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
            toast({ title: "Error", description: "Failed to load listening test.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerChange = (questionId: string, value: any) => {
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
                question_id: question.id,
                master_question_id: question.id,
                source_table: 'listening_questions',
                exam_type: 'ielts' // Default for this component
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
                    source_table: 'listening_questions',
                    reason: reason
                });

            if (reportError) throw reportError;

            // Auto-bookmark
            if (!question.is_saved) {
                await supabase.from('bookmarked_questions').insert({
                    user_id: user.id,
                    question_id: question.id,
                    master_question_id: question.id,
                    source_table: 'listening_questions',
                    exam_type: 'ielts',
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

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const skipTime = (seconds: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                    const userSorted = [...userAns].map(s => String(s).trim().toLowerCase()).sort().join(',');
                    const correctSorted = correctAns.split(',').map(s => s.trim().toLowerCase()).sort().join(',');
                    if (userSorted === correctSorted) score++;
                } else {
                    if (String(userAns).trim().toLowerCase() === correctAns.trim().toLowerCase()) {
                        score++;
                    }
                }
            });

            let submissionResult;
            if (submissionId) {
                const { data, error } = await supabase.from('listening_submissions').update({
                    answers,
                    score,
                    status: 'completed'
                }).eq('id', submissionId).select().single();

                if (error && error.message.includes('column "status" of relation "listening_submissions" does not exist')) {
                    console.warn("Schema mismatch: 'status' column missing. Retrying without it...");
                    const { data: retryData, error: retryError } = await supabase.from('listening_submissions').update({
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
                const { data, error } = await supabase.from('listening_submissions').insert({
                    user_id: user.id,
                    test_id: testId,
                    answers,
                    score,
                    status: 'completed'
                }).select().single();

                if (error && error.message.includes('column "status" of relation "listening_submissions" does not exist')) {
                    console.warn("Schema mismatch: 'status' column missing. Retrying without it...");
                    const { data: retryData, error: retryError } = await supabase.from('listening_submissions').insert({
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
                    .update({ listening_submission_id: (submissionResult as any).id })
                    .eq('id', mockSubmissionId);
            }

            toast({ title: "Success", description: "Listening section completed." });

            if (isMockSession && onComplete) {
                onComplete();
            } else {
                navigate(`/listening/results/${submissionResult.id}`);
            }

        } catch (error: any) {
            console.error('Submit error:', error);
            toast({ title: "Error", description: "Failed to submit test.", variant: "destructive" });
        }
    };

    const currentPart = parts[currentPartIndex];
    const currentQuestions = questions.filter(q => q.part_id === currentPart?.id);

    if (isLoading) return (
        isMockSession ?
            <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div> :
            <Layout><div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div></Layout>
    );

    if (!parts.length) return (
        isMockSession ?
            <div className="p-10 text-center">No content found for this test.</div> :
            <Layout><div className="p-10 text-center">No content found for this test.</div></Layout>
    );

    const Container: any = isMockSession ? ({ children }: { children: React.ReactNode }) => <>{children}</> : Layout;

    return (
        <Container showFooter={false}>
            <div className="h-[calc(100vh-4.5rem)] flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
                {/* Compact Header */}
                <header className="h-16 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-6 flex items-center justify-between z-30">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                            <Music className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-slate-900 dark:text-white leading-none tracking-tight">{test?.title}</h1>
                            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">Part {currentPartIndex + 1} of {parts.length}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            {parts.map((p, i) => (
                                <button
                                    key={p.id}
                                    onClick={() => setCurrentPartIndex(i)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${i === currentPartIndex
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                >
                                    P{i + 1}
                                </button>
                            ))}
                        </div>
                        <Button
                            onClick={handleSubmit}
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md shadow-indigo-100 dark:shadow-none gap-2 px-4 h-9"
                        >
                            <Save className="w-4 h-4" />
                            <span>Finish</span>
                        </Button>
                    </div>
                </header>

                {/* Integrated Audio Player - Sticky/Compact */}
                <div className="shrink-0 bg-slate-900 px-6 py-4 border-b border-slate-800 z-20 shadow-xl">
                    <div className="max-w-7xl mx-auto flex items-center gap-6">
                        {/* Play/Pause */}
                        <button
                            onClick={togglePlayPause}
                            className="w-12 h-12 shrink-0 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                        >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                        </button>

                        <div className="flex items-center gap-3 shrink-0 hidden md:flex">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => skipTime(-10)}><SkipBack className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => skipTime(10)}><SkipForward className="w-4 h-4" /></Button>
                        </div>

                        {/* Progress */}
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between items-center px-0.5">
                                <span className="text-[10px] font-bold text-white uppercase tracking-widest opacity-60 truncate max-w-[200px]">{currentPart?.title}</span>
                                <div className="flex items-center gap-1.5 font-mono text-[10px] font-black tracking-tighter">
                                    <span className="text-indigo-400">{formatTime(currentTime)}</span>
                                    <span className="text-slate-600">/</span>
                                    <span className="text-slate-400">{formatTime(duration)}</span>
                                </div>
                            </div>
                            <Slider
                                value={[currentTime]}
                                max={duration || 100}
                                step={0.1}
                                onValueChange={(vals) => {
                                    setCurrentTime(vals[0]);
                                    if (audioRef.current && isDragging) {
                                        audioRef.current.currentTime = vals[0];
                                    }
                                }}
                                onPointerDown={() => setIsDragging(true)}
                                onPointerUp={() => {
                                    setIsDragging(false);
                                    if (audioRef.current) {
                                        audioRef.current.currentTime = currentTime;
                                    }
                                }}
                                className="cursor-pointer py-4 [&_[data-orientation=horizontal]]:h-1.5 [&_[data-orientation=horizontal]]:bg-slate-800 [&_.bg-primary]:bg-indigo-400 [&_.bg-primary]:shadow-[0_0_10px_rgba(129,140,248,0.5)]"
                            />
                        </div>

                        {/* Volume - Real */}
                        <div className="flex items-center gap-2 hidden lg:flex shrink-0">
                            <Volume2 className="w-4 h-4 text-indigo-400 opacity-60" />
                            <Slider
                                value={[volume * 100]}
                                max={100}
                                step={1}
                                onValueChange={(vals) => setVolume(vals[0] / 100)}
                                className="w-24 cursor-pointer [&_[data-orientation=horizontal]]:h-1 [&_[data-orientation=horizontal]]:bg-slate-800 [&_.bg-primary]:bg-indigo-400"
                            />
                        </div>
                    </div>
                </div>

                <audio ref={audioRef} src={currentPart?.audio_url} className="hidden" />

                {/* Split Pane Main Content */}
                <main className="flex-1 flex overflow-hidden">
                    {/* Left Pane: Content/Instructions (Fixed or Scrollable separately) */}
                    <div className="hidden lg:flex flex-col w-[35%] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Part Instructions</h3>
                        </div>
                        <ScrollArea className="flex-1 p-6">
                            {currentPart?.content ? (
                                <div
                                    dangerouslySetInnerHTML={{ __html: currentPart.content }}
                                    className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 opacity-50">
                                    <HelpCircle className="w-8 h-8" />
                                    <p className="text-xs font-bold">No specific instructions for this part.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Right Pane: Questions (Master Scroll) */}
                    <ScrollArea className="flex-1 dark:bg-slate-950">
                        <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
                            {/* Mobile-only Content Toggle or Warning */}
                            <div className="lg:hidden mb-6 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                                <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Instructions</h3>
                                <div
                                    dangerouslySetInnerHTML={{ __html: currentPart?.content || '' }}
                                    className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3"
                                />
                            </div>

                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Questions</h3>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                                    {currentQuestions.length} Questions
                                </span>
                            </div>

                            <div className="grid gap-4">
                                {currentQuestions.map((q, i) => (
                                    <div key={q.id} className="group flex gap-4">
                                        <div className="shrink-0 w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs font-black text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors shadow-sm self-start mt-4">
                                            {String(i + 1).padStart(2, '0')}
                                        </div>
                                        <div className="flex-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all">
                                            <div className="flex justify-between items-start">
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
                                ))}
                            </div>

                            {currentQuestions.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                                    <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Awaiting Material...</p>
                                </div>
                            )}

                            <div className="h-12" />
                        </div>
                    </ScrollArea>
                </main>
            </div>
        </Container>
    );
}
