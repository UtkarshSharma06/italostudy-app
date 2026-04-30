import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import {
    Mic,
    Clock,
    Target,
    Calendar,
    ChevronRight,
    ArrowLeft,
    Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

export default function SpeakingHistory() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        if (!loading && !user) navigate('/auth');
        if (user) fetchSpeakingHistory();
    }, [user, loading]);

    const fetchSpeakingHistory = async () => {
        setIsFetching(true);
        const { data, error } = await (supabase as any)
            .from('speaking_sessions')
            .select('*, speaking_scores(overall_score)')
            .eq('candidate_id', user?.id)
            .order('started_at', { ascending: false });

        if (data) setEvaluations(data);
        setIsFetching(false);
    };

    if (loading || isFetching) {
        return (
            <Layout>
                <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center bg-[#f8fafc] dark:bg-[#020617]">
                    <div className="w-12 h-12 border-4 border-slate-100 dark:border-white/5 border-t-indigo-600 rounded-full animate-spin" />
                </div>
            </Layout>
        );
    }

    const avgBand = evaluations.length > 0
        ? (evaluations.filter(e => e.speaking_scores?.[0]?.overall_score).reduce((acc, curr) => acc + (curr.speaking_scores?.[0]?.overall_score || 0), 0) / (evaluations.filter(e => e.speaking_scores?.[0]?.overall_score).length || 1)).toFixed(1)
        : '0.0';

    return (
        <Layout showFooter={false}>
            <div className="min-h-[calc(100vh-4.5rem)] bg-[#f8fafc] dark:bg-[#020617] relative overflow-hidden py-12 md:py-20">
                {/* Visual Background Elements */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/5 dark:bg-indigo-600/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/5 dark:bg-blue-600/10 rounded-full blur-[120px]" />
                </div>

                <div className="container max-w-5xl px-6 relative z-10 mx-auto">
                    <motion.button
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => navigate('/speaking')}
                        className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-12 group"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Back to Lobby
                    </motion.button>

                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-16">
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-full"
                            >
                                <Target className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Performance Archive</span>
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic"
                            >
                                Mission <span className="text-indigo-600">Logs.</span>
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-xl"
                            >
                                Historical analysis of your interactive peer sessions and band score progression.
                            </motion.p>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center gap-1 p-2 rounded-[2.5rem] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl"
                        >
                            <div className="px-8 py-4 text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sessions</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{evaluations.length}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-100 dark:bg-white/10" />
                            <div className="px-8 py-4 text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Score</p>
                                <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 leading-none tracking-tighter">{avgBand}</p>
                            </div>
                        </motion.div>
                    </div>

                    <div className="grid gap-6">
                        {evaluations.map((evalItem, i) => (
                            <motion.div
                                key={evalItem.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * (i % 5) }}
                                onClick={() => navigate(`/speaking/${evalItem.id}`)}
                                className="bg-white dark:bg-slate-900/40 backdrop-blur-3xl border border-slate-200 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                        <Mic className="w-7 h-7" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg italic leading-none">Speaking Session</h3>
                                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded text-[9px] font-black uppercase tracking-widest">Completed</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                            <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {evalItem.started_at ? format(new Date(evalItem.started_at), 'PPP') : 'N/A'}</div>
                                            <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {evalItem.started_at ? format(new Date(evalItem.started_at), 'p') : 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="px-6 py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-center min-w-[100px]">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Band Score</p>
                                        <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter leading-none">
                                            {evalItem.speaking_scores?.[0]?.overall_score?.toFixed(1) || '—'}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:border-indigo-500/50 group-hover:translate-x-1 transition-all">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {evaluations.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-24 bg-white dark:bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm"
                            >
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-[2rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-8 border border-indigo-100 dark:border-indigo-500/20">
                                    <Mic className="w-10 h-10" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic mb-3">No Mission Records</h3>
                                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto mb-10">Start your first speaking session to begin tracking your academic progression.</p>
                                <Button
                                    onClick={() => navigate('/speaking')}
                                    className="h-16 px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                                >
                                    Launch Lobby
                                </Button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
