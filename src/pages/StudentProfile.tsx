import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import {
    ArrowLeft, Trophy,
    Calendar, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useExam } from '@/context/ExamContext';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
import { useAuth } from '@/lib/auth';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

interface StudentProfileData {
    display_name: string;
    avatar_url: string | null;
    plan?: string;
    created_at?: string;
    username?: string | null;
}

const COLORS = [
    "bg-red-200 text-red-700",
    "bg-orange-200 text-orange-700",
    "bg-amber-200 text-amber-700",
    "bg-yellow-200 text-yellow-700",
    "bg-lime-200 text-lime-700",
    "bg-green-200 text-green-700",
    "bg-emerald-200 text-emerald-700",
    "bg-teal-200 text-teal-700",
    "bg-cyan-200 text-cyan-700",
    "bg-sky-200 text-sky-700",
    "bg-blue-200 text-blue-700",
    "bg-indigo-200 text-indigo-700",
    "bg-violet-200 text-violet-700",
    "bg-purple-200 text-purple-700",
    "bg-fuchsia-200 text-fuchsia-700",
    "bg-pink-200 text-pink-700",
    "bg-rose-200 text-rose-700",
];

const generateAvatarColor = (name: string) => {
    if (!name) return COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
};

export default function StudentProfile({ hideLayout = false }: { hideLayout?: boolean }) {
    const { id, username } = useParams();
    const navigate = useNavigate();
    const { activeExam } = useExam();
    const { user, profile } = useAuth();
    const [profileData, setProfileData] = useState<StudentProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (id || username) fetchProfileData();
    }, [id, username, activeExam?.id]);

    const fetchProfileData = async () => {
        if (!id && !username) return;
        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select('id, display_name, avatar_url, selected_plan, selected_exam, created_at');

            if (id) {
                query = query.eq('id', id);
            }
            // Removed username query fallback

            const { data, error } = await query.single();

            if (error || !data) {
                console.error("Profile not found:", error);
                setHasError(true);
                return;
            }

            let plan = data.selected_plan || 'explorer';
            if (user && user.id === id && profile?.selected_plan) {
                plan = profile.selected_plan;
            }

            setProfileData({
                display_name: data.display_name || "Student",
                avatar_url: data.avatar_url,
                plan,
                created_at: data.created_at || new Date().toISOString()
            });
        } catch (error) {
            console.error("Error fetching profile data:", error);
            setHasError(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout isLoading={true}>
                <div />
            </Layout>
        );
    }

    if (!profileData) {
        const errorContent = (
            <div className="container mx-auto px-6 py-40 text-center">
                <h2 className="text-2xl font-black uppercase tracking-widest text-slate-300">Data Stream Interrupted</h2>
                <button onClick={() => navigate(-1)} className="mt-8 text-indigo-600 font-black uppercase tracking-widest flex items-center gap-2 mx-auto">
                    <ArrowLeft size={16} /> Return to Base
                </button>
            </div>
        );
        return hideLayout ? errorContent : <Layout>{errorContent}</Layout>;
    }

    const content = (
        <div className="container mx-auto px-4 sm:px-6 md:px-12 lg:px-16 py-4 sm:py-12 max-w-[1800px] overflow-x-hidden">
            {!hideLayout && (
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors mb-6 sm:mb-12"
                >
                    <ArrowLeft size={14} /> Back to Champions List
                </button>
            )}

            {/* Profile Header / Identity */}
            <div className="bg-white dark:bg-slate-900 px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl relative overflow-hidden mb-6 sm:mb-8 lg:mb-12">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                    {/* Avatar Section */}
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1 shadow-2xl relative shrink-0">
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-indigo-600 text-white text-[7px] font-black px-4 py-2 rounded-full uppercase tracking-[0.2em] border-2 border-white dark:border-slate-900 shadow-xl z-30 whitespace-nowrap">
                            {profileData.plan === 'elite' ? 'Global Admission Plan' : profileData.plan === 'pro' ? 'Exam Prep Plan' : 'Explorer'}
                        </div>
                        <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-900 shadow-inner">
                            {profileData.avatar_url && !hasError ? (
                                <img
                                    src={getOptimizedImageUrl(profileData.avatar_url, 128, 128)}
                                    alt={profileData.display_name}
                                    className="w-full h-full object-cover"
                                    onError={() => setHasError(true)}
                                />
                            ) : (
                                <div className={cn("w-full h-full flex items-center justify-center", generateAvatarColor(profileData.display_name))}>
                                    <span className="text-4xl font-black uppercase opacity-80">{(profileData.display_name || "S")[0]}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Name & Basic Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 leading-none">{profileData.display_name}</h1>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-6">@{profileData.username || profileData.display_name?.toLowerCase().replace(/\s+/g, '')}</p>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-0 md:pl-1 border-slate-100 dark:border-white/5">
                                <Calendar size={14} className="text-indigo-500" />
                                Joined {format(new Date(profileData.created_at || Date.now()), 'MMM yyyy')}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                <Trophy size={14} className="text-amber-500" />
                                Champion Status
                            </div>
                        </div>
                    </div>

                    {/* Quick CTA */}
                    <div className="shrink-0 hidden lg:block">
                        <button
                            onClick={() => navigate('/practice')}
                            className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-600/20"
                        >
                            Challenge This Champion
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content — Analytics Dashboard (same as /analytics page) */}
            <div className="space-y-8 lg:space-y-12">
                <div className="bg-white dark:bg-slate-900 p-0 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden">
                    <AnalyticsDashboard userId={id} hideLayout={true} />
                </div>

                {/* Action CTA (Mobile/Tablet fallback) */}
                <div className="bg-indigo-600 p-10 rounded-[3.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl shadow-indigo-600/20 lg:hidden">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
                    <div className="relative z-10 text-center md:text-left">
                        <h4 className="text-2xl font-black tracking-tight mb-2">Secure the Throne</h4>
                        <p className="text-xs font-bold uppercase text-indigo-100 opacity-80 tracking-tight">Challenge this champion in the practice arena.</p>
                    </div>
                    <button
                        onClick={() => navigate('/practice')}
                        className="relative z-10 px-12 py-5 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                        Initiate Session
                    </button>
                </div>
            </div>
        </div>
    );

    if (hideLayout) return content;

    return (
        <Layout isLoading={loading}>
            {content}
        </Layout>
    );
}
