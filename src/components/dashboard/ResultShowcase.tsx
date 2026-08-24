import { useEffect, useState, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronLeft, ChevronRight, Lock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import SecureYouTubePlayer from '@/components/courses/SecureYouTubePlayer';

interface ShowcaseVideo {
    id: string;
    title: string;
    description: string;
    youtube_video_id: string;
    thumbnail_url: string;
    course_id: string | null;
    subject: string | null;
    topic: string | null;
    is_preview?: boolean;
}

interface Props {
    /** 'practice_result' or 'mock_result' */
    placement: 'practice_result' | 'mock_result';
    examName?: string;
    examType?: string;  // exam_id or type key from test data
    userId?: string;
    /** Subject of the just-completed practice session */
    subject?: string | null;
    /** Topic of the just-completed practice session */
    topic?: string | null;
}

export const ResultShowcase = memo(({
    placement,
    examName,
    examType,
    userId,
    subject,
    topic,
}: Props) => {
    const [videos, setVideos] = useState<ShowcaseVideo[]>([]);
    const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [playingVideo, setPlayingVideo] = useState<ShowcaseVideo | null>(null);
    const navigate = useNavigate();

    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'start',
        slidesToScroll: 1,
        breakpoints: {
            '(min-width: 768px)': { slidesToScroll: 2 },
            '(min-width: 1024px)': { slidesToScroll: 3 }
        }
    });

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

    useEffect(() => {
        // Need at least exam info to fetch
        if (!examName && !examType) return;

        const loadData = async () => {
            setIsLoading(true);
            try {
                // Step 1: Resolve exam_id from learning_exams table
                // test.exam_type is a slug like 'imat-prep' or 'cent-s-prep'
                // learning_exams.name is like 'IMAT (International Medical...)'
                // We match by extracting the meaningful keyword from the slug
                const examSlug = (examName || examType || '').toLowerCase().replace('-prep', '').replace(/-/g, ' ').trim();
                const examKeyword = examSlug.split(' ')[0]; // e.g. 'imat', 'cent', 'sat'

                const { data: examRows } = await (supabase as any)
                    .from('learning_exams')
                    .select('id, name');

                // Find the best matching exam by checking if any exam name contains our keyword
                const matchedExam = (examRows || []).find((ex: any) =>
                    ex.name?.toLowerCase().includes(examKeyword) ||
                    ex.id?.toLowerCase().includes(examKeyword)
                );

                const examId = matchedExam?.id;

                // Step 2: Fetch showcase videos — filter by exam_id if resolved
                let query = (supabase as any)
                    .from('exam_showcase_videos')
                    .select('id, title, description, youtube_video_id, thumbnail_url, course_id, subject, topic')
                    .eq('is_active', true)
                    .eq('placement', placement)
                    .order('position', { ascending: true });

                if (examId) {
                    query = query.eq('exam_id', examId);
                }

                const { data: vids, error } = await query;

                if (error) throw error;

                let filtered = vids || [];

                // For practice_result: smart subject+topic cascade
                // Rule: If the student practiced a specific TOPIC → show exact topic match first
                //       If the student practiced at SUBJECT level (topic=null) → show ALL videos
                //       for that subject (regardless of what topic they were tagged with)
                if (placement === 'practice_result' && subject) {
                    const subjectLower = subject.toLowerCase();

                    if (topic) {
                        // Student practiced a specific topic → cascade:
                        // 1. Exact subject + exact topic match
                        // 2. Subject match with no topic filter (catch-all for subject)
                        // 3. No subject/topic filter at all (exam catch-all)
                        const exactMatch = filtered.filter((v: any) =>
                            v.subject?.toLowerCase() === subjectLower &&
                            v.topic?.toLowerCase() === topic.toLowerCase()
                        );
                        const subjectOnly = filtered.filter((v: any) =>
                            v.subject?.toLowerCase() === subjectLower && !v.topic
                        );
                        const noFilter = filtered.filter((v: any) => !v.subject && !v.topic);

                        filtered = exactMatch.length > 0 ? exactMatch
                            : subjectOnly.length > 0 ? subjectOnly
                            : noFilter;
                    } else {
                        // Student practiced subject-level (no specific topic)
                        // → show ALL videos tagged for this subject (any or no topic)
                        const subjectMatch = filtered.filter((v: any) =>
                            v.subject?.toLowerCase() === subjectLower
                        );
                        const noFilter = filtered.filter((v: any) => !v.subject && !v.topic);

                        filtered = subjectMatch.length > 0 ? subjectMatch : noFilter;
                    }
                }

                console.log('[ResultShowcase] examKeyword:', examKeyword, '| matched exam:', matchedExam?.name, '| examId:', examId, '| placement:', placement, '| subject:', subject, '| topic:', topic, '| fetched:', vids?.length, '| filtered:', filtered.length);

                if (filtered.length === 0) {
                    setVideos([]);
                    setIsLoading(false);
                    return;
                }

                // Resolve enrollment / PRO access
                const courseIds = filtered.filter((v: any) => v.course_id).map((v: any) => v.course_id);
                const enrollments = new Set<string>();

                if (courseIds.length > 0 && userId) {
                    const { data: enrollRes } = await (supabase as any)
                        .from('course_enrollments')
                        .select('course_id')
                        .eq('user_id', userId)
                        .in('course_id', courseIds)
                        .eq('status', 'active')
                        .gt('expires_at', new Date().toISOString());

                    if (enrollRes) {
                        enrollRes.forEach((e: any) => enrollments.add(e.course_id));
                    }
                }

                // Check free preview status
                const ytIds = filtered.map((v: any) => v.youtube_video_id);
                let previewIds = new Set<string>();
                if (ytIds.length > 0) {
                    const { data: previewData } = await (supabase as any)
                        .from('course_lectures')
                        .select('youtube_video_id')
                        .in('youtube_video_id', ytIds)
                        .eq('is_preview', true);
                    if (previewData) {
                        previewIds = new Set(previewData.map((p: any) => p.youtube_video_id));
                    }
                }

                setVideos(filtered.map((v: any) => ({ ...v, is_preview: previewIds.has(v.youtube_video_id) })));
                setEnrolledCourseIds(enrollments);
            } catch (err) {
                console.error('ResultShowcase load error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [placement, examName, examType, userId, subject, topic]);

    if (isLoading || videos.length === 0) return null;

    const isPractice = placement === 'practice_result';

    return (
        <div className="w-full mt-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        {isPractice
                            ? `Master ${subject || 'this topic'} — Watch These Lectures`
                            : 'Improve Your Weakest Areas — Top Courses'}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {isPractice
                            ? 'Students who watched these scored 25%+ higher on their next attempt.'
                            : 'Top-scoring students used these courses to jump 15+ points.'}
                    </p>
                </div>
                {videos.length > 2 && (
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={scrollPrev} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={scrollNext} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Carousel */}
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-3">
                    {videos.map((video) => {
                        const isAccessible = video.course_id
                            ? (enrolledCourseIds.has(video.course_id) || video.is_preview)
                            : true;

                        return (
                            <div key={video.id} className="flex-[0_0_85%] sm:flex-[0_0_48%] lg:flex-[0_0_31%] min-w-0">
                                <div className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm aspect-video bg-slate-900 cursor-pointer">
                                    {/* Thumbnail */}
                                    <img
                                        src={video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`}
                                        alt={video.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`;
                                        }}
                                    />

                                    {/* Play button */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl transition-transform duration-300 group-hover:scale-110">
                                            {isAccessible
                                                ? <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                                : <Lock className="w-4 h-4 text-white" />
                                            }
                                        </div>
                                    </div>

                                    {/* Gradient + title */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
                                    <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
                                        <h3 className="text-white font-bold text-sm line-clamp-1 mb-0.5">{video.title}</h3>
                                        {video.description && (
                                            <p className="text-white/60 text-[11px] line-clamp-1">{video.description}</p>
                                        )}
                                    </div>

                                    {/* Locked overlay */}
                                    {!isAccessible && video.course_id && (
                                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-5 text-center z-20">
                                            <Lock className="w-7 h-7 text-amber-400 mb-2" />
                                            <h4 className="text-white font-bold text-base mb-1">Unlock Full Course</h4>
                                            <p className="text-white/60 text-xs mb-4 max-w-[180px]">
                                                Enroll to watch the full lecture and master this subject.
                                            </p>
                                            <Button
                                                onClick={() => navigate(`/courses/${video.course_id}/checkout`)}
                                                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2 rounded-full text-xs"
                                            >
                                                Enroll Now
                                            </Button>
                                        </div>
                                    )}

                                    {/* Click to play (if accessible) */}
                                    {isAccessible && (
                                        <div
                                            className="absolute inset-0 z-10"
                                            onClick={() => setPlayingVideo(video)}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Video player modal */}
            <Dialog open={!!playingVideo} onOpenChange={(open) => !open && setPlayingVideo(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none [&>button]:text-white" aria-describedby={undefined}>
                    <DialogTitle className="sr-only">{playingVideo?.title || 'Video Player'}</DialogTitle>
                    {playingVideo && (
                        <div className="aspect-video w-full relative bg-black">
                            <SecureYouTubePlayer
                                videoId={playingVideo.youtube_video_id}
                                title={playingVideo.title}
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
});
