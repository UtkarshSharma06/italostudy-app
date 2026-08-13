import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, ChevronRight, CheckCircle, Clock, Play, FileText, Star, Bookmark, MonitorPlay, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useCurrency } from '@/hooks/useCurrency';
import { Course } from '@/pages/Courses'; 
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface CourseCardProps { 
    course: Course; 
    index?: number;
    variant?: 'batch' | 'recommended' | 'default';
}

function formatExpiry(days: number) {
    if (days >= 365) return `${Math.floor(days / 365)}yr`;
    if (days >= 30) return `${Math.floor(days / 30)}mo`;
    return `${days}d`;
}

// Deterministic gradient/color per course id if none is provided
function gradientFor(id: string) {
    const palettes = [
        'from-violet-500 to-purple-700',
        'from-blue-500 to-indigo-700',
        'from-emerald-500 to-teal-700',
        'from-orange-500 to-rose-600',
        'from-pink-500 to-fuchsia-700',
        'from-amber-500 to-orange-700',
    ];
    const idx = id.charCodeAt(0) % palettes.length;
    return palettes[idx];
}

function getIconForType(type?: string) {
    switch (type) {
        case 'hat': return 'https://cdn3d.iconscout.com/3d/premium/thumb/graduation-cap-and-books-5339678-4466542.png';
        case 'atom': return 'https://cdn3d.iconscout.com/3d/premium/thumb/atom-5590924-4652936.png';
        case 'leaf': return 'https://cdn3d.iconscout.com/3d/premium/thumb/leaf-4993467-4160010.png';
        case 'flask': return 'https://cdn3d.iconscout.com/3d/premium/thumb/flask-4993452-4160000.png';
        default: return 'https://cdn3d.iconscout.com/3d/premium/thumb/graduation-cap-and-books-5339678-4466542.png'; // Fallback
    }
}

export default function CourseCard({ course, index = 0, variant = 'default' }: CourseCardProps) {
    const navigate = useNavigate();
    const { formatPrice, getRegionalPrice } = useCurrency();
    const isEnrolled = !!course.enrolled;

    const originalLocal = getRegionalPrice(course.price_eur, course.regional_prices);
    const hasDiscount = !!course.discount_price_eur || !!course.regional_prices?.INR_discount;
    
    const displayOriginalAmount = hasDiscount ? originalLocal.amount : (originalLocal.amount > 0 ? Math.round(originalLocal.amount * 1.8) : 0);
    
    const finalLocal = hasDiscount 
        ? getRegionalPrice(course.discount_price_eur || course.price_eur, course.regional_prices?.INR_discount ? { INR: course.regional_prices.INR_discount } : undefined)
        : originalLocal;

    const discountPercent = displayOriginalAmount > 0 
        ? Math.round(((displayOriginalAmount - finalLocal.amount) / displayOriginalAmount) * 100) 
        : 0;

    const isComingSoon = course.launch_date && (
        course.launch_date.toLowerCase() === 'coming soon' || 
        (!isNaN(Date.parse(course.launch_date)) && new Date(course.launch_date) > new Date())
    );

    const { user } = useAuth() as any;
    const [isWishlisted, setIsWishlisted] = useState(!!course.is_wishlisted);

    const toggleWishlist = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        
        try {
            const sb = supabase as any;
            if (isWishlisted) {
                await sb.from('user_wishlists').delete().eq('user_id', user.id).eq('course_id', course.id);
                setIsWishlisted(false);
            } else {
                await sb.from('user_wishlists').insert({ user_id: user.id, course_id: course.id });
                setIsWishlisted(true);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleResume = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            navigate(`/courses/${course.id}`);
            return;
        }

        // Try to fetch last progress to resume exact video
        try {
            const sb = supabase as any;
            const { data } = await sb.from('user_course_progress').select('lesson_id').eq('user_id', user.id).eq('course_id', course.id).single();
            if (data?.lesson_id) {
                // If we had a lesson_id, we would navigate to the exact player. 
                // Currently, the app routes are nested by subject/chapter. 
                // We'll navigate to the course detail and let it handle resume or just pass it in state
                navigate(`/courses/${course.id}?resume=${data.lesson_id}`);
                return;
            }
        } catch(err) {}
        
        navigate(`/courses/${course.id}`);
    };

    // --- BATCH VARIANT ---
    if (variant === 'batch') {
        const bgColor = course.theme_color || '#5a4bda'; // Default to primary if not set
        const progress = course.progress_percentage || 0;
        const isInProgress = progress > 0 && progress < 100;
        const isNotStarted = progress === 0;

        // Button style dynamically based on theme_color
        const buttonStyle = {
            color: bgColor,
            borderColor: `${bgColor}40`, // 25% opacity for border
            backgroundColor: 'transparent'
        };

        return (
            <div 
                onClick={() => navigate(`/courses/${course.id}`)}
                className="bg-white rounded-3xl p-4 flex flex-col gap-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-xl transition-all cursor-pointer group"
            >
                {/* Top Section */}
                <div className="flex gap-4">
                    {/* Left: Color Block */}
                    <div 
                        className="w-[100px] h-[130px] rounded-[18px] flex-shrink-0 flex flex-col justify-between p-3 relative overflow-hidden"
                        style={{ backgroundColor: bgColor }}
                    >
                        {/* Abstract pattern & subtle glow */}
                        <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-center gap-1 opacity-90">
                                {/* Small mock logo mark */}
                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                <span className="text-[7px] font-black text-white uppercase tracking-widest">ItaloStudy</span>
                            </div>
                            <div className="text-white font-black text-[14px] leading-[1.1] mt-2 mb-1">
                                {course.title.split(' ').slice(0, 2).join('\n')}
                            </div>
                            <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center backdrop-blur-md">
                                <BookOpen className="w-3 h-3 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Right: Content */}
                    <div className="flex-1 flex flex-col pt-1">
                        {/* Title & Bookmark */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                                <h3 className="font-bold text-[15px] leading-tight text-slate-900 line-clamp-2">{course.title}</h3>
                            </div>
                            <button className="text-slate-300 hover:text-blue-600 transition-colors flex-shrink-0" onClick={toggleWishlist}>
                                <Bookmark className={cn("w-5 h-5", isWishlisted && "fill-current text-blue-600")} />
                            </button>
                        </div>

                        {/* Badge */}
                        <div className="mb-3">
                            {isInProgress ? (
                                <span className="inline-block bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                                    In Progress
                                </span>
                            ) : isNotStarted ? (
                                <span className="inline-block bg-slate-100 text-slate-500 text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                                    Not Started
                                </span>
                            ) : (
                                <span className="inline-block bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                                    Completed
                                </span>
                            )}
                        </div>

                        <div className="mt-auto">
                            {/* Progress */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%`, backgroundColor: isInProgress ? '#2563eb' : (isNotStarted ? '#cbd5e1' : '#10b981') }} />
                                </div>
                                <span className="text-[11px] font-bold text-slate-600 w-6 text-right">{progress}%</span>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <MonitorPlay className="w-3.5 h-3.5 text-slate-400" />
                                    {course.lectures_count || '0 Lessons'}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                                    {course.tests_count || '0 Tests'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section (Button) */}
                <button 
                    onClick={handleResume}
                    className="w-full py-3 rounded-[14px] border font-bold text-[13px] flex items-center justify-center transition-all relative overflow-hidden group/btn hover:bg-opacity-5"
                    style={{ ...buttonStyle, backgroundColor: `${bgColor}08` }} // 8% opacity background
                >
                    <span>{isNotStarted ? 'Start Learning' : 'Continue Learning'}</span>
                    <div className="absolute right-4 group-hover/btn:translate-x-1 transition-transform">
                        <Play className="w-4 h-4 fill-current opacity-80" />
                    </div>
                </button>
            </div>
        );
    }

    // --- RECOMMENDED VARIANT ---
    if (variant === 'recommended') {
        const iconUrl = getIconForType(course.icon_type);
        
        return (
            <div 
                onClick={() => navigate(`/courses/${course.id}`)}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[20px] p-5 flex flex-col hover:shadow-lg transition-all cursor-pointer group"
            >
                {/* Badge if present */}
                <div className="mb-4">
                    {course.badge_text ? (
                        <span className="inline-block bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {course.badge_text}
                        </span>
                    ) : (
                        <span className="inline-block bg-slate-50 dark:bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-md invisible">
                            Spacer
                        </span>
                    )}
                </div>

                <div className="flex flex-col items-center text-center mb-5 relative">
                    <button className="absolute top-0 right-0 text-slate-400 hover:text-blue-600 transition-colors" onClick={toggleWishlist}>
                        <Bookmark className={cn("w-5 h-5", isWishlisted && "fill-current text-blue-600")} />
                    </button>
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-3">
                        {/* Use custom icon image, scaled slightly larger */}
                        <img src={iconUrl} alt="icon" className="w-20 h-20 object-contain -mt-4 drop-shadow-md group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <h3 className="font-bold text-[15px] leading-snug text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {course.title}
                    </h3>
                    <p className="text-[12px] text-slate-500 mt-1 line-clamp-1">
                        {course.description || 'Comprehensive prep'}
                    </p>
                </div>

                <div className="mt-auto space-y-3">
                    {/* Meta info */}
                    <div className="flex items-center justify-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                            <Play className="w-3.5 h-3.5 text-slate-400" />
                            {course.lectures_count || '0 Lessons'}
                        </div>
                        <div className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            {course.tests_count || '0 Tests'}
                        </div>
                    </div>

                    <div className="h-px w-full bg-slate-100 dark:bg-slate-800" />

                    {/* Rating & Action */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[12px] font-bold text-slate-700 dark:text-slate-300">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {course.rating ? course.rating.toFixed(1) : '4.5'}
                        </div>
                        <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- DEFAULT VARIANT (Original PW Style) ---
    return (
        <div onClick={() => navigate(`/courses/${course.id}`)} className="bg-white dark:bg-slate-900 border border-[#e2e2e2] dark:border-slate-800 rounded-[16px] overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all cursor-pointer flex flex-col h-full group">
            {/* Top Image area */}
            <div className={cn(
                'relative w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 flex-shrink-0',
                course.banner_url ? '' : gradientFor(course.id)
            )}>
                {course.banner_url && (
                    <img src={course.banner_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
                
                {/* Top badges PW style */}
                <div className="absolute top-0 left-0 right-0 py-1.5 px-3 bg-gradient-to-b from-black/50 to-transparent flex items-start justify-between">
                     <span className="text-white text-[10px] font-bold flex items-center gap-1 mt-1">
                         <span className="text-amber-400">★</span> Comprehensive Course Inside
                     </span>
                     <button className="text-white/80 hover:text-white transition-colors" onClick={toggleWishlist}>
                        <Bookmark className={cn("w-5 h-5 drop-shadow-md", isWishlisted && "fill-current text-blue-400")} />
                     </button>
                </div>

                {isEnrolled && (
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <CheckCircle className="w-3 h-3" /> Enrolled
                    </div>
                )}
            </div>

            {/* Bottom Content area */}
            <div className="p-4 flex flex-col flex-1">
                {/* Meta Row */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[#e26a2c] font-bold text-[12px] uppercase tracking-wide">
                        {course.exam_model_name || 'All Exams'}
                    </span>
                    <div className="flex items-center gap-1.5">
                        {course.lecture_type && (
                            <span className={cn("px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase border", course.lecture_type.toLowerCase() === 'live' ? "text-red-600 border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20" : "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800")}>
                                {course.lecture_type.toLowerCase() === 'live' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600 mr-1 animate-pulse"></span>}
                                {course.lecture_type}
                            </span>
                        )}
                        <span className="text-[#555] dark:text-slate-300 border border-[#e2e2e2] dark:border-slate-700 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase">
                            ENGLISH
                        </span>
                    </div>
                </div>

                {/* Title */}
                <h3 className="font-bold text-[#222] dark:text-slate-100 text-[16px] leading-snug mb-3 line-clamp-2 group-hover:text-[#5a4bda] dark:group-hover:text-indigo-400 transition-colors">
                    {course.title}
                </h3>

                {/* Features */}
                <div className="space-y-1.5 mb-4 text-[13px] text-[#555] dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#777] dark:text-slate-500" />
                        <span>Syllabus Coverage</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#777] dark:text-slate-500" />
                        {isEnrolled ? (
                            <span className="text-emerald-600 font-medium">Access until {new Date(course.expires_at || '').toLocaleDateString()}</span>
                        ) : (
                            <span>Starts {course.launch_date ? course.launch_date : 'instantly'} | {formatExpiry(course.expiry_days)} access</span>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#f0f0f0] dark:bg-slate-800 my-3 w-full" />

                {/* Footer: Price + Button */}
                <div className="flex items-center justify-between mt-auto">
                    {isEnrolled ? (
                        <div className="text-emerald-600 font-bold text-[15px]">Enrolled</div>
                    ) : isComingSoon ? (
                        <div className="text-indigo-600 dark:text-indigo-400 font-bold text-[13px] uppercase tracking-wide">Coming Soon</div>
                    ) : course.is_free ? (
                        <div className="text-emerald-600 font-bold text-[18px]">Free</div>
                    ) : (
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-1.5 mb-0.5">
                                <span className="font-bold text-[#222] dark:text-slate-100 text-[18px]">{formatPrice(finalLocal.amount, finalLocal.currency)}</span>
                                <span className="text-[#888] dark:text-slate-500 text-[12px] line-through">{formatPrice(displayOriginalAmount, finalLocal.currency)}</span>
                            </div>
                            <span className="text-[#138a4b] dark:text-emerald-500 font-bold text-[11px]">{discountPercent}% OFF</span>
                        </div>
                    )}

                    <div className="flex items-center">
                        {isEnrolled ? (
                            <>
                                <button className="bg-[#2d2d2d] dark:bg-slate-800 hover:bg-[#1a1a1a] dark:hover:bg-slate-700 text-white font-bold text-[13px] px-5 py-2 rounded-l-[8px] transition-colors h-[38px] flex items-center justify-center">
                                    View Details
                                </button>
                                <div className="bg-[#1a1a1a] dark:bg-slate-700 text-white border-l border-white/20 dark:border-white/10 h-[38px] w-[34px] rounded-r-[8px] flex items-center justify-center">
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </>
                        ) : isComingSoon ? (
                            <>
                                <button className="bg-slate-600 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-[13px] px-5 py-2 rounded-l-[8px] transition-colors h-[38px] flex items-center justify-center">
                                    Pre-Register
                                </button>
                                <div className="bg-slate-700 dark:bg-slate-600 text-white border-l border-white/20 h-[38px] w-[34px] rounded-r-[8px] flex items-center justify-center">
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </>
                        ) : (
                            <>
                                <button className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-[13px] px-5 py-2 rounded-l-[8px] transition-colors h-[38px] flex items-center justify-center">
                                    Buy Now
                                </button>
                                <div className="bg-emerald-700 hover:bg-emerald-800 text-white border-l border-white/20 h-[38px] w-[34px] rounded-r-[8px] flex items-center justify-center cursor-pointer transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
