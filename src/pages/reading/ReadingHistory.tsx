import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import {
    BookOpen,
    Clock,
    Target,
    Calendar,
    ChevronRight,
    ArrowLeft,
    FileText
} from 'lucide-react';
import { format } from 'date-fns';

export default function ReadingHistory() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        if (!loading && !user) navigate('/auth');
        if (user) fetchReadingHistory();
    }, [user, loading]);

    const fetchReadingHistory = async () => {
        setIsFetching(true);
        const { data, error } = await (supabase as any)
            .from('reading_submissions')
            .select('*')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false });

        if (data) setEvaluations(data);
        setIsFetching(false);
    };

    if (loading || isFetching) {
        return (
            <Layout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto px-6 py-12 max-w-5xl">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-indigo-600 transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
                </button>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-100">
                            <BookOpen className="w-3 h-3" /> IELTS Module
                        </div>
                        <h1 className="text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-tight">
                            Reading <span className="text-blue-600">History</span>
                        </h1>
                        <p className="text-lg text-slate-400 font-bold tracking-tight">Track your progress in Reading missions.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white dark:bg-card p-4 rounded-[2rem] border-2 border-slate-100 dark:border-border shadow-xl shadow-slate-200/50">
                        <div className="text-center px-6 border-r border-slate-100">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Missions</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white uppercase">{evaluations.length}</p>
                        </div>
                        <div className="text-center px-6">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Avg Score</p>
                            <p className="text-2xl font-black text-blue-600 uppercase">
                                {evaluations.length > 0
                                    ? Math.round(evaluations.reduce((acc, curr) => acc + (curr.score || 0), 0) / evaluations.length)
                                    : 0}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6">
                    {evaluations.map((evalItem) => (
                        <div
                            key={evalItem.id}
                            onClick={() => navigate(`/reading/results/${evalItem.id}`)}
                            className="bg-white dark:bg-card p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-border border-b-[6px] shadow-xl shadow-slate-200/50 hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 dark:bg-muted border border-slate-100 dark:border-border flex items-center justify-center text-3xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner">
                                        📖
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none uppercase text-base">IELTS Reading Test</h3>
                                            <div className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                Completed
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5" /> {format(new Date(evalItem.created_at), 'PPP')}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5" /> {format(new Date(evalItem.created_at), 'p')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="bg-slate-50/50 dark:bg-muted/50 px-8 py-4 rounded-[1.5rem] border border-slate-50 dark:border-border text-center min-w-[120px]">
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Score</p>
                                        <p className="text-3xl font-black tracking-tight text-blue-600">
                                            {evalItem.score}%
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-muted border border-slate-100 flex items-center justify-center group-hover:translate-x-2 transition-transform shadow-sm">
                                        <ChevronRight className="w-5 h-5 text-slate-300" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {evaluations.length === 0 && (
                        <div className="text-center py-32 bg-white dark:bg-card rounded-[4rem] border-2 border-slate-100 dark:border-border border-b-[10px] shadow-2xl shadow-slate-200/50">
                            <div className="w-24 h-24 bg-slate-50 dark:bg-muted rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-slate-100 dark:border-border">
                                <BookOpen className="w-10 h-10 text-slate-200" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-3 tracking-tight">No History Found</h3>
                            <p className="text-slate-400 font-bold mb-10 max-w-xs mx-auto text-lg leading-relaxed">Complete your first reading mission to see your performance logs here.</p>
                            <Button
                                onClick={() => navigate('/practice')}
                                className="bg-slate-900 text-white hover:bg-slate-800 font-black px-12 py-8 rounded-2xl h-16 shadow-xl shadow-slate-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all text-sm tracking-widest uppercase"
                            >
                                Start Reading Mission
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
