/**
 * CrossSellBanner
 *
 * Shows personalized offers based on user state:
 * - Explorer / free / expired plan  → rotate sub offer + course offer
 * - Active subscriber, no course    → show exam-matched course (launched only)
 * - Course buyer, no subscription   → subscription upsell with UPGRADE15
 * - Has both                        → nothing
 */
import { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight, Tag, GraduationCap, Zap, Star, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { usePricing } from '@/context/PricingContext';

const DISMISS_KEY = 'italostudy_crosssell_dismissed';

interface Course {
    id: string;
    title: string;
    thumbnail_url?: string;
    discount_price_eur?: number | null;
    price_eur: number;
    exam_model_id?: string;
    launch_date?: string | null;
}

interface CrossSellBannerProps {
    variant?: 'banner' | 'card';
    onUpgradeClick?: () => void;
}

function isCourseLaunched(course: Course): boolean {
    if (!course.launch_date) return true; // no date = available
    const ld = course.launch_date.toLowerCase();
    if (ld === 'coming soon' || ld === 'tba' || ld === '') return false;
    const d = new Date(course.launch_date);
    if (isNaN(d.getTime())) return false; // unparseable = treat as coming soon
    return d <= new Date();
}

function isSubscriptionActive(profile: any): boolean {
    if (!profile) return false;
    const tier = profile.subscription_tier;
    if (!tier || tier === 'explorer' || tier === 'free') return false;
    const expiry = profile.subscription_expiry_date;
    if (!expiry) return true; // no expiry = lifetime
    return new Date(expiry) > new Date();
}

export default function CrossSellBanner({ variant = 'banner', onUpgradeClick }: CrossSellBannerProps) {
    const { user, profile } = useAuth() as any;
    const navigate = useNavigate();
    const [dismissed, setDismissed] = useState(false);
    const [copied, setCopied] = useState(false);
    const [launchedCourses, setLaunchedCourses] = useState<Course[]>([]);
    const [comingSoonCourses, setComingSoonCourses] = useState<Course[]>([]);
    const [mode, setMode] = useState<'sub_to_course' | 'course_to_sub' | 'free_to_paid' | null>(null);
    const [explorerSlide, setExplorerSlide] = useState(0);
    const [mounted, setMounted] = useState(false);
    const { openPricingModal } = usePricing();

    useEffect(() => {
        if (sessionStorage.getItem(DISMISS_KEY)) { setDismissed(true); return; }
        if (!user || !profile) return;

        const detectMode = async () => {
            const hasSub = isSubscriptionActive(profile);

            // Check if user owns any course
            const { data: txns } = await (supabase as any)
                .from('course_transactions')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'completed')
                .limit(1);
            const hasCourse = txns && txns.length > 0;

            if (!hasSub && !hasCourse) {
                setMode('free_to_paid');
                await fetchCourses(profile.selected_exam);
            } else if (hasSub && !hasCourse) {
                setMode('sub_to_course');
                await fetchCourses(profile.selected_exam);
            } else if (hasCourse && !hasSub) {
                setMode('course_to_sub');
            }
            setMounted(true);
        };

        detectMode();
    }, [user, profile]);

    const fetchCourses = async (examName?: string) => {
        // Get all active courses
        const { data: allCourses } = await (supabase as any)
            .from('courses')
            .select('id, title, thumbnail_url, price_eur, discount_price_eur, exam_model_id, launch_date')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (!allCourses?.length) return;

        let candidates: Course[] = allCourses;

        // Try to find exam-matched course first
        if (examName) {
            try {
                const { data: exams, error } = await (supabase as any)
                    .from('exam_models')
                    .select('id')
                    .ilike('name', `%${examName}%`)
                    .limit(1);

                if (!error && exams?.[0]) {
                    candidates = allCourses.filter((c: Course) => c.exam_model_id === exams[0].id);
                    if (!candidates.length) candidates = allCourses; // fallback to all
                }
            } catch (err) {
                // Ignore if table doesn't exist or other error
            }
        }

        // Split into launched vs coming soon
        const launched = candidates.filter((c: Course) => isCourseLaunched(c));
        const comingSoon = candidates.filter((c: Course) => !isCourseLaunched(c));

        // Sort coming soon courses so the nearest launch date is first
        const sortedComingSoon = comingSoon.sort((a, b) => {
            const dateA = a.launch_date ? new Date(a.launch_date).getTime() : Infinity;
            const dateB = b.launch_date ? new Date(b.launch_date).getTime() : Infinity;
            return dateA - dateB;
        });

        setLaunchedCourses(launched);
        setComingSoonCourses(sortedComingSoon);
        
        // If no launched candidates, fallback to all courses launched
        if (!launched.length) {
            const anyLaunched = allCourses.filter((c: Course) => isCourseLaunched(c));
            setLaunchedCourses(anyLaunched);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem(DISMISS_KEY, '1');
    };

    const copyCode = () => {
        navigator.clipboard.writeText('UPGRADE15').catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    // Rotate Explorer slides every 8 seconds
    useEffect(() => {
        if (mode !== 'free_to_paid' && mode !== 'sub_to_course') return;
        const slidesCount = getTotalSlides();
        if (slidesCount <= 1) return;
        const id = setInterval(() => setExplorerSlide(s => (s + 1) % slidesCount), 8000);
        return () => clearInterval(id);
    }, [mode, launchedCourses, comingSoonCourses]);

    const getTotalSlides = () => {
        let count = mode === 'free_to_paid' ? 1 : 0; // free_to_paid has a sub slide
        count += launchedCourses.length;
        count += comingSoonCourses.length;
        return count;
    };

    if (!mounted || dismissed || !mode) return null;

    const dismissBtn = (
        <button onClick={handleDismiss} className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white/70 hover:text-white shrink-0 transition-colors">
            <X className="w-3.5 h-3.5" />
        </button>
    );

    // ── Free / Explorer / Expired → Convert to paid ───────────────────────────
    if (mode === 'free_to_paid') {
        const subSlide = (
            <div className="flex items-center gap-3 sm:gap-4 w-full">
                <div className="hidden sm:flex items-center gap-1.5 bg-white/15 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
                    <Sparkles className="w-3 h-3" /> Free Plan
                </div>
                <p className="flex-1 text-white text-[11px] sm:text-sm font-bold min-w-0">
                    🔓 <strong>Unlock unlimited practice</strong> — 12,000+ students use Premium to score higher.
                </p>
                <button onClick={onUpgradeClick || openPricingModal}
                    className="flex items-center gap-1.5 bg-white text-violet-700 font-black text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full hover:bg-violet-50 transition-all shrink-0 shadow-md whitespace-nowrap">
                    See Plans <ArrowRight className="w-3 h-3" />
                </button>
            </div>
        );

        const launchedSlides = launchedCourses.map(course => (
            <div key={`l-${course.id}`} className="flex items-center gap-3 sm:gap-4 w-full">
                <div className="hidden sm:flex items-center gap-1.5 bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
                    <GraduationCap className="w-3 h-3" /> Course
                </div>
                <p className="flex-1 text-white text-[11px] sm:text-sm font-bold min-w-0 truncate">
                    🎯 <strong className="text-yellow-300">{course.title}</strong> — only €{course.discount_price_eur || course.price_eur}
                </p>
                <button onClick={() => navigate(`/courses/${course.id}`)}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-black font-black text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full transition-all shrink-0 whitespace-nowrap">
                    View Course <ArrowRight className="w-3 h-3" />
                </button>
            </div>
        ));

        const comingSoonSlides = comingSoonCourses.map(course => (
            <div key={`c-${course.id}`} className="flex items-center gap-3 sm:gap-4 w-full">
                <div className="hidden sm:flex items-center gap-1.5 bg-pink-400/20 border border-pink-400/30 text-pink-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
                    <Calendar className="w-3 h-3" /> Coming Soon
                </div>
                <p className="flex-1 text-white text-[11px] sm:text-sm font-bold min-w-0 truncate">
                    🚀 <strong className="text-pink-300">{course.title}</strong> is launching soon — pre-register now & save!
                </p>
                <button onClick={() => navigate(`/courses/${course.id}`)}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-black text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full transition-all shrink-0 whitespace-nowrap">
                    Pre-Register <ArrowRight className="w-3 h-3" />
                </button>
            </div>
        ));

        const slides = [subSlide, ...launchedSlides, ...comingSoonSlides].filter(Boolean);
        const totalSlides = slides.length;

        if (variant === 'banner') {
            return (
                <div className="w-full relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #2d1b69 0%, #4338ca 50%, #6d28d9 100%)' }}>
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-1/4 w-28 h-28 bg-white/5 rounded-full blur-2xl" />
                        <div className="absolute top-0 right-1/3 w-20 h-20 bg-violet-300/10 rounded-full blur-xl" />
                    </div>
                    <div className="relative max-w-[1200px] mx-auto px-4 py-2.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">{slides[explorerSlide % totalSlides]}</div>
                        {totalSlides > 1 && (
                            <div className="flex gap-1 shrink-0">
                                {slides.map((_, i) => (
                                    <button key={i} onClick={() => setExplorerSlide(i)}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === explorerSlide % totalSlides ? 'bg-white w-4' : 'bg-white/30 w-1.5'}`} />
                                ))}
                            </div>
                        )}
                        {dismissBtn}
                    </div>
                </div>
            );
        }

        // Card variant
        return (
            <div className="relative rounded-2xl overflow-hidden border border-violet-200 shadow-lg bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50">
                <button onClick={handleDismiss} className="absolute top-3 right-3 w-6 h-6 rounded-full bg-violet-100 hover:bg-violet-200 flex items-center justify-center text-violet-400 z-10">
                    <X className="w-3.5 h-3.5" />
                </button>
                <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest">Upgrade Now</span>
                            <h3 className="text-sm font-black text-slate-900 leading-tight">You're leaving marks on the table</h3>
                        </div>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">
                        Free users score <strong>23% lower</strong> on average. Get unlimited mock tests, AI explanations & daily practice.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <button onClick={onUpgradeClick || openPricingModal}
                            className="py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.98]">
                            <Zap className="w-3.5 h-3.5" /> Get Premium
                        </button>
                        {launchedCourses.length > 0 && (
                            <button onClick={() => navigate(`/courses/${launchedCourses[0].id}`)}
                                className="py-2.5 bg-white border-2 border-amber-400 text-amber-700 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all hover:bg-amber-50 active:scale-[0.98]">
                                <GraduationCap className="w-3.5 h-3.5" /> View Course
                            </button>
                        )}
                    </div>
                    {comingSoonCourses.length > 0 && (
                        <button onClick={() => navigate(`/courses/${comingSoonCourses[0].id}`)}
                            className="w-full py-2 bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-200 text-pink-700 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all hover:bg-pink-50 active:scale-[0.98] mb-3">
                            <Calendar className="w-3.5 h-3.5" /> Pre-register: {comingSoonCourses[0].title}
                        </button>
                    )}
                    <div className="flex items-center justify-center gap-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />)}
                        <span className="text-[10px] text-slate-400 ml-1">12,000+ students · 4.9/5</span>
                    </div>
                </div>
            </div>
        );
    }

    // ── Active Sub → Buy a launched course ───────────────────────────────────
    if (mode === 'sub_to_course') {
        const courseToShow = launchedCourses[0]; // ONLY show launched courses
        if (!courseToShow) return null;
        const price = courseToShow.discount_price_eur || courseToShow.price_eur;

        if (variant === 'banner') {
            return (
                <div className="w-full relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #d97706 100%)' }}>
                    <div className="absolute inset-0 opacity-[0.08]"
                        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                    <div className="relative max-w-[1200px] mx-auto px-4 py-2.5 flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-1.5 bg-white/15 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
                            <GraduationCap className="w-3 h-3" /> Member Perk
                        </div>
                        <p className="flex-1 text-white text-[11px] sm:text-sm font-bold min-w-0 truncate">
                            🎓 <strong>Premium perk</strong> — Get <strong className="text-yellow-200">{courseToShow.title}</strong> for just <strong className="text-yellow-200">€{price}</strong>
                        </p>
                        <button onClick={() => navigate(`/courses/${courseToShow.id}`)}
                            className="flex items-center gap-1.5 bg-white text-amber-700 font-black text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full hover:bg-amber-50 transition-all shrink-0 shadow-md whitespace-nowrap">
                            Enroll Now <ArrowRight className="w-3 h-3" />
                        </button>
                        {dismissBtn}
                    </div>
                </div>
            );
        }

        return (
            <div className="relative rounded-2xl overflow-hidden border border-amber-200 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
                <button onClick={handleDismiss} className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center text-amber-600 z-10">
                    <X className="w-3.5 h-3.5" />
                </button>
                <div className="p-5 flex gap-4">
                    {courseToShow.thumbnail_url && (
                        <div className="w-20 aspect-video rounded-xl overflow-hidden shrink-0 shadow-md">
                            <img src={courseToShow.thumbnail_url} alt={courseToShow.title} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">For Premium Members</span>
                        <h3 className="text-sm font-black text-slate-900 leading-tight mt-0.5 mb-1 pr-6">{courseToShow.title}</h3>
                        <p className="text-xs text-slate-600 font-medium mb-3">Structured video course — perfect complement to your practice tests.</p>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-lg font-black text-slate-900">€{price}</span>
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full">One-time</span>
                        </div>
                        <button onClick={() => navigate(`/courses/${courseToShow.id}/checkout`)}
                            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]">
                            <GraduationCap className="w-3.5 h-3.5" /> Enroll Now <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        {comingSoonCourses.length > 0 && (
                            <button onClick={() => navigate(`/courses/${comingSoonCourses[0].id}`)}
                                className="w-full mt-2 py-2 text-xs text-pink-600 font-bold flex items-center justify-center gap-1.5 hover:text-pink-800">
                                <Calendar className="w-3.5 h-3.5" /> Also: {comingSoonCourses[0].title} — Pre-register →
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Course buyer → Subscription upsell ───────────────────────────────────
    if (mode === 'course_to_sub') {
        if (variant === 'banner') {
            return (
                <div className="w-full relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' }}>
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-1/3 w-24 h-24 bg-violet-500/20 rounded-full blur-2xl" />
                    </div>
                    <div className="relative max-w-[1200px] mx-auto px-4 py-2.5 flex items-center gap-3 sm:gap-4">
                        <div className="hidden sm:flex items-center gap-1.5 bg-violet-400/20 border border-violet-400/30 text-violet-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0">
                            <Zap className="w-3 h-3 fill-violet-300" /> Exclusive
                        </div>
                        <p className="flex-1 text-white text-[11px] sm:text-sm font-bold min-w-0">
                            You have a course! Now practice daily — <strong className="text-yellow-300">15% off Premium</strong> with code
                            <button onClick={copyCode} className="ml-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-yellow-300 font-black text-xs px-2 py-0.5 rounded-md transition-all tracking-wider">
                                {copied ? '✓ Copied!' : 'UPGRADE15'}
                            </button>
                        </p>
                        <button onClick={onUpgradeClick || openPricingModal}
                            className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-black font-black text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full transition-all shrink-0">
                            Get Premium <ArrowRight className="w-3 h-3" />
                        </button>
                        {dismissBtn}
                    </div>
                </div>
            );
        }

        return (
            <div className="relative rounded-2xl overflow-hidden border border-indigo-200 dark:border-indigo-800 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #ede9fe 100%)' }}>
                <button onClick={handleDismiss} className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-200/50 hover:bg-slate-300/50 flex items-center justify-center text-slate-400 z-10">
                    <X className="w-3.5 h-3.5" />
                </button>
                <div className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Course Holder Offer</span>
                            <h3 className="text-base font-black text-slate-900 leading-tight mb-1">Now practice what you learn — daily!</h3>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3">
                                Your course gives you the theory. <strong>Premium</strong> gives you unlimited mock tests & AI explanations. As a course holder, get <strong className="text-indigo-700">15% off</strong>.
                            </p>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex-1 bg-white border-2 border-dashed border-indigo-300 rounded-xl px-3 py-2 flex items-center gap-2">
                                    <Tag className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <span className="font-black text-indigo-700 tracking-widest text-sm">UPGRADE15</span>
                                </div>
                                <button onClick={copyCode} className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                                    {copied ? '✓ Copied!' : 'Copy'}
                                </button>
                            </div>
                            <div className="flex items-center gap-1 mb-3">
                                {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />)}
                                <span className="text-[10px] text-slate-500 ml-1 font-medium">Loved by 12,000+ students</span>
                            </div>
                            <button onClick={onUpgradeClick || openPricingModal}
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black rounded-xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]">
                                <Sparkles className="w-4 h-4" /> Upgrade to Premium <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
