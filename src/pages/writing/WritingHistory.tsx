import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import {
    FileText,
    Clock,
    Target,
    Calendar,
    ChevronRight,
    CheckCircle,
    ArrowLeft,
    Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

export default function WritingHistory() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        if (!loading && !user) navigate('/auth');
        if (user) fetchWritingHistory();
    }, [user, loading]);

    const fetchWritingHistory = async () => {
        setIsFetching(true);
        const { data, error } = await supabase
            .from('writing_submissions')
            .select('*, writing_feedback(overall_score)')
            .eq('user_id', user?.id)
            .in('status', ['pending', 'completed'])
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
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                            <FileText className="w-3 h-3" /> IELTS Module
                        </div>
                        <h1 className="text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-tight">
                            Writing <span className="text-indigo-600">Evaluations</span>
                        </h1>
                        <p className="text-lg text-slate-400 font-bold tracking-tight">Review your graded essays and examiner feedback.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white dark:bg-card p-4 rounded-[2rem] border-2 border-slate-100 dark:border-border shadow-xl shadow-slate-200/50">
                        <div className="text-center px-6 border-r border-slate-100">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Total</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white uppercase">{evaluations.length}</p>
                        </div>
                        <div className="text-center px-6 border-r border-slate-100">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Graded</p>
                            <p className="text-2xl font-black text-emerald-600 uppercase">
                                {evaluations.filter(e => e.status === 'completed').length}
                            </p>
                        </div>
                        <div className="text-center px-6">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Avg Band</p>
                            <p className="text-2xl font-black text-indigo-600 uppercase">
                                {(evaluations.filter(e => e.status === 'completed').reduce((acc, curr) => acc + (curr.writing_feedback?.[0]?.overall_score || 0), 0) /
                                    (evaluations.filter(e => e.status === 'completed').length || 1)).toFixed(1)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6">
                    {evaluations.map((evalItem) => (
                        <div
                            key={evalItem.id}
                            onClick={() => navigate(`/writing/results/${evalItem.id}`)}
                            className="bg-white dark:bg-card p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-border border-b-[6px] shadow-xl shadow-slate-200/50 hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 dark:bg-muted border border-slate-100 dark:border-border flex items-center justify-center text-3xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner">
                                        ✍️
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none uppercase text-base">IELTS Writing Task</h3>
                                            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border ${evalItem.status === 'completed'
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                                                }`}>
                                                {evalItem.status === 'completed' ? 'Evaluated' : 'In Review'}
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
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Band Score</p>
                                        <p className={`text-3xl font-black tracking-tight ${evalItem.status === 'completed' ? 'text-indigo-600' : 'text-slate-200'}`}>
                                            {evalItem.status === 'completed' ? (evalItem.writing_feedback?.[0]?.overall_score || '—') : '...'}
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
                                <Sparkles className="w-10 h-10 text-slate-200" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-3 tracking-tight">No Evaluations Yet</h3>
                            <p className="text-slate-400 font-bold mb-10 max-w-xs mx-auto text-lg leading-relaxed">Complete your first writing mission and get it evaluated by our examiners.</p>
                            <Button
                                onClick={() => navigate('/practice')}
                                className="bg-slate-900 text-white hover:bg-slate-800 font-black px-12 py-8 rounded-2xl h-16 shadow-xl shadow-slate-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all text-sm tracking-widest uppercase"
                            >
                                Start Writing Mission
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
