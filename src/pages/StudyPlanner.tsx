import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import {
    Calendar, BookOpen, FlaskConical, Zap, Brain, ChevronRight,
    Sparkles, Target, Clock, CheckCircle2, Play, Settings,
    Atom, Binary, ArrowRight, ArrowLeft, BarChart3, Flame,
    GraduationCap, Info, TrendingUp, Award, Trophy, Star,
    AlertTriangle, Lightbulb, Rocket, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
    format, addDays, differenceInDays, addMonths, subMonths, 
    startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
    eachDayOfInterval, isSameMonth, isSameDay, isBefore 
} from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StudyPlanConfig {
    exam: 'imat' | 'cent-s';
    examDate: string;
    hoursPerDay: number;
    targetScore: number;
    subjectLevels: Record<string, 'weak' | 'medium' | 'strong'>;
    createdAt: string;
}

type Step = 'exam' | 'date' | 'hours' | 'levels' | 'target' | 'review';

// ─── Exam Data ────────────────────────────────────────────────────────────────

export const EXAM_SUBJECTS = {
    imat: [
        { name: 'Biology', weight: 0.25, subject: 'biology', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-200', icon: BookOpen, topics: ['Cell Biology & Organelles', 'Molecular Genetics & DNA', 'Human Physiology & Anatomy', 'Bioenergetics (ATP/Respiration)', 'Mendelian Genetics & Heredity', 'Evolution & Ecology'] },
        { name: 'Chemistry', weight: 0.25, subject: 'chemistry', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-200', icon: FlaskConical, topics: ['Stoichiometry & Mole Concept', 'Organic Chemistry Mechanisms', 'Periodic Table & Atomic Structure', 'Chemical Equilibrium & Kinetics', 'Acid-Base & Redox Reactions', 'Thermodynamics'] },
        { name: 'Physics & Math', weight: 0.25, subject: 'physics', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200', icon: Atom, topics: ['Mechanics & Newton\'s Laws', 'Thermodynamics & Gas Laws', 'Electromagnetism & Circuits', 'Optics & Waves', 'Algebra & Functions', 'Trigonometry & Geometry'] },
        { name: 'Logic & GK', weight: 0.25, subject: 'reasoning', color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', border: 'border-indigo-200', icon: Brain, topics: ['Critical Thinking & Arguments', 'Data Interpretation & Graphs', 'Syllogisms & Deductive Reasoning', 'Numerical Problem Solving', 'Western History & Philosophy', 'EU Institutions & General Knowledge'] },
    ],
    'cent-s': [
        { name: 'Mathematics', weight: 0.27, subject: 'mathematics', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200', icon: Binary, topics: ['Algebra & Polynomial Equations', 'Functions, Domain & Range', 'Euclidean & Coordinate Geometry', 'Trigonometric Identities', 'Probability & Statistical Analysis', 'Exponential & Logarithmic Functions'] },
        { name: 'Reasoning', weight: 0.27, subject: 'reasoning', color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', border: 'border-indigo-200', icon: Brain, topics: ['Text Comprehension & Inference', 'Logical Deduction & Syllogisms', 'Data & Graph Interpretation', 'Critical Thinking & Assumption ID', 'Numerical Reasoning Problems', 'Scientific Argument Evaluation'] },
        { name: 'Biology', weight: 0.18, subject: 'biology', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-200', icon: BookOpen, topics: ['Cell Structure & Function', 'Genetics & DNA Replication', 'Bioenergetics & Metabolism', 'Chemistry of Life (Biomolecules)', 'Cellular Respiration', 'Evolutionary Mechanisms'] },
        { name: 'Chemistry', weight: 0.18, subject: 'chemistry', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-200', icon: FlaskConical, topics: ['Atomic Structure & Periodic Table', 'Ionic, Covalent & Metallic Bonds', 'Reaction Equations & Stoichiometry', 'Intro Organic Chemistry (Nomenclature)', 'Concentration & Molarity', 'Redox Reactions'] },
        { name: 'Physics', weight: 0.09, subject: 'physics', color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30', border: 'border-rose-200', icon: Zap, topics: ['Kinematics & Newton\'s Laws', 'Work, Energy & Power', 'Thermodynamics Basics', 'Electric Charge & Ohm\'s Law', 'Magnetic Fields'] },
    ],
};

const LEVEL_COLOR = { weak: 'rose', medium: 'amber', strong: 'emerald' } as const;
const LEVEL_EMOJI = { weak: '😓', medium: '🙂', strong: '💪' } as const;
const LEVEL_LABEL = { weak: 'Weak', medium: 'Medium', strong: 'Strong' } as const;
const LEVEL_MULT = { weak: 1.5, medium: 1.0, strong: 0.6 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(d: string) {
    return Math.max(0, differenceInDays(new Date(d), new Date()));
}

function calcWeeklyHours(config: StudyPlanConfig) {
    const subs = EXAM_SUBJECTS[config.exam];
    const totalMinsPerDay = config.hoursPerDay * 60;
    const weighted = subs.map(s => ({ ...s, adj: s.weight * LEVEL_MULT[config.subjectLevels[s.subject] ?? 'medium'] }));
    const total = weighted.reduce((a, b) => a + b.adj, 0);
    return weighted.map(s => ({ ...s, minsPerDay: Math.max(10, Math.round((s.adj / total) * totalMinsPerDay)) }));
}

// ─── Step Components ──────────────────────────────────────────────────────────

const PremiumCalendar = ({ selectedDate, onSelect, minDate }: { selectedDate: string, onSelect: (d: string) => void, minDate: Date }) => {
    const [viewDate, setViewDate] = useState(selectedDate ? new Date(selectedDate) : addDays(new Date(), 7));
    
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
                <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
                    {format(viewDate, 'MMMM yyyy')}
                </h3>
                <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-7 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase py-2">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day, idx) => {
                        const isSelected = selectedDate === format(day, 'yyyy-MM-dd');
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isDisabled = isBefore(day, minDate) && !isSameDay(day, minDate);
                        
                        return (
                            <button
                                key={idx}
                                disabled={isDisabled}
                                onClick={() => onSelect(format(day, 'yyyy-MM-dd'))}
                                className={cn(
                                    "aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all relative group",
                                    !isCurrentMonth && "opacity-20",
                                    isDisabled && "opacity-10 cursor-not-allowed grayscale",
                                    isSelected 
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40" 
                                        : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                )}
                            >
                                {format(day, 'd')}
                                {isSameDay(day, new Date()) && !isSelected && (
                                    <div className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-800/50 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest leading-relaxed">
                    Important: A high-quality plan requires at least 7 days of preparation. You cannot create a plan for less than 7 days.
                </p>
            </div>
        </div>
    );
};

const StepIndicator = ({ steps, current }: { steps: { id: Step; label: string }[]; current: Step }) => {
    const idx = steps.findIndex(s => s.id === current);
    return (
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {steps.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 shrink-0">
                    <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all",
                        i < idx ? "bg-indigo-600 text-white" : i === idx ? "bg-indigo-600 text-white ring-4 ring-indigo-200 dark:ring-indigo-900" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                        {i < idx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={cn("text-[9px] font-black uppercase tracking-widest hidden sm:block", i === idx ? "text-indigo-600" : "text-slate-400")}>
                        {s.label}
                    </span>
                    {i < steps.length - 1 && <div className={cn("w-6 sm:w-12 h-0.5 mx-1", i < idx ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700")} />}
                </div>
            ))}
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudyPlanner() {
    const { user } = useAuth();
    const { activeExam } = useExam();
    const navigate = useNavigate();

    const [step, setStep] = useState<Step>('exam');
    const [exam, setExam] = useState<'imat' | 'cent-s' | null>(() =>
        (activeExam?.id === 'cent-s' || activeExam?.id === 'imat') ? activeExam.id as 'imat' | 'cent-s' : null
    );
    const [examDate, setExamDate] = useState('');
    const [hoursPerDay, setHoursPerDay] = useState(2);
    const [targetScore, setTargetScore] = useState(exam === 'imat' ? 50 : 35);
    const [levels, setLevels] = useState<Record<string, 'weak' | 'medium' | 'strong'>>(() => {
        const init: Record<string, 'weak' | 'medium' | 'strong'> = {};
        [...EXAM_SUBJECTS.imat, ...EXAM_SUBJECTS['cent-s']].forEach(s => { init[s.subject] = 'medium'; });
        return init;
    });
    const [saving, setSaving] = useState(false);
    const [existingPlan, setExistingPlan] = useState<StudyPlanConfig | null>(null);
    const [masteryData, setMasteryData] = useState<Record<string, { accuracy: number, total: number }>>({});

    // Load existing plan & mastery data
    useEffect(() => {
        if (!user) return;
        
        const loadData = async () => {
            const examId = activeExam?.id || 'imat';
            const local = localStorage.getItem(`study_plan_${examId}_${user.id}`);
            
            if (local) {
                try {
                    const parsed = JSON.parse(local) as StudyPlanConfig;
                    setExistingPlan(parsed);
                    setExam(parsed.exam);
                    setExamDate(parsed.examDate);
                    setHoursPerDay(parsed.hoursPerDay);
                    setTargetScore(parsed.targetScore ?? 50);
                    setLevels(parsed.subjectLevels);
                } catch (_) {}
            }

            // Fetch Real Mastery Data
            try {
                const { data: responses } = await supabase
                    .from('user_practice_responses')
                    .select('subject, is_correct')
                    .eq('user_id', user.id);

                if (responses) {
                    const stats: Record<string, { total: number, correct: number }> = {};
                    responses.forEach((r: any) => {
                        const sub = (r.subject || '').toLowerCase();
                        if (!stats[sub]) stats[sub] = { total: 0, correct: 0 };
                        stats[sub].total++;
                        if (r.is_correct) stats[sub].correct++;
                    });
                    const mastery: Record<string, { accuracy: number, total: number }> = {};
                    Object.keys(stats).forEach(k => {
                        mastery[k] = {
                            accuracy: Math.round((stats[k].correct / stats[k].total) * 100),
                            total: stats[k].total
                        };
                    });
                    setMasteryData(mastery);
                }
            } catch (_) {}
        };

        loadData();
    }, [user, activeExam?.id]);

    const getRecommendation = (subjectKey: string) => {
        const data = masteryData[subjectKey.toLowerCase()];
        if (!data || data.total < 5) return null; 
        if (data.accuracy < 45) return 'weak';
        if (data.accuracy > 72) return 'strong';
        return 'medium';
    };

    const autoFillMastery = () => {
        const nextLevels = { ...levels };
        subjects.forEach(s => {
            const rec = getRecommendation(s.subject);
            if (rec) nextLevels[s.subject] = rec;
        });
        setLevels(nextLevels);
    };

    useEffect(() => {
        if (exam) {
            setTargetScore(exam === 'imat' ? 50 : 35);
        }
    }, [exam]);

    const subjects = exam ? EXAM_SUBJECTS[exam] : [];
    const daysLeft = examDate ? daysUntil(examDate) : 0;
    
    // Determine the start date (now, or when the plan was created)
    const startDate = useMemo(() => existingPlan?.createdAt ? new Date(existingPlan.createdAt) : new Date(), [existingPlan]);
    
    const totalDaysPreview = useMemo(() => {
        if (!examDate) return 120;
        return Math.max(1, differenceInDays(new Date(examDate), startDate));
    }, [examDate, startDate]);

    const phase = useMemo(() => {
        const fCutoff = Math.floor(totalDaysPreview * 0.6);
        const pCutoff = Math.floor(totalDaysPreview * 0.2);
        if (daysLeft > fCutoff) return { label: 'Foundation Phase', color: 'blue', desc: 'Build deep conceptual understanding across all subjects.' };
        if (daysLeft > pCutoff) return { label: 'Practice Phase', color: 'amber', desc: 'Drill questions intensively, focus on weak spots.' };
        return { label: 'Mock Sprint Phase', color: 'rose', desc: 'Full timed mocks daily, rapid revision, penalty strategy.' };
    }, [daysLeft, totalDaysPreview]);

    const weeklyPlan = useMemo(() => {
        if (!examDate) return [];
        return calcWeeklyHours({ exam, examDate, hoursPerDay, targetScore, subjectLevels: levels, createdAt: '' });
    }, [exam, examDate, hoursPerDay, levels, targetScore]);

    const recommendedHours = useMemo(() => {
        if (!daysLeft) return 2;
        if (daysLeft < 15) return 5;
        if (daysLeft < 30) return 4;
        if (daysLeft < 60) return 3;
        return 2;
    }, [daysLeft]);

    const STEPS: { id: Step; label: string }[] = [
        { id: 'exam', label: 'Exam' },
        { id: 'date', label: 'Date' },
        { id: 'hours', label: 'Hours' },
        { id: 'levels', label: 'Subjects' },
        { id: 'target', label: 'Target' },
        { id: 'review', label: 'Review' },
    ];

    const nextStep = () => {
        const order: Step[] = ['exam', 'date', 'hours', 'levels', 'target', 'review'];
        const idx = order.indexOf(step);
        if (idx < order.length - 1) setStep(order[idx + 1]);
    };
    const prevStep = () => {
        const order: Step[] = ['exam', 'date', 'hours', 'levels', 'target', 'review'];
        const idx = order.indexOf(step);
        if (idx > 0) setStep(order[idx - 1]);
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        const config: StudyPlanConfig = {
            exam, examDate, hoursPerDay, targetScore,
            subjectLevels: levels,
            createdAt: new Date().toISOString(),
        };
        localStorage.setItem(`study_plan_${activeExam?.id}_${user.id}`, JSON.stringify(config));
        // Best-effort Supabase sync
        try {
            await (supabase as any).from('profiles').update({ study_plan_config: config }).eq('id', user.id);
        } catch (_) {}
        setSaving(false);
        navigate('/dashboard', { state: { planCreated: true } });
    };

    const canProceed = useMemo(() => {
        if (step === 'exam') return exam !== null;
        if (step === 'date') return examDate !== '';
        return true;
    }, [step, examDate, exam]);

    const slideVariants = {
        enter: { opacity: 0, x: 40 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -40 },
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                <div className="max-w-3xl mx-auto px-4 py-10">

                    {/* Active Plan Guard */}
                    {existingPlan && step === 'exam' && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl shadow-indigo-100 dark:shadow-none border border-slate-100 dark:border-slate-800 p-8 text-center mb-10"
                        >
                            <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Rocket className="w-10 h-10 text-indigo-600" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Study Plan Active</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                                You already have a custom plan for <span className="text-indigo-600 font-black">{existingPlan.exam.toUpperCase()}</span>. To create a fresh one, you must delete the current active plan.
                            </p>
                            
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button 
                                    onClick={() => navigate('/dashboard')}
                                    className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
                                >
                                    Go to Dashboard
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={() => {
                                        if (window.confirm("Are you sure? This will permanently erase your current progress and adaptive settings.")) {
                                            localStorage.removeItem(`study_plan_${activeExam?.id || 'imat'}_${user?.id}`);
                                            setExistingPlan(null);
                                            window.location.reload();
                                        }
                                    }}
                                    className="h-12 px-8 rounded-2xl border-2 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/10"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete & Reset
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* Hero Header */}
                    {!existingPlan && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/10 border border-indigo-200 dark:border-indigo-500/30 rounded-full text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-5">
                                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                {existingPlan ? 'Update Your Plan' : 'Create Your Plan'}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight mb-3">
                                Your Personal<br />
                                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Study Roadmap</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-lg mx-auto">
                                Built around the official syllabus. Adapted to your strengths. Engineered for your exam date.
                            </p>
                        </motion.div>
                    )}

                    {!existingPlan && <StepIndicator steps={STEPS} current={step} />}

                    {/* Step Content */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        {!existingPlan ? (
                            <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.22, ease: 'easeInOut' }}
                                className="p-6 md:p-10"
                            >
                                {/* ── STEP: Exam ── */}
                                {step === 'exam' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                                                <GraduationCap className="w-5 h-5 text-white" />
                                            </div>
                                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Which exam are you preparing for?</h2>
                                        </div>
                                        <p className="text-sm text-slate-500 mb-8 ml-12">Your plan will be built from the official syllabus weightage of your chosen exam.</p>

                                        <div className="grid grid-cols-1 gap-5 max-w-xl mx-auto">
                                            {([
                                                {
                                                    id: 'imat' as const, label: 'IMAT', subtitle: 'International Medical Admissions Test',
                                                    stats: [{ label: 'Questions', val: '60 MCQ' }, { label: 'Duration', val: '100 min' }, { label: 'Penalty', val: '-0.4 pts' }, { label: 'Sections', val: '4 equal' }],
                                                    tip: '💡 All 4 sections are equally weighted (25% each) from 2024 onwards.',
                                                    color: 'indigo'
                                                },
                                                {
                                                    id: 'cent-s' as const, label: 'CENT-S', subtitle: 'Common Entrance Test for Science',
                                                    stats: [{ label: 'Questions', val: '55 MCQ' }, { label: 'Duration', val: '110 min' }, { label: 'Sections', val: '5 subjects' }, { label: 'Top Weight', val: '54% Logic+Math' }],
                                                    tip: '💡 Math + Reasoning = 54% of total marks. These two sections dominate your rank.',
                                                    color: 'violet'
                                                },
                                            ] as const).filter(e => !activeExam?.id || activeExam.id.includes(e.id)).map(e => (
                                                <button
                                                    key={e.id}
                                                    onClick={() => setExam(e.id)}
                                                    className={cn(
                                                        "relative text-left p-6 rounded-2xl border-2 transition-all duration-200 group",
                                                        exam === e.id
                                                            ? `border-${e.color}-500 bg-${e.color}-50 dark:bg-${e.color}-900/10 shadow-lg shadow-${e.color}-100 dark:shadow-${e.color}-900/20`
                                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                                    )}
                                                >
                                                    {exam === e.id && (
                                                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                                                            <CheckCircle2 className="w-4 h-4 text-white" />
                                                        </div>
                                                    )}
                                                    <p className={cn("text-2xl font-black mb-1 leading-none", exam === e.id ? "text-indigo-700 dark:text-indigo-300" : "text-slate-900 dark:text-white")}>{e.label}</p>
                                                    <p className="text-xs font-bold text-slate-400 mb-5">{e.subtitle}</p>
                                                    <div className="grid grid-cols-2 gap-2 mb-5">
                                                        {e.stats.map(stat => (
                                                            <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700">
                                                                <p className="text-base font-black text-slate-900 dark:text-white leading-none">{stat.val}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{stat.label}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className={cn("p-3 rounded-xl text-[10px] font-bold leading-relaxed", exam === e.id ? "bg-indigo-100/70 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : "bg-slate-50 dark:bg-slate-800 text-slate-500")}>
                                                        {e.tip}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── STEP: Date ── */}
                                {step === 'date' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
                                                <Calendar className="w-5 h-5 text-white" />
                                            </div>
                                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">When is your exam?</h2>
                                        </div>
                                        <p className="text-sm text-slate-500 mb-8 ml-12">Your plan phases (Foundation → Practice → Mock Sprint) are automatically calculated from this date.</p>

                                        <div className="mb-6 max-w-sm mx-auto">
                                            <PremiumCalendar 
                                                selectedDate={examDate} 
                                                onSelect={setExamDate} 
                                                minDate={addDays(new Date(), 7)}
                                            />
                                        </div>

                                        {examDate && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                                <div className="grid grid-cols-3 gap-4">
                                                    {[
                                                        { label: 'Days Left', val: daysLeft, icon: Clock, color: 'indigo' },
                                                        { label: 'Weeks Left', val: Math.floor(daysLeft / 7), icon: Calendar, color: 'violet' },
                                                        { label: 'Current Phase', val: phase.label.split(' ')[0], icon: Target, color: phase.color },
                                                    ].map(item => (
                                                        <div key={item.label} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-700">
                                                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-1">{item.val}</p>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="bg-gradient-to-r from-blue-50 via-amber-50 to-rose-50 dark:from-blue-900/10 dark:via-amber-900/10 dark:to-rose-900/10 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                                                    <p className="text-xs font-black text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-widest">Your Study Timeline</p>
                                                    <div className="space-y-2">
                                                        {[
                                                            { label: '🔵 Foundation', range: `${format(startDate, 'MMM d')} → ${format(addDays(startDate, Math.floor(totalDaysPreview * 0.4)), 'MMM d')}`, desc: 'Build concepts systematically' },
                                                            { label: '🟡 Practice', range: `${format(addDays(startDate, Math.floor(totalDaysPreview * 0.4)), 'MMM d')} → ${format(addDays(startDate, Math.floor(totalDaysPreview * 0.8)), 'MMM d')}`, desc: 'Intensive question drilling' },
                                                            { label: '🔴 Mock Sprint', range: `${format(addDays(startDate, Math.floor(totalDaysPreview * 0.8)), 'MMM d')} → Exam Day`, desc: 'Full timed mocks + rapid revision' },
                                                        ].map(p => (
                                                            <div key={p.label} className="flex items-center gap-3 text-xs font-bold">
                                                                <span className="text-sm">{p.label.split(' ')[0]}</span>
                                                                <span className="font-black text-slate-900 dark:text-white">{p.label.split(' ').slice(1).join(' ')}</span>
                                                                <span className="text-slate-400">{p.range}</span>
                                                                <span className="text-slate-400 hidden sm:block">— {p.desc}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                )}

                                {/* ── STEP: Hours ── */}
                                {step === 'hours' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
                                                <Clock className="w-5 h-5 text-white" />
                                            </div>
                                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">How many hours can you study daily?</h2>
                                        </div>
                                        <p className="text-sm text-slate-500 mb-8 ml-12">Be realistic — consistency beats intensity. Daily hours are distributed across subjects based on exam weightage.</p>

                                        {examDate && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }} 
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mb-8 p-5 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/10 dark:to-violet-900/5 border border-indigo-100 dark:border-indigo-800/50 rounded-3xl flex items-center gap-4"
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200 dark:shadow-none">
                                                    <Sparkles className="w-6 h-6 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Italostudy Recommendation</p>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-snug">
                                                        With <span className="text-indigo-600 dark:text-indigo-400 font-black">{daysLeft} days</span> remaining, we suggest <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-md mx-1">{recommendedHours} hours</span> per day.
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => setHoursPerDay(recommendedHours)}
                                                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
                                                >
                                                    Apply
                                                </button>
                                            </motion.div>
                                        )}

                                        <div className="flex flex-wrap gap-3 mb-8">
                                            {[1, 1.5, 2, 2.5, 3, 3.5, 4, 5].map(h => (
                                                <button
                                                    key={h}
                                                    onClick={() => setHoursPerDay(h)}
                                                    className={cn(
                                                        "px-5 py-4 rounded-2xl border-2 font-black text-lg transition-all relative",
                                                        hoursPerDay === h
                                                            ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900 scale-105"
                                                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300"
                                                    )}
                                                >
                                                    {h}h
                                                    {h === recommendedHours && (
                                                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-600 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-sm">
                                                            <Sparkles className="w-2.5 h-2.5 text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        {examDate && (
                                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Daily Time Distribution ({hoursPerDay}h total)</p>
                                                <div className="space-y-3">
                                                    {weeklyPlan.map(s => (
                                                        <div key={s.subject}>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", s.bg)}>
                                                                        <s.icon className={cn("w-3 h-3", s.color)} />
                                                                    </div>
                                                                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">{s.name}</span>
                                                                </div>
                                                                <span className="text-xs font-black text-slate-900 dark:text-white">{s.minsPerDay} min/day</span>
                                                            </div>
                                                            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div className={cn("h-full rounded-full", s.color.replace('text-', 'bg-'))} style={{ width: `${(s.minsPerDay / (hoursPerDay * 60)) * 100}%`, opacity: 0.7 }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-5 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl flex gap-3">
                                            <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                                <strong>Expert tip:</strong> 2–3 hours of focused daily study beats 6 hours of passive review. Your plan includes active recall, not just reading.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ── STEP: Levels ── */}
                                {step === 'levels' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                                                <BarChart3 className="w-5 h-5 text-white" />
                                            </div>
                                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Self-assess each subject</h2>
                                        </div>
                                        
                                        <div className="flex items-center justify-between mb-8 ml-12">
                                            <p className="text-sm text-slate-500">Weak subjects get 1.5× more daily time. Be honest — this directly impacts how your plan distributes hours.</p>
                                            {Object.keys(masteryData).length > 0 && (
                                                <Button 
                                                    onClick={autoFillMastery}
                                                    variant="outline" 
                                                    className="h-9 px-4 rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest gap-2"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5" /> Auto-Fill from Data
                                                </Button>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            {subjects.map(s => {
                                                const recommendation = getRecommendation(s.subject);
                                                const stats = masteryData[s.subject.toLowerCase()];
                                                
                                                return (
                                                    <div key={s.subject} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                                        <div className="flex items-start gap-4 mb-4">
                                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", s.bg)}>
                                                                <s.icon className={cn("w-5 h-5", s.color)} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{s.name}</p>
                                                                        {stats && (
                                                                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[8px] font-black text-slate-500 rounded border border-slate-200 dark:border-slate-700">
                                                                                {stats.accuracy}% accuracy
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{Math.round(s.weight * 100)}% of exam</span>
                                                                </div>
                                                                {recommendation && (
                                                                    <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1">
                                                                        <Info className="w-3 h-3" /> Italostudy recommends <strong>{recommendation.toUpperCase()}</strong> based on your {stats?.total} questions.
                                                                    </p>
                                                                )}
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {s.topics.slice(0, 3).map(t => (
                                                                        <span key={t} className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-[9px] font-bold text-slate-500">{t}</span>
                                                                    ))}
                                                                    <span className="px-2 py-0.5 text-[9px] font-bold text-slate-400">+{s.topics.length - 3} more</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {(['weak', 'medium', 'strong'] as const).map(level => (
                                                                <button
                                                                    key={level}
                                                                    onClick={() => setLevels(prev => ({ ...prev, [s.subject]: level }))}
                                                                    className={cn(
                                                                        "flex-1 py-2.5 rounded-xl border-2 text-xs font-black transition-all relative",
                                                                        levels[s.subject] === level
                                                                            ? level === 'weak' ? "border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-200 dark:shadow-rose-900/30"
                                                                                : level === 'medium' ? "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/30"
                                                                                    : "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30"
                                                                            : "border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300"
                                                                    )}
                                                                >
                                                                    {LEVEL_EMOJI[level]} {LEVEL_LABEL[level]}
                                                                    {recommendation === level && (
                                                                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full border border-white dark:border-slate-900 flex items-center justify-center shadow-sm">
                                                                            <Sparkles className="w-2.5 h-2.5 text-white" />
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* ── STEP: Target ── */}
                                {step === 'target' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center">
                                                <Trophy className="w-5 h-5 text-white" />
                                            </div>
                                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">What's your target score?</h2>
                                        </div>
                                        <p className="text-sm text-slate-500 mb-8 ml-12">
                                            {exam === 'imat' ? 'IMAT 2024 minimum competitive score was ~42. Top university (Sapienza) required ~58+.' : 'CENT-S average qualifying score ranges 28–38 depending on university.'}
                                        </p>

                                        <div className="mb-8">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Target Score</span>
                                                <span className="text-4xl font-black text-indigo-600">{targetScore}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={exam === 'imat' ? 30 : 20}
                                                max={exam === 'imat' ? 90 : 55}
                                                value={targetScore}
                                                onChange={e => setTargetScore(Number(e.target.value))}
                                                className="w-full h-3 rounded-full accent-indigo-600"
                                            />
                                            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                <span>Min</span>
                                                <span>Competitive</span>
                                                <span>Top Tier</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {(exam === 'imat' ? [
                                                { min: 30, max: 45, label: 'Qualifying', desc: 'Smaller/regional universities', color: 'amber' },
                                                { min: 46, max: 57, label: 'Competitive', desc: 'Mid-tier public universities', color: 'indigo' },
                                                { min: 58, max: 90, label: 'Top Tier', desc: 'Sapienza, Milan, Bologna', color: 'emerald' },
                                            ] : [
                                                { min: 20, max: 28, label: 'Qualifying', desc: 'Regional CISIA universities', color: 'amber' },
                                                { min: 29, max: 37, label: 'Competitive', desc: 'Most public Italian universities', color: 'indigo' },
                                                { min: 38, max: 55, label: 'Top Tier', desc: 'Top-ranking Italian uni\'s', color: 'emerald' },
                                            ]).map(b => (
                                                <div key={b.label} className={cn(
                                                    "p-4 rounded-2xl border-2 text-center transition-all",
                                                    targetScore >= b.min && targetScore <= b.max 
                                                        ? `border-${b.color}-500 bg-${b.color}-50 dark:bg-${b.color}-900/10` 
                                                        : "border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                                )}>
                                                    <p className="text-xl font-black text-slate-900 dark:text-white">{b.min}–{b.max}</p>
                                                    <p className={cn("text-[10px] font-black uppercase tracking-widest", `text-${b.color}-600`)}>{b.label}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-1">{b.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── STEP: Review ── */}
                                {step === 'review' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                                                <Rocket className="w-5 h-5 text-white" />
                                            </div>
                                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Your Study Plan</h2>
                                        </div>
                                        <p className="text-sm text-slate-500 mb-8 ml-12">Review everything below. You can always update your plan from the dashboard.</p>

                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                                            {[
                                                { label: 'Exam', val: exam.toUpperCase(), icon: GraduationCap, color: 'indigo' },
                                                { label: 'Days Left', val: daysLeft, icon: Clock, color: 'violet' },
                                                { label: 'Daily Hours', val: `${hoursPerDay}h`, icon: Flame, color: 'amber' },
                                                { label: 'Target Score', val: targetScore, icon: Trophy, color: 'rose' },
                                            ].map(item => (
                                                <div key={item.label} className={cn("bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-center")}>
                                                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none mb-1">{item.val}</p>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Subject Daily Plan */}
                                        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 mb-5">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Daily Subject Allocation</p>
                                            <div className="space-y-3">
                                                {weeklyPlan.map(s => (
                                                    <div key={s.subject} className="flex items-center gap-3">
                                                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", s.bg)}>
                                                            <s.icon className={cn("w-4 h-4", s.color)} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{s.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full",
                                                                        levels[s.subject] === 'weak' ? "bg-rose-100 text-rose-600" :
                                                                            levels[s.subject] === 'strong' ? "bg-emerald-100 text-emerald-600" :
                                                                                "bg-amber-100 text-amber-600"
                                                                    )}>
                                                                        {LEVEL_EMOJI[levels[s.subject]]} {LEVEL_LABEL[levels[s.subject]]}
                                                                    </span>
                                                                    <span className="text-xs font-black text-slate-900 dark:text-white">{s.minsPerDay}min</span>
                                                                </div>
                                                            </div>
                                                            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div className={cn("h-full rounded-full", s.color.replace('text-', 'bg-'))} style={{ width: `${(s.minsPerDay / (hoursPerDay * 60)) * 100}%`, opacity: 0.7 }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Phase */}
                                        <div className={cn("p-4 rounded-2xl border mb-5", `bg-${phase.color}-50 dark:bg-${phase.color}-900/10 border-${phase.color}-200 dark:border-${phase.color}-500/30`)}>
                                            <div className="flex items-center gap-3">
                                                <Target className={cn("w-5 h-5 flex-shrink-0", `text-${phase.color}-600`)} />
                                                <div>
                                                    <p className={cn("text-sm font-black", `text-${phase.color}-700 dark:text-${phase.color}-300`)}>{phase.label}</p>
                                                    <p className={cn("text-xs font-medium", `text-${phase.color}-600/80 dark:text-${phase.color}-400/80`)}>{phase.desc}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="w-full h-14 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-base uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40 transition-all"
                                        >
                                            {saving ? (
                                                <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving Plan...</span>
                                            ) : (
                                                <span className="flex items-center gap-2"><Rocket className="w-5 h-5" /> Launch My Study Plan</span>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                        ) : (
                            <div className="p-10 text-center">
                                <p className="text-sm font-medium text-slate-500">Please use the controls above to manage your plan.</p>
                            </div>
                        )}

                        {/* Navigation Footer */}
                        {!existingPlan && step !== 'review' && (
                            <div className="px-6 md:px-10 pb-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-5">
                                <Button
                                    variant="outline"
                                    onClick={step === 'exam' ? () => navigate('/dashboard') : prevStep}
                                    className="h-11 px-6 rounded-xl font-black text-xs uppercase tracking-widest border-2"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    {step === 'exam' ? 'Cancel' : 'Back'}
                                </Button>
                                <Button
                                    onClick={nextStep}
                                    disabled={!canProceed}
                                    className="h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
                                >
                                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
