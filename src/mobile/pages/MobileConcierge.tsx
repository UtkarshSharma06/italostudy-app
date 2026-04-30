import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
    LayoutDashboard, MessageSquare, Gift, CheckSquare,
    Calendar, Edit, FileText, Menu, X, ShieldCheck,
    CheckCircle2, AlertCircle, Mail, Landmark,
    MapPin, RotateCcw, Video, Info, GraduationCap,
    Plus, Loader2, ChevronRight, Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AdmissionChat } from "@/components/concierge/AdmissionChat";
import MobileLayout from '../components/MobileLayout';

import { usePlanAccess } from "@/hooks/usePlanAccess";

export default function MobileConcierge() {
    const { user, profile } = useAuth();
    const { isElite, isGlobal, isLoading: isPlanLoading } = usePlanAccess();
    const { toast } = useToast();
    const navigate = useNavigate();

    // States
    const [applications, setApplications] = useState<any[]>([]);
    const [offers, setOffers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'applications' | 'messages' | 'offers' | 'meetings'>('applications');
    const [isInitializing, setIsInitializing] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);

    // Dynamic Plan Check - Redirect if not premium
    useEffect(() => {
        if (!isPlanLoading && !isElite && !isGlobal && profile?.role !== 'admin') {
            navigate('/apply-university/upgrade', { replace: true });
        }
    }, [isElite, isGlobal, isPlanLoading, navigate, profile]);

    useEffect(() => {
        if (user) {
            fetchData();
            // Subscribe to updates same as web
            const channel = supabase
                .channel('mobile_concierge_updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'admission_messages' }, () => fetchData())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'admission_offers' }, () => fetchData())
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [user]);

    const fetchData = async () => {
        try {
            const [appRes, offerRes, msgRes] = await Promise.all([
                supabase.from('admission_applications' as any).select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
                supabase.from('admission_offers' as any).select('*'),
                supabase.from('admission_messages' as any).select('id, is_read, is_from_consultant')
            ]);
            setApplications(appRes.data || []);
            setOffers(offerRes.data || []);
            setUnreadMessages(((msgRes.data || []) as any[]).filter(m => m.is_from_consultant && !m.is_read).length);
        } catch (err) {
            console.error('Error fetching concierge data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitialize = async () => {
        if (!user) return;
        setIsInitializing(true);
        try {
            const { data, error } = await (supabase as any)
                .from('admission_applications')
                .insert({ user_id: user.id, status: 'draft', progress_percentage: 0 })
                .select().single();
            if (data) navigate(`/apply-university/apply/${data.id}`);
        } catch (err) {
            console.error('Init error:', err);
        } finally {
            setIsInitializing(false);
        }
    };

    return (
        <MobileLayout isLoading={isLoading} hideHeader={true}>
            <div className="flex flex-col min-h-screen bg-background pb-32 animate-in fade-in duration-500">
            {/* Immersive Header */}
            <header className="p-6 pt-10 bg-gradient-to-b from-indigo-500/10 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Admissions Support</span>
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tight leading-none mb-6">University <br /><span className="text-indigo-600">Concierge</span></h1>

                {/* Tactical Stats Mini Grid */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    <TabPill id="applications" label="Active" icon={LayoutDashboard} count={applications.length} active={activeTab === 'applications'} onClick={setActiveTab} />
                    <TabPill id="messages" label="Chat" icon={MessageSquare} count={unreadMessages} active={activeTab === 'messages'} onClick={setActiveTab} />
                    <TabPill id="offers" label="Offers" icon={Gift} count={offers.length} active={activeTab === 'offers'} onClick={setActiveTab} />
                    <TabPill id="meetings" label="Meetings" icon={Video} count={applications.filter(a => a.meeting_link).length} active={activeTab === 'meetings'} onClick={setActiveTab} />
                </div>
            </header>

            <main className="flex-1 px-4 mt-4">
                {activeTab === 'applications' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        {/* New App CTA */}
                        {applications.length < 2 && (
                            <button
                                onClick={handleInitialize}
                                disabled={isInitializing}
                                className="w-full p-6 rounded-[2.5rem] bg-indigo-600 text-white shadow-xl shadow-indigo-200 flex items-center justify-between group active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/20"><Plus /></div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">New Application</p>
                                        <p className="font-black text-lg uppercase tracking-tight">Start Application</p>
                                    </div>
                                </div>
                                <ChevronRight className="opacity-40 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}

                        <div className="space-y-4">
                            <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Your History</h3>
                            {applications.map((app, i) => (
                                <ApplicationCard key={app.id} app={app} index={i} onClick={() => {
                                    if (app.status === 'draft') navigate(`/apply-university/apply/${app.id}`);
                                    else navigate(`/apply-university/status/${app.id}`);
                                }} />
                            ))}
                            {applications.length === 0 && (
                                <div className="text-center py-20 bg-secondary/10 rounded-[2.5rem] border border-dashed border-border p-10 opacity-30">
                                    <Briefcase size={40} className="mx-auto mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No Active Applications</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'messages' && (
                    <div className="h-[60vh] rounded-[2.5rem] border border-border/40 overflow-hidden shadow-2xl animate-in fade-in duration-500">
                        {applications.length > 0 ? (
                            <AdmissionChat applicationId={applications[0].id} />
                        ) : (
                            <div className="h-full flex items-center justify-center p-8 text-center">
                                <div>
                                    <MessageSquare className="w-12 h-12 text-muted-foreground opacity-20 mx-auto mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Start an application to chat</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'offers' && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                        <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Recent Offers</h3>
                        {offers.length === 0 ? (
                            <div className="text-center py-20 opacity-20"><Gift size={48} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase">No offers yet</p></div>
                        ) : offers.map(offer => (
                            <Card key={offer.id} className="bg-secondary/20 border-border/40 rounded-[2rem] p-6 shadow-sm overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-5"><Landmark size={60} /></div>
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600"><Gift size={24} /></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Update Available</p>
                                        <h4 className="font-black text-lg uppercase tracking-tight truncate">{offer.title || "University Offer"}</h4>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-muted-foreground mb-6 line-clamp-2">{offer.content}</p>
                                <Button className="w-full h-12 rounded-xl bg-indigo-600 font-black uppercase text-[10px] tracking-widest">View Details</Button>
                            </Card>
                        ))}
                    </div>
                )}

                {activeTab === 'meetings' && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                        <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Scheduled Meetings</h3>
                        {applications.filter(a => a.meeting_link).map(app => (
                            <Card key={app.id} className="bg-slate-900 border-none rounded-[2rem] p-6 text-white overflow-hidden relative group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Video size={80} /></div>
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-4">Admissions Meeting</p>
                                <h4 className="text-2xl font-black uppercase tracking-tighter mb-2">Strategy Consultation</h4>
                                <p className="text-indigo-100/60 text-xs font-bold uppercase tracking-tight mb-8">Via Zoom</p>
                                <Button
                                    onClick={() => window.open(app.meeting_link, '_blank')}
                                    className="w-full h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-indigo-500/20"
                                >
                                    Join Meeting <Video size={16} />
                                </Button>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
            </div>
        </MobileLayout>
    );
}

const TabPill = ({ id, label, icon: Icon, count, active, onClick }: any) => (
    <button
        onClick={() => onClick(id)}
        className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-full border transition-all shrink-0 active:scale-95",
            active
                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-200"
                : "bg-secondary/10 border-border/40 text-muted-foreground opacity-60"
        )}
    >
        <Icon size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        {count > 0 && <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-full ml-1", active ? "bg-white text-indigo-600" : "bg-primary/20 text-primary")}>{count}</span>}
    </button>
);

const ApplicationCard = ({ app, index, onClick }: any) => {
    const prog = app.application_data?.program_info || {};
    const statusMap: any = {
        'accepted': { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Accepted' },
        'rejected': { color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Declined' },
        'under_review': { color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Review' },
        'draft': { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Draft' },
        'submitted': { color: 'text-indigo-500', bg: 'bg-indigo-500/10', label: 'Submitted' },
    };
    const s = statusMap[app.status] || { color: 'text-primary', bg: 'bg-primary/10', label: app.status };

    return (
        <Card onClick={onClick} className="bg-secondary/10 border-border/40 rounded-[2.2rem] overflow-hidden active:scale-95 transition-all cursor-pointer group mb-1 shadow-sm">
            <CardContent className="p-6 flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-background border border-border/50 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-muted-foreground opacity-30">{index + 1}</span>
                    <Landmark size={20} className="text-primary mt-1" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest border-none px-0 mb-1", s.color)}>
                            [{s.label}]
                        </Badge>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">Ref: {app.id.substring(0, 8)}</span>
                    </div>
                    <h4 className="font-black text-sm uppercase tracking-tight truncate mb-1">{prog.major || 'Details Incomplete'}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                        {prog.preferred_country || "Location Pending"} • {prog.degree_level || "Year Pending"}
                    </p>
                </div>
                <ChevronRight className="self-center opacity-10 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </CardContent>
        </Card>
    );
};
