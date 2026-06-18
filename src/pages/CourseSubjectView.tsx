/**
 * CourseSubjectView — shows a subject's chapters as PW-style cards.
 * Mobile-native: wraps in MobileLayout for header + bottom dock.
 */
import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useCourseAccess } from '@/hooks/useCourseAccess';
import { ArrowLeft, Loader2, BookOpen, Video, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Chapter {
    id: string; title: string; position: number;
    _lectureCount?: number; _pdfCount?: number;
}

export default function CourseSubjectView({ isMobileLayout }: { isMobileLayout?: boolean }) {
    const { courseId, subjectId } = useParams<{ courseId: string; subjectId: string }>();
    const navigate = useNavigate();
    const { hasAccess, isLoading: accessLoading } = useCourseAccess(courseId);

    const [subjectTitle, setSubjectTitle] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!courseId || !subjectId) return;
        fetchData();
    }, [courseId, subjectId]);

    const fetchData = async () => {
        setIsLoading(true);
        const sb = supabase as any;
        const [courseRes, subjectRes, chaptersRes] = await Promise.all([
            sb.from('courses').select('title').eq('id', courseId!).single(),
            sb.from('course_subjects').select('title').eq('id', subjectId!).single(),
            sb.from('course_chapters').select('*').eq('subject_id', subjectId!).order('position'),
        ]);

        setCourseTitle(courseRes.data?.title || '');
        setSubjectTitle(subjectRes.data?.title || '');
        const chaps: Chapter[] = chaptersRes.data || [];

        if (chaps.length > 0) {
            const chapIds = chaps.map(c => c.id);
            const [lecRes, pdfRes] = await Promise.all([
                sb.from('course_lectures').select('chapter_id').in('chapter_id', chapIds),
                sb.from('course_pdfs').select('chapter_id').in('chapter_id', chapIds),
            ]);

            const lecCounts: Record<string, number> = {};
            const pdfCounts: Record<string, number> = {};
            (lecRes.data || []).forEach((l: any) => { lecCounts[l.chapter_id] = (lecCounts[l.chapter_id] || 0) + 1; });
            (pdfRes.data || []).forEach((p: any) => { pdfCounts[p.chapter_id] = (pdfCounts[p.chapter_id] || 0) + 1; });

            chaps.forEach(c => {
                c._lectureCount = lecCounts[c.id] || 0;
                c._pdfCount = pdfCounts[c.id] || 0;
            });
        }

        setChapters(chaps);
        setIsLoading(false);
    };

    const handleChapterClick = (chapter: Chapter) => {
        navigate(`/courses/${courseId}/subject/${subjectId}/chapter/${chapter.id}`);
    };

    // Loading state
    if (isLoading || accessLoading) {
        const loader = (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                </div>
                <p className="text-sm font-bold text-slate-400">Loading chapters…</p>
            </div>
        );
        if (isMobileLayout) return loader;
        return <Layout>{loader}</Layout>;
    }

    const content = (
        <div className={cn("min-h-screen bg-[#f5f5f5] dark:bg-slate-950", isMobileLayout && "pb-36")}>

            {/* ── Top bar ── */}
            <div className={cn(
                "sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800",
                isMobileLayout ? "px-4 py-3" : "px-5 py-3"
            )}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/courses/${courseId}`)}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white active:text-indigo-600 text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
                    <span className="text-xs font-bold text-slate-400 truncate flex-1">{courseTitle}</span>
                </div>
            </div>

            {/* ── Content ── */}
            <div className={cn("max-w-5xl mx-auto py-6", isMobileLayout ? "px-4" : "px-5 py-8")}>

                {/* Subject heading */}
                <div className="mb-6">
                    <h1 className={cn("font-black text-slate-900 dark:text-white", isMobileLayout ? "text-xl" : "text-2xl md:text-3xl")}>
                        {subjectTitle}
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        {chapters.length} Chapter{chapters.length !== 1 ? 's' : ''} · Select a chapter to start learning
                    </p>
                </div>

                {/* Chapters */}
                {chapters.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-bold">No chapters added yet.</p>
                    </div>
                ) : (
                    <div className={cn("grid gap-3", isMobileLayout ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
                        {chapters.map((chapter, i) => (
                            <motion.button
                                key={chapter.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04, duration: 0.3 }}
                                onClick={() => handleChapterClick(chapter)}
                                className={cn(
                                    "group w-full text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all flex items-start gap-4",
                                    isMobileLayout
                                        ? "p-4 active:scale-[0.98] active:bg-indigo-50 dark:active:bg-indigo-900/20 active:border-indigo-300"
                                        : "p-5 hover:shadow-md hover:-translate-y-0.5"
                                )}
                            >
                                {/* PW left accent bar */}
                                <div className="w-1 self-stretch rounded-full bg-indigo-500 flex-shrink-0" />

                                <div className="flex-1 min-w-0">
                                    <h3 className={cn(
                                        "font-black leading-snug line-clamp-2 text-slate-900 dark:text-white transition-colors",
                                        isMobileLayout ? "text-sm" : "text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                    )}>
                                        {chapter.title}
                                    </h3>

                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                        <span className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
                                            <Video className="w-3 h-3" />
                                            {chapter._lectureCount} Video{chapter._lectureCount !== 1 ? 's' : ''}
                                        </span>
                                        <span className="text-slate-200 dark:text-slate-700">|</span>
                                        <span className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
                                            <FileText className="w-3 h-3" />
                                            {chapter._pdfCount} Note{chapter._pdfCount !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    if (isMobileLayout) return content;
    return <Layout showFooter={false}>{content}</Layout>;
}
