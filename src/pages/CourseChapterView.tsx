/**
 * CourseChapterView
 *
 * Normal: light background, two tabs (Lectures | PDFs & Notes)
 *         Everyone can browse — non-enrolled see lock icon on videos
 * Player: Netflix-style fixed overlay — video fits viewport, close button always clickable
 */
import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useCourseAccess } from '@/hooks/useCourseAccess';
import SecureYouTubePlayer from '@/components/courses/SecureYouTubePlayer';
import {
    ArrowLeft, FileText, Video, Loader2, Lock,
    CheckCircle, Download, ExternalLink, Clock, Play, BookOpen, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Chapter { id: string; title: string; position: number; }
interface Lecture {
    id: string; chapter_id: string; title: string;
    youtube_video_id: string; thumbnail_url?: string;
    duration_seconds: number | null; position: number; is_preview: boolean;
}
interface Pdf { id: string; chapter_id: string; title: string; pdf_url: string; position: number; is_preview: boolean; }

type Tab = 'lectures' | 'pdfs';

function fmtDuration(sec: number | null) {
    if (!sec) return '';
    const m = Math.floor(sec / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
}

export default function CourseChapterView({ isMobileLayout }: { isMobileLayout?: boolean }) {
    const { courseId, subjectId, chapterId } = useParams<{
        courseId: string; subjectId: string; chapterId: string;
    }>();
    const navigate = useNavigate();
    const { user } = useAuth() as any;
    const { hasAccess, isLoading: accessLoading } = useCourseAccess(courseId);

    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [subjectTitle, setSubjectTitle] = useState('');
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [pdfs, setPdfs] = useState<Pdf[]>([]);
    const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
    const [completedLectures, setCompletedLectures] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<Tab>('lectures');
    const [isLoading, setIsLoading] = useState(true);

    // Lock body scroll when player is open
    useEffect(() => {
        if (activeLecture) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [activeLecture]);

    // Escape key closes player
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveLecture(null); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    useEffect(() => {
        if (courseId && subjectId && chapterId) fetchData();
    }, [courseId, subjectId, chapterId]);

    const fetchData = async () => {
        setIsLoading(true);
        const sb = supabase as any;
        const [subjectRes, chapterRes, lRes, pRes, progressRes] = await Promise.all([
            sb.from('course_subjects').select('title').eq('id', subjectId!).single(),
            sb.from('course_chapters').select('*').eq('id', chapterId!).single(),
            sb.from('course_lectures').select('*').eq('chapter_id', chapterId!).order('position'),
            sb.from('course_pdfs').select('*').eq('chapter_id', chapterId!).order('position'),
            user
                ? sb.from('course_progress').select('lecture_id').eq('user_id', user.id)
                : Promise.resolve({ data: [] }),
        ]);

        setSubjectTitle(subjectRes.data?.title || '');
        setChapter(chapterRes.data || null);
        setLectures(lRes.data || []);
        setPdfs(pRes.data || []);
        setCompletedLectures(new Set((progressRes.data || []).map((p: any) => p.lecture_id)));
        setActiveLecture(null);
        setIsLoading(false);
    };

    const handleLectureClick = (lec: Lecture) => {
        if (!hasAccess && !lec.is_preview) {
            toast.error('Enroll in this course to watch all lectures.');
            return;
        }
        
        // Save for Dashboard Continue Learning
        if (user) {
            const progressData = {
                courseId,
                subjectId,
                chapterId,
                lectureId: lec.id,
                title: lec.title,
                courseTitle: subjectTitle || chapter?.title || 'Course',
                timestamp: Date.now()
            };
            localStorage.setItem(`last_accessed_course_lecture_${user.id}`, JSON.stringify(progressData));
        }

        setActiveLecture(lec);
    };

    const handleMarkComplete = async (lec: Lecture) => {
        if (!user || completedLectures.has(lec.id)) return;
        const { error } = await (supabase as any)
            .from('course_progress')
            .upsert([{ user_id: user.id, lecture_id: lec.id }], { onConflict: 'user_id,lecture_id' });
        if (!error) {
            setCompletedLectures(prev => new Set([...prev, lec.id]));
            toast.success('Lecture marked as complete ✓');
        }
    };

    if (isLoading || accessLoading) {
        const loader = (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                </div>
                <p className="text-sm font-bold text-slate-400">Loading chapter…</p>
            </div>
        );
        if (isMobileLayout) return loader;
        return <Layout>{loader}</Layout>;
    }

    const TABS: { id: Tab; label: string; count: number; icon: typeof Video }[] = [
        { id: 'lectures', label: 'Lectures', count: lectures.length, icon: Video },
        { id: 'pdfs', label: 'PDFs & Notes', count: pdfs.length, icon: FileText },
    ];

    const Wrapper = isMobileLayout ? ({ children }: { children: React.ReactNode }) => <>{children}</> : ({ children }: { children: React.ReactNode }) => <Layout showFooter={false}>{children}</Layout>;

    return (
        <>
            {/* NORMAL PAGE — light theme, two tabs, lecture card grid */}
            <Wrapper>
                <div className={cn("min-h-screen bg-[#f5f5f5] dark:bg-slate-950", isMobileLayout && "pb-36")}>

                    {/* Sticky top bar */}
                    <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-5 py-3 flex items-center gap-3">
                        <button
                            onClick={() => navigate(`/courses/${courseId}/subject/${subjectId}`)}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold uppercase tracking-widest transition-colors flex-shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:block">Back</span>
                        </button>
                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{subjectTitle}</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white truncate">{chapter?.title}</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="max-w-5xl mx-auto px-4 sm:px-5 py-6 sm:py-8">

                        {/* Chapter heading */}
                        <div className="mb-5 sm:mb-6">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                                {chapter?.title}
                            </h1>
                        </div>

                        {/* Two tabs */}
                        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-5 sm:mb-6 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'flex items-center gap-2 px-4 sm:px-6 py-3.5 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all -mb-px whitespace-nowrap flex-shrink-0',
                                        activeTab === tab.id
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'
                                    )}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                    <span className={cn(
                                        'text-[9px] font-black px-1.5 py-0.5 rounded-full',
                                        activeTab === tab.id
                                            ? 'bg-indigo-100 text-indigo-600'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    )}>{tab.count}</span>
                                </button>
                            ))}
                        </div>

                        <AnimatePresence mode="wait">

                            {/* ── Lectures tab ── */}
                            {activeTab === 'lectures' && (
                                <motion.div key="lec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    {lectures.length === 0 ? (
                                        <div className="text-center py-16 sm:py-20">
                                            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                            <p className="text-slate-400 font-bold">No lectures added yet.</p>
                                        </div>
                                    ) : (
                                        /* Mobile: 1 col | sm: 2 col | lg: 3 col */
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                            {lectures.map((lec, i) => {
                                                const accessible = hasAccess || lec.is_preview;
                                                const isDone = completedLectures.has(lec.id);
                                                const thumb = lec.thumbnail_url
                                                    || (lec.youtube_video_id
                                                        ? `https://img.youtube.com/vi/${lec.youtube_video_id}/mqdefault.jpg`
                                                        : null);

                                                return (
                                                    <motion.button
                                                        key={lec.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: Math.min(i * 0.04, 0.3) }}
                                                        onClick={() => handleLectureClick(lec)}
                                                        className="group w-full text-left rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all"
                                                    >
                                                        {/* Thumbnail */}
                                                        <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                            {thumb && (
                                                                <img
                                                                    src={thumb}
                                                                    alt={lec.title}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                    onError={e => {
                                                                        const img = e.target as HTMLImageElement;
                                                                        if (lec.youtube_video_id && !img.src.includes('hqdefault'))
                                                                            img.src = `https://img.youtube.com/vi/${lec.youtube_video_id}/hqdefault.jpg`;
                                                                    }}
                                                                />
                                                            )}
                                                            {/* Hover overlay + play button */}
                                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                                                                {isDone ? (
                                                                    <div className="w-11 h-11 bg-emerald-500/90 rounded-full flex items-center justify-center shadow-lg">
                                                                        <CheckCircle className="w-5 h-5 text-white" />
                                                                    </div>
                                                                ) : accessible ? (
                                                                    <div className="w-11 h-11 bg-white/20 backdrop-blur-sm border-2 border-white/60 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-white/30 transition-all shadow-lg">
                                                                        <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                                                                    </div>
                                                                ) : (
                                                                    /* Lock — not enrolled */
                                                                    <div className="w-11 h-11 bg-black/50 rounded-full flex items-center justify-center">
                                                                        <Lock className="w-5 h-5 text-white/80" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Duration badge */}
                                                            {lec.duration_seconds && (
                                                                <div className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                                    {fmtDuration(lec.duration_seconds)}
                                                                </div>
                                                            )}
                                                            {/* Free badge */}
                                                            {lec.is_preview && (
                                                                <div className="absolute top-2 left-2 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                                                    Free
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="p-3">
                                                            <p className="text-slate-900 dark:text-white text-sm font-bold leading-snug line-clamp-2">
                                                                {i + 1}. {lec.title}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {!accessible && (
                                                                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                                                                        <Lock className="w-2.5 h-2.5" /> Enroll to watch
                                                                    </span>
                                                                )}
                                                                {isDone && (
                                                                    <span className="text-[10px] text-emerald-600 font-black">✓ Completed</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* ── PDFs & Notes tab ── */}
                            {activeTab === 'pdfs' && (
                                <motion.div key="pdf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                                    {pdfs.length === 0 ? (
                                        <div className="text-center py-16 sm:py-20">
                                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                            <p className="text-slate-400 font-bold">No notes added yet.</p>
                                        </div>
                                    ) : pdfs.map(pdf => {
                                        const pdfAccessible = hasAccess || pdf.is_preview;
                                        return (
                                            <div key={pdf.id} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-sm transition-shadow group">
                                                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                                                    {pdfAccessible ? <FileText className="w-5 h-5 text-rose-600" /> : <Lock className="w-5 h-5 text-slate-400" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-slate-900 dark:text-white text-sm font-bold truncate">{pdf.title}</p>
                                                        {pdf.is_preview && (
                                                            <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full uppercase tracking-widest flex-shrink-0">Free</span>
                                                        )}
                                                    </div>
                                                    {!pdfAccessible && (
                                                        <p className="text-slate-400 text-[10px] font-medium flex items-center gap-1">
                                                            <Lock className="w-2.5 h-2.5" /> Enroll to access
                                                        </p>
                                                    )}
                                                </div>
                                                {pdfAccessible && (
                                                    <div className="flex items-center gap-2 sm:gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <a href={pdf.pdf_url} target="_blank" rel="noopener noreferrer"
                                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                            <span className="hidden sm:block">Open</span>
                                                        </a>
                                                        <a href={pdf.pdf_url} download
                                                            className="text-xs text-slate-400 hover:text-slate-600">
                                                            <Download className="w-3.5 h-3.5" />
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </div>
            </Wrapper>

            {/* ─────────────────────────────────────────────────────────────
                NETFLIX PLAYER OVERLAY
                - fixed inset-0, z-[9999], bg-black
                - Video constrained to fit viewport (no overflow)
                - Close button is a direct child of the overlay (always clickable)
            ───────────────────────────────────────────────────────────── */}
            <AnimatePresence>
                {activeLecture && (
                    <motion.div
                        key="player"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="fixed inset-0 z-[9999] bg-black flex flex-col overflow-hidden"
                        style={{ touchAction: 'none' }}
                    >
                        {/* ── Header bar — always on top, always clickable ── */}
                        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/90 to-transparent z-10">
                            {/* Close button — NOT inside pointer-events-none wrapper */}
                            <button
                                onClick={() => setActiveLecture(null)}
                                className="flex items-center gap-2 text-white/80 hover:text-white text-xs font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 active:bg-white/30 px-3 py-2 rounded-xl transition-all flex-shrink-0"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                <X className="w-4 h-4" />
                                <span className="hidden sm:block">Close</span>
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest truncate">{subjectTitle}</p>
                                <p className="text-white text-sm font-bold truncate">{activeLecture.title}</p>
                            </div>
                            {/* Mark done — in header on mobile */}
                            {hasAccess && (
                                completedLectures.has(activeLecture.id) ? (
                                    <div className="flex-shrink-0 flex items-center gap-1.5 text-emerald-400 text-xs font-black">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="hidden sm:block">Done</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleMarkComplete(activeLecture)}
                                        className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-black text-white/70 hover:text-emerald-400 border border-white/20 hover:border-emerald-400/50 px-3 py-1.5 rounded-xl transition-all"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span className="hidden sm:block">Mark Done</span>
                                    </button>
                                )
                            )}
                        </div>

                        {/* ── Video area — fills remaining space, constrains player ── */}
                        <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
                            {/*
                              width: min(100vw, (availableHeight * 16/9))
                              This ensures the 16:9 video NEVER overflows the viewport height.
                              The header is ~52px, so available height = 100dvh - 52px.
                            */}
                            <div style={{
                                width: 'min(100vw, calc((100dvh - 52px) * 16 / 9))',
                                maxWidth: '100vw',
                            }}>
                                <SecureYouTubePlayer
                                    videoId={activeLecture.youtube_video_id}
                                    title={activeLecture.title}
                                    thumbnail={activeLecture.thumbnail_url}
                                    startSeconds={Number(localStorage.getItem(`yt_progress_${activeLecture.youtube_video_id}`)) || 0}
                                    onProgress={(sec) => {
                                        // only save progress if watched more than 5s to avoid saving 0s on load
                                        if (sec > 5) {
                                            localStorage.setItem(`yt_progress_${activeLecture.youtube_video_id}`, sec.toString());
                                        }
                                    }}
                                    onEnded={() => {
                                        handleMarkComplete(activeLecture);
                                        localStorage.removeItem(`yt_progress_${activeLecture.youtube_video_id}`);
                                    }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
