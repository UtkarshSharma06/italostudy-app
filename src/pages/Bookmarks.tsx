import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Bookmark, Target, ChevronRight, LayoutGrid, Search, Trash2, Lock, AlertTriangle, Sparkles, BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose
} from "@/components/ui/dialog";
import { MathText } from '@/components/MathText';
import QuestionMedia from '@/components/QuestionMedia';
import DiagramRenderer from '@/components/DiagramRenderer';
import { MediaContent, DiagramData } from '@/types/test';

interface BookmarkedQuestion {
    id: string;
    question_id: string;
    created_at: string;
    display: {
        subject: string;
        text: string;
        passage?: string;
        difficulty: string;
        options?: string[];
        correct_index?: number;
        explanation?: string;
        is_corrected?: boolean;
        media?: MediaContent | null;
        diagram?: DiagramData | null;
    };
    is_reported_by_user?: boolean;
    admin_message?: string | null;
}

export default function Bookmarks() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [bookmarks, setBookmarks] = useState<BookmarkedQuestion[]>([]);
    const [selectedBookmark, setSelectedBookmark] = useState<BookmarkedQuestion | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'reported'>('all');
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 5;

    // Reset to first page whenever the tab changes
    useEffect(() => { setPage(0); }, [activeTab]);

    useEffect(() => {
        if (user) {
            fetchBookmarks();
        }
    }, [user]);

    const fetchBookmarks = async () => {
        setLoading(true);
        try {
            const { data: rawBookmarks, error: bError } = await (supabase as any)
                .from('bookmarked_questions')
                .select('id, question_id, created_at, is_reported_by_user')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (bError) throw bError;
            if (!rawBookmarks || rawBookmarks.length === 0) {
                setBookmarks([]);
                return;
            }

            const questionIds = rawBookmarks.map((b: any) => b.question_id);

            // Fetch from all possible question tables and reports
            const [
                questionsRes,
                readingRes,
                listeningRes,
                reportsRes,
                practiceQuestionsRes, // For master questions from practice_questions
                sessionQuestionsRes   // For master questions from session_questions
            ] = await Promise.all([
                supabase.from('questions').select('id, question_text, passage, subject, topic, options, correct_index, explanation, is_corrected, master_question_id, media, diagram').in('id', questionIds),
                supabase.from('reading_questions').select('id, question_text').in('id', questionIds),
                supabase.from('listening_questions').select('id, question_text').in('id', questionIds),
                supabase.from('question_reports').select('question_id, admin_message').eq('user_id', user?.id),
                supabase.from('practice_questions').select('id, is_corrected, media, passage, question_text, options, explanation'), // Fetch all fields from master (no diagram in these tables)
                supabase.from('session_questions').select('id, is_corrected, media, passage, question_text, options, explanation')   // Fetch all fields from master (no diagram in these tables)
            ]);

            const merged = rawBookmarks.map((b: any) => {
                const qSnapshot = questionsRes.data?.find(x => x.id === b.question_id);
                const r = readingRes.data?.find(x => x.id === b.question_id);
                const l = listeningRes.data?.find(x => x.id === b.question_id);
                const report = reportsRes.data?.find(x => x.question_id === b.question_id);

                let display: BookmarkedQuestion['display'] = {
                    subject: 'Archive',
                    text: 'Question content no longer available',
                    difficulty: 'Standard'
                };

                if (qSnapshot) {
                    // Check if there is a master question with updates
                    let q = qSnapshot;
                    if (qSnapshot.master_question_id) {
                        const foundMaster =
                            practiceQuestionsRes.data?.find((mq: any) => mq.id === qSnapshot.master_question_id) ||
                            sessionQuestionsRes.data?.find((mq: any) => mq.id === qSnapshot.master_question_id);

                        if (foundMaster) {
                            // Use master data if snapshot is missing it OR if master is corrected (has latest fixes)
                            q = {
                                ...qSnapshot,
                                is_corrected: foundMaster.is_corrected || qSnapshot.is_corrected,
                                media: qSnapshot.media || foundMaster.media,
                                diagram: qSnapshot.diagram, // diagram only in questions table, not in master tables
                                passage: qSnapshot.passage || foundMaster.passage
                            };

                            // If master is corrected, prioritize its text/options too
                            if (foundMaster.is_corrected) {
                                q.question_text = foundMaster.question_text || q.question_text;
                                q.options = foundMaster.options || q.options;
                                q.explanation = foundMaster.explanation || q.explanation;
                            }
                        }
                    }

                    // Use topic if subject is generic 'Practice'
                    const subjectDisplay = (q.subject === 'Practice' && q.topic) ? q.topic : (q.subject || 'Practice');
                    display = {
                        subject: subjectDisplay,
                        text: q.question_text,
                        passage: q.passage,
                        difficulty: 'Standard', // difficulty column doesn't exist in questions table
                        options: q.options as string[],
                        correct_index: q.correct_index,
                        explanation: q.explanation,
                        is_corrected: q.is_corrected,
                        media: q.media as unknown as MediaContent,
                        diagram: q.diagram as unknown as DiagramData
                    };
                } else if (r) {
                    display = {
                        subject: 'Reading',
                        text: r.question_text,
                        difficulty: 'IELTS'
                    };
                } else if (l) {
                    display = {
                        subject: 'Listening',
                        text: l.question_text,
                        difficulty: 'IELTS'
                    };
                }

                return { ...b, display, admin_message: report?.admin_message };
            });

            setBookmarks(merged);
        } catch (error) {
            console.error('Error fetching bookmarks:', error);
        } finally {
            setLoading(false);
        }
    };

    const removeBookmark = async (bookmark: BookmarkedQuestion) => {
        // Prevent removal if question is reported and not yet fixed
        if (bookmark.is_reported_by_user && !bookmark.display.is_corrected) {
            toast({
                title: "Action Restricted",
                description: "This bookmark is mandatory until the reported issue is resolved by an admin.",
                variant: "destructive"
            });
            return;
        }

        await (supabase as any)
            .from('bookmarked_questions')
            .delete()
            .eq('id', bookmark.id);

        fetchBookmarks();
    };

    const getSubjectEmoji = (subject: string) => {
        const s = subject.toLowerCase();
        if (s.includes('math') || s.includes('alg') || s.includes('geom')) return '📐';
        if (s.includes('phys')) return '⚛️';
        if (s.includes('chem')) return '⚗️';
        if (s.includes('biol')) return '🧬';
        if (s.includes('read')) return '📖';
        if (s.includes('listen')) return '🎧';
        if (s.includes('writ')) return '✍️';
        if (s.includes('speak')) return '🎙️';
        return '🧠';
    };

    return (
        <Layout isLoading={loading}>
            <div className="container mx-auto px-6 py-16 max-w-5xl">
                {/* Header (Sleek Modern) */}
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100 mb-4 scale-90">
                        <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Knowledge Base</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-tight">Saved <span className="text-indigo-600">Assets</span></h1>
                    <p className="text-lg text-slate-400 font-bold tracking-tight">Access your curated collection of complex items.</p>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-center gap-4 mb-12">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'all'
                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                    >
                        All Bookmarks
                    </button>
                    <button
                        onClick={() => setActiveTab('reported')}
                        className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'reported'
                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                            : 'bg-indigo-50 text-indigo-400 hover:bg-indigo-100'
                            }`}
                    >
                        Reported & Fixed
                        {bookmarks.filter(b => b.is_reported_by_user).length > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-[8px] ${activeTab === 'reported' ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
                                {bookmarks.filter(b => b.is_reported_by_user).length}
                            </span>
                        )}
                    </button>
                </div>

                {bookmarks.length === 0 ? (
                    <div className="text-center py-32 bg-white dark:bg-card rounded-[3rem] border border-slate-100 dark:border-border shadow-sm transition-all hover:shadow-xl hover:shadow-indigo-50/50">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-muted rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-slate-100 dark:border-border group transition-all">
                            <Bookmark className="w-8 h-8 text-slate-200 group-hover:text-indigo-600 transition-colors" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-3 tracking-tight">Archive Empty</h3>
                        <p className="text-slate-400 font-bold mb-10 max-w-xs mx-auto text-lg leading-relaxed">
                            No items have been secured yet. Start a mission to find items worth saving.
                        </p>
                        <Button
                            onClick={() => navigate('/practice')}
                            className="h-16 px-12 font-black bg-slate-900 hover:bg-slate-800 text-white rounded-2xl active:scale-95 transition-all shadow-xl"
                        >
                            START NEW MISSION
                        </Button>
                    </div>
                ) : (
                    (() => {
                        const filtered = bookmarks.filter(b => activeTab === 'all' ? true : b.is_reported_by_user);
                        const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
                        const paged = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
                        return (
                    <div>
                        <div className="grid gap-6">
                        {paged
                            .map((bookmark) => (
                                <div
                                    key={bookmark.id}
                                    className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-indigo-600 dark:hover:border-indigo-500 transition-all duration-500 group flex flex-col md:flex-row gap-8 items-start relative overflow-hidden hover:-translate-y-1"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-muted rounded-full -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                    <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/10 flex items-center justify-center text-3xl group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-6 transition-all shrink-0">
                                        {getSubjectEmoji(bookmark.display.subject)}
                                    </div>

                                    <div className="flex-1 space-y-4 relative z-10">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                                                {bookmark.display.subject}
                                            </span>
                                            <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${bookmark.display.difficulty.toLowerCase() === 'easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                bookmark.display.difficulty.toLowerCase() === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                    'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                }`}>
                                                {bookmark.display.difficulty}
                                            </span>
                                            {bookmark.display.is_corrected && (
                                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-100 flex items-center gap-1.5">
                                                    <Target className="w-2.5 h-2.5" />
                                                    Fixed by Admin
                                                </span>
                                            )}
                                            {bookmark.is_reported_by_user && !bookmark.display.is_corrected && (
                                                <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-100 flex items-center gap-1.5">
                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                    Under Review
                                                </span>
                                            )}
                                        </div>

                                        <MathText 
                                            content={bookmark.display.text.substring(0, 200) + (bookmark.display.text.length > 200 ? '...' : '')}
                                            className="text-slate-800 font-bold leading-relaxed tracking-tight text-lg line-clamp-2"
                                            variant="default"
                                        />

                                        {bookmark.admin_message && (
                                            <div className="mt-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                                                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-1">Admin Response</p>
                                                    <p className="text-sm font-bold text-indigo-700 italic">"{bookmark.admin_message}"</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex md:flex-col gap-3 shrink-0 relative z-10 w-full md:w-auto mt-4 md:mt-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeBookmark(bookmark)}
                                            disabled={bookmark.is_reported_by_user && !bookmark.display.is_corrected}
                                            className={cn(
                                                "h-12 w-12 rounded-xl transition-all",
                                                bookmark.is_reported_by_user && !bookmark.display.is_corrected
                                                    ? "text-slate-200 cursor-not-allowed bg-slate-50 border-slate-100"
                                                    : "text-rose-300 hover:text-rose-600 hover:bg-rose-50 border border-slate-50 hover:border-rose-100"
                                            )}
                                            title={bookmark.is_reported_by_user && !bookmark.display.is_corrected ? "Mandatory until resolved" : "Remove Bookmark"}
                                        >
                                            {bookmark.is_reported_by_user && !bookmark.display.is_corrected ? (
                                                <Lock className="w-4 h-4" />
                                            ) : (
                                                <Trash2 className="w-5 h-5" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelectedBookmark(bookmark)}
                                            className="h-12 w-12 rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-50 hover:border-indigo-100 transition-all"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-8">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white"
                                >
                                    ← Prev
                                </button>
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                    Page {page + 1} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-slate-900 text-white hover:bg-indigo-600"
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </div>
                        );
                    })()
                )}

                <Dialog open={!!selectedBookmark} onOpenChange={(open) => !open && setSelectedBookmark(null)}>
                    <DialogContent className="max-w-xl max-h-[85vh] bg-white dark:bg-slate-900 border-none rounded-[2rem] shadow-2xl overflow-hidden flex flex-col p-0">
                        <div className="relative p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-white/50 backdrop-blur-xl z-10">
                            <DialogClose className="absolute top-4 right-4 z-50 rounded-full p-2 bg-slate-100 hover:bg-slate-200 transition-colors">
                                <X className="w-4 h-4 text-slate-500" />
                            </DialogClose>

                            <div className="flex flex-wrap items-center gap-2 mb-3 pr-8">
                                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-full">
                                    {selectedBookmark?.display.subject}
                                </span>
                                {selectedBookmark?.display.is_corrected && (
                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-100 flex items-center gap-1.5">
                                        <Target className="w-2.5 h-2.5" /> Fixed by Admin
                                    </span>
                                )}
                                {selectedBookmark?.is_reported_by_user && !selectedBookmark?.display.is_corrected && (
                                    <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-100 flex items-center gap-1.5">
                                        <AlertTriangle className="w-2.5 h-2.5" /> Under Review
                                    </span>
                                )}
                            </div>

                            {selectedBookmark?.admin_message && (
                                <div className="mb-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-3">
                                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[9px] font-black text-indigo-900 uppercase tracking-widest mb-0.5">We fixed it</p>
                                        <p className="text-xs font-bold text-indigo-700 italic">"{selectedBookmark.admin_message}"</p>
                                    </div>
                                </div>
                            )}

                            <DialogTitle className="text-xl font-black text-slate-900 dark:text-slate-100 hidden">
                                Question Preview
                            </DialogTitle>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Passage */}
                            {selectedBookmark?.display.passage && (
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <BookOpen className="w-3.5 h-3.5" />
                                        Reading Passage
                                    </h4>
                                    <MathText content={selectedBookmark.display.passage} className="text-sm text-slate-700 leading-relaxed font-serif" />
                                </div>
                            )}

                            {/* Media Rendering (Image, Graph, Table) */}
                            {selectedBookmark?.display.media ? (
                                <QuestionMedia media={selectedBookmark.display.media} className="mb-6" />
                            ) : selectedBookmark?.display.diagram ? (
                                <DiagramRenderer diagram={selectedBookmark.display.diagram} className="mb-6" />
                            ) : null}

                            {/* Question Text */}
                            <div className="text-base font-medium text-slate-800 dark:text-slate-200">
                                <MathText content={selectedBookmark?.display.text || ''} />
                            </div>

                            {/* Options */}
                            {selectedBookmark?.display.options && (
                                <div className="space-y-2.5">
                                    {selectedBookmark.display.options.map((option, index) => (
                                        <div
                                            key={index}
                                            className={`p-3.5 rounded-xl border-2 transition-all flex items-center gap-3 ${index === selectedBookmark?.display.correct_index
                                                ? 'border-emerald-100 bg-emerald-50/50'
                                                : 'border-slate-50 bg-slate-50/30'
                                                }`}
                                        >
                                            <div
                                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${index === selectedBookmark?.display.correct_index
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-white text-slate-300 border border-slate-100'
                                                    }`}
                                            >
                                                {String.fromCharCode(65 + index)}
                                            </div>
                                            <div className="flex-1">
                                                <MathText content={option} className={`text-sm font-medium ${index === selectedBookmark?.display.correct_index ? 'text-emerald-900' : 'text-slate-600'
                                                    }`} />
                                            </div>
                                            {index === selectedBookmark?.display.correct_index && (
                                                <Target className="w-4 h-4 text-emerald-500" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Explanation */}
                            {selectedBookmark?.display.explanation && (
                                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                                    <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        Explanation
                                    </h4>
                                    <MathText content={selectedBookmark.display.explanation} className="text-xs text-blue-800 leading-relaxed" />
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
