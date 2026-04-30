import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import {
    Timer,
    ShieldCheck,
    Globe,
    Monitor,
    Lock,
    ChevronRight,
    Info,
    CheckCircle2,
    Loader2,
    Sparkles,
    Zap,
    Users,
    ArrowLeft,
    LogIn,
    Share2,
    Copy,
    Check
} from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
// EXAMS import removed
import { motion, AnimatePresence } from 'framer-motion';
import { AuthModal } from '@/components/auth/AuthModal';
// import MockGuidelineModal from '@/components/MockGuidelineModal';

interface MockSession {
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    exam_type: string;
    max_attempts?: number;
    attempts_per_person?: number;
    duration?: number;
    config?: {
        reading_test_id?: string;
        listening_test_id?: string;
        writing_task1_id?: string;
        writing_task2_id?: string;
    };
}

export default function InternationalMockWaitingRoom() {
    const navigate = useNavigate();
    const { sessionId } = useParams();
    const { user, loading: authLoading } = useAuth();
    const { hasPremiumAccess } = usePlanAccess();
    const { activeExam, allExams } = useExam();
    const { toast } = useToast();
    const [session, setSession] = useState<MockSession | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isLocked, setIsLocked] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    useEffect(() => {
        fetchActiveSession();
    }, [sessionId]);

    useEffect(() => {
        if (user && session) {
            checkRegistration();
        }
    }, [user, session]);

    const checkRegistration = async () => {
        if (!user || !session) return;
        const { data } = await (supabase as any)
            .from('session_registrations')
            .select('id')
            .eq('user_id', user.id)
            .eq('session_id', session.id)
            .maybeSingle();

        setIsRegistered(!!data);
    };

    const handleRegister = async () => {
        if (!user) {
            navigate('/auth');
            return;
        }

        if (!hasPremiumAccess) {
            // Check if session allows more attempts for free users
            const { count } = await supabase
                .from('mock_exam_submissions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('session_id', session?.id);

            const limit = session?.max_attempts || session?.attempts_per_person || 1;
            if ((count || 0) >= limit) {
                toast({
                    title: "Limit Reached",
                    description: "You have exhausted your allowed attempts for this session. Upgrade for more.",
                });
                return;
            }
        }

        setIsRegistering(true);
        const { error } = await (supabase as any)
            .from('session_registrations')
            .insert({
                user_id: user.id,
                session_id: session?.id
            });

        if (error) {
            toast({
                title: "Registration Failed",
                description: error.message,
                variant: "destructive"
            });
        } else {
            setIsRegistered(true);
            toast({
                title: "Successfully Registered",
                description: "You are now eligible to join this session when it goes live."
            });
        }
        setIsRegistering(false);
    };

    const handleStartTest = async () => {
        if (!session) return;
        
        if (!user) {
            setIsAuthModalOpen(true);
            return;
        }

        if (!hasPremiumAccess) {
            const { count } = await supabase
                .from('mock_exam_submissions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('session_id', session.id);

            const limit = session.max_attempts || session.attempts_per_person || 1;
            if ((count || 0) >= limit) {
                toast({
                    title: "Limit Reached",
                    description: "You have reached your allowed attempts for this session. Upgrade for more.",
                });
                navigate('/mock-exams');
                return;
            }
        }

        setIsStarting(true);
        try {
            // 1. Mandatory Registration Check
            if (!isRegistered) {
                const { data: regData } = await (supabase as any)
                    .from('session_registrations')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('session_id', session.id)
                    .maybeSingle();

                if (!regData) {
                    toast({
                        title: "Access Denied",
                        description: "You must register for this session before starting.",
                        variant: "destructive"
                    });
                    setIsStarting(false);
                    return;
                }
            }

            // 2. Attempt Limit Check (Only for live sessions)
            const isPast = new Date(session.end_time) < new Date();
            if (!isPast) {
                const { data: tests } = await (supabase as any)
                    .from('tests')
                    .select('id, status')
                    .eq('user_id', user.id)
                    .eq('session_id', session.id);

                const inProgressTest = tests?.find((t: any) => t.status === 'in_progress');
                if (inProgressTest) {
                    // Check local blacklist: if the client previously terminated this test but RLS
                    // blocked the database update, we MUST NOT resume it.
                    let isBlacklisted = false;
                    try {
                        const blackList = JSON.parse(localStorage.getItem('terminated_tests') || '[]');
                        if (blackList.includes(inProgressTest.id)) {
                            isBlacklisted = true;
                        }
                    } catch(e) {}

                    // Validate this test actually has questions before resuming.
                    // A reload-terminated test may have been deleted and a ghost record left behind,
                    // or the question insert may have failed silently.
                    const { count: questionCount } = await (supabase as any)
                        .from('questions')
                        .select('id', { count: 'exact', head: true })
                        .eq('test_id', inProgressTest.id);

                    if (!isBlacklisted && (questionCount || 0) > 0) {
                        // Safe to resume — questions exist and test is not blacklisted
                        navigate(`/test/${inProgressTest.id}`);
                        setIsStarting(false);
                        return;
                    } else {
                        // Ghost test — mark it abandoned so the attempt counter doesn't count it,
                        // and set disqualified so it doesn't appear in History.
                        // then fall through to create a fresh new test
                        await (supabase as any)
                            .from('tests')
                            .update({ 
                                status: 'abandoned',
                                proctoring_status: 'disqualified' 
                            })
                            .eq('id', inProgressTest.id);
                        toast({
                            title: "Previous Session Recovered",
                            description: "Your previous session was incomplete. Starting a fresh test now.",
                        });
                    }
                }

                // Count completed (non-abandoned, non-in_progress) tests for limit check
                const completedCount = tests?.filter((t: any) =>
                    t.status !== 'in_progress' && t.status !== 'abandoned'
                ).length || 0;
                const limit = session.max_attempts || session.attempts_per_person || 1;

                if (completedCount >= limit) {
                    toast({
                        title: "Attempt Limit Reached",
                        description: `This session has an attempt limit of ${limit}.`,
                        variant: "default"
                    });
                    setIsStarting(false);
                    return;
                }
            }

            if (session.exam_type === 'ielts-academic') {
                navigate(`/ielts-flow/${session.id}`);
                setIsStarting(false);
                return;
            }

            // 3. Fetch pre-fed questions for this session
            const { data: sessionQuestions, error: qError } = await (supabase as any)
                .from('session_questions')
                .select('*')
                .eq('session_id', session.id)
                .order('order_index', { ascending: true });

            if (qError || !sessionQuestions || sessionQuestions.length === 0) {
                toast({
                    title: "Engine Error",
                    description: "No questions have been fed into this session yet. Please contact admin.",
                    variant: "destructive"
                });
                setIsStarting(false);
                return;
            }

            // 4. Create the test record linked to session_id
            const isMobile = window.innerWidth <= 768;
            const { data: test, error: testError } = await (supabase as any)
                .from('tests')
                .insert({
                    user_id: user.id,
                    session_id: session.id,
                    subject: session.title,
                    difficulty: 'mixed',
                    total_questions: sessionQuestions.length,
                    time_limit_minutes: session.duration || 100,
                    status: 'in_progress',
                    test_type: 'mock',
                    exam_type: session.exam_type,
                    is_proctored: !isMobile,
                    proctoring_status: 'passed',
                })
                .select()
                .single();

            if (testError) throw testError;

            // 4. Sort and Clone questions
            const examConfig = allExams[session.exam_type];
            const sectionOrder = examConfig?.sections.map(s => s.name) || [];

            const resolveSectionName = (name: string) => {
                if (!name || !examConfig) return name || 'General';
                const lowerName = name.toLowerCase().trim();

                // 1. Direct match with official sections
                const sectionMatch = examConfig.sections.find(s => s.name.toLowerCase() === lowerName);
                if (sectionMatch) return sectionMatch.name;

                // 2. Keyword-based heuristics (STRICT mapping to official names)
                // These must return the EXACT name as defined in examConfig.sections
                if (/math|number|algebra|function|exponen|logarithm|calculus|geometry|statistic/i.test(lowerName)) {
                    const mathSection = examConfig.sections.find(s => /math/i.test(s.name));
                    return mathSection ? mathSection.name : 'Mathematics';
                }
                if (/reasoning|text|data|problem|logic/i.test(lowerName)) {
                    const reasoningSection = examConfig.sections.find(s => /reasoning|logic/i.test(s.name));
                    return reasoningSection ? reasoningSection.name : 'Reasoning on texts and data';
                }
                if (/bio|cell|plant|ecology|animal|physiology|molecul|inheritance/i.test(lowerName)) {
                    const bioSection = examConfig.sections.find(s => /biology/i.test(s.name));
                    return bioSection ? bioSection.name : 'Biology';
                }
                if (/chem|element|reaction|periodic|nomenclature|stoichiometry|acid|base|redox|organic/i.test(lowerName)) {
                    const chemSection = examConfig.sections.find(s => /chemistry/i.test(s.name));
                    return chemSection ? chemSection.name : 'Chemistry';
                }
                if (/physic|measurement|kinematic|dynamic|fluid|thermo|electro|magnet/i.test(lowerName)) {
                    const physSection = examConfig.sections.find(s => /physic|magnet/i.test(s.name));
                    return physSection ? physSection.name : 'Physics';
                }

                // 3. Syllabus deep lookup
                for (const [sectionName, topics] of Object.entries(examConfig.syllabus)) {
                    const topicList = topics as any[];
                    if (topicList.some(t => t.name.toLowerCase() === lowerName)) {
                        const officialSec = examConfig.sections.find(s => s.name === sectionName);
                        return officialSec ? officialSec.name : sectionName;
                    }
                }

                return name;
            };

            // PRESERVE ADMIN ORDER: Sort strictly by order_index to honour the exact
            // sequence the admin set in the sessions panel.
            const sortedSessionQuestions = [...sessionQuestions].sort((a, b) =>
                (a.order_index || 0) - (b.order_index || 0)
            );

            const questionsToInsert = sortedSessionQuestions.map((sq: any, idx: number) => {
                const finalSectionName = resolveSectionName(sq.section_name);
                return {
                    test_id: test.id,
                    question_number: idx + 1,
                    question_text: sq.question_text,
                    options: sq.options,
                    correct_index: sq.correct_index,
                    explanation: sq.explanation,
                    difficulty: 'mixed',
                    topic: sq.topic,
                    subject: finalSectionName,
                    section_name: finalSectionName,
                    exam_type: session.exam_type,
                    master_question_id: sq.id,
                    source_table: 'session_questions',
                    media: sq.media,
                    diagram: sq.diagram,
                    passage: sq.passage
                };
            });

            // Batch insert in chunks of 50 to avoid Supabase payload size limits
            const CHUNK_SIZE = 50;
            let insertError: any = null;
            for (let i = 0; i < questionsToInsert.length; i += CHUNK_SIZE) {
                const chunk = questionsToInsert.slice(i, i + CHUNK_SIZE);
                const { error: chunkError } = await (supabase as any)
                    .from('questions')
                    .insert(chunk);
                if (chunkError) {
                    insertError = chunkError;
                    break;
                }
            }

            if (insertError) {
                // Rollback: delete questions and the test record to prevent ghost/zombie tests
                await (supabase as any).from('questions').delete().eq('test_id', test.id);
                const { error: delError } = await (supabase as any).from('tests').delete().eq('id', test.id);

                // If RLS prevents deletion, soft-delete it so it's hidden from History and Attempts
                if (delError) {
                    await (supabase as any).from('tests').update({ 
                        status: 'abandoned',
                        proctoring_status: 'disqualified'
                    }).eq('id', test.id);
                }

                toast({
                    title: "Launch Failed",
                    description: `Failed to load question set: ${insertError.message}. Please try again.`,
                    variant: "destructive"
                });
                setIsStarting(false);
                return;
            }

            toast({
                title: "Launch Sequence Complete",
                description: "Good luck with your examination."
            });

            // RESPONSIVE ROUTING: Use sectioned runner for Mobile
            if (isMobile) {
                navigate(`/mobile/sectioned-test/${test.id}`);
            } else {
                navigate(`/test/${test.id}`);
            }
        } catch (error: any) {
            console.error("Start Test Error:", error);
            toast({
                title: "Launch Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsStarting(false);
        }
    };

    const fetchActiveSession = async () => {
        setIsLoading(true);
        const { data } = await (supabase as any)
            .from('mock_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (data) {
            setSession(data);
            calculateTimeLeft(data.start_time);
        } else {
            toast({
                title: "Session Not Found",
                description: "The requested mock session could not be located.",
                variant: "destructive"
            });
        }
        setIsLoading(false);
    };

    const calculateTimeLeft = (startTime: string) => {
        const start = new Date(startTime);
        const now = new Date();
        const diff = differenceInSeconds(start, now);

        if (diff <= 0) {
            setTimeLeft(0);
            setIsLocked(false);
        } else {
            setTimeLeft(diff);
            setIsLocked(true);
        }
    };

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setIsLocked(false);
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        const pad = (n: number) => n.toString().padStart(2, '0');

        if (d > 0) return `${d}D ${pad(h)}H ${pad(m)}M ${pad(s)}S`;
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!session) {
        return (
            <Layout>
                <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mb-6">
                        <Info className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-black mb-4 tracking-tighter">Session Missing</h1>
                    <p className="text-muted-foreground text-lg mb-8 max-w-md">The simulation room you're looking for doesn't exist or has been archived.</p>
                    <Button onClick={() => navigate('/dashboard')} className="rounded-full px-8 py-6 h-auto font-black uppercase text-xs tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20">Return Home</Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showHeader={!!user} showFooter={!!user}>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors relative overflow-x-hidden flex flex-col items-center py-4 md:py-8 px-4 selection:bg-indigo-600 selection:text-white">
                {/* Visual Background Elements - More spatial and subtle */}
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-indigo-600/5 dark:bg-indigo-600/10 blur-[160px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/5 dark:bg-purple-600/10 blur-[140px] rounded-full pointer-events-none" />

                {/* Content Container */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full max-w-7xl relative z-10"
                >
                    {/* Minimal Branding */}
                    <div className="flex flex-col items-center mb-4 space-y-2">
                        <Link to="/">
                            <img src="/logo.webp" alt="ItaloStudy" className="h-8 w-auto object-contain opacity-90" />
                        </Link>
                        {!user && (
                            <div className="flex items-center gap-2 py-1 px-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-500/20 rounded-full">
                                <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Simulation Engine v4</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                        {/* LEFT COLUMN: ACTION CENTER */}
                        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-none relative overflow-hidden group flex flex-col justify-center min-h-[500px] lg:min-h-full">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

                            <div className="flex flex-col items-center text-center">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/20 rounded-full mb-6"
                                >
                                    <Sparkles className="w-3 h-3 text-indigo-500" />
                                    <span className="text-[7px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">{session.exam_type.replace('-prep', '').toUpperCase()} PROTOCOL</span>
                                </motion.div>

                                <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 mb-4 tracking-tighter leading-tight">
                                    {session.title}
                                </h1>

                                <p className="text-slate-500 dark:text-slate-400 text-[13px] font-medium max-w-sm mx-auto mb-8 leading-relaxed">
                                    {session.description}
                                </p>

                                {/* Timer Block */}
                                <div className="relative mb-10">
                                    <span className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.4em] block mb-3">T-Minus to Launch</span>
                                    <div className="text-5xl md:text-6xl font-black text-indigo-600 tracking-tighter font-mono tabular-nums leading-none select-none">
                                        {timeLeft > 0 ? formatTime(timeLeft) : '00:00:00'}
                                    </div>

                                    {!isLocked && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-6 inline-flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em]"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]" />
                                            Authorization Granted
                                        </motion.div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                                    {!user ? (
                                        <Button
                                            onClick={() => setIsAuthModalOpen(true)}
                                            className="w-full h-16 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            <LogIn className="w-3.5 h-3.5 mr-2.5" />
                                            Sign in to Access
                                        </Button>
                                    ) : !isRegistered ? (
                                        <Button
                                            onClick={handleRegister}
                                            disabled={isRegistering}
                                            className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-indigo-600/10 border-b-[4px] border-indigo-800 active:border-b-0 active:translate-y-[1px] transition-all disabled:opacity-50"
                                        >
                                            {isRegistering ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Zap className="w-4 h-4 mr-2.5 fill-white" />
                                                    Register For Protocol
                                                </>
                                            )}
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleStartTest}
                                            disabled={isLocked || isStarting}
                                            className={cn(
                                                "w-full h-16 rounded-[20rem] font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3",
                                                isLocked
                                                    ? "bg-slate-50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 border border-slate-300/50 dark:border-slate-700 cursor-not-allowed"
                                                    : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
                                            )}
                                        >
                                            {isStarting ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : isLocked ? (
                                                <>
                                                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                                                    Locked Until Start
                                                </>
                                            ) : (
                                                <>
                                                    <span>Enter Hall</span>
                                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                                                </>
                                            )}
                                        </Button>
                                    )}
                                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.1em] leading-relaxed max-w-xs">
                                        {isLocked
                                            ? "Module sequence is active. Entry authorization at T-0."
                                            : "Personnel authorization complete. Environment synchronized."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: INTELLIGENCE CENTER */}
                        <div className="space-y-6">
                            {/* Syllabus Component */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm dark:shadow-none">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                                        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase italic">Live Syllabus</h3>
                                </div>
                                <div className="space-y-3">
                                    {(allExams[session.exam_type] || activeExam)?.sections.map((section, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 group hover:bg-white dark:hover:bg-slate-700 hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <span className="text-lg">{section.icon}</span>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{section.name}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{section.questionCount} Questions</span>
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-black text-indigo-600/40 dark:text-indigo-400/60">{section.durationMinutes}m</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Scoring & Protocol Block */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Scoring Card */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm dark:shadow-none">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <h4 className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Marking System</h4>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Correct</span>
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">+{allExams[session.exam_type]?.scoring.correct}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Incorrect</span>
                                            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400">{allExams[session.exam_type]?.scoring.incorrect}</span>
                                        </div>
                                        <div className="flex justify-between py-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Skipped</span>
                                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">{allExams[session.exam_type]?.scoring.skipped}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Security Card */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm dark:shadow-none">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <h4 className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Proctored</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Monitor className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase">Screen Lock Active</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase">Official Standard</span>
                                        </div>
                                        <div className="inline-block px-3 py-1 bg-slate-900 dark:bg-indigo-600 text-white text-[8px] font-black rounded-full uppercase tracking-widest mt-1">
                                            Secure v4.0
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technical Footer & Shareable Link */}
                    <div className="mt-6 md:mt-8 w-full flex flex-col gap-6">
                        {/* Shareable Link Section */}
                        <div className="w-full max-w-md mx-auto bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-3xl p-6 flex flex-col items-center gap-4 group hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all">
                            <div className="flex items-center gap-2 mb-1">
                                <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Share Test</span>
                            </div>
                            <div className="w-full flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-2 pl-4 shadow-sm dark:shadow-none">
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate flex-1 tracking-tight">
                                    {window.location.href}
                                </span>
                                <Button
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        toast({
                                            title: "Link Copied",
                                            description: "Share this link with your peers!",
                                        });
                                    }}
                                    className="h-10 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-black uppercase text-[9px] tracking-widest flex items-center gap-2"
                                >
                                    <Copy className="w-3 h-3 text-indigo-400" />
                                    Copy
                                </Button>
                            </div>
                        </div>

                        <div className="w-full flex justify-between items-center px-6 border-t border-slate-200 dark:border-slate-800 pt-4 opacity-60 hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-4">
                                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                                <div className="text-left">
                                    <p className="text-[9px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Secure Protocol</p>
                                    <p className="text-[7px] font-bold text-slate-400 tracking-tight">ENCRYPTED CONNECTION v4</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em] block">ID: #SYS-IM-{session.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
                <AuthModal 
                    isOpen={isAuthModalOpen} 
                    onClose={() => setIsAuthModalOpen(false)} 
                    onSuccess={() => {
                        setIsAuthModalOpen(false);
                        // Refresh will happen via auth context update
                    }}
                />
            </div>
        </Layout>
    );
}
