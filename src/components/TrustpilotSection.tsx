
import { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';

interface Review {
    id: string;
    user_name: string;
    user_avatar: string | null;
    rating: number;
    content: string;
    date_string: string;
}

interface SectionSettings {
    title: string;
    avgRating: string;
    reviewCount: string;
}


const DEFAULT_SETTINGS: SectionSettings = {
    title: "Our customers' Trustpilot reviews",
    avgRating: '4.5',
    reviewCount: '100+',
};

const FEATURED_REVIEWS: Review[] = [
    {
        id: 'rev-1',
        user_name: 'Jasper Jerry',
        user_avatar: null,
        rating: 5,
        content: "Being an Indian student it's really hard to find guidance to find a path to walk on to get the opportunity to study abroad. With help of italostudy, not only i recieved CEnT-S materials for free , but I also got guidance from someone who has actually experienced the world and the unis. Getting clarity on what to do , which country to go is very important. It saves you from a lot troubles. :)",
        date_string: '2 days ago'
    },
    {
        id: 'rev-2',
        user_name: 'Angelo Fernando',
        user_avatar: null,
        rating: 5,
        content: "ItaloStudy has been really helpful for my CEnT‑S preparation. The interface is clean, the mock exams feel realistic, and the question bank covers all the main topics. I appreciate that everything is free and easy to use. Definitely worth trying if you’re preparing for the exam.",
        date_string: '1 week ago'
    },
    {
        id: 'rev-3',
        user_name: 'kmllsh',
        user_avatar: null,
        rating: 4,
        content: "i like how convenient and user-friendly the interface giving me a pleasant experience and making my studying path more enjoyable. I was fascinated by how many tasks the website consists for training. However i don't quite understand some symbols in mock tests from resources section, and i don't know if the problem is coming from italostudy or from cisia so I'm not gonna take away a star",
        date_string: '3 days ago'
    },
    {
        id: 'rev-4',
        user_name: 'Ahemad Faruk',
        user_avatar: null,
        rating: 5,
        content: "not gonna lie italostudy is one of the best platfrom out their , i took my cent-s exam on 23 of april and 4-5 question are direct from italostudy question bandk and mocks and a lot of question are in similar patern , iam scoring 50/55 in my cent-s exam",
        date_string: 'Just now'
    }
];

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => {
                const isFull = i + 1 <= Math.floor(rating);
                const isHalf = !isFull && i < rating;
                
                return (
                    <div key={i} className="relative w-4 h-4">
                        <Star className="absolute inset-0 w-full h-full text-slate-200 fill-slate-200" />
                        {isFull && <Star className="absolute inset-0 w-full h-full text-[#FFD700] fill-[#FFD700]" />}
                        {isHalf && (
                            <div className="absolute inset-0 overflow-hidden" style={{ width: `${(rating % 1) * 100}%` }}>
                                <Star className="w-4 h-4 text-[#FFD700] fill-[#FFD700]" />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
    if (src) return <img src={getOptimizedImageUrl(src, 80, 80)} alt={name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" loading="lazy" />;
    
    // Google-style single letter avatar
    const firstLetter = name.charAt(0).toUpperCase();
    const colors = [
        'bg-[#1a73e8]', // Blue
        'bg-[#ea4335]', // Red
        'bg-[#fbbc04]', // Yellow
        'bg-[#34a853]', // Green
        'bg-[#673ab7]', // Purple
        'bg-[#ff5722]', // Orange
        'bg-[#607d8b]'  // Blue Grey
    ];
    // Consistently pick a color based on the name
    const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    const color = colors[colorIndex];

    return (
        <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white text-base font-bold shadow-sm border-2 border-white shrink-0`}>
            {firstLetter}
        </div>
    );
}

const TrustpilotLogo = () => (
    <div className="flex items-center gap-1.5">
        <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21L12 17.77L6.82 21L8 14.14L3 9.27L9.91 8.26L12 2Z" fill="#00B67A" /></svg>
        <span className="text-[#00B67A] font-black text-lg tracking-tight">Trustpilot</span>
    </div>
);

import { useTranslation } from 'react-i18next';

export default function TrustpilotSection() {
    const { t } = useTranslation();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [settings, setSettings] = useState<SectionSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                console.log("🚀 TrustpilotSection: Attempting Load (via Redis cache)...");

                // Helper: try API route first, fall back to direct Supabase on failure
                const fetchWithFallback = async (apiPath: string, supabaseFallback: () => Promise<any>) => {
                    try {
                        const res = await fetch(apiPath);
                        if (!res.ok) throw new Error(`API ${apiPath} returned ${res.status}`);
                        const json = await res.json();
                        console.log(`✅ ${apiPath} [${json.source}]:`, json.data);
                        return json.data;
                    } catch (e) {
                        console.warn(`⚠️ API route failed, using direct Supabase:`, e);
                        return supabaseFallback();
                    }
                };

                // 1. Fetch reviews via Redis-cached API route
                const reviewData = await fetchWithFallback(
                    '/api/reviews',
                    async () => {
                        const { data } = await (supabase as any)
                            .from('site_reviews')
                            .select('id,user_name,user_avatar,rating,content,date_string')
                            .eq('is_published', true)
                            .order('created_at', { ascending: false });
                        return data;
                    }
                );

                const allReviews = [...FEATURED_REVIEWS, ...(reviewData || [])];
                setReviews(allReviews);

                // 2. Fetch site settings via Redis-cached API route
                const settingsData = await fetchWithFallback(
                    '/api/site-settings',
                    async () => {
                        const { data } = await (supabase as any)
                            .from('site_settings')
                            .select('key,value')
                            .in('key', ['trustpilot_section_title', 'trustpilot_avg_rating', 'trustpilot_review_count']);
                        return data;
                    }
                );

                if (settingsData && settingsData.length > 0) {
                    const map: Record<string, string> = {};
                    settingsData.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
                    setSettings({
                        title: map['trustpilot_section_title'] || DEFAULT_SETTINGS.title,
                        avgRating: '4.5',
                        reviewCount: '100+',
                    });
                } else {
                    setSettings(DEFAULT_SETTINGS);
                }
            } catch (err) {
                console.error("🔥 TrustpilotSection: Critical crash during load:", err);
                setReviews([]);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const openReview = (review: Review) => {
        setSelectedReview(review);
    };

    if (isLoading) return null;

    return (
        <section className="py-12 bg-white overflow-hidden">
            <div className="container mx-auto px-4 max-w-7xl">
                {/* Header - Compact */}
                <div className="flex items-center justify-center gap-8 mb-4 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2">
                        <StarRating rating={Number(settings.avgRating)} />
                        <span className="font-black text-slate-900 text-sm">
                            {settings.avgRating}
                        </span>
                    </div>
                    <div className="h-4 w-px bg-slate-200" />
                    <TrustpilotLogo />
                    <div className="h-4 w-px bg-slate-200" />
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                        {settings.reviewCount} REVIEWS
                    </span>
                </div>

                {/* Marquee Carousel - CSS Optimized for Mobile */}
                <div className="relative group/marquee">
                    <div className="absolute left-0 top-0 bottom-0 w-8 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-8 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
                    
                    <div className="flex overflow-hidden">
                        <div className="flex gap-4 py-4 animate-marquee hover:[animation-play-state:paused] will-change-transform">
                            {[...reviews, ...reviews].map((review, idx) => (
                                <div
                                    key={`${review.id}-${idx}`}
                                    onClick={() => openReview(review)}
                                    className="w-[280px] md:w-[320px] flex-shrink-0 bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-3 hover:bg-white hover:shadow-lg transition-all cursor-pointer group relative transform-gpu"
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar name={review.user_name} src={review.user_avatar} />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-black text-slate-900 text-xs leading-none truncate">{review.user_name}</p>
                                            <div className="mt-1">
                                                <StarRating rating={review.rating} />
                                            </div>
                                        </div>
                                        <div className="ml-auto opacity-20 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21L12 17.77L6.82 21L8 14.14L3 9.27L9.91 8.26L12 2Z" fill="#00B67A" /></svg>
                                        </div>
                                    </div>
                                    <p className="text-slate-600 text-[11px] font-bold leading-relaxed line-clamp-3 italic">
                                        "{review.content}"
                                    </p>
                                    <div className="mt-auto pt-2 flex justify-between items-center">
                                        <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">{review.date_string}</span>
                                        <span className="text-[9px] text-indigo-500 font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Read Full Review →</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <style>{`
                    @keyframes marquee {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    .animate-marquee {
                        animation: marquee 60s linear infinite;
                        width: max-content;
                    }
                    @media (max-width: 768px) {
                        .animate-marquee {
                            animation-duration: 40s;
                        }
                    }
                `}</style>
                
                {/* Review Detail Modal */}
                {selectedReview && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setSelectedReview(null)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden"
                        >
                            <button 
                                onClick={() => setSelectedReview(null)}
                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            
                            <div className="p-8 sm:p-12">
                                <div className="flex items-center gap-4 mb-8">
                                    <Avatar name={selectedReview.user_name} src={selectedReview.user_avatar} />
                                    <div>
                                        <h3 className="font-black text-slate-900 text-lg leading-tight">{selectedReview.user_name}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <StarRating rating={selectedReview.rating} />
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedReview.date_string}</span>
                                        </div>
                                    </div>
                                    <div className="ml-auto">
                                        <TrustpilotLogo />
                                    </div>
                                </div>
                                
                                <div className="relative">
                                    <span className="absolute -top-6 -left-4 text-8xl text-indigo-50 opacity-50 font-serif leading-none">“</span>
                                    <p className="text-slate-600 text-lg sm:text-xl font-bold leading-relaxed italic relative z-10">
                                        {selectedReview.content}
                                    </p>
                                </div>
                                
                                <div className="mt-12 flex items-center gap-3 py-4 px-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21L12 17.77L6.82 21L8 14.14L3 9.27L9.91 8.26L12 2Z" fill="currentColor" /></svg>
                                    </div>
                                    <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Verified Customer Review</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </section>
    );
}
