import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import { ChevronRight, Sparkles, BookOpen, X, Info, HelpCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { SubjectsGridSkeleton } from '@/components/SkeletonLoader';

interface SubjectStats {
    subject: string;
    description: string;
    total_questions: number;
    solved_count: number;
    accuracy: number;
    icon: string;
    color: string;
    studyGuide: string;
}

export default function Subjects() {
    const { user } = useAuth();
    const { activeExam } = useExam();
    const navigate = useNavigate();
    const [stats, setStats] = useState<SubjectStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState<SubjectStats | null>(null);

    useEffect(() => {
        if (user && activeExam) {
            fetchSubjectStats();
        }
    }, [user, activeExam?.id]);

    const fetchSubjectStats = async () => {
        if (!activeExam?.id) return;
        try {
            // 1. Fetch Practice Responses (General)
            const { data: practiceResponses } = await (supabase as any)
                .from('user_practice_responses')
                .select('subject, is_correct, question_id')
                .eq('user_id', user!.id)
                .eq('exam_type', activeExam.id);

            // 2. Fetch specialized IELTS submissions if needed
            let specializedData: any = {};
            if (activeExam?.id === 'ielts-academic') {
                const [reading, listening, writing] = await Promise.all([
                    (supabase as any).from('reading_submissions').select('id, score, reading_test_id').eq('user_id', user!.id),
                    (supabase as any).from('listening_submissions').select('id, score, listening_test_id').eq('user_id', user!.id),
                    (supabase as any).from('writing_submissions').select('id, status').eq('candidate_id', user!.id)
                ]);
                specializedData = {
                    'Academic Reading': reading.data || [],
                    'Listening': listening.data || [],
                    'Academic Writing': writing.data || []
                };
            }

            const subjectStats: SubjectStats[] = await Promise.all((activeExam?.sections || []).map(async (section: any) => {
                let realTotalQuestions = 0;
                let solvedCount = 0;
                let correctCount = 0;

                // A. Calculate Total Questions (Denominator)
                if (activeExam?.id === 'ielts-academic') {
                    if (section.name === 'Academic Reading') {
                        const { count } = await (supabase as any).from('reading_tests').select('*', { count: 'exact', head: true }).eq('is_mock_only', false);
                        realTotalQuestions = count || 0;
                    } else if (section.name === 'Listening') {
                        const { count } = await (supabase as any).from('listening_tests').select('*', { count: 'exact', head: true }).eq('is_mock_only', false);
                        realTotalQuestions = count || 0;
                    } else if (section.name === 'Academic Writing') {
                        const { count } = await (supabase as any).from('writing_tasks').select('*', { count: 'exact', head: true }).eq('is_mock_only', false);
                        realTotalQuestions = count || 0;
                    } else {
                        const { count } = await (supabase as any).from('practice_questions').select('*', { count: 'exact', head: true }).eq('subject', section.name).eq('exam_type', activeExam.id);
                        realTotalQuestions = count || 0;
                    }
                } else {
                    const { count } = await (supabase as any).from('practice_questions').select('*', { count: 'exact', head: true }).eq('subject', section.name).eq('exam_type', activeExam.id);
                    realTotalQuestions = count || 0;
                }

                // B. Calculate Solved/Accuracy (Numerator)
                let attempts: any[] = [];
                let specializedSubmissions: any[] = [];

                if (activeExam.id === 'ielts-academic' && specializedData[section.name]) {
                    // IELTS Specialized Sections
                    specializedSubmissions = specializedData[section.name];
                    solvedCount = specializedSubmissions.length;

                    if (section.name === 'Academic Writing') {
                        correctCount = specializedSubmissions.length;
                    } else {
                        const totalScore = specializedSubmissions.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
                        correctCount = totalScore;
                    }
                } else {
                    // Standard Practice Questions
                    attempts = practiceResponses?.filter((r: any) => r.subject === section.name) || [];
                    const uniqueSolved = new Set(attempts.map((a: any) => a.question_id));
                    solvedCount = uniqueSolved.size;
                    correctCount = attempts.filter((a: any) => a.is_correct).length;
                }

                // Calculate Accuracy Percentage
                let accuracy = 0;
                if (activeExam.id === 'ielts-academic' && specializedData[section.name]) {
                    if (solvedCount > 0) {
                        if (section.name === 'Academic Writing') accuracy = 100;
                        else accuracy = Math.round(correctCount / solvedCount);
                    }
                } else {
                    if (attempts.length > 0) {
                        accuracy = Math.round((correctCount / attempts.length) * 100);
                    }
                }

                return {
                    subject: section.name,
                    description: getSubjectDescription(section.name),
                    solved_count: solvedCount,
                    total_questions: realTotalQuestions || section.questionCount * 10,
                    accuracy: accuracy,
                    icon: section.icon,
                    color: section.color,
                    studyGuide: getStudyGuide(section.name)
                };
            }));

            setStats(subjectStats);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getSubjectDescription = (name: string) => {
        const desc: Record<string, string> = {
            'Mathematics': 'Elementary operations, algebra, geometry, functions, and statistics.',
            'Reasoning on texts and data': 'Logic, deduction, and interpretation of complex datasets.',
            'Biology': 'From biological molecules to anatomy and ecosystems.',
            'Chemistry': 'Atomic structure, stoichiometry, reactions, and organic chemistry.',
            'Physics': 'Mechanics, fluids, thermodynamics, and electromagnetism.'
        };
        return desc[name] || 'Master the concepts and practice questions for this subject.';
    };

    const getStudyGuide = (name: string) => {
        const guides: Record<string, string> = {
            'Mathematics': 'Focus on formula derivation and high-speed mental math. Practice past problems with a timer to improve efficiency.',
            'Reasoning on texts and data': 'Read academic journals and data reports. Practice identifying logical fallacies and data trends quickly.',
            'Biology': 'Use active recall and spaced repetition for vocabulary. Diagrams are key—ensure you can draw and label organ systems.',
            'Chemistry': 'Understand the periodic table trends first. Focus on stoichiometry calculations and reaction mechanics rather than pure memorization.',
            'Physics': 'Master the base units and dimensional analysis. Most problems are solved by identifying which conservation law applies.'
        };
        return guides[name] || 'Start with fundamental concepts, then move to timed practice sessions. Review every mistake in detail.';
    };

    const handlePracticeSubject = async (subject: string) => {
        if (activeExam?.id === 'ielts-academic') {
            if (subject === 'Speaking') {
                navigate('/speaking');
                return;
            }
            if (subject === 'Academic Reading') {
                const { data } = await (supabase as any).from('reading_tests').select('id').limit(1).single();
                if (data) navigate(`/reading/${data.id}`);
                else alert('No Reading tests available. Please add one in Admin.');
                return;
            }
            if (subject === 'Listening') {
                const { data } = await (supabase as any).from('listening_tests').select('id').limit(1).single();
                if (data) navigate(`/listening/${data.id}`);
                else alert('No Listening tests available. Please add one in Admin.');
                return;
            }
            if (subject === 'Academic Writing') {
                const { data } = await (supabase as any).from('writing_tasks').select('id').limit(1).single();
                if (data) navigate(`/writing/${data.id}`);
                else alert('No Writing tasks available. Please add one in Admin.');
                return;
            }
        }

        const params = new URLSearchParams({
            subject,
            count: '10',
            mode: 'practice'
        });
        navigate(`/start-test?${params.toString()}`);
    };

    return (
        <Layout isLoading={loading}>
            <div className="container mx-auto px-4 sm:px-6 py-8 max-w-7xl">
                {/* Header (Sleek Modern) */}
                <div className="text-center mb-10 space-y-4 animate-in fade-in fill-mode-both duration-700">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-slate-100 leading-tight">
                        <span className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                            {activeExam?.name}
                        </span>
                    </h1>
                    <p className="text-base sm:text-lg text-slate-400 font-bold max-w-2xl mx-auto tracking-tight leading-relaxed">
                        Master the curriculum with precision. Explore topics and study methods below.
                    </p>

                    {/* Pro Tip Banner (Sleek) */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50/50 rounded-full border border-indigo-100/50 mt-4 group cursor-help max-w-[90%] sm:max-w-none">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse shrink-0" />
                        <span className="text-[9px] sm:text-[10px] font-black text-indigo-900 uppercase tracking-widest leading-none truncate sm:whitespace-normal">
                            Pro Tip: Active Recall is 3x more effective than passive reading.
                        </span>
                    </div>
                </div>

                {loading ? (
                    <SubjectsGridSkeleton />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {stats.map((stat) => (
                            <Dialog key={stat.subject}>
                                <DialogTrigger asChild>
                                    <div
                                        onClick={() => setSelectedSubject(stat)}
                                        className="bg-white dark:bg-card p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-100 dark:border-border border-b-[6px] shadow-xl shadow-slate-200/50 hover:border-slate-300 hover:-translate-y-1 hover:shadow-2xl active:border-b-2 active:translate-y-1 transition-all duration-200 group relative cursor-pointer"
                                    >
                                        {/* Accuracy Bubble (Screenshot 4 style) */}
                                        <div className="absolute top-5 right-5 sm:top-6 sm:right-6 flex items-center gap-1.5 bg-slate-50 dark:bg-muted px-3 py-1.5 rounded-full border border-slate-100 dark:border-border overflow-hidden">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                            <span className="text-[9px] sm:text-[10px] font-black text-slate-900 dark:text-slate-100">{stat.accuracy}%</span>
                                        </div>

                                        <div className="mb-4">
                                            <div className="w-10 h-10 bg-slate-50 dark:bg-muted rounded-xl border border-slate-100 dark:border-border flex items-center justify-center text-xl group-hover:bg-white dark:bg-card group-hover:border-slate-300 transition-all mb-3">
                                                {stat.icon}
                                            </div>
                                            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 mb-2 tracking-tight">{stat.subject}</h2>
                                            <p className="text-[11px] sm:text-xs font-bold text-slate-400 leading-relaxed min-h-[3rem]">
                                                {stat.description}
                                            </p>
                                        </div>

                                        {/* Counter Grid (Screenshot 4 style) */}
                                        <div className="grid grid-cols-2 gap-4 py-4 sm:py-6 border-y border-slate-50 dark:border-slate-800 mb-6 sm:mb-8">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1.5">Solved</p>
                                                <p className="text-[13px] sm:text-sm font-black text-slate-900 dark:text-slate-100">{stat.solved_count} <span className="text-[9px] text-slate-400 opacity-60 ml-1">MISSION</span></p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1.5">Items</p>
                                                <p className="text-[13px] sm:text-sm font-black text-slate-900 dark:text-slate-100">{stat.total_questions} <span className="text-[9px] text-slate-400 opacity-60 ml-1">TOTAL</span></p>
                                            </div>
                                        </div>

                                        {/* Footer Action */}
                                        <div className="flex items-center justify-between group/footer">
                                            <span className="text-[9px] sm:text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                                                Explore Modules <ChevronRight className="w-3 h-3 group-hover/footer:translate-x-1 transition-transform" />
                                            </span>
                                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-muted flex items-center justify-center border border-slate-100 dark:border-border group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                <Info className="w-4 h-4 p-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                </DialogTrigger>

                                {/* Subject Detail Modal */}
                                <DialogContent className="w-[95vw] sm:max-w-2xl bg-white dark:bg-card border border-slate-200 dark:border-border rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl p-0 overflow-hidden ring-0">
                                    <div className="relative p-6 sm:p-10 max-h-[90vh] overflow-y-auto no-scrollbar">
                                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-8 sm:mb-10 text-center sm:text-left">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-muted rounded-2xl border border-slate-100 dark:border-border flex items-center justify-center text-4xl shrink-0">
                                                {stat.icon}
                                            </div>
                                            <div className="flex-1">
                                                <DialogTitle className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none mb-3">{stat.subject}</DialogTitle>
                                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                                                        {stat.solved_count}/{stat.total_questions} Solved
                                                    </span>
                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                                                        {stat.accuracy}% Accuracy
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-8 sm:space-y-10">
                                            {/* How to Study Section (User Request) */}
                                            <section>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">How to Study</h3>
                                                </div>
                                                <p className="text-[13px] sm:text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-muted p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-border">
                                                    {stat.studyGuide}
                                                </p>
                                            </section>

                                            {/* Topics & Sub-topics (User Request) */}
                                            <section>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <BookOpen className="w-4 h-4 text-indigo-600" />
                                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Curriculum Syllabus</h3>
                                                </div>
                                                <div className="grid gap-3 sm:gap-4">
                                                    {activeExam && activeExam.syllabus[stat.subject]?.map((topic) => (
                                                        <div key={topic.id} className="p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-border hover:border-slate-200 transition-colors">
                                                            <h4 className="font-black text-slate-900 dark:text-slate-100 text-[13px] sm:text-sm mb-3 flex flex-wrap items-center justify-between gap-2">
                                                                {topic.name}
                                                                <span className="text-[8px] sm:text-[10px] text-slate-300 font-bold">{topic.subtopics.length} SUB-TOPICS</span>
                                                            </h4>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {topic.subtopics.map((sub, idx) => (
                                                                    <span key={idx} className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 px-2 py-1 rounded text-[9px] sm:text-[10px] font-bold border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-card hover:border-slate-300 transition-colors cursor-default">
                                                                        {sub}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        </div>

                                        <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md pt-5 sm:pt-6 pb-2">
                                            <Button
                                                onClick={() => handlePracticeSubject(stat.subject)}
                                                className="flex-1 bg-slate-900 dark:bg-indigo-600 dark:text-white text-white hover:bg-slate-800 dark:hover:bg-indigo-700 font-black h-12 sm:h-14 rounded-2xl text-[11px] sm:text-xs uppercase tracking-widest shadow-xl shadow-slate-200 dark:shadow-indigo-900/20 active:scale-95 transition-all w-full"
                                            >
                                                Launch Practice Mission
                                            </Button>
                                            <button
                                                onClick={() => (document.querySelector('[data-state="open"]')?.closest('[role="dialog"]') as any)?.click()}
                                                className="px-6 h-12 sm:h-14 rounded-2xl border border-slate-100 dark:border-border font-bold text-[11px] sm:text-xs text-slate-400 hover:text-slate-900 dark:text-slate-100 transition-colors w-full sm:w-auto"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
