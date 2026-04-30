
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle, XCircle, Home, RotateCcw } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function ListeningResult() {
    const { submissionId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState<any>(null);
    const [test, setTest] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (submissionId && user) {
            fetchResult();
        }
    }, [submissionId, user]);

    const fetchResult = async () => {
        try {
            // Fetch Submission
            const { data: subData, error: subError } = await supabase
                .from('listening_submissions')
                .select('*')
                .eq('id', submissionId)
                .single();

            if (subError) throw subError;
            setSubmission(subData);

            // Fetch Test Details
            const { data: testData, error: testError } = await supabase
                .from('listening_tests')
                .select('*')
                .eq('id', subData.test_id)
                .single();

            if (testError) throw testError;
            setTest(testData);

            // Fetch Parts and Questions
            const { data: partData } = await supabase
                .from('listening_parts')
                .select('id')
                .eq('test_id', subData.test_id);

            if (partData && partData.length > 0) {
                const partIds = partData.map(p => p.id);
                const { data: qData } = await supabase
                    .from('listening_questions')
                    .select('*')
                    .in('part_id', partIds)
                    .order('order_index');

                if (qData) setQuestions(qData);
            }

        } catch (error) {
            console.error('Error fetching results:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex h-screen items-center justify-center">
                    <Loader2 className="animate-spin" />
                </div>
            </Layout>
        );
    }

    if (!submission || !test) {
        return (
            <Layout>
                <div className="p-10 text-center">Result not found.</div>
            </Layout>
        );
    }

    const totalQuestions = questions.length;
    const scorePercentage = totalQuestions > 0 ? Math.round((submission.score / totalQuestions) * 100) : 0;

    const checkIsCorrect = (q: any, userAns: any) => {
        const correctAns = q.correct_answer || '';
        if (!userAns) return false;

        if (Array.isArray(userAns)) {
            const userSorted = [...userAns].map(s => s.trim().toLowerCase()).sort().join(',');
            const correctSorted = correctAns.split(',').map(s => s.trim().toLowerCase()).sort().join(',');
            return userSorted === correctSorted;
        } else {
            return userAns.trim().toLowerCase() === correctAns.trim().toLowerCase();
        }
    };

    return (
        <Layout>
            <div className="container mx-auto px-6 py-12 max-w-5xl">
                {/* Header */}
                <div className="flex items-center gap-4 mb-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/dashboard')}
                        className="rounded-xl border border-slate-200"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <h1 className="text-xl font-black uppercase text-slate-800">Listening Mission Report</h1>
                </div>

                {/* Score Card */}
                <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-100 shadow-xl mb-12 text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">{test.title}</h2>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Test Completed</p>

                        <div className={`text-8xl font-black tracking-tighter mb-4 ${scorePercentage >= 70 ? 'text-emerald-500' : 'text-indigo-600'}`}>
                            {scorePercentage}%
                        </div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                            {submission.score} / {totalQuestions} Correct
                        </p>
                    </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-6">
                    <h3 className="text-lg font-black uppercase text-slate-800">Answer Analysis</h3>
                    <div className="grid gap-4">
                        {questions.map((q, i) => {
                            const userAnswer = submission.answers[q.id];
                            const isCorrect = checkIsCorrect(q, userAnswer);

                            return (
                                <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
                                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                        {isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-800 mb-2">
                                            <span className="font-bold text-slate-400 mr-2">Q{i + 1}</span>
                                            {q.question_text}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div className={`p-3 rounded-lg ${isCorrect ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                                                <span className="block text-[10px] font-black uppercase text-slate-400 mb-1">Your Answer</span>
                                                <span className={`font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                    {Array.isArray(userAnswer) ? userAnswer.join(', ') : (userAnswer || '(Skipped)')}
                                                </span>
                                            </div>
                                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                <span className="block text-[10px] font-black uppercase text-slate-400 mb-1">Correct Answer</span>
                                                <span className="font-bold text-slate-700">{q.correct_answer}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 mt-12">
                    <Button onClick={() => navigate('/dashboard')} variant="outline" className="flex-1 h-12">
                        <Home className="w-4 h-4 mr-2" /> Dashboard
                    </Button>
                    <Button onClick={() => navigate('/practice')} className="flex-1 h-12">
                        <RotateCcw className="w-4 h-4 mr-2" /> Practice More
                    </Button>
                </div>
            </div>
        </Layout>
    );
}
