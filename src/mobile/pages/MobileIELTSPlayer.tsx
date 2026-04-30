import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2, Timer, BookOpen, Music, FileText,
    Save, ChevronLeft, ChevronRight, Play, Pause,
    Volume2, Bookmark, CheckCircle2, AlertTriangle, Sparkles, Clock, Lock
} from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { MultipleChoiceQuestion, TrueFalseQuestion, GapFillQuestion, MultiSelectQuestion } from "@/components/reading/QuestionTypes";
import { Textarea } from "@/components/ui/textarea";
import { Haptics, ImpactStyle } from '@capacitor/haptics';

type IELTSResourceType = 'reading' | 'listening' | 'writing';

interface MobileIELTSPlayerProps {
    overrideId?: string;
    overrideId2?: string;
    onComplete?: () => void;
    isMockSession?: boolean;
    mockSubmissionId?: string | null;
}

// IELTS Question Interface is dynamic, using any for broad compatibility

export default function MobileIELTSPlayer({
    overrideId,
    overrideId2,
    onComplete,
    isMockSession = false,
    mockSubmissionId
}: MobileIELTSPlayerProps) {
    const { id, taskId, testId, sessionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();

    // Determine type from path
    const type = location.pathname.includes('reading') ? 'reading' :
        location.pathname.includes('listening') ? 'listening' :
            location.pathname.includes('writing') ? 'writing' : 'reading';

    // State
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [test, setTest] = useState<any>(null);
    const [resources, setResources] = useState<any[]>([]); // Passages or Parts or Writing Tasks
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentResourceIndex, setCurrentResourceIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [activeTab, setActiveTab] = useState("resource");
    const [submissionId, setSubmissionId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<any>(null);

    // Timer
    const [timeLeft, setTimeLeft] = useState(type === 'writing' ? 60 * 60 : 60 * 60); // Default 60 mins

    // Audio State (Listening)
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Initial Load
    useEffect(() => {
        if (user) fetchData();
    }, [id, taskId, testId, user, overrideId, overrideId2]);

    // Timer Effect
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (!isMockSession) handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [questions, answers, isMockSession]);

    const fetchData = async () => {
        setIsLoading(true);
        const targetId = overrideId || id || taskId || testId;
        if (!targetId) return;

        try {
            if (type === 'reading') {
                const { data: testData } = await supabase.from('reading_tests').select('*').eq('id', targetId).single();
                setTest(testData);
                const { data: passageData } = await supabase.from('reading_passages').select('*').eq('test_id', targetId).order('order_index');
                if (passageData) {
                    setResources(passageData);
                    const pIds = passageData.map(p => p.id);
                    const { data: qData } = await supabase
                        .from('reading_questions')
                        .select('*')
                        .in('passage_id', pIds)
                        .order('order_index');

                    if (qData) {
                        // Fetch bookmarks separately
                        const questionIds = qData.map(q => q.id);
                        const { data: bData } = await supabase
                            .from('bookmarked_questions')
                            .select('question_id, is_reported_by_user')
                            .eq('user_id', user.id)
                            .in('question_id', questionIds);

                        const bookmarkMap = new Map(bData?.map(b => [b.question_id, b]) || []);

                        setQuestions(qData.map((q: any) => ({
                            ...q,
                            is_saved: bookmarkMap.has(q.id),
                            is_reported_by_user: (bookmarkMap.get(q.id) as any)?.is_reported_by_user || false
                        })));
                    }
                }
            } else if (type === 'listening') {
                const { data: testData } = await supabase.from('listening_tests').select('*').eq('id', targetId).single();
                setTest(testData);
                const { data: partData } = await supabase.from('listening_parts').select('*').eq('test_id', targetId).order('order_index');
                if (partData) {
                    setResources(partData);
                    const pIds = partData.map(p => p.id);
                    const { data: qData } = await supabase
                        .from('listening_questions')
                        .select('*')
                        .in('part_id', pIds)
                        .order('order_index');

                    if (qData) {
                        // Fetch bookmarks separately
                        const questionIds = qData.map(q => q.id);
                        const { data: bData } = await supabase
                            .from('bookmarked_questions')
                            .select('question_id, is_reported_by_user')
                            .eq('user_id', user.id)
                            .in('question_id', questionIds);

                        const bookmarkMap = new Map(bData?.map(b => [b.question_id, b]) || []);

                        setQuestions(qData.map((q: any) => ({
                            ...q,
                            is_saved: bookmarkMap.has(q.id),
                            is_reported_by_user: (bookmarkMap.get(q.id) as any)?.is_reported_by_user || false
                        })));
                    }
                }
            } else if (type === 'writing') {
                // Fetch first task
                const { data: task1Data } = await (supabase as any).from('writing_tasks').select('*').eq('id', targetId).single();
                setTest(task1Data);

                const writingResources = [task1Data];

                // Fetch second task if provided
                if (overrideId2) {
                    const { data: task2Data } = await (supabase as any).from('writing_tasks').select('*').eq('id', overrideId2).single();
                    if (task2Data) writingResources.push(task2Data);
                }

                setResources(writingResources);

                // Fetch existing submission and feedback if not in mock session
                if (!isMockSession) {
                    const { data: subData } = await supabase
                        .from('writing_submissions')
                        .select('*, writing_feedback(*)')
                        .eq('task_id', targetId)
                        .eq('user_id', user!.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (subData) {
                        setSubmissionId(subData.id);
                        setAnswers(prev => ({ ...prev, [`writing_content_${subData.task_id}`]: subData.content }));
                        if (subData.writing_feedback && subData.writing_feedback.length > 0) {
                            setFeedback(subData.writing_feedback[0]);
                        } else if (subData.status === 'pending') {
                            setFeedback({ manual_pending: true });
                        }
                    }
                }
            }

            // Init submission if user logged in and it's a new attempt
            if (user && !submissionId && !feedback) {
                const tableName = type === 'reading' ? 'reading_submissions' :
                    type === 'listening' ? 'listening_submissions' : 'writing_submissions';

                let payload: any = {
                    user_id: user.id,
                    is_mock_exam: isMockSession,
                    mock_submission_id: mockSubmissionId
                };

                // Add type-specific fields
                if (type === 'writing') {
                    payload.task_id = targetId;
                    payload.content = '';
                    payload.status = 'in-progress';
                } else {
                    payload.test_id = targetId;
                    payload.answers = {};
                }

                const { data: subData, error: subError } = await supabase.from(tableName as any).insert(payload).select().single();

                if (subError && subError.message.includes('column "status" of relation')) {
                    console.warn(`Schema mismatch in ${tableName}: 'status' missing. Retrying...`);
                    delete payload.status;
                    const { data: retryData } = await supabase.from(tableName as any).insert(payload).select().single();
                    if (retryData) setSubmissionId(retryData.id);
                } else if (subData) {
                    setSubmissionId(subData.id);
                }
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Load Error", description: "Failed to load IELTS intelligence.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerChange = (qId: string, val: any) => {
        setAnswers(prev => ({ ...prev, [qId]: val }));
    };

    const handleBookmark = async (q: any) => {
        if (!user || !q) return;

        // Prevent unbookmarking if reported and not fixed
        if (q.is_saved && q.is_reported_by_user && !q.is_corrected) {
            toast({
                title: "Mandatory Bookmark",
                description: "This question is reported and cannot be removed until fixed.",
                variant: "destructive"
            });
            return;
        }

        const newSavedState = !q.is_saved;
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { });

        setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, is_saved: newSavedState } : item));

        if (newSavedState) {
            await (supabase as any).from('bookmarked_questions').insert({
                user_id: user.id,
                question_id: q.id,
                master_question_id: q.master_id || q.id,
                source_table: type === 'reading' ? 'reading_questions' : 'listening_questions',
                exam_type: 'ielts'
            });
            toast({ title: "Question Saved" });
        } else {
            await (supabase as any).from('bookmarked_questions').delete().eq('question_id', q.id).eq('user_id', user.id);
            toast({ title: "Bookmark Removed" });
        }
    };

    const handleReport = async (q: any) => {
        if (!user || !q) return;

        const reason = window.prompt("Reason for reporting this question:");
        if (!reason) return;

        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => { });

        const { error } = await (supabase as any).from('question_reports').insert({
            user_id: user.id,
            question_id: q.id,
            master_question_id: q.master_id || q.id,
            source_table: type === 'reading' ? 'reading_questions' : 'listening_questions',
            reason: reason,
            status: 'pending'
        });

        if (!error) {
            // Automatically bookmark if reported
            setQuestions(prev => prev.map(item =>
                item.id === q.id ? { ...item, is_reported_by_user: true, is_saved: true } : item
            ));

            await (supabase as any).from('bookmarked_questions').upsert({
                user_id: user.id,
                question_id: q.id,
                master_question_id: q.master_id || q.id,
                source_table: type === 'reading' ? 'reading_questions' : 'listening_questions',
                exam_type: 'ielts',
                is_reported_by_user: true
            }, { onConflict: 'user_id,question_id' });

            toast({ title: "Report Submitted", description: "Question has been bookmarked for tracking." });
        }
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (type === 'writing') {
                // For writing, we might have multiple submissions if it's dual task, 
                // but usually we submit the one we are currently finishing.
                // In IELTSFlow, onComplete handles transition.

                const task = resources[currentResourceIndex];
                const content = answers[`writing_content_${task.id}`] || '';

                const { data: submission } = await supabase.from('writing_submissions').update({
                    content,
                    status: 'pending',
                    word_count: content.trim().split(/\s+/).filter(Boolean).length
                }).eq('id', submissionId).select().single();

                if (submission && mockSubmissionId) {
                    await (supabase as any).from('mock_exam_submissions').update({
                        [currentResourceIndex === 0 ? 'writing_submission_id' : 'writing_submission_id_2']: submission.id
                    }).eq('id', mockSubmissionId);
                }

                toast({ title: "Writing Submitted", description: "Your response has been securely transmitted." });

                if (isMockSession && currentResourceIndex < resources.length - 1) {
                    // Move to second task
                    setCurrentResourceIndex(prev => prev + 1);
                    setActiveTab("resource");

                    // Create second submission
                    const { data: sub2 } = await supabase.from('writing_submissions').insert({
                        user_id: user!.id,
                        task_id: resources[currentResourceIndex + 1].id,
                        status: 'in-progress',
                        content: '',
                        is_mock_exam: true,
                        mock_submission_id: mockSubmissionId
                    }).select().single();
                    if (sub2) setSubmissionId(sub2.id);

                } else if (onComplete) {
                    onComplete();
                } else {
                    navigate('/mobile/history');
                }
            } else {
                // Scoring logic for Reading/Listening
                let score = 0;
                questions.forEach(q => {
                    const userAns = answers[q.id];
                    const correctAns = q.correct_answer || '';
                    if (!userAns) return;

                    if (Array.isArray(userAns)) {
                        const userSorted = [...userAns].map(s => s.trim().toLowerCase()).sort().join(',');
                        const correctSorted = correctAns.split(',').map(s => s.trim().toLowerCase()).sort().join(',');
                        if (userSorted === correctSorted) score++;
                    } else if (userAns.trim().toLowerCase() === correctAns.trim().toLowerCase()) {
                        score++;
                    }
                });

                const tableName = type === 'reading' ? 'reading_submissions' : 'listening_submissions';

                const payload = {
                    answers: answers,
                    score: score
                };

                const { data, error } = await supabase.from(tableName as any).update({
                    ...payload,
                    status: 'completed'
                }).eq('id', submissionId).select().single();

                if (error && error.message.includes('column "status" of relation')) {
                    console.warn(`Schema mismatch in ${tableName}: 'status' missing. Retrying...`);
                    const { data: retryData } = await supabase.from(tableName as any).update(payload).eq('id', submissionId).select().single();
                    if (onComplete) onComplete();
                    else if (retryData) navigate(`/mobile/results/${retryData.id}`);
                } else if (data) {
                    if (onComplete) onComplete();
                    else navigate(`/mobile/results/${data.id}`);
                }
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Transmission Failed", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const res = s % 60;
        return `${m}:${res.toString().padStart(2, '0')}`;
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-40">Decrypting Mission Data...</p>
        </div>
    );

    const currentResource = resources[currentResourceIndex];
    const currentQuestions = questions.filter(q =>
        type === 'reading' ? q.passage_id === currentResource?.id :
            type === 'listening' ? q.part_id === currentResource?.id : true
    );

    return (
        <div className="flex flex-col min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="p-6 pt-10 border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground"><ChevronLeft /></button>
                        <div>
                            <h1 className="text-lg font-black uppercase tracking-tight leading-none">
                                {type.toUpperCase()} <span className="text-primary italic">MISSION</span>
                            </h1>
                            <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-1">
                                {currentResource?.title || test?.title || `Task ${currentResourceIndex + 1}`}
                            </p>
                        </div>
                    </div>
                    {!feedback && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl">
                            <Timer className="w-3 h-3 text-primary" />
                            <span className="text-[10px] font-black font-mono tracking-tighter text-primary">
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                    )}
                </div>
            </header>

            {/* examiner Feedback / Report Overlay if available */}
            {feedback && (
                <div className="px-6 pt-4">
                    <div className="p-6 bg-indigo-50 dark:bg-indigo-950/20 border-2 border-indigo-100 dark:border-indigo-900 rounded-[2rem] space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight">Examiner Report</h3>
                                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Review Finalized</p>
                            </div>
                        </div>

                        {feedback.manual_pending ? (
                            <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                <Clock className="w-5 h-5 text-amber-500" />
                                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Grading in Progress... ETA 2 Days</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-5 gap-2">
                                    {[
                                        { label: 'OVR', val: feedback.overall_score },
                                        { label: 'TR', val: feedback.task_achievement_score },
                                        { label: 'CC', val: feedback.coherence_score },
                                        { label: 'LR', val: feedback.lexical_score },
                                        { label: 'GR', val: feedback.grammar_score }
                                    ].map(s => (
                                        <div key={s.label} className="bg-background/50 p-2 rounded-xl text-center border border-indigo-100 dark:border-indigo-900">
                                            <div className="text-sm font-black text-indigo-600">{s.val}</div>
                                            <div className="text-[8px] font-black opacity-40">{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                                <ScrollArea className="h-40">
                                    <p className="text-xs text-muted-foreground leading-relaxed italic">{feedback.feedback_text}</p>
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="px-6 py-4">
                    <TabsList className="w-full h-14 bg-secondary/20 p-1.5 rounded-2xl border border-border/40">
                        <TabsTrigger value="resource" className="flex-1 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            {type === 'reading' ? <BookOpen className="w-4 h-4 mr-2" /> :
                                type === 'listening' ? <Music className="w-4 h-4 mr-2" /> :
                                    <FileText className="w-4 h-4 mr-2" />}
                            <span className="text-[10px] font-black uppercase tracking-widest">Resource</span>
                        </TabsTrigger>
                        <TabsTrigger value="questions" className="flex-1 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {type === 'writing' ? 'Editor' : 'Questions'}
                            </span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Resource View */}
                <TabsContent value="resource" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col">
                    <ScrollArea className="flex-1 px-6">
                        <div className="pb-10 space-y-6">
                            {type === 'reading' && (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <h2 className="text-2xl font-black uppercase italic mb-4">{currentResource?.title}</h2>
                                    {currentResource?.image_url && (
                                        <img src={currentResource.image_url} className="w-full rounded-2xl border border-border/40 mb-6" alt="Diagram" />
                                    )}
                                    <div dangerouslySetInnerHTML={{ __html: currentResource?.content }} className="text-slate-600 dark:text-slate-400 leading-relaxed" />
                                </div>
                            )}

                            {type === 'listening' && (
                                <div className="flex flex-col items-center justify-center pt-20 text-center space-y-8">
                                    <div className="w-32 h-32 rounded-[2.5rem] bg-primary/10 flex items-center justify-center animate-pulse">
                                        <Music className="w-16 h-16 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase tracking-tight">{currentResource?.title}</h2>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mt-2">Part {currentResourceIndex + 1} of {resources.length}</p>
                                    </div>
                                    <div dangerouslySetInnerHTML={{ __html: currentResource?.content }} className="text-xs text-muted-foreground max-w-xs" />
                                </div>
                            )}

                            {type === 'writing' && (
                                <div className="space-y-6 mt-4">
                                    <div className="p-6 bg-secondary/10 border border-border/40 rounded-3xl">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">Tactical Prompt (Task {currentResourceIndex + 1})</h3>
                                        <p className="text-lg font-bold leading-relaxed">{currentResource?.prompt}</p>
                                    </div>
                                    {currentResource?.image_url && (
                                        <img src={currentResource.image_url} className="w-full rounded-3xl border border-border/40" alt="Diagram" />
                                    )}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                {/* Questions / Editor View */}
                <TabsContent value="questions" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col">
                    <ScrollArea className="flex-1 px-6">
                        <div className="pb-10 space-y-8">
                            {type !== 'writing' ? (
                                questions.map((q, i) => (
                                    <div key={q.id} className="p-6 bg-secondary/10 border border-border/40 rounded-3xl">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <span className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white font-black text-xs">{i + 1}</span>
                                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{q.question_type}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleBookmark(q)}
                                                    disabled={q.is_saved && q.is_reported_by_user && !q.is_corrected}
                                                    className={`rounded-xl px-2 h-8 ${q.is_saved ? 'bg-indigo-500/10 text-indigo-500' : 'text-muted-foreground'}`}
                                                >
                                                    {q.is_saved && q.is_reported_by_user && !q.is_corrected ? (
                                                        <Lock className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Bookmark className={`w-3.5 h-3.5 ${q.is_saved ? 'fill-current' : ''}`} />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleReport(q)}
                                                    className="rounded-xl px-2 h-8 text-muted-foreground hover:text-red-500"
                                                >
                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        {q.question_type === 'mcq' && <MultipleChoiceQuestion question={q} value={answers[q.id] || ''} onChange={(v) => handleAnswerChange(q.id, v)} />}
                                        {q.question_type === 'bool' && <TrueFalseQuestion question={q} value={answers[q.id] || ''} onChange={(v) => handleAnswerChange(q.id, v)} />}
                                        {(q.question_type === 'gap' || q.question_type === 'short_answer') && <GapFillQuestion question={q} value={answers[q.id] || ''} onChange={(v) => handleAnswerChange(q.id, v)} />}
                                        {q.question_type === 'multi_select' && <MultiSelectQuestion question={q} value={answers[q.id] || []} onChange={(v) => handleAnswerChange(q.id, v)} />}
                                    </div>
                                ))
                            ) : (
                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Main Response</span>
                                        <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded italic">
                                            {(answers[`writing_content_${currentResource?.id}`] || '').trim().split(/\s+/).filter(Boolean).length} Words
                                        </span>
                                    </div>
                                    <Textarea
                                        className="min-h-[400px] rounded-3xl border-2 border-border/40 p-6 text-lg leading-relaxed focus:border-primary transition-colors"
                                        placeholder="Deploy your essay intelligence here..."
                                        value={answers[`writing_content_${currentResource?.id}`] || ''}
                                        onChange={(e) => handleAnswerChange(`writing_content_${currentResource?.id}`, e.target.value)}
                                        readOnly={!!feedback}
                                    />
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>

            {/* Bottom Panel (Listening Audio or Global Navigation) */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/95 backdrop-blur-md border-t border-border/40 z-40">
                {type === 'listening' ? (
                    <div className="space-y-4">
                        <audio ref={audioRef} src={currentResource?.audio_url} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} />
                        <div className="flex items-center gap-4">
                            <Button size="icon" className="w-12 h-12 rounded-2xl bg-primary text-white" onClick={() => {
                                if (isPlaying) audioRef.current?.pause(); else audioRef.current?.play();
                                setIsPlaying(!isPlaying);
                            }}>
                                {isPlaying ? <Pause /> : <Play />}
                            </Button>
                            <div className="flex-1 space-y-1">
                                <Slider
                                    value={[currentTime]}
                                    max={duration || 100}
                                    onValueChange={([val]) => { if (audioRef.current) audioRef.current.currentTime = val; }}
                                    className="[&_[data-orientation=horizontal]]:h-1"
                                />
                                <div className="flex justify-between text-[8px] font-black font-mono opacity-40">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>
                        </div>
                        <Button className="w-full h-14 rounded-2xl bg-foreground text-background font-black uppercase tracking-widest" onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Finalize Mission'} <Save className="ml-2 w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {resources.length > 1 && (
                            <Button
                                variant="outline"
                                className="h-14 rounded-2xl border-2 font-black uppercase tracking-widest gap-2"
                                onClick={() => {
                                    const next = (currentResourceIndex + 1) % resources.length;
                                    setCurrentResourceIndex(next);
                                    setActiveTab("resource");
                                }}
                            >
                                {type === 'writing' ? `Switch to Task ${((currentResourceIndex + 1) % resources.length) + 1}` : `Next ${type === 'reading' ? 'Passage' : 'Part'}`} <ChevronRight className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            className={`h-14 rounded-2xl font-black uppercase tracking-widest gap-2 ${resources.length === 1 ? 'col-span-2' : ''} bg-foreground text-background`}
                            onClick={handleSubmit}
                            disabled={isSubmitting || !!feedback}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : (feedback ? 'Archived Session' : 'Finish Test')} <Save className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
