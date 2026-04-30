import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Bookmark, Target, ChevronRight, LayoutGrid, Search, Trash2, Lock, AlertTriangle, Sparkles, BookOpen, X, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogClose,
    DialogTitle,
} from "@/components/ui/dialog";
import { MathText } from '@/components/MathText';
import { cn } from '@/lib/utils';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import QuestionMedia from '@/components/QuestionMedia';
import DiagramRenderer from '@/components/DiagramRenderer';
import { MediaContent, DiagramData } from '@/types/test';
import { TestListSkeleton } from '@/components/SkeletonLoader';
import MobileLayout from '../components/MobileLayout';

interface BookmarkedQuestion {
    id: string;
    question_id: string;
    created_at: string;
    display: {
        subject: string;
        text: string;
        passage?: string; // Added passage support
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

export default function MobileBookmarks() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [bookmarks, setBookmarks] = useState<BookmarkedQuestion[]>([]);
    const [selectedBookmark, setSelectedBookmark] = useState<BookmarkedQuestion | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'reported'>('all');

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
                .select('*')
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
                    const subjectDisplay = ((q as any).subject === 'Practice' && (q as any).topic) ? (q as any).topic : ((q as any).subject || 'Practice');
                    display = {
                        subject: subjectDisplay,
                        text: (q as any).question_text,
                        passage: (q as any).passage,
                        difficulty: 'Standard', // difficulty column doesn't exist in questions table
                        options: (q as any).options as string[],
                        correct_index: (q as any).correct_index,
                        explanation: (q as any).explanation,
                        is_corrected: (q as any).is_corrected,
                        media: (q as any).media as MediaContent,
                        diagram: (q as any).diagram as DiagramData
                    };
                } else if (r) {
                    display = {
                        subject: 'Reading',
                        text: (r as any).question_text,
                        difficulty: 'IELTS'
                    };
                } else if (l) {
                    display = {
                        subject: 'Listening',
                        text: (l as any).question_text,
                        difficulty: 'IELTS'
                    };
                }

                return { ...b, display, admin_message: (report as any)?.admin_message };
            });

            setBookmarks(merged);
        } catch (error) {
            console.error('Error fetching bookmarks:', error);
        } finally {
            setLoading(false);
        }
    };

    const removeBookmark = async (bookmark: BookmarkedQuestion) => {
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { });

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
        <MobileLayout isLoading={loading} hideHeader={true}>
            <div className="min-h-screen bg-slate-50 dark:bg-black pb-24">
            {/* Mobile Header */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 px-6 pt-12 pb-4">
                <div className="flex items-center gap-4 mb-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/dashboard')}
                        className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Saved Assets</h1>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'all'
                            ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-400'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setActiveTab('reported')}
                        className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'reported'
                            ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-400'
                            }`}
                    >
                        Reported
                        {bookmarks.filter(b => b.is_reported_by_user).length > 0 && (
                            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[8px] flex items-center justify-center">
                                {bookmarks.filter(b => b.is_reported_by_user).length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {bookmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8 pt-24">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-6">
                        <Bookmark className="w-6 h-6 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Archive Empty</h3>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto mb-8">
                        Save tricky questions during your missions to review them later.
                    </p>
                    <Button
                        onClick={() => navigate('/practice')}
                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-widest h-12 rounded-xl"
                    >
                        Start Mission
                    </Button>
                </div>
            ) : (
                <div className="px-4 py-6 space-y-4">
                    {bookmarks
                        .filter(b => activeTab === 'all' ? true : b.is_reported_by_user)
                        .map((bookmark) => (
                            <div
                                key={bookmark.id}
                                onClick={() => {
                                    Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
                                    setSelectedBookmark(bookmark);
                                }}
                                className="bg-white dark:bg-white/5 p-5 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-sm active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-xl">
                                            {getSubjectEmoji(bookmark.display.subject)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    {bookmark.display.subject}
                                                </span>
                                                {bookmark.display.is_corrected && (
                                                    <Target className="w-3 h-3 text-emerald-500" />
                                                )}
                                                {bookmark.is_reported_by_user && !bookmark.display.is_corrected && (
                                                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                )}
                                            </div>
                                            <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md inline-block ${bookmark.display.difficulty.toLowerCase() === 'easy' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                bookmark.display.difficulty.toLowerCase() === 'medium' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                                                    'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                                }`}>
                                                {bookmark.display.difficulty}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                </div>

                                <MathText 
                                    content={bookmark.display.text.substring(0, 150) + (bookmark.display.text.length > 150 ? '...' : '')}
                                    className="text-sm font-bold text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed mb-3 pointer-events-none"
                                    variant="default"
                                />

                                {bookmark.admin_message && (
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                        <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 line-clamp-1 italic">
                                            Admin: "{bookmark.admin_message}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                </div>
            )}

            <Dialog open={!!selectedBookmark} onOpenChange={(open) => !open && setSelectedBookmark(null)}>
                <DialogContent className="max-w-full h-full w-full p-0 bg-slate-50 dark:bg-black border-none rounded-none flex flex-col">
                    {/* Dialog Header */}
                    <div className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 px-6 pt-12 pb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                {selectedBookmark?.display.subject}
                            </span>
                            {selectedBookmark?.display.is_corrected && (
                                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5">
                                    <Target className="w-3 h-3" /> Fixed
                                </span>
                            )}
                        </div>
                        <DialogClose className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                            <X className="w-4 h-4 text-slate-500 dark:text-white" />
                        </DialogClose>
                        <DialogTitle className="hidden">Details</DialogTitle>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-6">
                        {/* Admin Message */}
                        {selectedBookmark?.admin_message && (
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    <p className="text-[9px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest">Admin Response</p>
                                </div>
                                <p className="text-xs font-bold text-indigo-800 dark:text-indigo-200 italic leading-relaxed">
                                    "{selectedBookmark.admin_message}"
                                </p>
                            </div>
                        )}

                        {/* Passage */}
                        {selectedBookmark?.display.passage && (
                            <div className="bg-white dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    Reading Passage
                                </h4>
                                <MathText content={selectedBookmark.display.passage} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif" />
                            </div>
                        )}

                        {/* Media Rendering (Image, Graph, Table) */}
                        {selectedBookmark?.display.media ? (
                            <QuestionMedia media={selectedBookmark.display.media} className="mb-6" />
                        ) : selectedBookmark?.display.diagram ? (
                            <DiagramRenderer diagram={selectedBookmark.display.diagram} className="mb-6" />
                        ) : null}

                        {/* Question Text */}
                        <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                            <MathText content={selectedBookmark?.display.text || ''} />
                        </div>

                        {/* Options */}
                        {selectedBookmark?.display.options && (
                            <div className="space-y-3">
                                {selectedBookmark.display.options.map((option, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-xl border border-slate-100 dark:border-white/5 flex items-start gap-3 ${index === selectedBookmark?.display.correct_index
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20'
                                            : 'bg-white dark:bg-white/5'
                                            }`}
                                    >
                                        <div
                                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5 ${index === selectedBookmark?.display.correct_index
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-slate-100 dark:bg-white/10 text-slate-400'
                                                }`}
                                        >
                                            {String.fromCharCode(65 + index)}
                                        </div>
                                        <MathText content={option} className={`text-xs font-bold leading-relaxed ${index === selectedBookmark?.display.correct_index ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'
                                            }`} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Explanation */}
                        {selectedBookmark?.display.explanation && (
                            <div className="bg-blue-50 dark:bg-blue-500/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                                <h4 className="text-[10px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    Explanation
                                </h4>
                                <MathText content={selectedBookmark.display.explanation} className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed font-medium" />
                            </div>
                        )}

                        {/* Remove Action */}
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (selectedBookmark) removeBookmark(selectedBookmark);
                                setSelectedBookmark(null);
                            }}
                            disabled={selectedBookmark?.is_reported_by_user && !selectedBookmark?.display.is_corrected}
                            className="w-full h-14 rounded-2xl text-rose-500 border-rose-100 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-900/10"
                        >
                            {selectedBookmark?.is_reported_by_user && !selectedBookmark?.display.is_corrected ? (
                                <>
                                    <Lock className="w-4 h-4 mr-2" />
                                    Locked Until Resolved
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remove Bookmark
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
        </MobileLayout>
    );
}
