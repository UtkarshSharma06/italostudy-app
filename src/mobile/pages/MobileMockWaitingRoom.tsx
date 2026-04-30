import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    Timer, ChevronLeft, ChevronRight, CheckCircle2,
    Loader2, Users, Trophy, BookOpen, Clock, AlertCircle,
    ShieldCheck, Globe, Monitor, Lock, Share2, Copy
} from 'lucide-react';
import { differenceInSeconds } from 'date-fns';
import { useExam } from '@/context/ExamContext';
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
}

export default function MobileMockWaitingRoom() {
    const { allExams } = useExam();
    const navigate = useNavigate();
    const { sessionId } = useParams();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [session, setSession] = useState<MockSession | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isLocked, setIsLocked] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    useEffect(() => {
        if (sessionId) fetchSession();
    }, [sessionId]);

    const fetchSession = async () => {
        setIsLoading(true);
        const { data } = await (supabase as any)
            .from('mock_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (data) {
            setSession(data);
            const start = new Date(data.start_time);
            const now = new Date();
            const diff = differenceInSeconds(start, now);
            setTimeLeft(Math.max(0, diff));
            setIsLocked(diff > 0);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
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

    const handleStart = async () => {
        if (!session) return;

        if (!user) {
            setIsAuthModalOpen(true);
            return;
        }

        // Determine if it's a sectioned exam early
        const examConfig = allExams[session.exam_type];
        const isSectionedExam = !!(examConfig && examConfig.sections && examConfig.sections.length > 1);

        setIsStarting(true);
        try {
            // Check if attempt exists
            const { data: existing } = await (supabase as any)
                .from('tests')
                .select('id, status')
                .eq('user_id', user.id)
                .eq('session_id', session.id)
                .maybeSingle();

            if (existing) {
                if (existing.status === 'in_progress') {
                    // Check local blacklist: if the client previously terminated this test but RLS
                    // blocked the database update, we MUST NOT resume it.
                    let isBlacklisted = false;
                    try {
                        const blackList = JSON.parse(localStorage.getItem('terminated_tests') || '[]');
                        if (blackList.includes(existing.id)) {
                            isBlacklisted = true;
                        }
                    } catch(e) {}

                    // Ghost Test Prevention: verify the test actually has questions
                    const { count: questionCount } = await (supabase as any)
                        .from('questions')
                        .select('id', { count: 'exact', head: true })
                        .eq('test_id', existing.id);

                    if (!isBlacklisted && (questionCount || 0) > 0) {
                        // Safe to resume — questions exist and not blacklisted
                        if (isSectionedExam) {
                            navigate(`/mobile/sectioned-test/${existing.id}`);
                        } else {
                            navigate(`/mobile/test/${existing.id}`);
                        }
                        return;
                    } else {
                        // Ghost test or blacklisted test — mark as abandoned
                        await (supabase as any)
                            .from('tests')
                            .update({ 
                                status: 'abandoned',
                                proctoring_status: 'disqualified' 
                            })
                            .eq('id', existing.id);
                        
                        toast({
                            title: "Previous Session Recovered",
                            description: "Your previous session was incomplete. Starting a fresh test now.",
                        });
                        // Fall through to create fresh test below...
                    }
                }
            }

            // Check total completed attempts (Only for live sessions)
            const isPast = new Date(session.end_time) < new Date();
            if (!isPast) {
                const { count: completedCount } = await (supabase as any)
                    .from('tests')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('session_id', session.id)
                    .neq('status', 'in_progress');

                const limit = session.max_attempts || session.attempts_per_person || 1;
                if ((completedCount || 0) >= limit) {
                    toast({
                        title: "Attempt Limit Reached",
                        description: `This session has an attempt limit of ${limit}.`,
                        variant: "default"
                    });
                    return;
                }
            }

            // Fetch questions
            const { data: sQs } = await (supabase as any)
                .from('session_questions')
                .select('*')
                .eq('session_id', session.id)
                .order('order_index', { ascending: true });

            if (!sQs || sQs.length === 0) {
                toast({ title: "No Questions Found", description: "Please contact support.", variant: "destructive" });
                return;
            }

            // Sort questions by section for proper subject grouping (Math, Reasoning, Bio, Chem, Phy)
            const sortedQuestions = [...sQs].sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

            // Create test
            const { data: test, error } = await (supabase as any)
                .from('tests')
                .insert({
                    user_id: user.id,
                    session_id: session.id,
                    subject: session.title,
                    difficulty: 'mixed',
                    total_questions: sortedQuestions.length,
                    time_limit_minutes: session.duration || 100,
                    status: 'in_progress',
                    test_type: 'mock',
                    exam_type: session.exam_type,
                })
                .select().single();

            if (error) throw error;

            // Clone questions with section support
            const resolveSectionName = (name: string) => {
                if (!name || !examConfig) return name || 'General';
                const lowerName = name.toLowerCase().trim();

                // 1. Direct match with official sections
                const sectionMatch = examConfig.sections.find(s => s.name.toLowerCase() === lowerName);
                if (sectionMatch) return sectionMatch.name;

                // 2. Keyword-based heuristics (STRICT mapping to official names)
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

            // STRICT SORTING: Group by Official Section Index first, then by order_index
            const getSectionIndex = (name: string) => {
                const resolved = resolveSectionName(name);
                return examConfig?.sections.findIndex(s => s.name === resolved) ?? 999;
            };

            const sortedSessionQuestions = [...sQs].sort((a: any, b: any) => {
                const secA = getSectionIndex(a.section_name);
                const secB = getSectionIndex(b.section_name);
                if (secA !== secB) return secA - secB;
                return (a.order_index || 0) - (b.order_index || 0);
            });

            const questions = sortedSessionQuestions.map((sq: any, i: number) => {
                const finalSectionName = resolveSectionName(sq.section_name);
                let sectionNum = 1;
                if (examConfig && isSectionedExam) {
                    const sectionIdx = examConfig.sections.findIndex(s => s.name === finalSectionName);
                    if (sectionIdx !== -1) sectionNum = sectionIdx + 1;
                }

                return {
                    test_id: test.id,
                    question_number: i + 1,
                    question_text: sq.question_text,
                    options: sq.options,
                    correct_index: sq.correct_index,
                    explanation: sq.explanation,
                    difficulty: 'mixed',
                    topic: sq.topic,
                    subject: finalSectionName,
                    exam_type: session.exam_type,
                    section_number: sectionNum,
                    section_name: finalSectionName,
                    master_question_id: sq.id,
                    source_table: 'session_questions',
                    media: sq.media,
                    diagram: sq.diagram,
                    passage: sq.passage
                };
            });

            await (supabase as any).from('questions').insert(questions);

            if (isSectionedExam) {
                navigate(`/mobile/sectioned-test/${test.id}`);
            } else {
                navigate(`/mobile/test/${test.id}`);
            }
        } catch (e: any) {
            toast({ title: "Error starting exam", description: e.message, variant: "destructive" });
        } finally {
            setIsStarting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (isLoading) return (
        <div className="h-screen flex items-center justify-center bg-background">
            <Loader2 className="w-10 h-10 text-primary animate-spin opacity-20" />
        </div>
    );

    if (!session) return (
        <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-background">
            <AlertCircle className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
            <h2 className="text-xl font-black uppercase">Session Not Found</h2>
            <Button onClick={() => navigate(-1)} className="mt-6 rounded-full">Go Back</Button>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-background pb-8">
            <header className="p-6 pt-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {user && (
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground"><ChevronLeft /></button>
                    )}
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo.webp" alt="Logo" className="h-8 w-auto object-contain dark:brightness-0 dark:invert" />
                    </Link>
                </div>
                {!user && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAuthModalOpen(true)}
                        className="text-[10px] font-black uppercase tracking-widest text-primary"
                    >
                        Sign In
                    </Button>
                )}
            </header>

            <main className="flex-1 px-6 pt-4 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mb-8">
                    <Clock className="w-8 h-8 text-primary" />
                </div>

                <div className="space-y-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Starts In</p>
                    <h2 className="text-6xl font-black tracking-tighter tabular-nums text-foreground">
                        {formatTime(timeLeft)}
                    </h2>
                </div>

                <div className="w-full bg-secondary/10 border border-border/40 rounded-[2.5rem] p-8 space-y-6 mb-6">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{session.title}</h3>
                        <p className="text-xs font-bold text-muted-foreground px-4">{session.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-background rounded-2xl border border-border/40">
                            <Users className="w-4 h-4 text-primary mx-auto mb-2" />
                            <span className="text-[8px] font-black uppercase text-muted-foreground block">Entry</span>
                            <span className="text-[10px] font-black uppercase">Open</span>
                        </div>
                        <div className="p-4 bg-background rounded-2xl border border-border/40">
                            <Trophy className="w-4 h-4 text-emerald-500 mx-auto mb-2" />
                            <span className="text-[8px] font-black uppercase text-muted-foreground block">Status</span>
                            <span className="text-[10px] font-black uppercase">{isLocked ? 'Locked' : 'Active'}</span>
                        </div>
                    </div>

                    {session.exam_type && allExams[session.exam_type]?.sections && (
                        <div className="space-y-4 pt-4 border-t border-border/20">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Exam Structure</h4>
                                <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                    {allExams[session.exam_type].sections.length} Sections
                                </span>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    {allExams[session.exam_type].sections.map((s, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl border border-border/10">
                                            <div className="flex items-center gap-3">
                                                <span className="w-5 h-5 bg-background border border-border/40 rounded-full flex items-center justify-center text-[8px] font-black">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-tight">{s.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[8px] font-black text-muted-foreground uppercase">{s.questionCount} Qs</span>
                                                <span className="text-[8px] font-black text-primary uppercase">{s.durationMinutes} Min</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Marking System & Protocol */}
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    {/* Scoring */}
                                    <div className="bg-background rounded-2xl border border-border/40 p-4 text-left">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                            <span className="text-[8px] font-black uppercase text-muted-foreground">Marking</span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-[8px] font-bold text-slate-400">CORRECT</span>
                                                <span className="text-[8px] font-black text-emerald-600">+{allExams[session.exam_type]?.scoring.correct}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[8px] font-bold text-slate-400">WRONG</span>
                                                <span className="text-[8px] font-black text-rose-600">{allExams[session.exam_type]?.scoring.incorrect}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Security */}
                                    <div className="bg-background rounded-2xl border border-border/40 p-4 text-left">
                                        <div className="flex items-center gap-2 mb-3">
                                            <ShieldCheck className="w-3 h-3 text-amber-500" />
                                            <span className="text-[8px] font-black uppercase text-muted-foreground">Protocol</span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <Monitor className="w-2.5 h-2.5 text-slate-400" />
                                                <span className="text-[8px] font-black uppercase">Screen Lock</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Globe className="w-2.5 h-2.5 text-slate-400" />
                                                <span className="text-[8px] font-black uppercase">Official</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full px-4 space-y-4">
                    {user ? (
                        <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Your seat is reserved</p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                            <AlertCircle className="w-4 h-4 text-primary" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-primary">Sign in to start the exam</p>
                        </div>
                    )}

                    <Button
                        onClick={handleStart}
                        disabled={!user ? false : (isLocked || isStarting)}
                        className="w-full h-20 rounded-[2.5rem] text-sm font-black uppercase tracking-[0.3em] shadow-2xl active:scale-[0.98] transition-all"
                    >
                        {isStarting ? (
                            <Loader2 className="animate-spin" />
                        ) : !user ? (
                            'Sign In to Enter Hall'
                        ) : isLocked ? (
                            'Waiting for Start'
                        ) : (
                            'Enter Exam'
                        )}
                        {!isStarting && (user ? !isLocked : true) && <ChevronRight className="ml-2 w-5 h-5" />}
                    </Button>
                </div>
            </main>

            <footer className="p-8 py-4 text-center space-y-4">
                {/* Shareable Link Section - Mobile */}
                <div className="w-full bg-secondary/10 border border-border/20 rounded-3xl p-5 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Share2 className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-black text-foreground uppercase tracking-widest">Share Test</span>
                    </div>
                    <div className="w-full flex items-center gap-2 bg-background border border-border/10 rounded-xl p-1.5 pl-3">
                        <span className="text-[9px] font-medium text-muted-foreground truncate flex-1 tracking-tight">
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
                            size="sm"
                            className="h-8 px-3 rounded-lg bg-primary text-white font-black uppercase text-[8px] tracking-widest flex items-center gap-1.5"
                        >
                            <Copy className="w-2.5 h-2.5" />
                            Copy
                        </Button>
                    </div>
                </div>

                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-30 leading-relaxed">
                    Please do not close this window. <br />The exam will start automatically once the timer ends.
                </p>
            </footer>

            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                onSuccess={() => {
                    setIsAuthModalOpen(false);
                }}
            />
        </div>
    );
}
