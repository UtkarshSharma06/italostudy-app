import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    Brain, ArrowLeft, PlayCircle, BookOpen,
    Clock, Target, Zap, ChevronLeft, Check, Loader2,
    Shield, Server, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExam } from '@/context/ExamContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { cn } from '@/lib/utils';
// EXAMS import removed
import { UpgradeModal } from '@/components/UpgradeModal';
import { useActiveTest } from '@/hooks/useActiveTest';
import { ToastAction } from '@/components/ui/toast';
import { readDashboardCache, invalidateDashboardCache } from '@/hooks/useDashboardPrefetch';

export default function MobileStartTest() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { activeExam, allExams } = useExam();
    const { hasReachedSubjectLimit, getRemainingQuestions, isExplorer } = usePlanAccess();
    const { activeTest } = useActiveTest();
    const [searchParams] = useSearchParams();

    // Mission Params
    const [subject, setSubject] = useState(searchParams.get('subject') || activeExam.sections[0].name);
    const [topic, setTopic] = useState('all');
    const [difficulty, setDifficulty] = useState('medium');
    const [questionCount, setQuestionCount] = useState(Number(searchParams.get('count')) || 10);
    const [timeLimit, setTimeLimit] = useState(30);

    // State
    const [availableTopics, setAvailableTopics] = useState<{ name: string; count: number }[]>([]);
    const [isLoadingTopics, setIsLoadingTopics] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    // Check for practice mode params
    const sessionId = searchParams.get('session_id');
    const practiceMode = searchParams.get('practice_mode') === 'true';
    const isPracticeMock = sessionId && practiceMode;

    // Auto-start practice mock if params present
    useEffect(() => {
        if (activeTest) {
            const examConfig = allExams[activeTest.exam_type];
            const isSectioned = !!(examConfig && examConfig.sections && examConfig.sections.length > 1);

            toast({
                title: "Active Mission Found",
                description: `Finish ${activeTest.subject} before starting new intel collection.`,
                variant: "destructive",
                action: (
                    <ToastAction
                        altText="Resume Test"
                        onClick={() => navigate(isSectioned ? `/mobile/sectioned-test/${activeTest.id}` : `/mobile/test/${activeTest.id}`)}
                    >
                        Resume
                    </ToastAction>
                ),
            });
            navigate('/mobile/dashboard');
            return;
        }

        if (isPracticeMock && user) {
            handlePracticeMockStart();
        }
    }, [isPracticeMock, user, activeTest]);

    // Sync topics when subject changes
    useEffect(() => {
        const fetchTopics = async () => {
            if (!activeExam || !subject) return;
            if (activeExam?.id === 'ielts-academic') {
                return;
            }
            setIsLoadingTopics(true);
            try {
                const { data } = await (supabase as any)
                    .from('practice_questions')
                    .select('topic')
                    .eq('exam_type', activeExam.id)
                    .eq('subject', subject);

                if (data) {
                    const counts: Record<string, number> = {};
                    data.forEach((q: any) => { if (q.topic) counts[q.topic] = (counts[q.topic] || 0) + 1; });
                    const sorted = Object.entries(counts)
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count);
                    setAvailableTopics(sorted);
                    if (topic !== 'all' && !counts[topic]) setTopic('all');
                }
            } catch (err) {
                console.error('Error fetching topics:', err);
            } finally {
                setIsLoadingTopics(false);
            }
        };
        fetchTopics();
    }, [subject, activeExam?.id]);

    const handlePracticeMockStart = async () => {
        if (!user || !sessionId) return;
        setIsGenerating(true);
        try {
            // Fetch session details
            const { data: session, error: sessionError } = await (supabase as any)
                .from('mock_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (sessionError || !session) {
                throw new Error("Session not found");
            }

            // Fetch session questions
            const { data: sQs } = await (supabase as any)
                .from('session_questions')
                .select('*')
                .eq('session_id', sessionId)
                .order('order_index', { ascending: true });

            if (!sQs || sQs.length === 0) {
                throw new Error("No questions found for this mock exam");
            }

            // Create practice test (NOT ranked)
            const { data: test, error: testError } = await (supabase as any)
                .from('tests')
                .insert({
                    user_id: user.id,
                    session_id: null, // Don't link to session for practice mode
                    subject: session.title,
                    difficulty: 'mixed',
                    total_questions: sQs.length,
                    time_limit_minutes: session.duration || 100,
                    status: 'in_progress',
                    test_type: 'mock',
                    exam_type: session.exam_type,
                    is_ranked: false, // CRITICAL: Not ranked for practice mode
                    is_mock: true,
                    is_proctored: false // Mobile is always standard
                })
                .select()
                .single();

            if (testError) throw testError;

            // Clone questions with section support
            const examConfig = allExams[session.exam_type];
            const isSectionedExam = !!(examConfig && examConfig.sections && examConfig.sections.length > 1);

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
                    difficulty: sq.difficulty || 'mixed',
                    topic: sq.topic,
                    subject: finalSectionName,
                    exam_type: session.exam_type,
                    section_number: sectionNum,
                    section_name: finalSectionName,
                    master_question_id: sq.master_question_id || sq.id,
                    source_table: sq.source_table || 'session_questions',
                    passage: sq.passage,
                    media: sq.media,
                    diagram: sq.diagram
                };
            });

            await (supabase as any).from('questions').insert(questions);

            toast({ title: "Practice Mock Started", description: "This attempt won't affect rankings." });

            if (isSectionedExam) {
                navigate(`/mobile/sectioned-test/${test.id}`);
            } else {
                navigate(`/mobile/test/${test.id}`);
            }

            // Invalidate dashboard cache
            invalidateDashboardCache();
        } catch (e: any) {
            toast({ title: "Failed to Start", description: e.message, variant: "destructive" });
            navigate('/mobile/mock-exams'); // Redirect back on error
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStart = async () => {
        if (!user) {
            toast({ title: "Authentication Required", variant: "destructive" });
            navigate('/mobile/auth');
            return;
        }

        if (hasReachedSubjectLimit(subject)) {
            setIsUpgradeModalOpen(true);
            return;
        }

        setIsGenerating(true);
        try {
            // 1. Fetch Solved IDs
            const { data: solvedData } = await (supabase as any)
                .from('user_practice_responses')
                .select('question_id')
                .eq('user_id', user.id);
            const solvedIds = solvedData?.map((r: any) => r.question_id) || [];

            // 2. Build Query
            let query = (supabase as any)
                .from('practice_questions')
                .select('*');
            const examIds = [activeExam?.id || ''];
            if (activeExam?.id === 'cent-s-prep') examIds.push('cent-s');
            if (activeExam?.id === 'imat-prep') examIds.push('imat');
            query = query.in('exam_type', examIds)
                .eq('subject', subject);

            if (difficulty !== 'mixed' && difficulty !== 'all') query = query.eq('difficulty', difficulty);
            if (topic && topic !== 'all') query = query.eq('topic', topic);
            let qPool = [];
            if (solvedIds.length > 0) {
                const DB_LIMIT = 500;
                const dbSafeIds = solvedIds.slice(0, DB_LIMIT);
                const clientFilterIds = new Set(solvedIds.slice(DB_LIMIT));

                query = query.not('id', 'in', `(${dbSafeIds.join(',')})`);
                const { data, error: qError } = await query;
                if (qError) throw qError;
                qPool = (data || []).filter((q: any) => !clientFilterIds.has(q.id));
            } else {
                const { data, error: qError } = await query;
                if (qError) throw qError;
                qPool = data || [];
            }

            if (!qPool || qPool.length < questionCount) {
                throw new Error("Insufficient neural fragments found in this sector.");
            }

            // 3. Select & Shuffle with Media Balancing
            const mediaPool = qPool.filter((q: any) => q.media || q.diagram);
            const normalPool = qPool.filter((q: any) => !q.media && !q.diagram);

            const targetMedia = Math.floor(questionCount / 2);
            const targetNormal = questionCount - targetMedia;

            const shuffledMedia = [...mediaPool].sort(() => Math.random() - 0.5);
            const shuffledNormal = [...normalPool].sort(() => Math.random() - 0.5);

            const selectedMedia = shuffledMedia.slice(0, targetMedia);
            const selectedNormal = shuffledNormal.slice(0, targetNormal);

            let selected = [...selectedMedia, ...selectedNormal];

            // Fallback: If one pool didn't have enough, fill from the other
            if (selected.length < questionCount) {
                const remainingMedia = shuffledMedia.slice(targetMedia);
                const remainingNormal = shuffledNormal.slice(targetNormal);
                const deficit = questionCount - selected.length;
                const combinedRemaining = [...remainingMedia, ...remainingNormal].sort(() => Math.random() - 0.5);
                selected = [...selected, ...combinedRemaining.slice(0, deficit)];
            }

            // Final shuffle for position variety
            selected = selected.sort(() => Math.random() - 0.5);

            // 4. Create Test Record
            const { data: test, error: tError } = await supabase
                .from('tests')
                .insert({
                    user_id: user.id,
                    subject: subject,
                    topic: topic !== 'all' ? topic : null,
                    difficulty: difficulty,
                    total_questions: selected.length,
                    time_limit_minutes: timeLimit,
                    status: 'in_progress',
                    exam_type: activeExam.id
                })
                .select()
                .single();

            if (tError) throw tError;

            // 5. Insert Mission Questions
            const questions = selected.map((q: any, i: number) => ({
                test_id: test.id,
                question_number: i + 1,
                question_text: q.question_text,
                options: q.options,
                correct_index: q.correct_index,
                explanation: q.explanation,
                difficulty: q.difficulty || difficulty || 'medium',
                topic: q.topic || subject,
                practice_question_id: q.id,
                master_question_id: q.id,
                source_table: 'practice_questions',
                passage: q.passage,
                media: q.media
            }));

            const { error: qsError } = await supabase.from('questions').insert(questions);
            if (qsError) {
                console.error('Supabase Questions Insert Error Details:', qsError);
                throw qsError;
            }

            toast({ title: "Test Started", description: "Curriculum loaded." });
            navigate(`/mobile/test/${test.id}`);

            // Invalidate dashboard cache
            invalidateDashboardCache();
        } catch (e: any) {
            toast({ title: "Generation Offline", description: e.message, variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    if (isGenerating) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8 overflow-hidden">
            <div className="w-full max-w-[280px] space-y-12">
                {/* Header */}
                <div className="text-center space-y-3">
                    <motion.h2 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-[10px] font-black uppercase tracking-[0.5em] text-foreground/80"
                    >
                        Examination Protocol
                    </motion.h2>
                    <div className="flex items-center justify-center gap-2">
                        <div className="h-px flex-1 bg-border/40" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap px-2">
                            Initialising Environment
                        </span>
                        <div className="h-px flex-1 bg-border/40" />
                    </div>
                </div>

                {/* Main Progress */}
                <div className="space-y-8">
                    <div className="relative h-[2px] w-full bg-muted overflow-hidden rounded-full">
                        <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 4, ease: "linear" }}
                            className="absolute h-full bg-primary"
                        />
                    </div>

                    <div className="space-y-5">
                        {[
                            { label: 'Session Integrity', delay: 0.5, icon: Shield },
                            { label: 'Cloud Synchronisation', delay: 1.5, icon: Server },
                            { label: 'Security Handshake', delay: 2.5, icon: Lock }
                        ].map((step, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: step.delay }}
                                className="flex items-center justify-between"
                            >
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                    {step.label}
                                </span>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: step.delay + 0.3 }}
                                >
                                    <step.icon className="w-3 h-3 text-primary" />
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Status */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 3.5 }}
                    className="flex justify-center"
                >
                    <div className="px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Secure Protocol Verified</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col min-h-full bg-background pb-32 animate-in fade-in slide-in-from-bottom-5 duration-500 overflow-y-auto">
            <header className="p-8 pt-10 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground"><ChevronLeft /></button>
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight">Practice <span className="text-primary">Setup</span></h1>
                    <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">Configure Your Session</p>
                </div>
            </header>

            <div className="px-6 space-y-10">
                {/* Sector Selection */}
                <section>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Select Subject</h3>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        {activeExam.sections.map((s) => (
                            <button
                                key={s.name}
                                onClick={() => setSubject(s.name)}
                                className={`shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-3xl border-2 transition-all active:scale-95 relative ${subject === s.name ? 'border-primary bg-primary/5 shadow-lg' : 'border-border/50 bg-secondary/10'}`}
                            >
                                <span className="text-2xl mb-1">{s.icon}</span>
                                <span className="text-[8px] font-black uppercase text-center px-1 leading-tight">{s.name}</span>
                                {subject === s.name && <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center"><Check size={8} className="text-white" /></div>}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Topic Selection */}
                <section>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Select Topic</h3>
                    <div className="flex gap-2 flex-wrap min-h-[40px]">
                        <button
                            onClick={() => setTopic('all')}
                            className={cn(
                                "px-4 py-2 rounded-xl border-2 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95",
                                topic === 'all' ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-secondary/10 text-muted-foreground opacity-60"
                            )}
                        >
                            All Topics
                        </button>
                        {isLoadingTopics ? (
                            <div className="flex items-center ml-2"><Loader2 className="w-4 h-4 animate-spin opacity-20" /></div>
                        ) : availableTopics.map((t) => (
                            <button
                                key={t.name}
                                onClick={() => setTopic(t.name)}
                                className={cn(
                                    "px-4 py-2 rounded-xl border-2 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2",
                                    topic === t.name ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-secondary/10 text-muted-foreground opacity-60"
                                )}
                            >
                                {t.name}
                                <span className="text-[7px] opacity-40">{t.count}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Question Count Grid */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Number of Questions</h3>
                        {isExplorer && <span className="text-[9px] font-black text-rose-500 uppercase">Limit: {getRemainingQuestions(subject)} Qs</span>}
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {[5, 10, 15, 20].map((c) => (
                            <button
                                key={c}
                                onClick={() => setQuestionCount(c)}
                                disabled={isExplorer && c > getRemainingQuestions(subject)}
                                className={cn(
                                    "h-14 rounded-2xl border-2 font-black text-xs transition-all active:scale-95",
                                    questionCount === c ? "border-primary bg-primary/5 text-primary" : "border-border/50 bg-secondary/10 opacity-60"
                                )}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Time Limit Grid */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Time Limit (Minutes)</h3>
                        <span className="text-[9px] font-black text-primary uppercase">{timeLimit} Mins Selected</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {[10, 15, 20, 30, 45, 60].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTimeLimit(t)}
                                className={cn(
                                    "h-14 rounded-2xl border-2 font-black text-xs transition-all active:scale-95",
                                    timeLimit === t ? "border-primary bg-primary/5 text-primary" : "border-border/50 bg-secondary/10 opacity-60"
                                )}
                            >
                                {t}m
                            </button>
                        ))}
                    </div>
                </section>

                {/* Difficulty Blocks */}
                <section>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Select Difficulty</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { value: 'easy', label: activeExam?.scoring?.difficulty_labels?.easy || 'Easy', color: 'text-emerald-500' },
                            { value: 'medium', label: activeExam?.scoring?.difficulty_labels?.medium || 'Medium', color: 'text-orange-500' },
                            { value: 'hard', label: activeExam?.scoring?.difficulty_labels?.hard || 'Hard', color: 'text-rose-500' },
                            { value: 'mixed', label: 'Mixed', color: 'text-indigo-500' },
                        ].map((d) => (
                            <button
                                key={d.value}
                                onClick={() => setDifficulty(d.value)}
                                className={cn(
                                    "h-16 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 text-center",
                                    difficulty === d.value ? `border-primary bg-primary/5 shadow-sm ${d.color}` : "border-border/50 bg-secondary/10 opacity-60"
                                )}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Mission Start CTA */}
                <Button
                    onClick={handleStart}
                    className="w-full h-20 rounded-[2.5rem] bg-foreground text-background hover:bg-foreground/90 font-black text-sm uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all mt-4"
                >
                    Start Test <PlayCircle className="ml-3 w-6 h-6" />
                </Button>
            </div>

            <UpgradeModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                title="Daily Limit Reached"
                description={`You've exhausted your daily practice allowance for ${subject}. Upgrade to PRO for unlimited mission intelligence.`}
                feature="Unlimited Practice"
            />
        </div>
    );
}
