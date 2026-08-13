import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, ChevronRight, Bell, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

/** Same logic as CourseDetail.tsx — a course is "coming soon" if
 *  launch_date is the literal string "coming soon" OR is a future date. */
function isComingSoon(launchDate?: string | null): boolean {
    if (!launchDate) return false;
    if (launchDate.toLowerCase() === 'coming soon') return true;
    const parsed = Date.parse(launchDate);
    return !isNaN(parsed) && new Date(launchDate) > new Date();
}

export const DynamicCourseAd = ({
    placementId,
    onStatusChange,
}: {
    placementId: string;
    onStatusChange?: (isActive: boolean) => void;
}) => {
    const { formatPrice } = useCurrency();
    const navigate = useNavigate();
    const { user } = useAuth() as any;

    // Track which courses the user has already pre-registered for (locally)
    const [preRegistered, setPreRegistered] = useState<Record<string, boolean>>({});
    const [preRegistering, setPreRegistering] = useState<Record<string, boolean>>({});

    const { data: adCourses, isLoading } = useQuery({
        queryKey: ['course_ads', placementId],
        queryFn: async () => {
            // 1. Fetch active campaign for this placement
            const { data: campaign } = await (supabase as any)
                .from('course_ad_campaigns')
                .select('course_ids')
                .eq('placement_id', placementId)
                .eq('is_active', true)
                .maybeSingle();

            if (!campaign || !campaign.course_ids || campaign.course_ids.length === 0) return [];

            // 2. Fetch the actual courses — include launch_date so we know if they're coming soon
            const { data: courses } = await (supabase as any)
                .from('courses')
                .select('id, title, slug, thumbnail_url, price_eur, discount_price_eur, exam_model_id, launch_date')
                .in('id', campaign.course_ids)
                .eq('is_active', true);

            // 3. Re-order to match the order saved in the campaign
            if (courses) {
                return courses.sort(
                    (a: any, b: any) =>
                        campaign.course_ids.indexOf(a.id) - campaign.course_ids.indexOf(b.id)
                );
            }

            return [];
        },
        staleTime: 1000 * 60 * 30, // 30 minutes caching
    });

    // After courses load, check which ones the logged-in user has already pre-registered for
    useEffect(() => {
        if (!user || !adCourses || adCourses.length === 0) return;

        const comingSoonIds = adCourses
            .filter((c: any) => isComingSoon(c.launch_date))
            .map((c: any) => c.id);

        if (comingSoonIds.length === 0) return;

        (supabase as any)
            .from('course_pre_registrations')
            .select('course_id')
            .eq('user_id', user.id)
            .in('course_id', comingSoonIds)
            .then(({ data }: any) => {
                if (data) {
                    const map: Record<string, boolean> = {};
                    data.forEach((row: any) => { map[row.course_id] = true; });
                    setPreRegistered(map);
                }
            });
    }, [user, adCourses]);

    useEffect(() => {
        if (!isLoading && onStatusChange) {
            onStatusChange(!!adCourses && adCourses.length > 0);
        }
    }, [adCourses, isLoading, onStatusChange]);

    const handlePreRegister = async (e: React.MouseEvent, courseId: string) => {
        e.stopPropagation(); // Don't navigate to the course page

        if (!user) {
            toast.error('Please sign in to pre-register.');
            navigate('/auth');
            return;
        }

        setPreRegistering(prev => ({ ...prev, [courseId]: true }));
        try {
            const { error } = await (supabase as any)
                .from('course_pre_registrations')
                .insert({ user_id: user.id, course_id: courseId });

            if (error) throw error;

            setPreRegistered(prev => ({ ...prev, [courseId]: true }));
            toast.success("You're pre-registered! We'll notify you with a discount when it launches. 🎉");
        } catch (e: any) {
            // Ignore duplicate key (user already pre-registered)
            if (e?.code === '23505') {
                setPreRegistered(prev => ({ ...prev, [courseId]: true }));
            } else {
                toast.error(e.message || 'Failed to pre-register. Please try again.');
            }
        } finally {
            setPreRegistering(prev => ({ ...prev, [courseId]: false }));
        }
    };

    if (isLoading) return null;
    if (!adCourses || adCourses.length === 0) return null;

    return (
        <div className="w-full mt-4 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </span>
                    Recommended Courses
                </h3>
                <button
                    onClick={() => navigate('/courses')}
                    className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-0.5 hover:opacity-70 transition-opacity"
                >
                    View All <ChevronRight className="w-3 h-3" />
                </button>
            </div>

            {/* Card Strip */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-4 md:p-5 border-2 border-emerald-100/60 dark:border-emerald-800/30">
                <div className="flex overflow-x-auto gap-3 pb-2 snap-x no-scrollbar">
                    {adCourses.map((course: any) => {
                        const comingSoon = isComingSoon(course.launch_date);
                        const alreadyPreRegistered = preRegistered[course.id];
                        const isRegistering = preRegistering[course.id];

                        // base price = price_eur (shown struck-through)
                        // discounted price = discount_price_eur (shown prominent)
                        const basePrice = course.price_eur;
                        const discountedPrice = course.discount_price_eur;
                        const hasDiscount = discountedPrice && discountedPrice < basePrice && discountedPrice > 0;
                        const displayPrice = hasDiscount ? discountedPrice : basePrice; // prominent price
                        const discountPct = hasDiscount ? Math.round(((basePrice - discountedPrice) / basePrice) * 100) : 0;

                        return (
                            <button
                                key={course.id}
                                onClick={() => navigate(`/courses/${course.id}`)}
                                className="min-w-[160px] w-[160px] snap-center bg-white dark:bg-slate-800 rounded-xl p-3 border-2 border-transparent hover:border-emerald-500 dark:hover:border-emerald-400 shadow-sm hover:shadow-xl transition-all group text-left shrink-0 flex flex-col"
                            >
                                {/* Thumbnail */}
                                <div className="aspect-video rounded-lg bg-emerald-50 dark:bg-slate-700 mb-3 overflow-hidden relative">
                                    {course.thumbnail_url ? (
                                        <img
                                            src={course.thumbnail_url}
                                            alt={course.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <GraduationCap className="w-8 h-8 text-emerald-300 dark:text-emerald-600" />
                                        </div>
                                    )}

                                    {/* Coming Soon badge overlaid on thumbnail */}
                                    {comingSoon && (
                                        <div className="absolute top-1.5 left-1.5">
                                            <span className="text-[9px] font-black bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-md uppercase tracking-wide leading-none">
                                                Coming Soon
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs line-clamp-2 mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    {course.title}
                                </h4>

                                {/* Bottom area — price OR pre-register button */}
                                <div className="mt-auto">
                                    {comingSoon ? (
                                        /* Pre-Register Button */
                                        alreadyPreRegistered ? (
                                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                                <span className="text-[10px] font-black">Pre-Registered!</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => handlePreRegister(e, course.id)}
                                                disabled={isRegistering}
                                                className="w-full flex items-center justify-center gap-1 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-amber-900 font-black text-[10px] uppercase tracking-wide px-2 py-1.5 rounded-lg transition-all hover:scale-[1.03] active:scale-95"
                                            >
                                                {isRegistering ? (
                                                    <span className="w-3 h-3 border-2 border-amber-900/40 border-t-amber-900 rounded-full animate-spin" />
                                                ) : (
                                                    <Bell className="w-3 h-3 shrink-0" />
                                                )}
                                                {isRegistering ? 'Saving...' : 'Pre-Register'}
                                            </button>
                                        )
                                    ) : (
                                        /* Normal price display — discounted price prominent, base price struck through */
                                        <div className="flex flex-col gap-0.5">
                                            {displayPrice != null ? (
                                                <>
                                                    {/* Main (prominent) price */}
                                                    <div className="flex items-baseline gap-1.5 flex-wrap">
                                                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                                            {formatPrice(displayPrice)}
                                                        </span>
                                                        {hasDiscount && (
                                                            <span className="text-[11px] font-bold text-slate-400 line-through">
                                                                {formatPrice(basePrice)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Discount badge */}
                                                    {hasDiscount && (
                                                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-md self-start">
                                                            -{discountPct}% OFF
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                    Free
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
