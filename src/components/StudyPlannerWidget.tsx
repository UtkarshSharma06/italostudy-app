import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import {
    Calendar, Sparkles, Clock, CheckCircle2, Play,
    Settings, Target, TrendingUp, ArrowRight, BookOpen,
    FlaskConical, Zap, Brain, Atom, Binary, Flame, Trophy, Info, X, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { differenceInDays } from 'date-fns';
import type { StudyPlanConfig } from '@/pages/StudyPlanner';
import { EXAM_SUBJECTS } from '@/pages/StudyPlanner';

// Helpers
const LEVEL_MULT = { weak: 1.5, medium: 1.0, strong: 0.6 };

function daysUntil(d: string) {
    return Math.max(0, Math.ceil((new Date(d).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000));
}

function getTodaysTasks(
    config: StudyPlanConfig, 
    completedToday: string[], 
    performance: Record<string, number> = {}, 
    missedYesterday: string[] = [],
    isReviewDay: boolean = false
) {
    const subjects = EXAM_SUBJECTS[config.exam] ?? EXAM_SUBJECTS.imat;
    const totalMins = config.hoursPerDay * 60;
    
    // 1. Calculate Multipliers (Level + Performance Feedback + Catch-up)
    const weighted = subjects.map(s => {
        let multiplier = LEVEL_MULT[config.subjectLevels[s.subject] ?? 'medium'];
        
        // FEEDBACK LOOP: If accuracy < 50%, boost time by 20%
        if (performance[s.subject] !== undefined && performance[s.subject] < 50) {
            multiplier *= 1.2;
        }
        
        // CATCH-UP: If missed yesterday, boost today's time by 15%
        if (missedYesterday.includes(s.name)) {
            multiplier *= 1.15;
        }
        
        return { ...s, adj: s.weight * multiplier };
    });
    
    const sum = weighted.reduce((a, b) => a + b.adj, 0);
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    
    const baseTasks = weighted.map(s => ({
        ...s,
        minsPerDay: Math.max(10, Math.round((s.adj / sum) * totalMins)),
        topic: s.topics[dayOfYear % s.topics.length],
        practiceLink: `/start-test?subject=${encodeURIComponent(s.subject)}&mode=practice`,
        completed: completedToday.includes(s.name),
        isCarryover: missedYesterday.includes(s.name),
        isWeakSpot: performance[s.subject] !== undefined && performance[s.subject] < 50,
        isReview: false
    }));

    // FORGETTING CURVES: Add a review task on review days
    if (isReviewDay) {
        // Pick the subject with lowest accuracy for review
        const weakest = [...baseTasks].sort((a, b) => (performance[a.subject] || 100) - (performance[b.subject] || 100))[0];
        if (weakest) {
            baseTasks.push({
                ...weakest,
                name: `Review: ${weakest.name}`,
                minsPerDay: 20,
                topic: weakest.topics[Math.abs(dayOfYear - 7) % weakest.topics.length], // Topic from 7 days ago
                practiceLink: `/start-test?subject=${encodeURIComponent(weakest.subject)}&mode=practice`,
                completed: completedToday.includes(`Review: ${weakest.name}`),
                isReview: true,
                isCarryover: false,
                isWeakSpot: false
            } as any);
        }
    }

    return baseTasks;
}

// ─── No Plan CTA ─────────────────────────────────────────────────────────────

function NoPlanCTA() {
    const navigate = useNavigate();
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate('/study-planner')}
            className="relative overflow-hidden rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/80 via-violet-50/50 to-purple-50/30 dark:from-indigo-900/10 dark:via-violet-900/5 dark:to-slate-900 p-6 cursor-pointer group hover:border-indigo-400 hover:shadow-lg transition-all duration-200"
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100/40 dark:bg-indigo-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
            <motion.div
                animate={{ rotate: [0, -6, 6, -4, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
                className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40"
            >
                <Calendar className="w-6 h-6 text-white" />
            </motion.div>

            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">
                Create Your Study Plan
            </h3>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Get a personalized daily schedule built from the official IMAT & CENT-S syllabus weight.
            </p>

            <div className="inline-flex items-center gap-2 bg-indigo-600 group-hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-200 dark:shadow-indigo-900/40">
                <Sparkles className="w-3.5 h-3.5" />
                Build My Plan <ArrowRight className="w-3 h-3" />
            </div>
        </motion.div>
    );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onToggle }: { task: any; onToggle: () => void }) {
    const navigate = useNavigate();
    return (
        <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl border transition-all",
            task.completed
                ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-500/20"
                : "bg-white dark:bg-slate-800/80 border-slate-100 dark:border-slate-700 hover:border-indigo-200 hover:shadow-sm"
        )}>
            <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 relative", 
                task.completed ? "bg-emerald-100 dark:bg-emerald-900/30" : task.bg
            )}>
                {task.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <task.icon className={cn("w-4 h-4", task.color)} />}
                
                {/* Status Indicators */}
                {!task.completed && (
                    <div className="absolute -top-1 -right-1 flex gap-0.5">
                        {task.isWeakSpot && <div className="w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-slate-800 animate-pulse" title="Performance Adjustment" />}
                        {task.isCarryover && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full border border-white dark:border-slate-800" title="Carryover Task" />}
                        {task.isReview && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full border border-white dark:border-slate-800" title="Review Task" />}
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className={cn("text-[10px] font-black uppercase tracking-tight leading-none", task.completed ? "text-emerald-600 line-through" : "text-slate-900 dark:text-white")}>{task.name}</p>
                    {task.isReview && <span className="px-1 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[6px] font-black uppercase tracking-widest rounded-sm">Review</span>}
                    {task.isCarryover && <span className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[6px] font-black uppercase tracking-widest rounded-sm">Missed</span>}
                </div>
                <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5">{task.topic}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5"><Clock className="w-3 h-3" />{task.minsPerDay}m</span>
                {!task.completed ? (
                    <button onClick={() => navigate(task.practiceLink)} className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors shadow-sm active:scale-95">
                        <Play className="w-3.5 h-3.5 fill-white" />
                    </button>
                ) : (
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── How It Works Modal ───────────────────────────────────────────────────────

function HowItWorksModal({ onClose, config }: { onClose: () => void, config: StudyPlanConfig }) {
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">How Your Plan Works</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">The Mathematics of Success</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                        Your study plan isn't random. It's built on a dynamically optimized algorithm that adapts to your target exam, available time, and subject strengths.
                    </p>

                    <div className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Target className="w-4 h-4 text-indigo-500" /> 1. Syllabus Accuracy
                            </h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                The engine knows the exact weight of each subject for the <strong>{config.exam.toUpperCase()}</strong>. It uses these official percentages as the baseline to divide your {config.hoursPerDay} daily study hours.
                            </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-emerald-500" /> 2. Live Feedback Loop
                            </h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                The engine analyzes your last 7 days of practice. If your accuracy drops below 50% in a subject, it automatically triggers a <strong>20% time boost</strong> for that subject today. It also carries over missed tasks from yesterday to ensure zero knowledge gaps.
                            </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-indigo-500" /> 3. Forgetting Curves
                            </h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                Every Sunday, the algorithm adds a <strong>Review Task</strong> for your weakest subject. It picks a topic you studied 7 days ago to reinforce long-term retention via spaced repetition.
                            </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-rose-500" /> 4. Phase Transitions
                            </h3>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed space-y-2">
                                {(() => {
                                    const totalDays = Math.max(1, differenceInDays(new Date(config.examDate), new Date(config.createdAt || new Date())));
                                    const fCutoff = Math.floor(totalDays * 0.6);
                                    const pCutoff = Math.floor(totalDays * 0.2);
                                    return (
                                        <>
                                            <p>As your exam date approaches, your {totalDays}-day plan automatically shifts focus:</p>
                                            <ul className="space-y-1 ml-1">
                                                <li><strong className="text-blue-600 dark:text-blue-400">Foundation ({fCutoff}+ days left):</strong> Deep, wide theory coverage.</li>
                                                <li><strong className="text-amber-600 dark:text-amber-400">Practice ({pCutoff}-{fCutoff} days):</strong> Heavy emphasis on question drilling.</li>
                                                <li><strong className="text-rose-600 dark:text-rose-400">Mock Sprint (&lt;{pCutoff} days):</strong> Total focus on timed mock conditions.</li>
                                            </ul>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                    <Button onClick={onClose} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl h-11">
                        Got it, Let's Study!
                    </Button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export default function StudyPlannerWidget({ examType }: { examType?: string }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [config, setConfig] = useState<StudyPlanConfig | null>(null);
    const [completedToday, setCompletedToday] = useState<string[]>([]);
    const [performanceData, setPerformanceData] = useState<Record<string, number>>({});
    const [missedYesterday, setMissedYesterday] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showHowItWorks, setShowHowItWorks] = useState(false);

    useEffect(() => {
        if (!user) return;
        
        const init = async () => {
            // 1. Load Config
            const local = localStorage.getItem(`study_plan_${examType}_${user.id}`);
            let plan: any = null;
            if (local) { 
                try { 
                    plan = JSON.parse(local);
                    setConfig(plan); 
                } catch (_) {} 
            }
            
            // 2. Load Today's Progress
            const todayKey = `study_completed_${user.id}_${new Date().toISOString().split('T')[0]}`;
            const done = localStorage.getItem(todayKey);
            if (done) { try { setCompletedToday(JSON.parse(done)); } catch (_) {} }
            
            // 3. CATCH-UP: Load Yesterday's Missed Tasks
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayKey = `study_completed_${user.id}_${yesterday.toISOString().split('T')[0]}`;
            const yesterdayDone = localStorage.getItem(yesterdayKey);
            if (yesterdayDone && plan) {
                try {
                    const doneList = JSON.parse(yesterdayDone);
                    const subjects = EXAM_SUBJECTS[plan.exam as 'imat' | 'cent-s'] || [];
                    const missed = subjects.filter(s => !doneList.includes(s.name)).map(s => s.name);
                    setMissedYesterday(missed);
                } catch (_) {}
            }

            // 4. FEEDBACK LOOP: Fetch Real Performance (Last 7 days)
            try {
                const { data: responses } = await supabase
                    .from('user_practice_responses')
                    .select('subject, is_correct')
                    .eq('user_id', user.id)
                    .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());

                if (responses) {
                    const stats: Record<string, { total: number, correct: number }> = {};
                    responses.forEach((r: any) => {
                        const sub = (r.subject || '').toLowerCase();
                        if (!stats[sub]) stats[sub] = { total: 0, correct: 0 };
                        stats[sub].total++;
                        if (r.is_correct) stats[sub].correct++;
                    });
                    const perf: Record<string, number> = {};
                    Object.keys(stats).forEach(k => {
                        perf[k] = Math.round((stats[k].correct / stats[k].total) * 100);
                    });
                    setPerformanceData(perf);
                }
            } catch (_) {}

            setIsLoading(false);
        };

        init();
    }, [user, examType]);

    const isReviewDay = new Date().getDay() === 0; // Sunday is review day
    const tasks = useMemo(() => config ? getTodaysTasks(config, completedToday, performanceData, missedYesterday, isReviewDay) : [], [config, completedToday, performanceData, missedYesterday, isReviewDay]);
    const daysLeft = useMemo(() => config ? daysUntil(config.examDate) : 0, [config]);
    const completedCount = tasks.filter(t => t.completed).length;
    const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    const handleToggle = (taskName: string) => {
        const next = completedToday.includes(taskName)
            ? completedToday.filter(s => s !== taskName)
            : [...completedToday, taskName];
        setCompletedToday(next);
        if (user) {
            const key = `study_completed_${user.id}_${new Date().toISOString().split('T')[0]}`;
            localStorage.setItem(key, JSON.stringify(next));
        }
    };

    const handleDeletePlan = () => {
        if (!user) return;
        if (window.confirm("Are you sure you want to completely delete your localized study plan? You will return to the global dashboard.")) {
            localStorage.removeItem(`study_plan_${examType}_${user.id}`);
            window.location.reload();
        }
    };

    const totalDays = useMemo(() => config ? Math.max(1, differenceInDays(new Date(config.examDate), new Date(config.createdAt || new Date()))) : 120, [config]);

    if (isLoading) return null;
    if (!config) return <NoPlanCTA />;

    const fCutoff = Math.floor(totalDays * 0.6);
    const pCutoff = Math.floor(totalDays * 0.2);
    const phase = daysLeft > fCutoff ? 'Foundation' : daysLeft > pCutoff ? 'Practice' : 'Mock Sprint';
    const phaseColor = phase === 'Foundation' ? 'text-blue-600 bg-blue-100' : phase === 'Practice' ? 'text-amber-600 bg-amber-100' : 'text-rose-600 bg-rose-100';

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-4 overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <span className="text-[9px] font-black text-white/60 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                            <Calendar className="w-3 h-3" /> Today's Study Plan
                        </span>
                        <h3 className="text-base font-black text-white leading-tight">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-center bg-white/15 border border-white/20 rounded-xl px-3 py-1.5 hidden sm:block">
                            <p className="text-lg font-black text-white leading-none">{daysLeft}</p>
                            <p className="text-[8px] font-bold text-white/60 uppercase tracking-widest">days left</p>
                        </div>
                        <button onClick={() => setShowHowItWorks(true)} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10" title="How does this work?">
                            <Info className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button onClick={() => navigate('/study-planner')} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10" title="Settings">
                            <Settings className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button onClick={handleDeletePlan} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-red-500/80 hover:border-red-500/50 flex items-center justify-center transition-colors border border-white/10" title="Delete Plan">
                            <Trash2 className="w-3.5 h-3.5 text-white" />
                        </button>
                    </div>
                </div>
                <div className="relative z-10 flex items-center flex-wrap gap-2 mt-2.5">
                    <span className="px-2.5 py-1 bg-white/15 border border-white/20 rounded-lg text-[9px] font-black text-white uppercase tracking-widest">{config.exam.toUpperCase()}</span>
                    <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest", "bg-white/15 border border-white/20 text-white")}>{phase} Phase</span>
                    <span className="px-2.5 py-1 bg-white/15 border border-white/20 rounded-lg text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1">
                        <Trophy className="w-2.5 h-2.5" /> Target: {config.targetScore}
                    </span>
                    {(Object.keys(performanceData).length > 0 || missedYesterday.length > 0) && (
                        <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-[9px] font-black text-emerald-200 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                            <Zap className="w-2.5 h-2.5 fill-emerald-200" /> Adaptive Tuning Active
                        </span>
                    )}
                </div>
            </div>

            {/* Tasks */}
            <div className="p-4 space-y-2">
                {tasks.map(task => (
                    <TaskCard key={task.name} task={task} onToggle={() => handleToggle(task.name)} />
                ))}
            </div>

            {/* Footer Progress */}
            <div className="px-4 pb-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Today's Progress</span>
                        <span className="text-[9px] font-black text-indigo-600">{completedCount}/{tasks.length} done</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={cn("h-full rounded-full", progressPct === 100 ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-gradient-to-r from-indigo-500 to-violet-600")}
                        />
                    </div>
                    {progressPct === 100 && (
                        <p className="text-[10px] font-black text-emerald-600 text-center mt-2">🎉 All done for today!</p>
                    )}
                </div>
            </div>
            
            <AnimatePresence>
                {showHowItWorks && config && (
                    <HowItWorksModal config={config} onClose={() => setShowHowItWorks(false)} />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
