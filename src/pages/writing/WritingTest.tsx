import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
// ... existing imports ...
import Layout from '@/components/Layout';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Save, Timer, FileText, Sparkles, Clock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import QuestionMedia from "@/components/QuestionMedia";

export default function WritingTest({
    overrideId,
    overrideId2,
    onComplete,
    isMockSession = false,
    mockSubmissionId
}: {
    overrideId?: string;
    overrideId2?: string;
    onComplete?: () => void;
    isMockSession?: boolean;
    mockSubmissionId?: string | null;
}) {
    const { taskId: paramTaskId, submissionId: paramSubmissionId } = useParams();
    const taskId = overrideId || paramTaskId;
    const submissionId = paramSubmissionId;
    const { user } = useAuth();
    const { toast } = useToast();

    const [task, setTask] = useState<any>(null);
    const [content, setContent] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [feedback, setFeedback] = useState<any>(null);
    const [submissionDate, setSubmissionDate] = useState<string | null>(null);
    const [hasPendingSubmission, setHasPendingSubmission] = useState(false);
    const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(submissionId || null);

    useEffect(() => {
        fetchData();

        // Timer - only if not viewing result
        if (!submissionId) {
            const interval = setInterval(() => {
                setTimeElapsed(prev => prev + 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [taskId, submissionId]);

    useEffect(() => {
        const words = content.trim().split(/\s+/).filter(w => w.length > 0);
        setWordCount(words.length);
    }, [content]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (submissionId) {
                // Fetch existing submission and task
                const { data: subData, error: subError } = await supabase
                    .from('writing_submissions')
                    .select('*, writing_tasks(*), writing_feedback(*)')
                    .eq('id', submissionId)
                    .single();

                if (subError) throw subError;
                if (subData) {
                    setTask(subData.writing_tasks);
                    setContent(subData.content);
                    setSubmissionDate(subData.created_at);

                    if (subData.status === 'pending') {
                        setFeedback({ manual_pending: true });
                    } else if (subData.writing_feedback) {
                        setFeedback(subData.writing_feedback);
                    }
                }
            } else if (taskId) {
                // Check if user has a pending submission for this task
                const { data: existingSub } = await supabase
                    .from('writing_submissions')
                    .select('id, status, created_at, content')
                    .eq('task_id', taskId)
                    .eq('user_id', user!.id)
                    .eq('status', 'pending')
                    .maybeSingle();

                if (existingSub) {
                    setHasPendingSubmission(true);
                    setContent(existingSub.content);
                    setSubmissionDate(existingSub.created_at);
                    setFeedback({ manual_pending: true });

                    const { data: taskData } = await supabase.from('writing_tasks').select('*').eq('id', taskId).single();
                    if (taskData) setTask(taskData);
                } else {
                    const { data: taskData } = await (supabase as any).from('writing_tasks').select('*').eq('id', taskId).single();
                    if (taskData) setTask(taskData);

                    if (isMockSession && overrideId2) {
                        // Potential logic for dual task loading
                    }

                    // Create in-progress submission with fallback for missing schema columns
                    if (user) {
                        const { data: subData, error: subError } = await supabase.from('writing_submissions').insert({
                            user_id: user.id,
                            task_id: taskId,
                            status: 'in-progress',
                            content: '',
                            is_mock_exam: isMockSession,
                            mock_submission_id: mockSubmissionId
                        }).select().single();

                        if (subError && subError.message.includes('column "status" of relation "writing_submissions" does not exist')) {
                            console.warn("Schema mismatch detected: 'status' column missing. Retrying without it...");
                            const { data: retryData } = await supabase.from('writing_submissions').insert({
                                user_id: user.id,
                                task_id: taskId,
                                content: '',
                                created_at: new Date().toISOString(),
                                is_mock_exam: isMockSession,
                                mock_submission_id: mockSubmissionId
                            }).select().single();
                            if (retryData) setCurrentSubmissionId(retryData.id);
                        } else if (subData) {
                            setCurrentSubmissionId(subData.id);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load writing data.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!user || !task) return;
        if (wordCount < task.min_words) {
            toast({
                title: "Word Count Too Low",
                description: `You need at least ${task.min_words} words. Current: ${wordCount}`,
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Save or Update submission with 'pending' status
            let submission;
            if (currentSubmissionId) {
                const { data, error } = await supabase
                    .from('writing_submissions')
                    .update({
                        content,
                        word_count: wordCount,
                        status: 'pending' // Set to pending for manual evaluation
                    })
                    .eq('id', currentSubmissionId)
                    .select()
                    .single();

                if (error && error.message.includes('column "status" of relation "writing_submissions" does not exist')) {
                    const { data: retryData, error: retryError } = await supabase
                        .from('writing_submissions')
                        .update({ content, word_count: wordCount })
                        .eq('id', currentSubmissionId)
                        .select().single();
                    if (retryError) throw retryError;
                    submission = retryData;
                } else if (error) {
                    throw error;
                } else {
                    submission = data;
                }
            } else {
                const { data, error } = await supabase
                    .from('writing_submissions')
                    .insert({
                        user_id: user.id,
                        task_id: task.id,
                        content,
                        word_count: wordCount,
                        status: 'pending',
                        is_mock_exam: isMockSession,
                        mock_submission_id: mockSubmissionId
                    })
                    .select()
                    .single();

                if (error && error.message.includes('column "status" of relation "writing_submissions" does not exist')) {
                    const { data: retryData, error: retryError } = await supabase
                        .from('writing_submissions')
                        .insert({
                            user_id: user.id,
                            task_id: task.id,
                            content,
                            word_count: wordCount
                        })
                        .select().single();
                    if (retryError) throw retryError;
                    submission = retryData;
                } else if (error) {
                    throw error;
                } else {
                    submission = data;
                }
            }

            // Link back to mock_exam_submissions if applicable
            if (submission && mockSubmissionId) {
                await (supabase as any)
                    .from('mock_exam_submissions')
                    .update({ writing_submission_id: submission.id })
                    .eq('id', mockSubmissionId);
            }

            // Success state - Show pending message
            setFeedback({ manual_pending: true });
            toast({
                title: "Submission Received!",
                description: isMockSession ? "Writing section completed." : "A real IELTS examiner will evaluate your band score within 2 days.",
                duration: 5000
            });

            if (isMockSession && onComplete) {
                onComplete();
            }

        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const Container: any = isMockSession ? ({ children }: { children: React.ReactNode }) => <>{children}</> : Layout;

    if (isLoading) return (
        isMockSession ?
            <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div> :
            <Layout><div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div></Layout>
    );

    if (!task) return (
        isMockSession ?
            <div className="p-10 text-center">Task not found.</div> :
            <Layout><div className="p-10 text-center">Task not found.</div></Layout>
    );

    if (feedback?.manual_pending) {
        return (
            <Container showFooter={false}>
                <div className="min-h-[80vh] flex items-center justify-center p-4">
                    <Card className="max-w-2xl w-full p-12 bg-white dark:bg-[#1e293b] border-2 border-indigo-100 dark:border-indigo-900 shadow-2xl rounded-[3rem] text-center space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-[80px]"></div>

                        <div className="relative z-10 flex flex-col items-center space-y-6">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-200 dark:shadow-none animate-bounce-slow">
                                <Clock className="w-12 h-12" />
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                    Submission <span className="text-indigo-600">Successful</span>
                                </h1>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em]">Manual Examiner Protocol Initiated</p>
                            </div>

                            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-indigo-50 dark:border-indigo-800/50">
                                <p className="text-lg text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                    Your essay has been securely transmitted to our expert panel. A real <span className="text-indigo-600 font-black">IELTS Examiner</span> will evaluate your performance across all criteria.
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-8 w-full py-4">
                                <div className="text-center space-y-1">
                                    <div className="text-2xl font-black text-slate-900 dark:text-white">2 Days</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ETA Window</div>
                                </div>
                                <div className="bg-slate-200 dark:bg-slate-800 w-px h-full self-center justify-self-center"></div>
                                <div className="text-center space-y-1">
                                    <div className="text-2xl font-black text-indigo-600">Manual</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grading Mode</div>
                                </div>
                            </div>

                            <div className="pt-4 w-full">
                                <Button
                                    onClick={() => window.location.href = '/writing/history'}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black h-14 rounded-2xl shadow-xl transition-all hover:scale-[1.02]"
                                >
                                    Return to My Writing History
                                </Button>
                                <p className="text-xs text-slate-400 italic mt-6">
                                    You will receive a notification in your dashboard once your band score is finalized.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </Container>
        );
    }


    return (
        <Container showFooter={false}>
            <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50 dark:bg-[#0f172a] overflow-hidden">
                {/* Header - More compact and professional */}
                <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] px-6 flex items-center justify-between shrink-0 z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-900 dark:text-slate-100 leading-none">IELTS Writing {task.task_type === 'task1' ? 'Task 1' : 'Task 2'}</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Target: {task.min_words} words</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {!submissionId && !hasPendingSubmission ? (
                            <div className="flex items-center gap-6">
                                <div className="hidden sm:flex flex-col items-end pr-6 border-r border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Time Elapsed</span>
                                    <div className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2 tracking-tighter">
                                        <Timer className="w-4 h-4 text-indigo-500" /> {formatTime(timeElapsed)}
                                    </div>
                                </div>
                                <div className={`px-3 py-1.5 rounded-lg font-bold text-sm border flex items-center gap-2 ${wordCount >= (task?.min_words || 0) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                    <Sparkles className={`w-4 h-4 ${wordCount >= (task?.min_words || 0) ? 'text-emerald-500' : 'text-amber-500'}`} />
                                    {wordCount} / {task?.min_words || 0} words
                                </div>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || wordCount < (task?.min_words || 0)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-indigo-200"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Transmitting essay...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Submit & Grade
                                        </>
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-end pr-2 text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                    {hasPendingSubmission ? 'Evaluation in Progress' : 'Submitted on'}
                                </span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {submissionDate ? format(new Date(submissionDate), 'MMM d, yyyy • h:mm a') : '—'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Split Layout */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Task Prompt (Scrollable) */}
                    <div className="w-1/2 overflow-y-auto border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111827]/50 p-6 lg:p-8">
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest">
                                Task Prompt
                            </div>

                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                <p className="text-lg text-slate-800 dark:text-slate-200 leading-relaxed font-medium bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    {task.prompt}
                                </p>
                            </div>

                            {(task.media || task.image_url) && (
                                <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-md bg-white dark:bg-[#1e293b]">
                                    <div className="bg-slate-50 dark:bg-slate-900 p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-2">Visual Prompt</span>
                                    </div>
                                    <div className="p-4 flex justify-center bg-white dark:bg-card">
                                        {task.media ? (
                                            <QuestionMedia media={task.media} />
                                        ) : (
                                            <img
                                                src={task.image_url}
                                                alt="Task Diagram"
                                                className="max-w-full max-h-[450px] object-contain transition-transform hover:scale-[1.02] cursor-zoom-in"
                                            />
                                        )}
                                    </div>
                                </Card>
                            )}

                            {/* Info Card */}
                            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase flex items-center gap-2 mb-2">
                                    <Sparkles className="w-3 h-3" /> Tip for {task.task_type === 'task1' ? 'Task 1' : 'Task 2'}
                                </h4>
                                <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-snug">
                                    {task.task_type === 'task1'
                                        ? "Focus on summarizing the main features and making comparisons where relevant. Don't include personal opinions."
                                        : "Clearly state your position and support it with relevant examples and evidence throughout your essay."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Editor (Scrollable) */}
                    <div className="w-1/2 overflow-y-auto bg-white dark:bg-[#0f172a] p-6 lg:p-8">
                        <div className="max-w-3xl mx-auto space-y-8">

                            {/* Feedback Card (At the top in Result view) */}
                            {feedback && !feedback.manual_pending && (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                    <Card className="p-8 bg-white dark:bg-[#1e293b] border-2 border-indigo-200 dark:border-indigo-900 shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>

                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg">
                                                <Sparkles className="w-7 h-7 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Examiner Evaluation</h2>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Review Finalized</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
                                            {[
                                                { label: 'Overall', score: feedback.overall_score, color: 'text-indigo-600 dark:text-indigo-400' },
                                                { label: 'Task Response', score: feedback.task_achievement_score, color: 'text-slate-700 dark:text-slate-200' },
                                                { label: 'Coherence', score: feedback.coherence_score, color: 'text-slate-700 dark:text-slate-200' },
                                                { label: 'Lexical Resource', score: feedback.lexical_score, color: 'text-slate-700 dark:text-slate-200' },
                                                { label: 'Grammar', score: feedback.grammar_score, color: 'text-slate-700 dark:text-slate-200' }
                                            ].map((item, i) => (
                                                <div key={i} className={`text-center p-4 rounded-2xl border transition-all hover:shadow-md ${i === 0 ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'}`}>
                                                    <div className={`text-3xl font-black ${item.color}`}>{item.score}</div>
                                                    <div className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-tighter leading-none">{item.label}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-6 rounded-2xl bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30">
                                            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-indigo-500" />
                                                Detailed Performance Analysis
                                            </h3>
                                            <div className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm lg:text-base whitespace-pre-wrap">
                                                {feedback.feedback_text}
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* Response Section */}
                            <div className="flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                        {submissionId ? 'Your Final Response' : 'Your Response'}
                                    </div>
                                    {!submissionId && <span className="text-[10px] text-slate-400 font-medium">Auto-saving...</span>}
                                    {submissionId && (
                                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest">
                                            {wordCount} Words Total
                                        </span>
                                    )}
                                </div>

                                <div className="min-h-[400px]">
                                    <Textarea
                                        readOnly={!!submissionId}
                                        placeholder="Start writing your response here..."
                                        className={`w-full h-full min-h-[500px] text-lg leading-relaxed p-8 rounded-2xl border-slate-200 dark:border-slate-800 focus:ring-indigo-500 shadow-sm dark:bg-[#1e293b] dark:text-slate-100 focus:outline-none ${submissionId ? 'bg-slate-50/50 dark:bg-[#1e293b]/50 border-dashed resize-none' : ''}`}
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
}
