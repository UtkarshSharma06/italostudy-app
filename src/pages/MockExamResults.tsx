import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Award, BookOpen, Headphones, PenTool, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface MockSubmission {
    id: string;
    started_at: string;
    overall_band: number;
    reading_band: number;
    listening_band: number;
    writing_band: number;
    status: string;
    mock_sessions: {
        title: string;
    };
    reading_submissions: any;
    listening_submissions: any;
    writing_submissions: any;
    writing_feedback: any[];
}

export default function MockExamResults() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState<MockSubmission | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchSubmission();
    }, [id]);

    const fetchSubmission = async () => {
        const { data, error } = await (supabase as any)
            .from('mock_exam_submissions')
            .select(`
                *,
                mock_sessions(title),
                reading_submissions(*),
                listening_submissions(*),
                writing_submissions(*)
            `)
            .eq('id', id)
            .single();

        if (data) {
            // Fetch writing feedback separately as it's linked to writing_submission
            let feedback = [];
            if ((data as any).writing_submission_id) {
                const { data: fb } = await supabase
                    .from('writing_feedback')
                    .select('*')
                    .eq('submission_id', (data as any).writing_submission_id);
                feedback = fb || [];
            }

            setSubmission({
                ...data,
                writing_feedback: feedback
            } as any as MockSubmission);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-[80vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            </Layout>
        );
    }

    if (!submission) {
        return (
            <Layout>
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold">Submission Not Found</h2>
                    <Button onClick={() => navigate('/history')} className="mt-4">Back to History</Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/history')}
                    className="mb-6 hover:bg-slate-100 -ml-2 text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest shrink-0"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
                </Button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 sm:mb-10 gap-6">
                    <div className="w-full md:w-auto">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 shadow-sm">Mock Exam</span>
                            <span className="text-slate-400 text-[10px] sm:text-xs font-bold flex items-center gap-1.5 ml-1">
                                <Calendar className="w-3.5 h-3.5" /> {new Date(submission.started_at).toLocaleDateString()}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">{submission.mock_sessions?.title}</h1>
                    </div>
                    {submission.status === 'completed' && (
                        <div className="flex items-center gap-4 bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-xl shadow-slate-200/50 w-full md:w-auto justify-center md:justify-start">
                            <div className="text-right">
                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Overall Band</p>
                                <p className="text-2xl sm:text-3xl font-black leading-none">{submission.overall_band}</p>
                            </div>
                            <Award className="w-8 h-8 text-amber-400 shrink-0" />
                        </div>
                    )}
                </div>

                {submission.status === 'pending' && (
                    <div className="bg-amber-50 border border-amber-100 p-5 sm:p-6 rounded-2xl flex items-start gap-4 mb-8 sm:mb-10">
                        <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-black text-amber-900 text-sm sm:text-base">Evaluation in Progress</h3>
                            <p className="text-[11px] sm:text-sm text-amber-700/80 mt-1 font-medium leading-relaxed">
                                Your writing test is currently under manual assessment by our expert examiners.
                                Reading and Listening scores are available below. Your final Overall Band will be updated once the writing evaluation is complete.
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                    {/* Listening Result */}
                    <Card className="p-6 sm:p-8 relative overflow-hidden group hover:border-indigo-200 transition-all border-2 border-slate-100 dark:border-border border-b-[6px] rounded-[1.5rem] sm:rounded-[2rem]">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-[4rem] -mr-4 -mt-4 transition-transform group-hover:scale-110 opacity-60" />
                        <div className="relative">
                            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 shadow-sm">
                                <Headphones className="w-6 h-6" />
                            </div>
                            <h3 className="font-black text-lg sm:text-xl mb-1 tracking-tight text-slate-800 dark:text-slate-100">Listening</h3>
                            <div className="flex justify-between items-end mt-6">
                                <div>
                                    <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100">{submission.listening_submissions?.score}</p>
                                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Score / 40</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl sm:text-3xl font-black text-indigo-600">{submission.listening_band || '-'}</p>
                                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Band</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Reading Result */}
                    <Card className="p-6 sm:p-8 relative overflow-hidden group hover:border-emerald-200 transition-all border-2 border-slate-100 dark:border-border border-b-[6px] rounded-[1.5rem] sm:rounded-[2rem]">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[4rem] -mr-4 -mt-4 transition-transform group-hover:scale-110 opacity-60" />
                        <div className="relative">
                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 shadow-sm">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <h3 className="font-black text-lg sm:text-xl mb-1 tracking-tight text-slate-800 dark:text-slate-100">Reading</h3>
                            <div className="flex justify-between items-end mt-6">
                                <div>
                                    <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100">{submission.reading_submissions?.score}</p>
                                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Score / 40</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl sm:text-3xl font-black text-emerald-600">{submission.reading_band || '-'}</p>
                                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Band</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Writing Result */}
                    <Card className="p-6 sm:p-8 relative overflow-hidden group hover:border-rose-200 transition-all border-2 border-slate-100 dark:border-border border-b-[6px] rounded-[1.5rem] sm:rounded-[2rem]">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-[4rem] -mr-4 -mt-4 transition-transform group-hover:scale-110 opacity-60" />
                        <div className="relative">
                            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-6 shadow-sm">
                                <PenTool className="w-6 h-6" />
                            </div>
                            <h3 className="font-black text-lg sm:text-xl mb-1 tracking-tight text-slate-800 dark:text-slate-100">Writing</h3>
                            {submission.status === 'pending' ? (
                                <div className="mt-6 flex items-center gap-2 text-amber-600 font-bold bg-amber-50 px-3 py-2 rounded-xl text-[10px] uppercase tracking-widest border border-amber-100">
                                    <Clock className="w-3.5 h-3.5" /> Grading...
                                </div>
                            ) : (
                                <div className="flex justify-between items-end mt-6">
                                    <div>
                                        <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100">{submission.writing_band}</p>
                                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Final Band</p>
                                    </div>
                                    <div className="text-right">
                                        <CheckCircle className="w-6 h-6 text-emerald-500 mb-1" />
                                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Evaluated</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {submission.writing_feedback && submission.writing_feedback.length > 0 && (
                    <div className="mt-12 sm:mt-16 pb-12">
                        <h3 className="text-xl sm:text-2xl font-black mb-6 flex items-center gap-3 tracking-tight text-slate-900 dark:text-slate-100">
                            <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
                                <PenTool className="w-5 h-5 text-indigo-600" />
                            </div>
                            Writing Feedback
                        </h3>
                        <Card className="p-6 sm:p-10 border-2 border-slate-100 dark:border-border border-b-[8px] rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl shadow-slate-100/50">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8 pb-8 border-b border-slate-100">
                                <div>
                                    <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Task Achievement</p>
                                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{submission.writing_feedback[0].task_achievement_score}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Coherence</p>
                                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{submission.writing_feedback[0].coherence_score}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Lexical Resource</p>
                                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{submission.writing_feedback[0].lexical_score}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Grammar</p>
                                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{submission.writing_feedback[0].grammar_score}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-black text-slate-900 dark:text-slate-100 text-base sm:text-lg tracking-tight">Examiner Comments</h4>
                                <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed whitespace-pre-wrap">
                                    {submission.writing_feedback[0].feedback_text}
                                </p>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </Layout>
    );
}
