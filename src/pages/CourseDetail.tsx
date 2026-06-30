import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import { useCourseAccess } from '@/hooks/useCourseAccess';
import { usePricing } from '@/context/PricingContext';
import { useCurrency } from '@/hooks/useCurrency';
import CoursePaymentModal from '@/components/courses/CoursePaymentModal';
import {
    ArrowLeft, Loader2, CheckCircle, Lock, Play, Sparkles, GraduationCap, ChevronRight, Share2, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { SubjectIcon, getSubjectColorClass } from '@/components/ui/SubjectIcon';
interface Course {
    id: string; title: string; description: string;
    thumbnail_url: string; banner_url: string;
    price_eur: number; discount_price_eur?: number | null; expiry_days: number; is_free: boolean;
    exam_model_id: string | null;
    regional_prices?: Record<string, number>;
    launch_date?: string;
    lecture_type?: string;
    features?: string[];
    slug?: string;
}
interface Subject { id: string; title: string; position: number; }

type Tab = 'description' | 'classes';

function formatExpiry(days: number) {
    if (days >= 365) return `${Math.floor(days / 365)} year`;
    if (days >= 30) return `${Math.floor(days / 30)} months`;
    return `${days} days`;
}

export default function CourseDetail({ isMobileLayout }: { isMobileLayout?: boolean }) {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth() as any;
    const { allExams } = useExam();
    const { hasAccess, enrollment, isLoading: accessLoading } = useCourseAccess(courseId);

    const [course, setCourse] = useState<Course | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [chapterCounts, setChapterCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('description');
    const [enrolling, setEnrolling] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isPreRegistered, setIsPreRegistered] = useState(false);
    const [isPreRegistering, setIsPreRegistering] = useState(false);
    const [preRegistrationCount, setPreRegistrationCount] = useState(0);

    const { config, openPricingModal } = usePricing();
    const { formatPrice, getRegionalPrice } = useCurrency();

    // Find the best bundle plan (prioritize global, then elite, then pro)
    const BUNDLE_PLAN = config?.plans.find(p => p.id === 'global') || 
                        config?.plans.find(p => p.id === 'elite') || 
                        config?.plans.find(p => p.id === 'pro');

    useEffect(() => { if (courseId) fetchCourseData(); }, [courseId]);

    const fetchCourseData = async () => {
        setIsLoading(true);
        const sb = supabase as any;
        const [courseRes, subjectsRes] = await Promise.all([
            sb.from('courses').select('*').eq('id', courseId!).single(),
            sb.from('course_subjects').select('*').eq('course_id', courseId!).order('position'),
        ]);

        if (courseRes.error || !courseRes.data) { navigate('/courses'); return; }

        const courseData = courseRes.data as any;
        courseData._examName = courseData.exam_model_id ? (allExams[courseData.exam_model_id]?.name || courseData.exam_model_id) : null;
        setCourse(courseData);

        const subs: Subject[] = (subjectsRes.data as any) || [];
        setSubjects(subs);

        if (subs.length > 0) {
            const { data: chapters } = await sb
                .from('course_chapters')
                .select('subject_id')
                .in('subject_id', subs.map((s: Subject) => s.id));

            const counts: Record<string, number> = {};
            (chapters || []).forEach((c: any) => {
                counts[c.subject_id] = (counts[c.subject_id] || 0) + 1;
            });
            setChapterCounts(counts);
        }

        if (user) {
            try {
                const { data } = await sb.from('course_pre_registrations').select('id').eq('user_id', user.id).eq('course_id', courseId).maybeSingle();
                if (data) setIsPreRegistered(true);
            } catch (e) {
                // Ignore error if table doesn't exist yet
            }
        }

        try {
            const { count } = await sb.from('course_pre_registrations').select('*', { count: 'exact', head: true }).eq('course_id', courseId);
            if (count) setPreRegistrationCount(count);
        } catch (e) {
            // Ignore
        }

        setIsLoading(false);
    };

    const handleEnroll = async () => {
        if (!user) { toast.error('Please sign in to enroll.'); return; }
        if (!course) return;
        if (course.is_free) {
            setEnrolling(true);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + course.expiry_days);
            const { error } = await (supabase as any).from('course_enrollments').upsert([{
                user_id: user.id, course_id: course.id,
                amount_paid_eur: 0, expires_at: expiresAt.toISOString(), status: 'active'
            }], { onConflict: 'user_id,course_id' });
            setEnrolling(false);
            if (error) { toast.error('Enrollment failed. Please try again.'); return; }
            toast.success('Enrolled! You now have access to all content.');
            window.location.reload();
        } else {
            navigate(`/courses/${course.id}/checkout`);
        }
    };

    const handlePreRegister = async () => {
        if (!user) { toast.error('Please sign in to pre-register.'); return; }
        setIsPreRegistering(true);
        try {
            const { error } = await (supabase as any).from('course_pre_registrations').insert({
                user_id: user.id,
                course_id: course.id
            });
            if (error) throw error;
            setIsPreRegistered(true);
            toast.success('Successfully pre-registered! We will notify you and send a discount when it launches.');
        } catch (e: any) {
            toast.error(e.message || 'Failed to pre-register. Please try again later.');
        } finally {
            setIsPreRegistering(false);
        }
    };

    const handleShare = async () => {
        const slugOrId = course?.slug || courseId;
        const url = `https://italostudy.com/courses/${slugOrId}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: course?.title || 'ItaloStudy Course',
                    text: `Check out this course: ${course?.title}`,
                    url: url
                });
            } catch (err) {
                // Ignore abort errors
            }
        } else {
            navigator.clipboard.writeText(url);
            toast.success('Course link copied to clipboard!');
        }
    };

    const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const examName = (course as any)?._examName;
    const TABS: { id: Tab; label: string }[] = [
        { id: 'description', label: 'Description' },
        { id: 'classes', label: 'All Classes' },
    ];

    const originalLocal = course ? getRegionalPrice(course.price_eur, course.regional_prices) : { amount: 0, currency: 'EUR' };
    const hasDiscount = !!course?.discount_price_eur || !!course?.regional_prices?.INR_discount;
    const finalLocal = course && hasDiscount
        ? getRegionalPrice(course.discount_price_eur || course.price_eur, course.regional_prices?.INR_discount ? { INR: course.regional_prices.INR_discount } : undefined)
        : originalLocal;
    const displayOriginalAmount = hasDiscount ? originalLocal.amount : (originalLocal.amount > 0 ? Math.round(originalLocal.amount * 1.8) : 0);
    const discountPercent = displayOriginalAmount > 0 ? Math.round(((displayOriginalAmount - finalLocal.amount) / displayOriginalAmount) * 100) : 0;

    const isComingSoon = course && course.launch_date && (
        course.launch_date.toLowerCase() === 'coming soon' || 
        (!isNaN(Date.parse(course.launch_date)) && new Date(course.launch_date) > new Date())
    );

    // ── Loading state ────────────────────────────────────────────────────────
    if (isLoading || accessLoading) {
        const loader = isMobileLayout ? (
            <div className="min-h-screen bg-[#f3f4f6] dark:bg-slate-950 pb-[100px] animate-pulse">
                <div className="w-full aspect-video bg-slate-200 dark:bg-slate-800" />
                <div className="bg-white dark:bg-slate-900 px-5 py-5">
                    <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
                    <div className="flex gap-2 mb-4">
                        <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                    <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-lg mt-4" />
                </div>
                <div className="mt-2 bg-white dark:bg-slate-900 px-5 py-6 space-y-4">
                    <div className="h-5 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="space-y-2">
                        <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-4 w-4/6 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                </div>
            </div>
        ) : (
            <div className="bg-[#f3f4f6] dark:bg-slate-950 min-h-screen animate-pulse">
                <div className="bg-slate-200 dark:bg-slate-800 h-[180px] w-full" />
                <div className="max-w-[1200px] mx-auto px-4 py-8 pb-20">
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 space-y-6">
                            <div className="bg-white dark:bg-slate-900 rounded-xl h-[400px] border border-slate-200 dark:border-slate-800" />
                            <div className="bg-white dark:bg-slate-900 rounded-xl h-[200px] border border-slate-200 dark:border-slate-800" />
                        </div>
                        <div className="w-full lg:w-[380px] shrink-0">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl h-[450px] border border-slate-200 dark:border-slate-800" />
                        </div>
                    </div>
                </div>
            </div>
        );

        if (isMobileLayout) return loader;
        return <Layout showFooter={false}>{loader}</Layout>;
    }

    if (!course) return null;

    // Features list
    const features = course.features && course.features.length > 0 ? course.features : [
        `${subjects.length} Subjects included`,
        `${formatExpiry(course.expiry_days)} access validity`,
        'One-time payment',
        examName ? `For ${examName} Aspirants` : 'All exam models',
        'Detailed Chapter Layout',
        'Expert Instruction',
        'Premium Video Player',
        'Progress Tracking'
    ];

    // ── Mobile layout ────────────────────────────────────────────────────────
    if (isMobileLayout) {
        return (
            <div className="min-h-screen bg-[#f3f4f6] dark:bg-slate-950 pb-[100px]">
                    {/* Top Poster Image */}
                    <div className="relative w-full aspect-video bg-slate-900 overflow-hidden">
                        <button onClick={() => navigate('/courses')} className="absolute top-4 left-4 z-10 w-8 h-8 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full text-white active:scale-95 transition-transform">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#6b46c1]">
                                <GraduationCap className="w-16 h-16 text-white/50" />
                            </div>
                        )}
                    </div>

                    {/* Title Block */}
                    <div className="bg-white dark:bg-slate-900 px-5 py-5 shadow-sm">
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-snug mb-3">
                            {course.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-slate-500">
                            {course.lecture_type && (
                                <div className={cn("px-2 py-1 rounded flex items-center gap-1 uppercase", course.lecture_type.toLowerCase() === 'live' ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300")}>
                                    {course.lecture_type.toLowerCase() === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>}
                                    {course.lecture_type}
                                </div>
                            )}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                <GraduationCap className="w-3.5 h-3.5" /> {examName ? `For ${examName} Aspirants` : 'For All Aspirants'}
                            </div>
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded">
                                English
                            </div>
                        </div>
                    </div>

                    {/* Inline CTA Block */}
                    <div className="bg-white dark:bg-slate-900 px-5 pb-5 pt-2 shadow-sm border-b border-slate-100 dark:border-slate-800">
                        {hasAccess ? (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        if (subjects.length > 0) {
                                            navigate(`/courses/${courseId}/subject/${subjects[0].id}`);
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 bg-[#5a4bda] active:bg-[#4a3bc2] text-white rounded-lg py-3 font-bold text-sm transition-all uppercase"
                                >
                                    <Play className="w-4 h-4 fill-white" /> Continue Learning
                                </button>
                                {BUNDLE_PLAN && (
                                    <button
                                        onClick={openPricingModal}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-[#5a4bda] text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" /> Unlock {BUNDLE_PLAN.name}
                                    </button>
                                )}
                            </div>
                        ) : isComingSoon ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg text-sm">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        <span className="font-bold">Pre-register for early discount</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handlePreRegister}
                                    disabled={isPreRegistering || isPreRegistered}
                                    className="w-full flex items-center justify-center gap-2 bg-[#5a4bda] active:bg-[#4a3bc2] disabled:opacity-60 text-white rounded-lg py-3 font-bold text-sm transition-all uppercase tracking-wide"
                                >
                                    {isPreRegistering ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                                        isPreRegistered ? 'PRE-REGISTERED SUCCESSFULLY' : 'PRE-REGISTER'
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 flex flex-col justify-center">
                                    {course.is_free ? (
                                        <span className="text-xl font-bold text-[#5a4bda]">Free</span>
                                    ) : (
                                        <>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-xl font-bold text-[#5a4bda] leading-none">
                                                    {formatPrice(finalLocal.amount, finalLocal.currency)}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-400 line-through">
                                                    {formatPrice(displayOriginalAmount, finalLocal.currency)}
                                                </span>
                                            </div>
                                            <div className="mt-1 w-fit inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 px-1 py-0.5 rounded text-[9px] font-bold">
                                                <span className="w-2.5 h-2.5 flex items-center justify-center bg-green-700 text-white rounded-full text-[6px]">%</span>
                                                {discountPercent}% OFF
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={handleEnroll}
                                    disabled={enrolling || accessLoading}
                                    className="flex-[1.5] flex items-center justify-center gap-2 bg-[#5a4bda] active:bg-[#4a3bc2] disabled:opacity-60 text-white rounded-lg py-3 font-bold text-sm transition-all shadow-sm uppercase tracking-wide"
                                >
                                    {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : (course.is_free ? 'ENROLL FREE' : 'BUY NOW')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Tab bar ── */}
                    <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm mt-2">
                        <div className="flex px-2 overflow-x-auto hide-scrollbar">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap',
                                        activeTab === tab.id
                                            ? 'border-[#5a4bda] text-[#5a4bda]'
                                            : 'border-transparent text-slate-500'
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Tab content ── */}
                    <div className="px-4 pt-4">
                        <AnimatePresence mode="wait">
                            {activeTab === 'description' && (
                                <motion.div key="desc" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                            <h3 className="font-bold text-slate-800 dark:text-white text-base">Batch Offerings</h3>
                                        </div>
                                        <div className="p-4">
                                            <div className="grid grid-cols-1 gap-3">
                                                {features.map((item, idx) => (
                                                    <div key={idx} className="flex items-start gap-3">
                                                        <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                        </svg>
                                                        <span className="text-slate-700 dark:text-slate-300 font-medium text-sm">{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {course.description && (
                                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                                            <h3 className="font-bold text-slate-800 dark:text-white mb-3 text-base">About This Course</h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{course.description}</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'classes' && (
                                <motion.div key="classes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                    {subjects.length === 0 ? (
                                        <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-900 rounded-xl">
                                            <p className="font-bold text-sm">Content coming soon.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {subjects.map((subject, si) => {
                                                const chapterCount = chapterCounts[subject.id] || 0;
                                                return (
                                                    <motion.button
                                                        key={subject.id}
                                                        onClick={() => navigate(`/courses/${courseId}/subject/${subject.id}`)}
                                                        className="w-full group flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 active:scale-[0.98] transition-all shadow-sm text-left"
                                                    >
                                                        <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
                                                            <SubjectIcon subjectName={subject.title} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
                                                                {subject.title}
                                                            </h3>
                                                            <p className="text-xs text-slate-400 font-medium mt-1">
                                                                {chapterCount} Chapter{chapterCount !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                        <ChevronRight className="w-5 h-5 text-slate-300" />
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    
                </div>
        );
    }

    // ── Desktop layout ───────────────────────────────────────────────────────
    return (
        <Layout showFooter={false}>
            <div className="bg-[#f3f4f6] dark:bg-slate-950 min-h-screen">
                    
                    {/* Top Purple Banner */}
                    <div className="bg-gradient-to-r from-[#6b46c1] to-[#805ad5] px-6 py-10 md:py-14 relative overflow-hidden">
                        {/* Optional background shapes */}
                        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 translate-x-10" />
                        <div className="absolute right-40 top-0 bottom-0 w-1/4 bg-white/5 skew-x-12 translate-x-10" />
                        
                        <div className="max-w-[1200px] mx-auto px-4 relative z-10 flex items-center">
                            <button onClick={() => navigate('/courses')} className="mr-4 text-white/80 hover:text-white transition-colors">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <h1 className="text-3xl md:text-[32px] font-bold text-white tracking-wide">
                                {course.title}
                            </h1>
                        </div>
                    </div>

                    {/* Tab Bar Container */}
                    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-30">
                        <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-between">
                            <div className="flex gap-8">
                                {TABS.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`py-4 text-[15px] font-semibold border-b-[3px] transition-all ${
                                            activeTab === tab.id
                                                ? 'border-[#5a4bda] text-[#5a4bda]'
                                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            {/* Action Buttons */}
                            <div className="hidden md:flex gap-3">
                                <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <Share2 className="w-4 h-4" /> Share Batch
                                </button>
                                <button onClick={() => toast.info('Announcements coming soon!')} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <Bell className="w-4 h-4" /> Announcement
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Layout (Below Tabs) */}
                    <div className="max-w-[1200px] mx-auto px-4 py-8 pb-20">
                        <div className="flex flex-col lg:flex-row gap-6">
                            
                            {/* Left Content */}
                            <div className="flex-1 min-w-0">
                                {activeTab === 'description' && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                            <div className="p-5 md:p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer">
                                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Batch Offerings</h2>
                                            </div>
                                            
                                            <div className="p-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                                                    {features.map((item, idx) => (
                                                        <div key={idx} className="flex items-start gap-3">
                                                            <svg className="w-[18px] h-[18px] text-amber-400 mt-[3px] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                            </svg>
                                                            <span className="text-slate-700 dark:text-slate-300 font-medium text-[15px]">{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {course.description && (
                                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-lg">About This Course</h3>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{course.description}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {activeTab === 'classes' && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        {subjects.length === 0 ? (
                                            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-slate-400">
                                                <p className="font-bold">Content coming soon.</p>
                                            </div>
                                        ) : (
                                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {subjects.map((subject, si) => {
                                                        const chapterCount = chapterCounts[subject.id] || 0;
                                                        return (
                                                            <motion.button
                                                                key={subject.id}
                                                                onClick={() => navigate(`/courses/${courseId}/subject/${subject.id}`)}
                                                                className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#5a4bda] dark:hover:border-[#5a4bda] bg-slate-50 dark:bg-slate-800/50 text-left transition-all cursor-pointer"
                                                            >
                                                                <div className={cn("w-12 h-12 rounded-lg shadow-sm flex items-center justify-center flex-shrink-0", getSubjectColorClass(subject.title))}>
                                                                    <SubjectIcon subjectName={subject.title} className="w-6 h-6" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <h3 className="font-bold text-slate-900 dark:text-white text-[15px] leading-snug line-clamp-2 group-hover:text-[#5a4bda] transition-colors">
                                                                        {subject.title}
                                                                    </h3>
                                                                    <p className="text-xs text-slate-500 font-medium mt-1">
                                                                        {chapterCount} Chapter{chapterCount !== 1 ? 's' : ''}
                                                                    </p>
                                                                </div>
                                                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#5a4bda] transition-colors" />
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>

                            {/* Right Content (Sticky Card) */}
                            <div className="lg:w-[350px] flex-shrink-0">
                                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-slate-200 dark:border-slate-800 sticky top-24 overflow-hidden">
                                    <div className="p-3">
                                        <div className="rounded-lg overflow-hidden relative mb-4">
                                            {course.thumbnail_url ? (
                                                <img src={course.thumbnail_url} alt={course.title} className="w-full aspect-video object-cover" />
                                            ) : (
                                                <div className="w-full aspect-video bg-[#6b46c1] flex items-center justify-center">
                                                    <GraduationCap className="w-16 h-16 text-white/50" />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="px-1 pb-2 space-y-4">
                                            <div className="flex items-center justify-between text-xs font-semibold">
                                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                    <GraduationCap className="w-4 h-4" /> {examName ? `For ${examName} Aspirants` : 'For All Aspirants'}
                                                </div>
                                                <div className="bg-[#f0f0ff] dark:bg-indigo-900/30 text-[#5a4bda] px-2 py-1 rounded">
                                                    English
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500 dark:text-slate-400">Start Date</span>
                                                    <span className="font-bold text-slate-800 dark:text-white">{course.launch_date || 'Immediately'}</span>
                                                </div>
                                                {course.lecture_type && (
                                                    <div className="flex justify-between text-sm items-center">
                                                        <span className="text-slate-500 dark:text-slate-400">Lecture Type</span>
                                                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", course.lecture_type.toLowerCase() === 'live' ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
                                                            {course.lecture_type}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {hasAccess ? (
                                                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                                                        <CheckCircle className="w-5 h-5" />
                                                        <span className="font-bold text-sm">Enrolled Successfully</span>
                                                    </div>
                                                    
                                                    <button
                                                        onClick={() => {
                                                            setActiveTab('classes');
                                                            if (subjects.length > 0) {
                                                                navigate(`/courses/${courseId}/subject/${subjects[0].id}`);
                                                            }
                                                        }}
                                                        className="w-full bg-[#5a4bda] hover:bg-[#4a3bc2] text-white rounded-lg h-12 font-bold uppercase tracking-wide text-sm transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Play className="w-4 h-4 fill-white" /> Continue Learning
                                                    </button>
                                                    
                                                    {BUNDLE_PLAN && (
                                                        <button
                                                            onClick={openPricingModal}
                                                            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Sparkles className="w-4 h-4 text-[#5a4bda]" />
                                                                <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Unlock {BUNDLE_PLAN.name}</span>
                                                            </div>
                                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : isComingSoon ? (
                                                <div className="flex flex-col gap-3 mt-2">
                                                    <div className="flex items-center justify-between gap-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Sparkles className="w-5 h-5" />
                                                            <span className="font-bold">Pre-register for early discount</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={handlePreRegister}
                                                        disabled={isPreRegistered || isPreRegistering}
                                                        className="w-full bg-[#5a4bda] hover:bg-[#4a3bc2] text-white rounded-lg h-12 font-bold uppercase tracking-wide text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                                    >
                                                        {isPreRegistering ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                                                            isPreRegistered ? 'PRE-REGISTERED SUCCESSFULLY' : 'PRE-REGISTER NOW'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-4 mt-2">
                                                    <div className="flex flex-col">
                                                        {course.is_free ? (
                                                            <span className="text-2xl font-bold text-[#5a4bda]">Free</span>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[22px] font-bold text-[#5a4bda]">{formatPrice(finalLocal.amount, finalLocal.currency)}</span>
                                                                    <span className="text-sm text-slate-400 line-through">{formatPrice(displayOriginalAmount, finalLocal.currency)}</span>
                                                                </div>
                                                                <div className="mt-1 w-fit inline-flex items-center gap-1 bg-[#e8f5e9] border border-[#c8e6c9] text-[#2e7d32] px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                                    <span className="w-3 h-3 flex items-center justify-center bg-[#2e7d32] text-white rounded-full text-[8px]">%</span>
                                                                    {discountPercent}% OFF
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={handleEnroll}
                                                        disabled={enrolling || accessLoading}
                                                        className="bg-[#5a4bda] hover:bg-[#4a3bc2] text-white font-bold px-6 py-3 rounded-lg shadow-sm transition-colors uppercase tracking-wide text-sm disabled:opacity-70 flex items-center gap-2 min-w-[120px] justify-center"
                                                    >
                                                        {enrolling ? <Loader2 className="w-5 h-5 animate-spin" /> : (course.is_free ? 'ENROLL FREE' : 'BUY NOW')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
    );
}
