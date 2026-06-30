import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import CourseCard from '@/components/courses/CourseCard';
import { Search, Loader2, Filter, Zap, ArrowRight, BookOpen, LayoutGrid, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Layout from '@/components/Layout';

interface AdBanner {
    image_url: string;
    title?: string;
    subtitle?: string;
    cta_label?: string;
    cta_url?: string;
}

export interface Course {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    banner_url: string;
    exam_model_id: string | null;
    price_eur: number;
    discount_price_eur?: number | null;
    regional_prices?: Record<string, number>;
    expiry_days: number;
    is_free: boolean;
    launch_date?: string;
    lecture_type?: string;
    exam_model_name?: string;
    enrolled?: boolean;
    expires_at?: string;
    // New fields
    lectures_count?: string;
    tests_count?: string;
    badge_text?: string;
    is_recommended?: boolean;
    rating?: number;
    theme_color?: string;
    icon_type?: string;
    progress_percentage?: number; // from user_course_progress
    is_wishlisted?: boolean;
}

const TABS = ['My Batches', 'All Courses', 'Completed', 'Wishlist'] as const;
type TabType = typeof TABS[number];

export default function Courses({ isMobileLayout }: { isMobileLayout?: boolean }) {
    const { user, profile } = useAuth() as any;
    const { activeExam, allExams } = useExam();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('All Courses');
    const [hasSetInitialTab, setHasSetInitialTab] = useState(false);
    const [isBannerVisible, setIsBannerVisible] = useState(() => {
        return sessionStorage.getItem('hideCourseBanner') !== 'true';
    });
    const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest');

    useEffect(() => { fetchCourses(); }, [user?.id, activeExam?.id]);

    const fetchCourses = async () => {
        setIsLoading(true);
        try {
            const sb = supabase as any;
            const { data: coursesData, error } = await sb.from('courses').select('*').eq('is_active', true).order('created_at', { ascending: false });
            if (error) throw error;

            let courseList: Course[] = (coursesData || []).map((c: any) => ({
                ...c,
                exam_model_name: c.exam_model_id ? (allExams[c.exam_model_id]?.name || c.exam_model_id) : null,
                progress_percentage: 0 // Default to 0 for now
            }));

            if (user) {
                // 1. Fetch enrollments
                const { data: enrollments } = await sb.from('course_enrollments')
                    .select('course_id, expires_at')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .gt('expires_at', new Date().toISOString());

                const enrollMap: Record<string, string> = {};
                (enrollments || []).forEach((e: any) => { enrollMap[e.course_id] = e.expires_at; });
                
                // 2. Fetch Progress (if table exists, otherwise ignore error)
                let progressData = null;
                try {
                    const { data } = await sb.from('user_course_progress').select('course_id, progress_percentage').eq('user_id', user.id);
                    progressData = data;
                } catch (e) {
                    // Ignore error if table doesn't exist yet
                }
                const progressMap: Record<string, number> = {};
                (progressData || []).forEach((p: any) => { progressMap[p.course_id] = p.progress_percentage || 0; });

                // 3. Fetch Wishlist (if table exists)
                let wishlistData = null;
                try {
                    const { data } = await sb.from('user_wishlists').select('course_id').eq('user_id', user.id);
                    wishlistData = data;
                } catch (e) {}
                const wishlistMap: Record<string, boolean> = {};
                (wishlistData || []).forEach((w: any) => { wishlistMap[w.course_id] = true; });

                // Apply to list
                courseList.forEach(c => { 
                    if (enrollMap[c.id]) { c.enrolled = true; c.expires_at = enrollMap[c.id]; }
                    if (progressMap[c.id] !== undefined) { c.progress_percentage = progressMap[c.id]; }
                    if (wishlistMap[c.id]) { c.is_wishlisted = true; }
                    // Mock progress if enrolled and no real progress found (just for UI demonstration)
                    if (c.enrolled && !progressMap[c.id]) { c.progress_percentage = 0; } // Changed to 0 by default so "Start Now" works
                });
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
    
    // Sort logic
    const sortedFiltered = [...filtered].sort((a, b) => {
        if (sortBy === 'price_low') return a.price_eur - b.price_eur;
        if (sortBy === 'price_high') return b.price_eur - a.price_eur;
        return 0; // Newest is default (already sorted by created_at desc from DB)
    });

    // Derived lists
    const enrolledCourses = sortedFiltered.filter(c => c.enrolled);
    const completedCourses = enrolledCourses.filter(c => (c.progress_percentage || 0) === 100);
    const recommendedCourses = sortedFiltered.filter(c => c.is_recommended);
    const wishlistCourses = sortedFiltered.filter(c => c.is_wishlisted);

    // Auto-open logic on initial load
    useEffect(() => {
        if (!isLoading && !hasSetInitialTab) {
            if (enrolledCourses.length > 0) {
                setActiveTab('My Batches');
            } else {
                setActiveTab('All Courses');
            }
            setHasSetInitialTab(true);
        }
    }, [isLoading, enrolledCourses.length, hasSetInitialTab]);

    // Determine what to show in the main grid based on the active tab
    let displayCourses: Course[] = [];
    if (activeTab === 'My Batches') {
        displayCourses = enrolledCourses;
    } else if (activeTab === 'All Courses') {
        displayCourses = sortedFiltered;
    } else if (activeTab === 'Completed') {
        displayCourses = completedCourses;
    } else if (activeTab === 'Wishlist') {
        displayCourses = wishlistCourses;
    }

    const content = (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#020617] w-full pb-20">
            {/* ── Top Header Section ── */}
            <div className="px-4 md:px-8 pt-6 md:pt-10 pb-4 md:pb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
                    <div className="max-w-xl z-10">
                        <h1 className="text-[#1a1f36] dark:text-white font-black text-[32px] mb-2 tracking-tight">Courses</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed max-w-sm font-medium">
                            Learn, practice and master with curated courses and expert-made content.
                        </p>
                    </div>
                    {/* Placeholder for the 3D Graphic */}
                    <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-72 h-56 pointer-events-none opacity-90"
                         style={{ 
                             backgroundImage: 'url(https://cdn3d.iconscout.com/3d/premium/thumb/graduation-cap-and-books-5339678-4466542.png)', 
                             backgroundSize: 'contain', 
                             backgroundRepeat: 'no-repeat', 
                             backgroundPosition: 'right center' 
                         }} 
                    />
                </div>
            </div>

            {/* ── Tabs & Search/Filter Bar ── */}
            <div className="px-4 md:px-8 sticky top-0 z-30 bg-[#fafafa]/90 dark:bg-[#020617]/90 backdrop-blur-md pt-2 pb-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="flex items-center gap-8 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 w-full xl:w-auto mask-fade-edges">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "whitespace-nowrap pb-3 text-[14px] font-bold transition-colors relative",
                                activeTab === tab ? "text-[#5a4bda] dark:text-indigo-400" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                            )}
                        >
                            {tab}
                            {tab === 'Wishlist' && wishlistCourses.length > 0 && (
                                <span className="ml-2 bg-[#5a4bda] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                    {wishlistCourses.length}
                                </span>
                            )}
                            {activeTab === tab && (
                                <motion.div layoutId="courseTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5a4bda] dark:bg-indigo-400 rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto pt-2 xl:pt-0">
                    <div className="relative w-full sm:flex-1 xl:w-[280px]">
                        <Search className="w-[18px] h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            placeholder="Search for courses..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-3 h-11 text-[14px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#5a4bda] focus:ring-1 focus:ring-[#5a4bda] transition-colors"
                        />
                    </div>
                    <div className="relative w-full sm:w-auto">
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="w-full sm:w-auto h-11 pl-4 pr-10 appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold text-[14px] flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus:border-[#5a4bda] focus:ring-1 focus:ring-[#5a4bda]"
                        >
                            <option value="newest">Newest First</option>
                            <option value="price_low">Price: Low to High</option>
                            <option value="price_high">Price: High to Low</option>
                        </select>
                        <Filter className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="px-4 md:px-8 mt-4 space-y-4">
                {/* ── Upgrade Banner ── */}
                {profile?.selected_plan === 'explorer' && isBannerVisible && (
                    <div className="bg-[#f4f2ff] dark:bg-[#201d36] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative shadow-sm border border-[#e5dfff] dark:border-[#3b3469]">
                        <div className="relative z-10 flex items-center gap-5">
                            <div className="w-12 h-12 rounded-full bg-[#5a4bda] flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(90,75,218,0.3)]">
                                <Zap className="w-6 h-6 text-white fill-white" />
                            </div>
                            <div>
                                <h3 className="text-[17px] font-bold mb-1 tracking-tight text-[#5a4bda] dark:text-indigo-400">
                                    Unlock unlimited practice + mocks
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 text-[14px] font-medium">
                                    Upgrade to Global Plan and access all courses, test series, mocks, videos and more.
                                </p>
                            </div>
                        </div>
                        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                            <a href="/pricing" className="w-full sm:w-auto justify-center whitespace-nowrap bg-white dark:bg-slate-800 text-[#5a4bda] dark:text-indigo-400 border border-[#e5dfff] dark:border-indigo-500/30 font-bold text-[13px] px-6 py-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 shadow-sm">
                                Upgrade Plan <ArrowRight className="w-4 h-4" />
                            </a>
                            <button onClick={() => { setIsBannerVisible(false); sessionStorage.setItem('hideCourseBanner', 'true'); }} className="absolute -top-12 sm:top-auto sm:relative right-0 sm:right-auto text-[#5a4bda]/50 hover:text-[#5a4bda] dark:text-indigo-400/50 dark:hover:text-indigo-400 p-2 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-[380px]">
                                <div className="h-48 bg-slate-200 dark:bg-slate-800 w-full" />
                                <div className="p-4 flex flex-col flex-1">
                                    <div className="flex justify-between mb-3">
                                        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                                        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                                    </div>
                                    <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-full mb-2" />
                                    <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-2/3 mb-4" />
                                    <div className="space-y-2 mt-auto mb-4">
                                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                                    </div>
                                    <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* ── Active Tab Display ── */}
                        <div>
                            {activeTab === 'My Batches' && (
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-[20px] font-black text-slate-900 dark:text-white">My Batches</h2>
                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full">{displayCourses.length} Active</span>
                                    </div>
                                    <button className="text-[#5a4bda] text-[13px] font-bold hover:underline flex items-center gap-1">View All <ArrowRight className="w-3.5 h-3.5" /></button>
                                </div>
                            )}

                            {displayCourses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center py-4 px-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[20px]">
                                    <div className="w-20 h-20 mb-2 relative flex items-center justify-center">
                                        <div className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-full scale-75 blur-2xl opacity-50" />
                                        <img src="/emptybox.webp" alt="Empty Box" className="w-full h-full object-contain relative z-10 drop-shadow-xl" />
                                    </div>
                                    <h3 className="text-[17px] font-black text-slate-900 dark:text-white mb-1 tracking-tight">
                                        {search ? 'No results found' : (activeTab === 'My Batches' ? "You're not enrolled in any batch yet" : `No courses in ${activeTab}`)}
                                    </h3>
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium max-w-[340px] mx-auto mb-4 leading-relaxed">
                                        {search 
                                            ? 'Try adjusting your search or filters to find what you are looking for.' 
                                            : (activeTab === 'My Batches' 
                                                ? 'Batches you enroll in will appear here. Explore courses and start your learning journey today!' 
                                                : 'Explore our catalog to find something new to learn!')
                                        }
                                    </p>
                                    
                                    {!search && activeTab === 'My Batches' && (
                                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                            <button 
                                                onClick={() => setActiveTab('All Courses')}
                                                className="bg-[#5a4bda] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-[#4b3ec2] transition-colors shadow-[0_4px_12px_rgba(90,75,218,0.25)] hover:shadow-[0_4px_16px_rgba(90,75,218,0.35)] w-full sm:w-auto"
                                            >
                                                <Search className="w-4 h-4" />
                                                Explore All Courses
                                            </button>
                                            <button 
                                                onClick={() => setActiveTab('All Courses')}
                                                className="bg-white dark:bg-slate-800 text-[#5a4bda] dark:text-indigo-400 border border-[#e5dfff] dark:border-indigo-500/30 px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto"
                                            >
                                                <LayoutGrid className="w-4 h-4" />
                                                Browse Categories
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {displayCourses.map((c, i) => (
                                        <CourseCard 
                                            key={c.id} 
                                            course={c} 
                                            variant={(activeTab === 'My Batches' || activeTab === 'Completed') ? "batch" : "default"} 
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Recommended For You (Only show on specific tabs) ── */}
                        {(activeTab === 'My Batches' || activeTab === 'All Courses') && recommendedCourses.length > 0 && (
                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-[20px] font-black text-slate-900 dark:text-white">Recommended For You</h2>
                                    <button onClick={() => setActiveTab('All Courses')} className="text-[#5a4bda] text-[13px] font-bold hover:underline flex items-center gap-1">Explore All Courses <ArrowRight className="w-3.5 h-3.5" /></button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {recommendedCourses.map((c, i) => (
                                        <CourseCard key={c.id} course={c} variant="default" />
                                    ))}
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
