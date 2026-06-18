import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useCurrency } from '@/hooks/useCurrency';

interface Course {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    banner_url: string;
    price_eur: number;
    discount_price_eur?: number | null;
    regional_prices?: Record<string, number>;
    expiry_days: number;
    is_free: boolean;
    exam_model_name?: string;
    enrolled?: boolean;
    expires_at?: string;
    launch_date?: string;
    lecture_type?: string;
}

interface CourseCardProps { course: Course; index?: number; }

function formatExpiry(days: number) {
    if (days >= 365) return `${Math.floor(days / 365)}yr`;
    if (days >= 30) return `${Math.floor(days / 30)}mo`;
    return `${days}d`;
}

// Deterministic gradient per course id
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

export default function CourseCard({ course, index = 0 }: CourseCardProps) {
    const navigate = useNavigate();
    const { formatPrice, getRegionalPrice } = useCurrency();
    const isEnrolled = !!course.enrolled;

    const originalLocal = getRegionalPrice(course.price_eur, course.regional_prices);
    const hasDiscount = !!course.discount_price_eur || !!course.regional_prices?.INR_discount;
    
    const displayOriginalAmount = hasDiscount ? originalLocal.amount : (originalLocal.amount > 0 ? Math.round(originalLocal.amount * 1.8) : 0);
    
    const finalLocal = hasDiscount 
        ? getRegionalPrice(course.discount_price_eur || course.price_eur, course.regional_prices?.INR_discount ? { INR: course.regional_prices.INR_discount } : undefined)
        : originalLocal;

    const discountPercent = displayOriginalAmount > 0 ? Math.round(((displayOriginalAmount - finalLocal.amount) / displayOriginalAmount) * 100) : 0;

    return (
        <div onClick={() => navigate(`/courses/${course.id}`)} className="bg-white border border-[#e2e2e2] rounded-[16px] overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all cursor-pointer flex flex-col h-full group">
            {/* Top Image area */}
            <div className={cn(
                'relative w-full aspect-[16/9] bg-slate-100 flex-shrink-0',
                course.banner_url ? '' : gradientFor(course.id)
            )}>
                {course.banner_url && (
                    <img src={course.banner_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
                
                {/* Top badges PW style */}
                <div className="absolute top-0 left-0 right-0 py-1.5 px-3 bg-gradient-to-b from-black/50 to-transparent flex items-center justify-center">
                     <span className="text-white text-[10px] font-bold flex items-center gap-1">
                         <span className="text-amber-400">★</span> Comprehensive Course Inside
                     </span>
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
                            <span className={cn("px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase border", course.lecture_type === 'Live' ? "text-red-600 border-red-200 bg-red-50" : "text-slate-600 border-slate-200 bg-slate-50")}>
                                {course.lecture_type === 'Live' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600 mr-1 animate-pulse"></span>}
                                {course.lecture_type}
                            </span>
                        )}
                        <span className="text-[#555] border border-[#e2e2e2] px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase">
                            ENGLISH
                        </span>
                    </div>
                </div>

                {/* Title */}
                <h3 className="font-bold text-[#222] text-[16px] leading-snug mb-3 line-clamp-2 group-hover:text-[#5a4bda] transition-colors">
                    {course.title}
                </h3>

                {/* Features */}
                <div className="space-y-1.5 mb-4 text-[13px] text-[#555]">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#777]" />
                        <span>Syllabus Coverage</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#777]" />
                        {isEnrolled ? (
                            <span className="text-emerald-600 font-medium">Access until {new Date(course.expires_at || '').toLocaleDateString()}</span>
                        ) : (
                            <span>Starts {course.launch_date ? course.launch_date : 'instantly'} | {formatExpiry(course.expiry_days)} access</span>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#f0f0f0] my-3 w-full" />

                {/* Footer: Price + Button */}
                <div className="flex items-center justify-between mt-auto">
                    {isEnrolled ? (
                        <div className="text-emerald-600 font-bold text-[15px]">Enrolled</div>
                    ) : course.is_free ? (
                        <div className="text-emerald-600 font-bold text-[18px]">Free</div>
                    ) : (
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-1.5 mb-0.5">
                                <span className="font-bold text-[#222] text-[18px]">{formatPrice(finalLocal.amount, finalLocal.currency)}</span>
                                <span className="text-[#888] text-[12px] line-through">{formatPrice(displayOriginalAmount, finalLocal.currency)}</span>
                            </div>
                            <span className="text-[#138a4b] font-bold text-[11px]">{discountPercent}% OFF</span>
                        </div>
                    )}

                    <div className="flex items-center">
                        <button className="bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white font-bold text-[13px] px-5 py-2 rounded-l-[8px] transition-colors h-[38px] flex items-center justify-center">
                            {isEnrolled ? 'View Details' : (course.launch_date?.toLowerCase() === 'coming soon' ? 'Coming Soon' : 'Buy Now')}
                        </button>
                        <div className="bg-[#1a1a1a] text-white border-l border-white/20 h-[38px] w-[34px] rounded-r-[8px] flex items-center justify-center">
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
