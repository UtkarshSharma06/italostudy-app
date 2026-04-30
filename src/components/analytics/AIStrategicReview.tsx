import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, Loader2, ChevronRight, Target, Clock, Zap, BookOpen, Activity, AlertCircle, BarChart3, Binary } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

interface AIStrategicReviewProps {
    examName: string;
    stats: {
        gross: number;
        penalty: number;
        net: number;
        skipped: number;
        wrong: number;
    };
    questions: any[];
    topicMastery: any[];
}

export default function AIStrategicReview({ examName, stats, questions, topicMastery }: AIStrategicReviewProps) {
    const [review, setReview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingPhase, setLoadingPhase] = useState(0);

    const phases = [
        "Analyzing all-time performance vectors...",
        "Correlating time-sinks with topic difficulty...",
        "Calculating accuracy decay & fatigue curves...",
        "Vectoring subject mastery vs exam weightings...",
        "Drafting elite strategic protocol..."
    ];

    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setLoadingPhase(prev => (prev + 1) % phases.length);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [loading]);

    const generateReview = async () => {
        setLoading(true);
        setLoadingPhase(0);
        try {
            // DEEP ANALYTICS CALCULATION
            const totalQ = questions.length || 1;

            // 1. Accuracy Decay (Fatigue)
            const midPoint = Math.ceil(questions.length / 2);
            const firstHalfAcc = (questions.slice(0, midPoint).filter(q => q.user_answer === q.correct_index).length / Math.max(1, midPoint)) * 100;
            const secondHalfAcc = (questions.slice(midPoint).filter(q => q.user_answer === q.correct_index).length / Math.max(1, questions.length - midPoint)) * 100;
            const fatigueDrop = (firstHalfAcc - secondHalfAcc).toFixed(1);

            // 2. Time Sink Analysis
            const correctTime = questions.filter(q => q.user_answer === q.correct_index).reduce((acc, q) => acc + (q.time_spent_seconds || 0), 0) / Math.max(1, questions.filter(q => q.user_answer === q.correct_index).length);
            const wrongTime = questions.filter(q => q.user_answer !== q.correct_index && q.user_answer !== null).reduce((acc, q) => acc + (q.time_spent_seconds || 0), 0) / Math.max(1, questions.filter(q => q.user_answer !== q.correct_index && q.user_answer !== null).length);
            const timeEfficiencyGap = (wrongTime - correctTime).toFixed(1);

            // 3. Guessing Risk Ratio
            const guessingRisk = ((stats.penalty / Math.max(1, stats.gross)) * 100).toFixed(1);

            // 4. Topic Sensitivity
            const volatility = topicMastery.length > 0
                ? (topicMastery.reduce((acc, t) => acc + Math.abs(t.accuracy - 50), 0) / topicMastery.length).toFixed(1)
                : 0;

            const topicsData = topicMastery
                .sort((a, b) => a.accuracy - b.accuracy)
                .map(t => `${t.topic}: ${t.accuracy}%`)
                .slice(0, 15)
                .join(', ');

            const prompt = `
                You are an Elite Strategic Consultant for high-stakes medical/competitive exams like ${examName}. 
                Your task is to analyze these hidden behavioral patterns and provide a "surgical" performance diagnostic.

                PERFORMANCE DATA ARCHIVE:
                - Overall Accuracy: ${((questions.filter(q => q.user_answer === q.correct_index).length / totalQ) * 100).toFixed(1)}%
                - Net Point Efficiency: ${(stats.net / totalQ).toFixed(2)} Pts/Question
                - Accuracy Decay (Fatigue): ${fatigueDrop}% drop from 1st to 2nd half.
                - Time Efficiency Gap: Students spends ${timeEfficiencyGap}s LONGER on questions they eventually get WRONG.
                - Guessing Risk: ${guessingRisk}% of gross points are lost to penalties.
                - Score Profile: ${stats.gross} Gross | ${stats.penalty} Penalties | ${stats.net} Net.
                - Subject Mastery Matrix: ${topicsData}

                REQUIRED OUTPUT STRUCTURE (No generic advice, must be data-backed):
                1. 🧠 **Core Diagnostic**: Identify the single biggest "behavioral leak" (e.g. fatigue, over-guessing, or time-sinking).
                2. 📈 **Behavioral Vector**: Detail how their performance changes during a session (reference the ${fatigueDrop}% fatigue or the ${timeEfficiencyGap}s time gap).
                3. 🎯 **Mastery Prioritization**: Based on the mastery matrix, identify 3 "High-Yield" topics to focus on to maximize net score gains.
                4. 📅 **Precision Protocol (7 Days)**: A specific, day-by-day ritual to fix the identified leak.

                TONE: High-level, surgical, data-driven, and authoritative. Format with professional Markdown.
            `;

            const { data, error } = await supabase.functions.invoke('ask-tutor', {
                body: {
                    question: prompt,
                    context: { subject: examName }
                }
            });

            if (error) throw error;
            setReview(data.response);
        } catch (err) {
            console.error('Error generating AI review:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl border border-indigo-500/10 rounded-[2.5rem] p-8 md:p-10 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full -mr-48 -mt-48 transition-colors group-hover:bg-indigo-500/15" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full -ml-48 -mb-48" />

            <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-200/50 group-hover:scale-105 transition-all duration-700 relative overflow-hidden">
                            <Brain className="w-8 h-8 text-white relative z-10" />
                            <motion.div
                                animate={{ opacity: [0.1, 0.3, 0.1] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-transparent"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[8.5px] font-black uppercase tracking-[0.2em] border border-indigo-500/20">Elite Intelligence</span>
                                <Activity className="w-3 h-3 text-indigo-400 animate-pulse" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter uppercase leading-none">Strategic <span className="text-indigo-600">Consultant</span></h3>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-2">Personalized Academic Diagnostic & Protocol</p>
                        </div>
                    </div>

                    {!review && !loading && (
                        <Button
                            onClick={generateReview}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-100/50 group/btn transition-all hover:-translate-y-1"
                        >
                            <Sparkles className="w-4 h-4 mr-3 text-indigo-400" />
                            <span>Run Diagnostic</span>
                            <ChevronRight className="w-4 h-4 ml-3 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="py-24 flex flex-col items-center justify-center space-y-8 text-center"
                        >
                            <div className="relative">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                    className="w-32 h-32 border-[1px] border-dashed border-indigo-300 rounded-full"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-20 h-20 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl">
                                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute -top-4 -right-4 w-12 h-12 bg-white dark:bg-slate-800 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-lg"
                                >
                                    <Binary className="w-6 h-6 text-indigo-600" />
                                </motion.div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-[0.1em]">{phases[loadingPhase]}</h4>
                                <div className="flex items-center justify-center gap-1">
                                    {phases.map((_, i) => (
                                        <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === loadingPhase ? 'w-8 bg-indigo-600' : 'w-2 bg-indigo-100'}`} />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : review ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000"
                        >
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-900 text-white p-5 rounded-[1.5rem] shadow-xl relative overflow-hidden group/card">
                                    <div className="absolute top-0 right-0 p-3 opacity-20"><Target className="w-10 h-10" /></div>
                                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Diagnosed Accuracy</p>
                                    <p className="text-3xl font-black tracking-tighter">
                                        {((questions.filter(q => q.user_answer === q.correct_index).length / Math.max(1, questions.length)) * 100).toFixed(1)}%
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-md">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Yield</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                        {(stats.net / Math.max(1, questions.length)).toFixed(2)}
                                        <span className="text-[10px] ml-1 uppercase text-slate-400">Pts/Q</span>
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-md">
                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Guessing Risk</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                        {((stats.penalty / Math.max(1, stats.gross)) * 100).toFixed(1)}%
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-md">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Stamina Rating</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                        {90 - parseFloat(((Math.max(1, questions.length / 100))).toFixed(0))}
                                        <span className="text-[10px] ml-1 uppercase text-slate-400">Idx</span>
                                    </p>
                                </div>
                            </div>

                            <div className="prose prose-slate dark:prose-invert max-w-none 
                                prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-headings:uppercase prose-headings:tracking-tight prose-headings:font-black
                                prose-p:text-slate-600 dark:prose-p:text-slate-400 prose-p:font-bold prose-p:leading-relaxed
                                prose-li:text-slate-600 dark:prose-li:text-slate-400 prose-li:font-bold
                                bg-white/60 dark:bg-slate-800/60 p-10 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl shadow-indigo-50/50"
                            >
                                <ReactMarkdown>{review}</ReactMarkdown>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-8 bg-slate-900 rounded-[2rem] text-white overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                        <AlertCircle className="w-6 h-6 text-indigo-300" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-indigo-200">Consultant Note</p>
                                        <p className="text-[11px] text-slate-400 font-bold max-w-md mt-1">This diagnostic is based on all-time behavioral patterns. Follow the protocol for 7 days before running a new scan.</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => setReview(null)}
                                    variant="outline"
                                    className="bg-transparent border-white/20 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest px-8 rounded-xl h-11 relative z-10 py-0"
                                >
                                    Re-Scan Metrics
                                </Button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { title: 'Behavioral Diagnostics', desc: 'AI identifies subtle patterns like accuracy decay across session length and time-sink correlations.', icon: BarChart3 },
                                { title: '7-Day Strategic Protocol', desc: 'Don\'t just study harder; study smarter with targeted rituals to patch your behavioral leaks.', icon: Zap },
                                { title: 'Risk Neutralization', desc: 'Identify if your guessing strategy is sabotaging your net score and calibrate your approach.', icon: AlertCircle }
                            ].map((feature, i) => (
                                <div key={i} className="p-8 rounded-[2rem] bg-slate-50/70 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-indigo-200 transition-colors group/feat">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm mb-6 group-hover/feat:scale-110 transition-transform">
                                        <feature.icon className="w-5 h-5 text-indigo-500" />
                                    </div>
                                    <h4 className="text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight mb-3 leading-none">{feature.title}</h4>
                                    <p className="text-[11px] text-slate-400 font-bold leading-relaxed">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
