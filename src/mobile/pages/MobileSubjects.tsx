import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import { ChevronRight, Sparkles, BookOpen, Info, Search, ArrowLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SubjectsGridSkeleton } from '@/components/SkeletonLoader';
import MobileLayout from '../components/MobileLayout';

export default function MobileSubjects() {
    const { user } = useAuth();
    const { activeExam } = useExam();
    const navigate = useNavigate();
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);

    useEffect(() => {
        if (user && activeExam) fetchSubjectStats();
    }, [user, activeExam?.id]);

    const fetchSubjectStats = async () => {
        if (!activeExam) return;
        setLoading(true);
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
                    (supabase as any).from('reading_submissions').select('id, score').eq('user_id', user!.id),
                    (supabase as any).from('listening_submissions').select('id, score').eq('user_id', user!.id),
                    (supabase as any).from('writing_submissions').select('id, status').eq('candidate_id', user!.id)
                ]);
                specializedData = {
                    'Academic Reading': reading.data || [],
                    'Listening': listening.data || [],
                    'Academic Writing': writing.data || []
                };
            }

            // 3. Aggregate Mastery
            const mastery = await Promise.all((activeExam?.sections || []).map(async (section: any) => {
                let realTotal = 0;
                let solved = 0;
                let accuracy = 0;

                // A. Calculate Total Questions
                if (activeExam?.id === 'ielts-academic') {
                    if (section.name === 'Academic Reading') {
                        const { count } = await (supabase as any).from('reading_tests').select('*', { count: 'exact', head: true }).eq('is_mock_only', false);
                        realTotal = count || 0;
                    } else if (section.name === 'Listening') {
                        const { count } = await (supabase as any).from('listening_tests').select('*', { count: 'exact', head: true }).eq('is_mock_only', false);
                        realTotal = count || 0;
                    } else if (section.name === 'Academic Writing') {
                        const { count } = await (supabase as any).from('writing_tasks').select('*', { count: 'exact', head: true }).eq('is_mock_only', false);
                        realTotal = count || 0;
                    } else {
                        const { count } = await (supabase as any).from('practice_questions').select('*', { count: 'exact', head: true }).eq('subject', section.name).eq('exam_type', activeExam.id);
                        realTotal = count || 0;
                    }
                } else {
                    const { count } = await (supabase as any).from('practice_questions').select('*', { count: 'exact', head: true }).eq('subject', section.name).eq('exam_type', activeExam.id);
                    realTotal = count || 0;
                }

                // B. Calculate Solved & Accuracy
                if (activeExam?.id === 'ielts-academic' && specializedData[section.name]) {
                    const submissions = specializedData[section.name];
                    solved = submissions.length;
                    if (solved > 0) {
                        if (section.name === 'Academic Writing') accuracy = 100;
                        else {
                            const totalScore = submissions.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
                            accuracy = Math.round(totalScore / solved);
                        }
                    }
                } else {
                    const attempts = practiceResponses?.filter((q: any) => q.subject === section.name) || [];
                    const uniqueSolved = new Set(attempts.map((a: any) => a.question_id)).size;
                    solved = uniqueSolved;

                    const correctCount = attempts.filter((q: any) => q.is_correct).length;
                    accuracy = attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0;
                }

                return {
                    subject: section.name,
                    icon: section.icon,
                    solved: solved,
                    total: realTotal || 0,
                    accuracy: accuracy,
                };
            }));

            setStats(mastery);
        } catch (error) {
            console.error('Error fetching subject stats:', error);
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

    const handlePracticeSubject = (subject: string) => {
        const params = new URLSearchParams({
            subject,
            count: '10'
        });
        navigate(`/mobile/practice?${params.toString()}`);
    };

    return (
        <MobileLayout isLoading={loading}>
            <div className="flex flex-col min-h-full bg-background pb-32 animate-in fade-in duration-500">
            {/* Premium Header Section */}
            <header className="px-6 pt-4 pb-2 sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border/10">
                <div className="flex items-center gap-4 mb-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="rounded-full bg-secondary/50 hover:bg-secondary transition-colors w-8 h-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Overview</span>
                    </div>
                </div>
                <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
                    Course <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">Syllabus</span>
                </h1>
                <p className="text-[10px] font-black text-muted-foreground mt-1 opacity-40 uppercase tracking-widest leading-relaxed">
                    Learning performance for <span className="text-foreground">{activeExam.name}</span>
                </p>
            </header>

            {/* Subject Grid */}
            <div className="px-4 grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="mt-8 px-2">
                        <SubjectsGridSkeleton />
                    </div>
                ) : (
                    stats.map((stat, i) => (
                        <Dialog key={i}>
                            <DialogTrigger asChild>
                                <Card
                                    onClick={() => setSelectedSubject(stat)}
                                    className="bg-card border border-border/10 rounded-[2.5rem] overflow-hidden active:scale-[0.98] transition-all group relative cursor-pointer"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <CardContent className="p-6 flex items-center gap-5 relative z-10">
                                        <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center text-3xl shadow-sm group-hover:rotate-6 transition-transform">
                                            {stat.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-black text-lg uppercase tracking-tighter">{stat.subject}</h3>
                                                <span className={cn(
                                                    "text-lg font-black",
                                                    stat.accuracy >= 80 ? "text-emerald-500" : stat.accuracy >= 50 ? "text-amber-500" : "text-rose-500"
                                                )}>
                                                    {stat.accuracy}%
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-1000",
                                                            stat.accuracy >= 80 ? "bg-emerald-500" : stat.accuracy >= 50 ? "bg-amber-500" : "bg-rose-500"
                                                        )}
                                                        style={{ width: `${stat.accuracy}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                                                        {stat.solved} / {stat.total} Solved
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground opacity-30 group-hover:text-primary transition-colors" />
                                    </CardContent>
                                </Card>
                            </DialogTrigger>

                            <DialogContent className="w-[95vw] max-w-[95vw] bg-background border border-border/10 rounded-[2rem] p-0 overflow-hidden shadow-2xl">
                                <div className="p-6 overflow-y-auto max-h-[85vh] no-scrollbar">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-14 h-14 bg-secondary/50 rounded-2xl flex items-center justify-center text-3xl">
                                            {stat.icon}
                                        </div>
                                        <div className="flex-1">
                                            <DialogTitle className="text-xl font-black uppercase tracking-tight mb-1">{stat.subject}</DialogTitle>
                                            <div className="flex gap-2">
                                                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[8px] font-black uppercase tracking-widest leading-none border border-primary/10">
                                                    {stat.accuracy}% Accuracy
                                                </span>
                                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black uppercase tracking-widest leading-none border border-emerald-500/10">
                                                    {stat.solved} Solved
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        {/* Description */}
                                        <p className="text-xs font-bold text-muted-foreground leading-relaxed uppercase tracking-tight opacity-70">
                                            {getSubjectDescription(stat.subject)}
                                        </p>

                                        {/* Study Guide */}
                                        <section>
                                            <div className="flex items-center gap-2 mb-3">
                                                <HelpCircle className="w-4 h-4 text-primary" />
                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Study Strategy</h3>
                                            </div>
                                            <div className="bg-secondary/20 p-5 rounded-2xl border border-border/10">
                                                <p className="text-xs font-bold text-foreground leading-relaxed">
                                                    {getStudyGuide(stat.subject)}
                                                </p>
                                            </div>
                                        </section>

                                        {/* Syllabus */}
                                        <section>
                                            <div className="flex items-center gap-2 mb-4">
                                                <BookOpen className="w-4 h-4 text-primary" />
                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syllabus Overview</h3>
                                            </div>
                                            <div className="space-y-4">
                                                {activeExam.syllabus[stat.subject]?.map((topic: any, idx: number) => (
                                                    <div key={idx} className="p-5 rounded-3xl border border-border/10 bg-muted/20">
                                                        <h4 className="font-black text-[11px] uppercase tracking-widest mb-4 flex justify-between items-center text-foreground/90">
                                                            {topic.name}
                                                            <span className="text-[8px] opacity-40 font-bold">{topic.subtopics.length} UNITS</span>
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {topic.subtopics.map((sub: string, sIdx: number) => (
                                                                <span key={sIdx} className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight border border-primary/5">
                                                                    {sub}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>

                                    <div className="mt-10 flex gap-3 sticky bottom-0 bg-background/90 backdrop-blur-md pt-4 pb-2">
                                        <Button
                                            onClick={() => handlePracticeSubject(stat.subject)}
                                            className="flex-1 h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                                        >
                                            Start Practice
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    ))
                )}
            </div>


        </div>
        </MobileLayout>
    );
}
