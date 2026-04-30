import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import { Calendar, Clock, Users, Globe, Play, ChevronRight, Zap, Target, ShieldCheck, Loader2, Crown, Lock, Sparkles, RotateCcw, Layers, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { differenceInHours, differenceInMinutes, isAfter, isBefore } from 'date-fns';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useActiveTest } from '@/hooks/useActiveTest';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { MockExamsSkeleton } from '@/components/SkeletonLoader';
import { lazy, Suspense } from 'react';

const TrustpilotReviewModal = lazy(() => import('@/components/TrustpilotReviewModal'));
const UpgradeModal = lazy(() => import('@/components/UpgradeModal').then(mod => ({ default: mod.UpgradeModal })));
const SeriesScheduleModal = lazy(() => import('@/components/SeriesScheduleModal').then(mod => ({ default: mod.SeriesScheduleModal })));

export default function MockExams() {
    const { user } = useAuth();
    const { activeExam, allExams } = useExam();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const [sessions, setSessions] = useState<any[]>([]);
    const [registrations, setRegistrations] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRegistering, setIsRegistering] = useState<string | null>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming' | 'past' | 'series'>(
        (location.state?.tab as 'all' | 'live' | 'upcoming' | 'past' | 'series') || 'all'
    );
    const { isExplorer, isRestrictedPlan, hasPremiumAccess, openPricingModal, mockAttempts, hasReachedMockLimit } = usePlanAccess();
    const { activeTest } = useActiveTest();
    const [sessionAttempts, setSessionAttempts] = useState<Record<string, number>>({});
    const [latestAttempts, setLatestAttempts] = useState<Record<string, string>>({});
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isCollectorEnabled, setIsCollectorEnabled] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [series, setSeries] = useState<any[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<any | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

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
            if (activeTab === 'past' && !hasPremiumAccess) {
                if (a.is_explorer_allowed && !b.is_explorer_allowed) return -1;
                if (!a.is_explorer_allowed && b.is_explorer_allowed) return 1;
            }
            if (activeTab === 'upcoming') {
                return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
            }
            return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
        });
    }, [sessions, activeTab, selectedSeries, hasPremiumAccess]);

    const counts = useMemo(() => ({
        all: sessions.length,
        live: sessions.filter(s => s.isLive).length,
        upcoming: sessions.filter(s => s.isUpcoming).length,
        past: sessions.filter(s => s.isPast).length,
        series: series.length
    }), [sessions, series]);

    useEffect(() => {
        if (user && activeExam) {
            const loadData = async () => {
                setLoading(true);
                try {
                    await Promise.all([
                        fetchSessions(),
                        fetchSeries(),
                        fetchRegistrations(),
                        fetchSessionAttempts(),
                        fetchCollectorSettings()
                    ]);
                } catch (error) {
                    console.error('Error loading mock data:', error);
                } finally {
                    setLoading(false);
                }
            };
            loadData();
        }
    }, [user, activeExam?.id]);

    const fetchCollectorSettings = async () => {
        if (!user) return;
        const { data: settings } = await supabase
            .from('system_settings')
            .select('*')
            .eq('key', 'is_review_collector_enabled')
            .maybeSingle();
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

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && user) {
                fetchRegistrations();
                fetchSessions();
                fetchSeries();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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
            const c: Record<string, number> = {};
            const l: Record<string, string> = {};
            data.forEach((test: any) => {
                c[test.session_id] = (c[test.session_id] || 0) + 1;
                if (!l[test.session_id]) l[test.session_id] = test.id;
            });
            setSessionAttempts(c);
            setLatestAttempts(l);
        }
    };

    const fetchSessions = async () => {
        if (!activeExam?.id) return;
        const now = new Date();
        const { data } = await supabase
            .from('mock_sessions')
            .select('*')
            .eq('is_active', true)
            .eq('exam_type', activeExam.id)
            .order('start_time', { ascending: false });
        if (data) {
            const processed = data.map((s: any) => {
                const start = new Date(s.start_time);
                const end = new Date(s.end_time);
                return {
                    ...s,
                    isLive: isBefore(start, now) && isAfter(end, now),
                    isPast: isAfter(now, end),
                    isUpcoming: isAfter(start, now)
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
        const { data } = await supabase
            .from('session_registrations')
            .select('session_id')
            .eq('user_id', user.id);
        if (data) setRegistrations(data.map((r: any) => r.session_id));
    };

    const handleRegister = async (sessionId: string) => {
        if (!user || isRegistering) return;
        const target = sessions.find(s => s.id === sessionId);
        if (activeTest && !target?.isLive && !target?.isUpcoming) {
            toast({ title: "Active Test in Progress", description: "Please finish your current mock test first.", variant: "destructive" });
            return;
        }
        if (!hasPremiumAccess) {
            if (isExplorer && !target?.is_explorer_allowed) { setIsUpgradeModalOpen(true); return; }
            if (hasReachedMockLimit()) { setIsUpgradeModalOpen(true); return; }
        }
        setIsRegistering(sessionId);
        const { error } = await supabase.from('session_registrations').insert({ user_id: user.id, session_id: sessionId });
        if (!error) setRegistrations([...registrations, sessionId]);
        setIsRegistering(null);
    };

    return (
        <Layout isLoading={loading}>
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
                <div className="text-center mb-10 sm:mb-12 space-y-4 animate-in fade-in duration-700">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-slate-100 leading-tight">
                        <span className="bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent">Official Simulation</span>
                    </h1>
                    <p className="text-base sm:text-lg text-slate-400 font-bold tracking-tight">Experience the real test environment, anytime.</p>
                </div>

                <div className="mb-8">
                    {isExplorer ? (
                        <div className="bg-white dark:bg-card rounded-[2rem] p-6 sm:p-8 border-2 border-slate-100 dark:border-border shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mock Exam Attempts</span>
                                <span className="text-sm font-black text-slate-900 dark:text-slate-100">{mockAttempts}/{hasPremiumAccess ? '∞' : '1'}</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 dark:bg-muted rounded-full overflow-hidden mb-6">
                                <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: hasPremiumAccess ? '100%' : `${Math.min(100, (mockAttempts / 1) * 100)}%` }} />
                            </div>
                            <Button onClick={openPricingModal} className="w-full bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl">
                                <Zap className="w-4 h-4 mr-2 text-purple-500" /> Upgrade for Unlimited Mocks
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-purple-200/50 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight mb-1 flex items-center gap-2"><Crown className="w-5 h-5 text-yellow-300" /> Unlimited Mock Exams</h2>
                                <p className="text-[10px] font-bold text-purple-100 uppercase tracking-widest opacity-80">You are a Premium User</p>
                            </div>
                            <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm"><Zap className="w-5 h-5 text-yellow-300" /></div>
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between px-2 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100 shadow-sm shrink-0"><Globe className="w-5 h-5 text-purple-600" /></div>
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Global Mock Sessions</h3>
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest">Scheduled Events</span>
                    </div>

                    <div className="flex gap-2 border-b border-slate-200 dark:border-border px-2 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'all', label: 'All Simulations', count: counts.all, color: 'indigo' },
                            { id: 'live', label: 'Live Mock Test', count: counts.live, color: 'red' },
                            { id: 'series', label: 'Series', count: counts.series, color: 'indigo' },
                            { id: 'upcoming', label: 'Upcoming', count: counts.upcoming, color: 'indigo' },
                            { id: 'past', label: 'Archive', count: counts.past, color: 'slate' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id as any); if (tab.id === 'series') setSelectedSeries(null); }}
                                className={`px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === tab.id
                                    ? tab.color === 'red' ? 'text-red-600 dark:text-red-500' : tab.color === 'slate' ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-500'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                            >
                                {tab.label}
                                {activeTab === tab.id && <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${tab.color === 'red' ? 'bg-red-600 dark:bg-red-500' : tab.color === 'slate' ? 'bg-slate-600 dark:bg-slate-400' : 'bg-indigo-600 dark:bg-indigo-500'}`} />}
                                {tab.count > 0 && <span className={`ml-2 px-1.5 py-0.5 ${tab.color === 'red' ? 'bg-red-500' : tab.color === 'slate' ? 'bg-slate-500' : 'bg-indigo-500'} text-white rounded text-[8px]`}>{tab.count}</span>}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <MockExamsSkeleton />
                    ) : (
                        (() => {
                            const showEmptyState = activeTab === 'series' 
                                ? (selectedSeries ? filteredSessions.length === 0 : series.length === 0)
                                : filteredSessions.length === 0;

                            if (showEmptyState) {
                                return (
                                    <div className="bg-slate-50/50 dark:bg-muted/20 p-10 sm:p-12 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-slate-100 dark:border-border border-b-[6px] text-center">
                                        <p className="text-slate-400 font-bold text-sm tracking-tight leading-relaxed">
                                            {activeTab === 'all' && 'No simulations available for this exam.'}
                                            {activeTab === 'live' && 'No live sessions currently active.'}
                                            {activeTab === 'upcoming' && 'No upcoming sessions scheduled.'}
                                            {activeTab === 'past' && 'No past sessions available.'}
                                            {activeTab === 'series' && (selectedSeries ? 'This series has no sessions.' : 'No series established for this exam.')}
                                        </p>
                                    </div>
                                );
                            }

                            if (activeTab === 'series' && !selectedSeries) {
                                return (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                        {series.map((s) => (
                                            <div key={s.id} className="bg-white dark:bg-card p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-border border-b-[6px] shadow-xl hover:border-indigo-200 transition-all cursor-pointer group flex flex-col justify-between" onClick={() => setSelectedSeries(s)}>
                                                <div>
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform"><Layers className="w-6 h-6" /></div>
                                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{s.title}</h3>
                                                    <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-6">{s.description || 'Curated series of practice mocks.'}</p>
                                                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        <span className="flex items-center gap-1.5"><Zap className="w-3 h-3" /> {s.mock_series_items?.length || 0} Mocks</span>
                                                        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Updated {new Date(s.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <div className="pt-8 flex flex-col gap-2">
                                                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-2xl text-xs uppercase font-black tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none">View Mocks</Button>
                                                    {s.schedule_info && (
                                                        <Button variant="ghost" className="w-full h-10 rounded-xl text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-slate-600" onClick={(e) => { e.stopPropagation(); setSelectedSeries(s); setIsScheduleModalOpen(true); }}>Open Schedule</Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-8 pb-20">
                                    {activeTab === 'series' && selectedSeries && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[2rem] border-2 border-indigo-100 dark:border-indigo-900/20 mb-4">
                                            <div className="flex items-center gap-4">
                                                <Button variant="ghost" size="icon" onClick={() => setSelectedSeries(null)} className="rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/30"><ChevronRight className="w-5 h-5 rotate-180" /></Button>
                                                <div>
                                                    <h2 className="text-lg font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-tight">{selectedSeries.title}</h2>
                                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Showing mocks in this series</p>
                                                </div>
                                            </div>
                                            {selectedSeries.schedule_info && (
                                                <Button onClick={() => setIsScheduleModalOpen(true)} className="bg-indigo-600 text-white px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-indigo-100">Series Schedule</Button>
                                            )}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-12">
                                        {filteredSessions.map((session: any) => {
                                            const isLocked = isRestrictedPlan && !session.is_explorer_allowed;
                                            return (
                                                <div key={session.id} className="bg-white dark:bg-card p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-slate-100 dark:border-border border-b-[6px] shadow-xl shadow-slate-200/50 hover:border-slate-300 hover:-translate-y-1 hover:shadow-2xl active:border-b-2 active:translate-y-1 transition-all duration-300 group relative overflow-hidden" onClick={() => isLocked && setIsUpgradeModalOpen(true)}>
                                                    <div className={cn("transition-all duration-500", isLocked && "blur-[8px] grayscale opacity-40 pointer-events-none select-none")}>
                                                        <div className="flex flex-wrap items-start justify-between gap-4 mb-6 sm:mb-8">
                                                            <div className="flex gap-2">
                                                                {session.is_explorer_allowed && !hasPremiumAccess && <div className="px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[8px] sm:text-[9px] font-black uppercase tracking-widest leading-none flex items-center gap-1"><Sparkles className="w-3 h-3" /> Explorer Access</div>}
                                                                <div className={`px-3 py-1.5 rounded-full border text-[8px] sm:text-[9px] font-black uppercase tracking-widest leading-none ${session.isLive ? 'bg-red-50 border-red-100 text-red-600 animate-pulse' : session.isPast ? 'bg-slate-50 dark:bg-muted border-slate-200 dark:border-border text-slate-500' : 'bg-slate-50 dark:bg-muted border-slate-100 dark:border-border text-slate-400'}`}>{session.isLive ? '🔴 Live Mock Test' : session.isPast ? '📝 Practice Mode' : '📅 Scheduled'}</div>
                                                                <div className={`px-3 py-1.5 rounded-full border text-[8px] sm:text-[9px] font-black uppercase tracking-widest leading-none ${session.difficulty === 'easy' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : session.difficulty === 'hard' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>{session.difficulty === 'easy' ? 'Easy' : session.difficulty === 'hard' ? 'Hard' : 'Medium'}</div>
                                                            </div>
                                                            {!session.isPast && (
                                                                <div className="text-right ml-auto">
                                                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">{session.isLive ? 'Closes In' : 'Starts In'}</p>
                                                                    <p className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                                                                        {(() => {
                                                                            const targetDate = session.isLive ? new Date(session.end_time) : new Date(session.start_time);
                                                                            const h = Math.max(0, differenceInHours(targetDate, new Date()));
                                                                            const m = Math.max(0, differenceInMinutes(targetDate, new Date()) % 60);
                                                                            return `${h}h ${m}m`;
                                                                        })()}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 mb-6 group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-tight">{session.title}</h3>
                                                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-8 py-4 border-y border-slate-50">
                                                            <div className="flex items-center gap-2 text-slate-400"><Clock className="w-3.5 h-3.5" /><span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{allExams[session.exam_type]?.durationMinutes || session.duration} MIN</span></div>
                                                            <div className="flex items-center gap-2 text-slate-400"><Users className="w-3.5 h-3.5" /><span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Global Entry</span></div>
                                                            <div className="flex items-center gap-2 text-indigo-500 font-bold"><Target className="w-3.5 h-3.5" /><span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{session.isPast ? 'Attempts: Unlimited' : `Attempts: ${session.max_attempts || 1}`}</span></div>
                                                        </div>
                                                    </div>
                                                    {isLocked && (
                                                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/10 dark:bg-slate-900/10 backdrop-blur-[1px]">
                                                            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-3 transform transition-transform group-hover:scale-105">
                                                                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-1 border border-indigo-100 dark:border-indigo-800 shadow-inner"><Lock className="w-7 h-7 text-indigo-600 dark:text-indigo-400" /></div>
                                                                <div className="text-center">
                                                                    <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 block mb-1">Premium Simulation</span>
                                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Upgrade to Unlock this Session</p>
                                                                </div>
                                                                <Button onClick={(e) => { e.stopPropagation(); setIsUpgradeModalOpen(true); }} className="mt-2 bg-slate-900 text-white hover:bg-slate-800 text-[9px] font-black px-6 rounded-xl h-10 uppercase tracking-widest">Upgrade Now</Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!isLocked && (
                                                        <div className="flex gap-2 w-full">
                                                            {(sessionAttempts[session.id] || 0) > 0 ? (
                                                                <>
                                                                    <Button onClick={(e) => { e.stopPropagation(); if (session.isLive || session.isUpcoming) { navigate(`/waiting-room/${session.id}`); } else { handleActionWithReview(() => { const params = new URLSearchParams({ session_id: session.id, exam_type: session.exam_type }); navigate(`/mock-guidelines?${params.toString()}`); }); } }} className="flex-1 h-12 sm:h-14 font-black rounded-2xl text-[9px] sm:text-[10px] uppercase tracking-[0.15em] transition-all shadow-sm bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500/50 flex items-center justify-center gap-2"><RotateCcw className="w-3.5 h-3.5" />{session.isLive || session.isUpcoming ? 'Enter Room' : 'Reattempt'}</Button>
                                                                    <Button onClick={(e) => { e.stopPropagation(); if (latestAttempts[session.id]) { navigate(`/results/${latestAttempts[session.id]}`); } }} className="flex-1 h-12 sm:h-14 font-black rounded-2xl text-[9px] sm:text-[10px] uppercase tracking-[0.15em] transition-all shadow-md bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2"><Target className="w-3.5 h-3.5" />Results</Button>
                                                                </>
                                                            ) : (
                                                                <Button disabled={isRegistering === session.id} onClick={(e) => { e.stopPropagation(); if (hasReachedMockLimit()) { setIsUpgradeModalOpen(true); return; } if (activeTest && !session.isLive && !session.isUpcoming) { toast({ title: "Active Test in Progress", description: `You are currently in the middle of ${activeTest.subject}. Finish it first!`, variant: "destructive", action: (<ToastAction altText="Resume Test" onClick={() => navigate(`/test/${activeTest.id}`)}>Resume</ToastAction>) }); return; } if (session.isPast) { handleActionWithReview(() => { const params = new URLSearchParams({ session_id: session.id, exam_type: session.exam_type }); navigate(`/mock-guidelines?${params.toString()}`); }); } else if (registrations.includes(session.id) || (session.isLive || session.isUpcoming)) { navigate(`/waiting-room/${session.id}`); } else { handleRegister(session.id); } }} className={`w-full h-12 sm:h-14 font-black rounded-2xl text-[9px] sm:text-[10px] uppercase tracking-[0.15em] transition-all shadow-sm flex items-center justify-center gap-2 ${hasReachedMockLimit() ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : session.isPast ? 'bg-indigo-600 text-white hover:bg-indigo-700' : (registrations.includes(session.id) || (session.isLive || session.isUpcoming)) ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white dark:bg-card text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-border hover:border-slate-900'}`}>{isRegistering === session.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <><span>{hasReachedMockLimit() ? 'Upgrade to Unlock' : session.isPast ? 'Start Practice' : (registrations.includes(session.id) || (session.isLive || session.isUpcoming)) ? 'Enter Room' : 'Request Access'}</span>{!hasReachedMockLimit() && <ChevronRight className="w-4 h-4 shrink-0" />}</>}</Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()
                    )}
                </div>
            </div>

            <Suspense fallback={null}>
                <TrustpilotReviewModal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} onSuccess={() => { setShowReviewModal(false); setUserProfile({ ...userProfile, has_submitted_review: true }); if (pendingAction) { pendingAction(); setPendingAction(null); } }} />
                <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} title="Premium Feature Locked" description="Official Mock Simulations and Global Sessions are exclusive to ELITE and GLOBAL plans. Upgrade now to experience building-grade exam preparation." feature="Official Mock Exams" />
                <SeriesScheduleModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} series={selectedSeries} />
            </Suspense>
        </Layout>
    );
}
