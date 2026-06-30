import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Bookmark, Target, ChevronRight, LayoutGrid, Search, Trash2, Lock, AlertTriangle, Sparkles, BookOpen, X, ChevronDown, Filter, Folder, Star, Clock } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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

    const [searchQuery, setSearchQuery] = useState('');
    const [filterSubject, setFilterSubject] = useState('All Subjects');
    const [filterStatus, setFilterStatus] = useState('All Status');
    const [sortOrder, setSortOrder] = useState('Newest First');

    // Reset to first page whenever any filter changes
    useEffect(() => { setPage(0); }, [activeTab, searchQuery, filterSubject, filterStatus, sortOrder]);

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

    // Derived Data
    const totalBookmarksCount = bookmarks.length;
    const uniqueSubjectsList = Array.from(new Set(bookmarks.map(b => b.display.subject))).filter(Boolean);
    const totalSubjectsCount = uniqueSubjectsList.length;

    const subjectCounts = bookmarks.reduce((acc, b) => {
        acc[b.display.subject] = (acc[b.display.subject] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const mostSavedSubjectStr = totalBookmarksCount > 0 
        ? Object.keys(subjectCounts).reduce((a, b) => subjectCounts[a] > subjectCounts[b] ? a : b, 'None')
        : 'None';
    const mostSavedPercent = totalBookmarksCount > 0 ? Math.round((subjectCounts[mostSavedSubjectStr] / totalBookmarksCount) * 100) : 0;

    const lastAddedBookmark = bookmarks.length > 0 ? [...bookmarks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] : null;
    let lastAddedStr = 'None';
    let lastAddedSubj = '';
    if (lastAddedBookmark) {
        lastAddedSubj = lastAddedBookmark.display.subject;
        const d = new Date(lastAddedBookmark.created_at);
        const today = new Date();
        const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        lastAddedStr = `${isToday ? 'Today' : d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}, ${d.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}`;
    }

    const filteredBookmarks = bookmarks.filter(b => {
        if (activeTab === 'reported' && !b.is_reported_by_user) return false;
        
        const textMatch = b.display.text?.toLowerCase().includes(searchQuery.toLowerCase()) || b.display.subject?.toLowerCase().includes(searchQuery.toLowerCase());
        const subjectMatch = filterSubject === 'All Subjects' || b.display.subject === filterSubject;
        
        let statusMatch = true;
        if (filterStatus === 'Under Review') {
            statusMatch = !!b.is_reported_by_user && !b.display.is_corrected;
        } else if (filterStatus === 'Fixed') {
            statusMatch = !!b.display.is_corrected;
        } else if (filterStatus === 'Standard') {
            statusMatch = !b.is_reported_by_user && !b.display.is_corrected;
        }
        
        return textMatch && subjectMatch && statusMatch;
    }).sort((a, b) => {
        if (sortOrder === 'Newest First') {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        } else {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
    });

    const totalPages = Math.ceil(filteredBookmarks.length / PAGE_SIZE);
    const paged = filteredBookmarks.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    return (
        <Layout isLoading={loading}>
            <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-4 max-w-[1200px]">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 sm:mb-10 gap-6 animate-in fade-in duration-700">
                    <div className="space-y-3 text-center md:text-left">
                        <div className="inline-flex items-center px-5 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm mb-1 gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                                <Bookmark className="w-4 h-4 text-indigo-600" />
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase uppercase bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-indigo-500 pr-2">
                                BOOKMARKS
                            </h1>
                        </div>
                        <p className="text-base sm:text-lg text-slate-500 font-medium tracking-tight">
                            Your curated collection of important questions and resources.
                        </p>
                        <div className="flex items-center justify-center md:justify-start gap-4 pt-1">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'all'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 border border-indigo-600'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                <Bookmark className="w-4 h-4" /> All Bookmarks
                            </button>
                            <button
                                onClick={() => setActiveTab('reported')}
                                className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'reported'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 border border-indigo-600'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                <Target className="w-4 h-4" /> Reported & Fixed
                                {bookmarks.filter(b => b.is_reported_by_user).length > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'reported' ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                                        {bookmarks.filter(b => b.is_reported_by_user).length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="hidden md:block shrink-0 relative pr-6">
                        <div className="absolute inset-0 bg-indigo-200/50 blur-3xl rounded-full" />
                        <img src="/bookmark.webp" alt="Saved Assets Folder" className="w-[180px] h-[180px] object-contain relative z-10 drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
                    </div>
                </div>

                {/* Statistics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-5 shadow-sm">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Bookmark className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Bookmarks</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalBookmarksCount}</p>
                            <p className="text-[11px] font-semibold text-slate-500 mt-1">Questions saved</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-5 shadow-sm">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Folder className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subjects</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalSubjectsCount}</p>
                            <p className="text-[11px] font-semibold text-slate-500 mt-1">Across all bookmarks</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-5 shadow-sm">
                        <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Added</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight truncate w-[120px]">{lastAddedStr}</p>
                            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">{lastAddedSubj || 'None'}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-5 shadow-sm">
                        <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                            <Star className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Most Saved</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight truncate w-[120px]">{mostSavedSubjectStr}</p>
                            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{mostSavedPercent}% of total</p>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white dark:bg-slate-900 p-3 rounded-[1rem] sm:rounded-full border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shadow-sm mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder="Search your bookmarks..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 h-12 bg-transparent border-none shadow-none focus-visible:ring-0 text-slate-800 font-medium placeholder:text-slate-400"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[10px] font-bold">/</div>
                    </div>
                    
                    <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-slate-800" />

                    <div className="flex items-center gap-2 px-2 sm:px-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-10 px-4 rounded-xl font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-100 sm:border-none">
                                    {filterSubject} <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                <DropdownMenuItem onClick={() => setFilterSubject('All Subjects')} className="font-bold cursor-pointer rounded-lg">All Subjects</DropdownMenuItem>
                                {uniqueSubjectsList.map(s => (
                                    <DropdownMenuItem key={s} onClick={() => setFilterSubject(s)} className="font-bold cursor-pointer rounded-lg">{s}</DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-10 px-4 rounded-xl font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-100 sm:border-none">
                                    {filterStatus} <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                {['All Status', 'Standard', 'Under Review', 'Fixed'].map(s => (
                                    <DropdownMenuItem key={s} onClick={() => setFilterStatus(s)} className="font-bold cursor-pointer rounded-lg">{s}</DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-10 px-4 rounded-xl font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-100 sm:border-none">
                                    {sortOrder} <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                <DropdownMenuItem onClick={() => setSortOrder('Newest First')} className="font-bold cursor-pointer rounded-lg">Newest First</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortOrder('Oldest First')} className="font-bold cursor-pointer rounded-lg">Oldest First</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl border-slate-200 hidden md:flex mr-2">
                            <Filter className="w-4 h-4 text-slate-500" />
                        </Button>
                    </div>
                </div>

                {filteredBookmarks.length === 0 ? (
                    <div className="text-center py-32 bg-white dark:bg-card rounded-[2rem] border border-slate-100 dark:border-border shadow-sm transition-all hover:shadow-md">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-muted rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-slate-100 dark:border-border group transition-all">
                            <Bookmark className="w-8 h-8 text-slate-200 group-hover:text-indigo-600 transition-colors" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-3 tracking-tight">No matching items</h3>
                        <p className="text-slate-400 font-bold mb-10 max-w-xs mx-auto text-lg leading-relaxed">
                            Try adjusting your search query or modifying the selected filters.
                        </p>
                    </div>
                ) : (
                    <div>
                        <div className="grid gap-6">
                        {paged
                            .map((bookmark, index) => (
                                <div
                                    key={bookmark.id}
                                    className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden"
                                >
                                    <div className="hidden sm:flex w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl items-center justify-center text-indigo-600 font-black text-2xl shrink-0">
                                        {String(page * PAGE_SIZE + index + 1).padStart(2, '0')}
                                    </div>

                                    <div className="flex-1 w-full space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="sm:hidden w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-600 font-black text-sm shrink-0 mr-1">
                                                    {String(page * PAGE_SIZE + index + 1).padStart(2, '0')}
                                                </div>
                                                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                                                    {bookmark.display.subject}
                                                </span>
                                                <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                                                    {bookmark.display.difficulty}
                                                </span>
                                                {bookmark.display.is_corrected && (
                                                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5">
                                                        <Target className="w-3 h-3" />
                                                        Fixed by Admin
                                                    </span>
                                                )}
                                                {bookmark.is_reported_by_user && !bookmark.display.is_corrected && (
                                                    <span className="px-3 py-1 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Reported
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] font-bold text-slate-400 shrink-0">
                                                Saved on {new Date(bookmark.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                                            </div>
                                        </div>

                                        <MathText 
                                            content={bookmark.display.text.substring(0, 200) + (bookmark.display.text.length > 200 ? '...' : '')}
                                            className="text-slate-900 dark:text-slate-100 font-bold leading-relaxed tracking-tight text-base sm:text-lg line-clamp-2"
                                            variant="default"
                                        />

                                        {bookmark.admin_message && (
                                            <div className="mt-4 p-4 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 flex items-start gap-3">
                                                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-1">Admin Response</p>
                                                    <p className="text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-300 italic">"{bookmark.admin_message}"</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-row md:flex-col gap-3 shrink-0 relative z-10 w-full md:w-auto justify-end border-t border-slate-100 dark:border-slate-800 md:border-t-0 pt-4 md:pt-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeBookmark(bookmark)}
                                            disabled={bookmark.is_reported_by_user && !bookmark.display.is_corrected}
                                            className={cn(
                                                "h-10 w-10 sm:h-12 sm:w-12 rounded-full sm:rounded-xl transition-all shrink-0",
                                                bookmark.is_reported_by_user && !bookmark.display.is_corrected
                                                    ? "text-slate-300 cursor-not-allowed bg-slate-50 border-slate-100"
                                                    : "text-rose-400 hover:text-white hover:bg-rose-500 bg-rose-50 border border-rose-100 hover:border-rose-500"
                                            )}
                                            title={bookmark.is_reported_by_user && !bookmark.display.is_corrected ? "Mandatory until resolved" : "Remove Bookmark"}
                                        >
                                            {bookmark.is_reported_by_user && !bookmark.display.is_corrected ? (
                                                <Lock className="w-4 h-4" />
                                            ) : (
                                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelectedBookmark(bookmark)}
                                            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full sm:rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 transition-all shrink-0"
                                        >
                                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
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
