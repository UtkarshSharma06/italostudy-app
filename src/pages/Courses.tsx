import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import CourseCard from '@/components/courses/CourseCard';
import { GraduationCap, Search, Loader2, BookOpen, Sparkles, ArrowRight, Zap, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AdBanner {
    image_url: string;
    title?: string;
    subtitle?: string;
    cta_label?: string;
    cta_url?: string;
}

interface Course {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    banner_url: string;
    exam_model_id: string | null;
    price_eur: number;
    expiry_days: number;
    is_free: boolean;
    exam_model_name?: string;
    enrolled?: boolean;
    expires_at?: string;
}

import Layout from '@/components/Layout';

export default function Courses({ isMobileLayout }: { isMobileLayout?: boolean }) {
    const { user, profile } = useAuth() as any;
    const { activeExam, allExams } = useExam();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [adBanner, setAdBanner] = useState<AdBanner | null>(null);

    useEffect(() => { fetchAdBanner(); }, []);
    useEffect(() => { fetchCourses(); }, [user?.id, activeExam?.id]);

    const fetchAdBanner = async () => {
        try {
            const { data } = await (supabase as any)
                .from('system_settings')
                .select('value')
                .eq('key', 'courses_ad_banner')
                .maybeSingle();
            if (data?.value) setAdBanner(data.value as AdBanner);
        } catch { /* silent */ }
    };

    const fetchCourses = async () => {
        setIsLoading(true);
        try {
            const sb = supabase as any;
            const { data: coursesData, error } = await sb.from('courses').select('*').eq('is_active', true).order('created_at', { ascending: false });
            if (error) throw error;

            const courseList: Course[] = (coursesData || []).map((c: any) => ({
                ...c,
                exam_model_name: c.exam_model_id ? (allExams[c.exam_model_id]?.name || c.exam_model_id) : null,
            }));

            if (user) {
                const { data: enrollments } = await sb.from('course_enrollments')
                    .select('course_id, expires_at')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .gt('expires_at', new Date().toISOString());

                const enrollMap: Record<string, string> = {};
                (enrollments || []).forEach((e: any) => { enrollMap[e.course_id] = e.expires_at; });
                courseList.forEach(c => { if (enrollMap[c.id]) { c.enrolled = true; c.expires_at = enrollMap[c.id]; } });
            }

            const filtered = courseList.filter(c => !c.exam_model_id || !activeExam || c.exam_model_id === activeExam.id);
            setCourses(filtered);
        } catch (err) {
            console.error('Failed to fetch courses:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const filtered = courses.filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()));
    const enrolled = filtered.filter(c => c.enrolled);
    const available = filtered.filter(c => !c.enrolled);

    const content = (
        <div className="min-h-screen bg-[#f0f2f5] dark:bg-slate-950 pb-8 w-full">

            {/* ── Banner ── */}
            {!isLoading && (adBanner || courses.length > 0) && (
                <AdBannerSection banner={adBanner} fallbackCourse={courses[0] || null} />
            )}

            {/* ── PW Style Header ── */}
            <div className="bg-white border-b border-[#e2e2e2] px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <h1 className="text-[#333] font-bold text-[20px] flex items-center gap-2">
                    Batches
                </h1>
                <div className="relative w-full max-w-xs md:max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
                    <input
                        placeholder="Search for courses..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 h-10 text-[13px] rounded-[6px] border border-[#d9d9d9] bg-white text-[#333] placeholder:text-[#888] focus:outline-none focus:border-[#5a4bda] focus:ring-1 focus:ring-[#5a4bda] transition-colors"
                    />
                </div>
            </div>

            {/* ── Cross-Promo Banner for Explorer Users ── */}
            {profile?.selected_plan === 'explorer' && (
                <div className="mx-4 mt-6">
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[2rem] p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight mb-1">
                                    🔥 Unlock unlimited practice + mocks
                                </h3>
                                <p className="text-indigo-100 text-xs">
                                    Courses give you knowledge. Subscriptions give you practice. Upgrade to Pro today.
                                </p>
                            </div>
                        </div>
                        <a href="/pricing" className="relative z-10 whitespace-nowrap bg-white text-indigo-600 font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl hover:scale-105 transition-transform flex items-center gap-2">
                            Upgrade Plan <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            )}

            {/* ── Course grid ── */}
            <div className="px-6 py-6 space-y-8 bg-white min-h-[50vh]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                        </div>
                        <p className="text-[13px] font-medium text-slate-400">Loading batches…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto mb-5">
                            <BookOpen className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-500 mb-2">
                            {search ? 'No results found' : 'No batches yet'}
                        </h3>
                        <p className="text-[13px] text-slate-400">
                            {search ? 'Try a different search term.' : 'Check back soon!'}
                        </p>
                    </div>
                ) : (
                    <>
                        {enrolled.length > 0 && (
                            <div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                                    {enrolled.map((c, i) => <CourseCard key={c.id} course={c} index={i} />)}
                                </div>
                            </div>
                        )}
                        {available.length > 0 && (
                            <div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {available.map((c, i) => <CourseCard key={c.id} course={c} index={i} />)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );

    if (isMobileLayout) return content;
    return <Layout showFooter={false}>{content}</Layout>;
}

// ── Ad/Promotional Banner ────────────────────────────────────────────────────
function AdBannerSection({ banner, fallbackCourse }: { banner: AdBanner | null; fallbackCourse: Course | null }) {
    if (banner?.image_url) {
        const hasText = !!(banner.title || banner.subtitle || (banner.cta_label && banner.cta_url));
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full overflow-hidden" style={{ height: 180 }}>
                <img src={banner.image_url} alt={banner.title || 'Courses'} className="w-full h-full object-cover" />
                {hasText && <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent" />}
                {hasText && (
                    <div className="absolute inset-0 flex flex-col justify-center px-5">
                        {banner.title && <h2 className="text-xl font-black text-white leading-tight drop-shadow-lg">{banner.title}</h2>}
                        {banner.subtitle && <p className="text-white/80 text-sm mt-1.5 drop-shadow">{banner.subtitle}</p>}
                        {banner.cta_label && banner.cta_url && (
                            <a href={banner.cta_url} className="mt-3 w-fit bg-white text-slate-900 font-black text-[11px] uppercase tracking-widest px-4 py-2 rounded-full shadow-lg">
                                {banner.cta_label} →
                            </a>
                        )}
                    </div>
                )}
            </motion.div>
        );
    }

    if (!fallbackCourse) return null;
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="relative w-full overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600"
            style={{ height: 140 }}
        >
            <div className="absolute right-4 top-2 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute right-20 bottom-2 w-20 h-20 rounded-full bg-white/5" />
            <div className="absolute inset-0 flex flex-col justify-center px-5">
                <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">ItaloStudy Courses</p>
                </div>
                <h2 className="text-xl font-black text-white">Elevate Your Exam Prep</h2>
                <p className="text-white/70 text-xs mt-1">Expert-curated courses for your success</p>
            </div>
        </motion.div>
    );
}

// Removed Section since PW layout doesn't use section headers like 'Popular Courses'
