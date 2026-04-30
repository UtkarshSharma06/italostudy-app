import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import { usePricing } from '@/context/PricingContext';
import {
    Calendar, Clock, Users, Globe, Play, ChevronRight,
    Zap, Target, ShieldCheck, Loader2, Sparkles, AlertCircle,
    BookOpen, Crown, Lock, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { differenceInHours, differenceInMinutes, isAfter, isBefore } from 'date-fns';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { Card, CardContent } from "@/components/ui/card";
// EXAMS import removed
import { useActiveTest } from '@/hooks/useActiveTest';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { MockExamSkeleton, PlanLimitSkeleton } from '../components/MockExamSkeleton';
import { cn } from '@/lib/utils';
import { lazy, Suspense } from 'react';
const TrustpilotReviewModal = lazy(() => import('@/components/TrustpilotReviewModal'));
const UpgradeModal = lazy(() => import('@/components/UpgradeModal').then(mod => ({ default: mod.UpgradeModal })));
const SeriesScheduleModal = lazy(() => import('@/components/SeriesScheduleModal').then(mod => ({ default: mod.SeriesScheduleModal })));
import MobileLayout from '../components/MobileLayout';

export default function MobileMockExams() {
    const { user } = useAuth();
    const { activeExam, allExams } = useExam();
    const { openPricingModal } = usePricing();
    const { toast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const [sessions, setSessions] = useState<any[]>([]);
    const [registrations, setRegistrations] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegistering, setIsRegistering] = useState<string | null>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming' | 'past' | 'series'>(
        (location.state?.tab as 'all' | 'live' | 'upcoming' | 'past' | 'series') || 'all'
    );
    const { isExplorer, isRestrictedPlan, hasPremiumAccess, mockAttempts, hasReachedMockLimit, isLoading: isPlanLoading } = usePlanAccess();
    const { activeTest } = useActiveTest();
    // const [attemptsCount, setAttemptsCount] = useState<number>(0); // Removed
    const [sessionAttempts, setSessionAttempts] = useState<Record<string, number>>({});
    const [latestAttempts, setLatestAttempts] = useState<Record<string, string>>({});
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isCollectorEnabled, setIsCollectorEnabled] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [series, setSeries] = useState<any[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<any | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    useEffect(() => {
        if (user && activeExam) {
            const loadData = async () => {
                setIsLoading(true);
                // Move usage data fetching to parallel but don't let it block the shells if possible
                // Actually fetchSessions is the most important for the cards.
                await Promise.all([
                    fetchSessions(),
                    fetchSeries(),
                    fetchRegistrations(),
                    fetchSessionAttempts(),
                    fetchCollectorSettings()
                ]);
                setIsLoading(false);
            };
            loadData();
        }
    }, [user, activeExam?.id]);

    const fetchSessionAttempts = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('tests')
            .select('session_id, status, id')
            .eq('user_id', user.id)
            .eq('is_mock', true)
            .not('session_id', 'is', null)
            .order('created_at', { ascending: false });

        if (data) {
            const counts: Record<string, number> = {};
            const latest: Record<string, string> = {};
            data.forEach((test: any) => {
                counts[test.session_id] = (counts[test.session_id] || 0) + 1;
                if (!latest[test.session_id]) {
                    latest[test.session_id] = test.id;
                }
            });
            setSessionAttempts(counts);
            setLatestAttempts(latest);
        }
    };

    const fetchSessions = async () => {
        const now = new Date();

        let query = (supabase as any)
            .from('mock_sessions')
            .select('*')
            .eq('is_active', true)
            .eq('exam_type', activeExam?.id);



        const { data } = await query.order('start_time', { ascending: false });

        if (data) {
            const processed = data.map((s: any) => {
                const start = new Date(s.start_time);
                const end = new Date(s.end_time);
                return {
                    ...s,
                    isLive: isBefore(start, now) && isAfter(end, now),
                    isPast: isAfter(now, end),
                    isUpcoming: isBefore(now, start)
                };
            });
            setSessions(processed);
        }
    };

    const fetchSeries = async () => {
        if (!activeExam?.id) return;
        const { data } = await (supabase.from('mock_series' as any) as any)
            .select('*, mock_series_items(session_id)')
            .eq('is_active', true)
            .eq('exam_type', activeExam.id)
            .order('created_at', { ascending: false });
        if (data) setSeries(data as any);
    };

    const fetchRegistrations = async () => {
        if (!user) return;
        const { data } = await (supabase as any).from('session_registrations').select('session_id').eq('user_id', user.id);
        if (data) setRegistrations(data.map((r: any) => r.session_id));
    };
    
    const fetchCollectorSettings = async () => {
        if (!user) return;
        
        // 1. Fetch Global Settings
        const { data: settings } = await supabase
            .from('system_settings')
            .select('*')
            .eq('key', 'is_review_collector_enabled')
            .maybeSingle();
        
        // 2. Fetch User Profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('has_submitted_review')
            .eq('id', user.id)
            .single();
        
        setIsCollectorEnabled(settings?.value === true);
        setUserProfile(profile as any);
    };

    const handleActionWithReview = (action: () => void) => {
        if (isCollectorEnabled && !userProfile?.has_submitted_review) {
            setPendingAction(() => action);
            setShowReviewModal(true);
            return;
        }
        action();
    };

    const handleRegister = async (sessionId: string) => {
        if (!user || isRegistering) return;

        // Check if user has an active mock test
        if (activeTest) {
            toast({
                title: "Active Test in Progress",
                description: "Please finish your current mock test before starting a new one.",
                variant: "destructive"
            });
            return;
        }

        // Premium Check
        if (!hasPremiumAccess) {
            // Check if Explorer user can access this specific session
            const session = sessions.find(s => s.id === sessionId);
            if (isExplorer && !session?.is_explorer_allowed) {
                setIsUpgradeModalOpen(true);
                return;
            }

            // Strict 1-mock limit for free users across ALL sessions
            if (hasReachedMockLimit()) {
                setIsUpgradeModalOpen(true);
                return;
            }
        }

        setIsRegistering(sessionId);
        const { error } = await (supabase as any).from('session_registrations').insert({ user_id: user.id, session_id: sessionId });
        if (!error) {
            setRegistrations([...registrations, sessionId]);
        }
        setIsRegistering(null);
    };

    const handleRegisterWithReview = (sessionId: string) => {
        handleActionWithReview(() => handleRegister(sessionId));
    };

    const formatCountdown = (session: any) => {
        const target = session.isLive ? new Date(session.end_time) : new Date(session.start_time);
        const h = Math.max(0, differenceInHours(target, new Date()));
        const m = Math.max(0, differenceInMinutes(target, new Date()) % 60);
        return `${h}h ${m}m`;
    };

    const filteredSessions = useMemo(() => {
        const filtered = sessions.filter(s => {
            if (activeTab === 'series' && selectedSeries) {
                return selectedSeries.mock_series_items.some((item: any) => item.session_id === s.id);
            }
            if (activeTab === 'all') return true;
            if (activeTab === 'live') return s.isLive;
            if (activeTab === 'upcoming') return s.isUpcoming;
            if (activeTab === 'past') return s.isPast;
            return false;
        });

        return [...filtered].sort((a, b) => {
            if (activeTab === 'series' && selectedSeries) {
                return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
            }
            // Primary sort for 'all' tab: Live first, then Upcoming, then Past
            if (activeTab === 'all') {
                if (a.isLive && !b.isLive) return -1;
                if (!a.isLive && b.isLive) return 1;
                if (a.isUpcoming && b.isPast) return -1;
                if (a.isPast && b.isUpcoming) return 1;

                // If both are upcoming, show the closest one first
                if (a.isUpcoming && b.isUpcoming) {
                    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
                }
            }

            // Secondary sort: Explorer allowed first (only for past mocks and NOT for premium)
            if (activeTab === 'past' && !hasPremiumAccess) {
                if (a.is_explorer_allowed && !b.is_explorer_allowed) return -1;
                if (!a.is_explorer_allowed && b.is_explorer_allowed) return 1;
            }

            if (activeTab === 'upcoming') {
                return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
            }

            // Tertiary sort: Newest to oldest
            return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
        });
    }, [sessions, activeTab, selectedSeries, hasPremiumAccess]);

    // Pre-calculate counts for tabs to avoid multiple filters in the render body
    const counts = useMemo(() => ({
        all: sessions.length,
        live: sessions.filter(s => s.isLive).length,
        upcoming: sessions.filter(s => s.isUpcoming).length,
        past: sessions.filter(s => s.isPast).length,
        series: series.length
    }), [sessions, series]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background p-4 space-y-6">
                <PlanLimitSkeleton />
                <div className="mx-2 bg-secondary/20 rounded-2xl border border-border/50 p-4 h-14 animate-pulse" />
                <MockExamSkeleton />
            </div>
        );
    }

    return (
        <MobileLayout isLoading={isLoading}>
            <div className="flex flex-col min-h-full bg-background pb-20 animate-in fade-in duration-500">
            <div className="flex-1 px-4 space-y-6 py-6 transition-all duration-300">
                {/* Mock Attempt Limit Bar */}
                <div className="mb-2">
                    {isPlanLoading ? (
                        <PlanLimitSkeleton />
                    ) : isExplorer ? (
                        <div className="bg-secondary/30 rounded-[2rem] p-6 border border-border/50 shadow-sm backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mock Exam Attempts</span>
                                <span className="text-sm font-black text-foreground">
                                    {mockAttempts}/{hasPremiumAccess ? '∞' : '1'}
                                </span>
                            </div>
                            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden mb-6">
                                <div
                                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                    style={{
                                        width: hasPremiumAccess ? '100%' : `${Math.min(100, (mockAttempts / 1) * 100)}%`
                                    }}
                                />
                            </div>
                            <Button
                                onClick={openPricingModal}
                                className="w-full bg-background hover:bg-secondary text-foreground border border-border/50 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl shadow-sm"
                            >
                                <Zap className="w-4 h-4 mr-2 text-purple-500" /> Upgrade for Unlimited Mocks
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-purple-500/20 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-tight mb-1 flex items-center gap-2">
                                    <Crown className="w-5 h-5 text-yellow-300" /> Unlimited Mock Exams
                                </h2>
                                <p className="text-[10px] font-bold text-purple-100 uppercase tracking-widest opacity-80">You are a Premium User</p>
                            </div>
                            <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Zap className="w-5 h-5 text-yellow-300" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

                {/* Global Pulse Indicator */}
                <div className="mx-2 bg-secondary/20 rounded-2xl border border-border/50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-primary opacity-60" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Global Status</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-black uppercase text-emerald-500">Live</span>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 border-b border-border/50 px-2 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'all'
                            ? 'text-primary'
                            : 'text-muted-foreground/60'
                            }`}
                    >
                        All Mocks
                        {activeTab === 'all' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                        {counts.all > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-secondary text-muted-foreground rounded text-[7px]">
                                {counts.all}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('live')}
                        className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'live'
                            ? 'text-red-500'
                            : 'text-muted-foreground/60'
                            }`}
                    >
                        Live Mocks
                        {activeTab === 'live' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />
                        )}
                        {counts.live > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white rounded text-[7px]">
                                {counts.live}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => { setActiveTab('series'); setSelectedSeries(null); }}
                        className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'series'
                            ? 'text-indigo-500'
                            : 'text-muted-foreground/60'
                            }`}
                    >
                        Series
                        {activeTab === 'series' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                        )}
                        {counts.series > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-500 text-white rounded text-[7px]">
                                {counts.series}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'upcoming'
                            ? 'text-primary'
                            : 'text-muted-foreground/60'
                            }`}
                    >
                        Upcoming
                        {activeTab === 'upcoming' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                        {counts.upcoming > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-white rounded text-[7px]">
                                {counts.upcoming}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'past'
                            ? 'text-foreground'
                            : 'text-muted-foreground/60'
                            }`}
                    >
                        Past Mocks
                        {activeTab === 'past' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                        )}
                        {counts.past > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-muted-foreground text-white rounded text-[7px]">
                                {counts.past}
                            </span>
                        )}
                    </button>
                </div>

                {(() => {
                    const showEmptyState = activeTab === 'series' 
                        ? (selectedSeries ? filteredSessions.length === 0 : series.length === 0)
                        : filteredSessions.length === 0;

                    if (showEmptyState) {
                        return (
                            <div className="text-center py-20 bg-secondary/10 rounded-[3rem] border border-dashed border-border px-8">
                                <AlertCircle className="w-12 h-12 text-muted-foreground opacity-20 mx-auto mb-4" />
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                    {activeTab === 'all' && 'No simulations available for this exam'}
                                    {activeTab === 'live' && 'No live sessions currently active'}
                                    {activeTab === 'series' && (selectedSeries ? 'This series has no sessions' : 'No series established for this exam')}
                                    {activeTab === 'upcoming' && 'No upcoming sessions scheduled'}
                                    {activeTab === 'past' && 'No past sessions available'}
                                </p>
                            </div>
                        );
                    }

                    if (activeTab === 'series' && !selectedSeries) {
                        return (
                            <div className="space-y-4">
                                {series.map((s) => (
                                    <div key={s.id} className="bg-secondary/20 p-6 rounded-[2.5rem] border border-border/40 border-b-4 shadow-xl flex flex-col justify-between" onClick={() => setSelectedSeries(s)}>
                                        <div>
                                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-500"><BookOpen className="w-5 h-5" /></div>
                                            <h3 className="text-base font-black text-foreground uppercase tracking-tight mb-1">{s.title}</h3>
                                            <p className="text-[10px] text-muted-foreground font-medium line-clamp-2 mb-4">{s.description || 'Curated series of practice mocks.'}</p>
                                            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                                                <span className="flex items-center gap-1.5"><Zap className="w-3 h-3" /> {s.mock_series_items?.length || 0} Mocks</span>
                                                <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Updated {new Date(s.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="pt-6 flex flex-col gap-2">
                                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 rounded-2xl text-[10px] uppercase font-black tracking-widest shadow-lg shadow-indigo-500/20">View Mocks</Button>
                                            {s.schedule_info && (
                                                <Button variant="ghost" className="w-full h-9 rounded-xl text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60" onClick={(e) => { e.stopPropagation(); setSelectedSeries(s); setIsScheduleModalOpen(true); }}>Open Schedule</Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    }

                    return (
                        <div className="space-y-6">
                            {activeTab === 'series' && selectedSeries && (
                                <div className="flex items-center justify-between gap-4 p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 mb-2">
                                    <div className="flex items-center gap-3">
                                        <Button variant="ghost" size="icon" onClick={() => setSelectedSeries(null)} className="rounded-full w-8 h-8 hover:bg-indigo-500/20"><ChevronRight className="w-4 h-4 rotate-180" /></Button>
                                        <div>
                                            <h2 className="text-[10px] font-black text-indigo-500 uppercase tracking-tight">{selectedSeries.title}</h2>
                                            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Viewing series mocks</p>
                                        </div>
                                    </div>
                                    {selectedSeries.schedule_info && (
                                        <Button onClick={() => setIsScheduleModalOpen(true)} className="bg-indigo-600 text-white px-4 h-8 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-md">Schedule</Button>
                                    )}
                                </div>
                            )}
                            {filteredSessions.map((session, i) => {
                            const isLocked = isRestrictedPlan && !session.is_explorer_allowed;

                                return (
                                    <Card key={i} className="bg-secondary/20 border-border/40 rounded-[2.5rem] overflow-hidden border-b-4 shadow-xl relative"
                                        onClick={() => isLocked && setIsUpgradeModalOpen(true)}
                                    >
                                        {isLocked && (
                                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/20 backdrop-blur-[1px]">
                                                <div className="bg-background/95 border border-border p-5 rounded-[2rem] shadow-2xl flex flex-col items-center gap-3 transform">
                                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                                                        <Lock className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground block mb-0.5">Premium Session</span>
                                                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tight">Upgrade to Unlock</p>
                                                    </div>
                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsUpgradeModalOpen(true);
                                                        }}
                                                        className="bg-primary text-white text-[9px] font-black h-10 px-6 rounded-xl uppercase tracking-widest"
                                                    >
                                                        Upgrade
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                        <CardContent className={cn(
                                            "p-6 space-y-6 transition-all duration-500",
                                            isLocked && "blur-[8px] grayscale opacity-40 pointer-events-none select-none"
                                        )}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col gap-2">
                                                    {session.is_explorer_allowed && !hasPremiumAccess && (
                                                        <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit">
                                                            <Sparkles className="w-3 h-3" />
                                                            Explorer Access
                                                        </div>
                                                    )}
                                                    <div className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 border ${session.isLive ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' : session.isPast ? 'bg-secondary/50 text-muted-foreground border-border/30' : 'bg-secondary text-muted-foreground border-border/50'
                                                        }`}>
                                                        {session.isLive ? <><div className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Live Now</> : session.isPast ? 'Ended' : 'Scheduled'}
                                                    </div>
                                                    <div className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 border ${session.difficulty === 'easy'
                                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                        : session.difficulty === 'hard'
                                                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                        }`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${session.difficulty === 'easy' ? 'bg-emerald-500' : session.difficulty === 'hard' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                                        {session.difficulty === 'easy' ? 'Easy' : session.difficulty === 'hard' ? 'Hard' : 'Medium'}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-[7px] font-black text-muted-foreground uppercase opacity-40 mb-1">{session.isLive ? 'Closes' : 'Starts'} In</span>
                                                    <span className="text-sm font-black text-primary font-mono">{formatCountdown(session)}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <h3 className="text-lg font-black uppercase tracking-tight leading-tight">{session.title}</h3>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">{allExams[session.exam_type]?.durationMinutes || session.duration} MIN</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Users className="w-3.5 h-3.5" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Global Entry</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-primary">
                                                        <Target className="w-3.5 h-3.5" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                                            {session.isPast ? 'Attempts: Unlimited' : `Attempts: ${session.max_attempts || 1}`}
                                                        </span>
                                                    </div>
                                                    {allExams[session.exam_type]?.sections && (
                                                        <div className="flex items-center gap-1.5">
                                                            <BookOpen className="w-3.5 h-3.5 text-primary" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">
                                                                {allExams[session.exam_type].sections.length} Sections
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {allExams[session.exam_type]?.sections && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {allExams[session.exam_type].sections.map((s: any, idx: number) => (
                                                            <span key={idx} className="px-2 py-0.5 bg-secondary/30 rounded text-[7px] font-bold uppercase tracking-tight text-muted-foreground/80">
                                                                {s.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 w-full mt-2">
                                                {(sessionAttempts[session.id] || 0) > 0 ? (
                                                    <>
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (session.isLive || session.isUpcoming) {
                                                                    const action = () => navigate(`/mobile/waiting-room/${session.id}`);
                                                                    handleActionWithReview(action);
                                                                } else {
                                                                    const action = () => {
                                                                        const params = new URLSearchParams({
                                                                            session_id: session.id,
                                                                            exam_type: session.exam_type
                                                                        });
                                                                        navigate(`/mobile/mock-guidelines?${params.toString()}`);
                                                                    };
                                                                    handleActionWithReview(action);
                                                                }
                                                            }}
                                                            className="flex-1 h-14 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] shadow-lg bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/30 flex items-center justify-center gap-1.5"
                                                        >
                                                            <RotateCcw className="w-3.5 h-3.5" />
                                                            {session.isLive || session.isUpcoming ? 'Enter Room' : 'Reattempt'}
                                                        </Button>
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (latestAttempts[session.id]) {
                                                                    navigate(`/mobile/results/${latestAttempts[session.id]}`);
                                                                }
                                                            }}
                                                            className="flex-1 h-14 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] shadow-lg bg-indigo-600 text-white flex items-center justify-center gap-1.5"
                                                        >
                                                            <Target className="w-3.5 h-3.5" />
                                                            Results
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button
                                                        disabled={isRegistering === session.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isRestrictedPlan && !session.is_explorer_allowed) {
                                                                setIsUpgradeModalOpen(true);
                                                                return;
                                                            }

                                                            if (hasReachedMockLimit()) {
                                                                setIsUpgradeModalOpen(true);
                                                                return;
                                                            }

                                                            if (activeTest) {
                                                                const examConfig = allExams[activeTest.exam_type];
                                                                const isSectioned = !!(examConfig && examConfig.sections && examConfig.sections.length > 1);

                                                                toast({
                                                                    title: "Active Test in Progress",
                                                                    description: `Finish ${activeTest.subject} first!`,
                                                                    variant: "destructive",
                                                                    action: (
                                                                        <ToastAction
                                                                            altText="Resume Test"
                                                                            onClick={() => navigate(isSectioned ? `/mobile/sectioned-test/${activeTest.id}` : `/mobile/test/${activeTest.id}`)}
                                                                        >
                                                                            Resume
                                                                        </ToastAction>
                                                                    ),
                                                                });
                                                                return;
                                                            }

                                                            if (session.isPast) {
                                                                const action = () => {
                                                                    const params = new URLSearchParams({
                                                                        session_id: session.id,
                                                                        exam_type: session.exam_type
                                                                    });
                                                                    navigate(`/mobile/mock-guidelines?${params.toString()}`);
                                                                };
                                                                handleActionWithReview(action);
                                                            } else if (registrations.includes(session.id) || (session.isLive || session.isUpcoming)) {
                                                                const action = () => navigate(`/mobile/waiting-room/${session.id}`);
                                                                handleActionWithReview(action);
                                                            } else {
                                                                handleRegisterWithReview(session.id);
                                                            }
                                                        }}
                                                        className={`w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-2 ${hasReachedMockLimit()
                                                            ? 'bg-secondary/50 text-muted-foreground border border-border/50 cursor-not-allowed opacity-70'
                                                            : (registrations.includes(session.id) || (session.isLive || session.isUpcoming))
                                                                ? 'bg-primary text-white'
                                                                : 'bg-background text-foreground border border-border/50'
                                                            }`}
                                                    >
                                                        {isRegistering === session.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        ) : (
                                                            <>
                                                                {hasReachedMockLimit()
                                                                    ? 'Upgrade to Unlock'
                                                                    : session.isPast
                                                                        ? 'Start Practice'
                                                                        : (registrations.includes(session.id) || (session.isLive || session.isUpcoming))
                                                                            ? 'Enter Room'
                                                                            : 'Request Access'}
                                                                {!hasReachedMockLimit() && (
                                                                    <ChevronRight className="w-4 h-4 shrink-0" />
                                                                )}
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    );
                })()}

            </div>

            <Suspense fallback={null}>
                <UpgradeModal
                    isOpen={isUpgradeModalOpen}
                    onClose={() => setIsUpgradeModalOpen(false)}
                    title="Premium Access Required"
                    description="Mock Exams are reserved for PRO members. Upgrade your plan to continue."
                    feature="Full Exams"
                />

                <TrustpilotReviewModal
                    isOpen={showReviewModal}
                    onClose={() => setShowReviewModal(false)}
                    onSuccess={() => {
                        setShowReviewModal(false);
                        fetchCollectorSettings(); // Refresh status
                        if (pendingAction) {
                            pendingAction();
                            setPendingAction(null);
                        }
                    }}
                />

                <SeriesScheduleModal 
                    isOpen={isScheduleModalOpen} 
                    onClose={() => setIsScheduleModalOpen(false)} 
                    series={selectedSeries} 
                />
            </Suspense>
        </MobileLayout>
    );
}
