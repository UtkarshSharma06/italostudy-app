import { useEffect, useState, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import SecureYouTubePlayer from '@/components/courses/SecureYouTubePlayer';

interface ShowcaseVideo {
    id: string;
    title: string;
    description: string;
    youtube_video_id: string;
    thumbnail_url: string;
    course_id: string | null;
    is_preview?: boolean; // Dynamically populated
}

export const DashboardShowcase = memo(({ examName, userId }: { examName?: string, userId?: string }) => {
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

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    useEffect(() => {
        if (!examName || !userId) return;

        const loadData = async () => {
            setIsLoading(true);
            try {
                // Fetch videos for active exam using inner join with learning_exams
                const { data: vids, error: vidsError } = await (supabase as any)
                    .from('exam_showcase_videos')
                    .select('id, title, description, youtube_video_id, thumbnail_url, course_id, learning_exams!inner(name)')
                    .eq('is_active', true)
                    .order('position', { ascending: true });

                console.log('SHOWCASE VIDEOS FETCHED:', vids);
                console.log('Current examName:', examName);
                
                if (vidsError) throw vidsError;

                // Filter locally just in case
                const filteredVids = vids?.filter((v: any) => v.learning_exams?.name?.toLowerCase().includes(examName.toLowerCase().split(' ')[0])) || [];
                console.log('SHOWCASE VIDEOS FILTERED:', filteredVids);

                // Only get enrollments if they are actually needed (we have videos with course_id)
                const courseIds = filteredVids.filter((v: any) => v.course_id).map((v: any) => v.course_id);
                const enrollments = new Set<string>();

                // 1. Fetch course enrollments
                if (courseIds.length > 0) {
                    const { data: enrollmentData } = await (supabase as any)
                        .from('course_enrollments')
                        .select('course_id')
                        .eq('user_id', userId)
                        .in('course_id', courseIds);

                    if (enrollmentData) {
                        enrollmentData.forEach((e: any) => enrollments.add(e.course_id));
                    }
                    
                    // Also check global PRO access if we want
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('selected_plan')
                        .eq('id', userId)
                        .single();
                        
                    if (profile?.selected_plan && profile.selected_plan !== 'explorer') {
                        // If they have PRO, they might have access to all courses, but lets stick to direct enrollments 
                        // or just unlock them if PRO gives access to courses.
                        // Assuming PRO gives access to all courses:
                        courseIds.forEach((id: string) => enrollments.add(id));
                    }
                }

                // 2. Fetch preview status from course_lectures
                const ytIds = filteredVids.map((v: any) => v.youtube_video_id);
                let previewIds = new Set<string>();
                if (ytIds.length > 0) {
                    const { data: previewData, error: previewError } = await (supabase as any)
                        .from('course_lectures')
                        .select('youtube_video_id, is_preview')
                        .in('youtube_video_id', ytIds)
                        .eq('is_preview', true);
                    
                    if (previewData) {
                        previewIds = new Set(previewData.map((p: any) => p.youtube_video_id));
                    }
                }

                // Attach is_preview to the videos
                const finalVids = filteredVids.map((v: any) => ({
                    ...v,
                    is_preview: previewIds.has(v.youtube_video_id)
                }));

                setVideos(finalVids);
                setEnrolledCourseIds(enrollments);
            } catch (error) {
                console.error('Error loading showcase videos:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [examName, userId]);

    if (isLoading || videos.length === 0) return null;

    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 mt-6 mb-2">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Play className="w-5 h-5 text-indigo-500 fill-indigo-500" />
                        Featured Videos
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">Watch exclusive content and highly recommended lectures.</p>
                </div>
                {videos.length > 3 && (
                    <div className="flex items-center gap-2">
                        <button onClick={scrollPrev} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={scrollNext} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-4">
                    {videos.map((video) => {
                        // A video is accessible if enrolled OR if it is marked as a free preview
                        const isEnrolled = video.course_id ? (enrolledCourseIds.has(video.course_id) || video.is_preview) : true;
                        
                        return (
                            <div key={video.id} className="flex-[0_0_85%] md:flex-[0_0_45%] lg:flex-[0_0_31%] min-w-0">
                                <div className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm aspect-video bg-slate-900">
                                    {/* Thumbnail */}
                                    <img 
                                        src={video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`} 
                                        alt={video.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                                    />
                                    
                                    {/* Play Button Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl transition-transform duration-300 group-hover:scale-110">
                                            <Play className="w-5 h-5 text-white fill-white ml-1" />
                                        </div>
                                    </div>

                                    {/* Content Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                                    {/* Title & Description */}
                                    <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
                                        <h3 className="text-white font-bold text-sm md:text-base line-clamp-1 mb-1">{video.title}</h3>
                                        {video.description && (
                                            <p className="text-white/70 text-xs line-clamp-2">{video.description}</p>
                                        )}
                                    </div>

                                    {/* Hover CTA Overlay for locked courses */}
                                    {!isEnrolled && video.course_id && (
                                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-6 text-center">
                                            <Lock className="w-8 h-8 text-amber-400 mb-3" />
                                            <h4 className="text-white font-bold text-lg mb-1">Unlock Full Course</h4>
                                            <p className="text-white/70 text-xs mb-4">Enroll in this course to watch the full lecture and master the subject.</p>
                                            <Button 
                                                onClick={() => navigate(`/courses/${video.course_id}/checkout`)}
                                                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-2 rounded-full"
                                            >
                                                Enroll Now
                                            </Button>
                                        </div>
                                    )}

                                    {/* Click Target for playing (if not locked) */}
                                    {(isEnrolled || !video.course_id) && (
                                        <div 
                                            className="absolute inset-0 z-10 cursor-pointer"
                                            onClick={() => {
                                                setPlayingVideo(video);
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Video Player Modal */}
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
