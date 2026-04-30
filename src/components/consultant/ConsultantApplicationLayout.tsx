import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import {
    Loader2,
    FileText,
    MessageCircle,
    Gift,
    User,
    ArrowLeft,
    ChevronRight,
    LayoutDashboard,
    FolderOpen,
    Menu,
    X
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
import { cn } from "@/lib/utils";

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

interface ConsultantApplicationLayoutProps {
    children: React.ReactNode;
    activeTab: 'application' | 'messages' | 'offer' | 'documents';
}

export default function ConsultantApplicationLayout({ children, activeTab }: ConsultantApplicationLayoutProps) {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [application, setApplication] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [unreadMessages, setUnreadMessages] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const fetchUnreadCount = async () => {
        if (!id) return;
        const { data } = await (supabase
            .from('admission_messages') as any)
            .select('id')
            .eq('application_id', id)
            .eq('is_from_consultant', false)
            .eq('is_read', false);
        setUnreadMessages(data?.length || 0);
    };

    useEffect(() => {
        if (!id) return;

        const fetchApp = async () => {
            // Fetch application first
            const { data: appData, error: appError } = await (supabase
                .from('admission_applications') as any)
                .select('*')
                .eq('id', id)
                .single();

            if (appError) {
                console.error("Error fetching app:", appError);
                setIsLoading(false);
                return;
            }

            // Fetch profile separately
            const { data: profileData } = await (supabase
                .from('profiles') as any)
                .select('*')
                .eq('id', appData.user_id)
                .single();

            setApplication({ ...appData, profiles: profileData });
            setIsLoading(false);
        };

        fetchApp();
        fetchUnreadCount();

        const channel = supabase
            .channel(`layout_updates_${id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'admission_messages',
                filter: `application_id=eq.${id}`
            }, () => fetchUnreadCount())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    if (isLoading) {
        return (
            <Layout>
                <div className="min-h-screen flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                </div>
            </Layout>
        );
    }

    if (!application) return <div>Application not found</div>;

    const SidebarItem = ({ tabId, icon: Icon, label, path, count }: any) => (
        <button
            onClick={() => {
                navigate(path);
                setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-200 border-l-4 ${activeTab === tabId
                ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold'
                : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
        >
            <Icon className={`w-5 h-5 ${activeTab === tabId ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="text-sm tracking-wide">{label}</span>
            {count > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center ml-2 shadow-lg shadow-red-200 animate-pulse">
                    {count}
                </span>
            )}
            {activeTab === tabId && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />}
        </button>
    );

    return (
        <Layout>
            <div className="flex min-h-[calc(100vh-72px)] bg-slate-50/50 relative">
                {/* Mobile Sidebar Toggle - Visible when sidebar is CLOSED */}
                {!isSidebarOpen && (
                    <div className="lg:hidden fixed bottom-6 right-6 z-[60]">
                        <Button
                            onClick={() => setIsSidebarOpen(true)}
                            className="rounded-full w-14 h-14 bg-indigo-600 shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center"
                        >
                            <Menu className="w-6 h-6" />
                        </Button>
                    </div>
                )}

                {/* Sidebar Backdrop */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <div className={`
                    fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:relative lg:translate-x-0 lg:w-72 bg-white border-r border-slate-200 z-50 transition-transform duration-300 ease-in-out
                    shadow-2xl lg:shadow-none top-[72px] lg:top-0 h-[calc(100vh-72px)]
                `}>
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={() => navigate('/consultant/dashboard')}
                                className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                            >
                                <ArrowLeft className="w-3 h-3" /> Back to Dashboard
                            </button>
                            {/* Close button inside sidebar (mobile only) */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden text-slate-500 hover:text-slate-900 h-8 w-8"
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-indigo-100 shadow-sm overflow-hidden">
                                {(() => {
                                    const sName = `${application.application_data?.personal_info?.first_name || ''} ${application.application_data?.personal_info?.last_name || ''}`.trim() || "Student";
                                    return application.profiles?.avatar_url ? (
                                        <img src={getOptimizedImageUrl(application.profiles.avatar_url, 80, 80)} alt={sName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className={cn("w-full h-full flex items-center justify-center", generateAvatarColor(sName))}>
                                            <span className="text-xs font-black uppercase">{sName[0]}</span>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 truncate max-w-[140px]">
                                    {application.application_data?.personal_info?.first_name} {application.application_data?.personal_info?.last_name}
                                </h2>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                    #{application.user_id.substring(0, 8)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        <SidebarItem tabId="application" icon={LayoutDashboard} label="Overview" path={`/consultant/application/${id}`} />
                        <SidebarItem tabId="documents" icon={FolderOpen} label="Documents" path={`/consultant/application/${id}?tab=documents`} />
                        <SidebarItem tabId="messages" icon={MessageCircle} label="Messages" path={`/consultant/application/${id}/chat`} count={unreadMessages} />
                        <SidebarItem tabId="offer" icon={Gift} label="Make Offer" path={`/consultant/application/${id}/offer`} />
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 sm:p-6 lg:p-12 overflow-y-auto lg:ml-0">
                    {children}
                </div>
            </div>
        </Layout>
    );
}
