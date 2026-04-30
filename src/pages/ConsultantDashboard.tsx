import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Layout from "@/components/Layout";
import { Loader2, CheckCircle2, User, FileText, Calendar, MessageCircle, Gift, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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

const StudentAvatar = ({ url, name, size = 80 }: { url: string | null, name: string, size?: number }) => {
    const [hasError, setHasError] = useState(false);

    if (url && !hasError) {
        return (
            <img
                src={getOptimizedImageUrl(url, size, size)}
                alt={name}
                className="w-full h-full object-cover"
                onError={() => setHasError(true)}
            />
        );
    }

    return (
        <div className={cn("w-full h-full flex items-center justify-center", generateAvatarColor(name))}>
            <span className={cn("font-black uppercase", size >= 100 ? "text-sm" : "text-xs")}>
                {name[0] || "?"}
            </span>
        </div>
    );
};

export default function ConsultantDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [myStudents, setMyStudents] = useState<any[]>([]);
    const [applications, setApplications] = useState<any[]>([]); // New Pool
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'applications' | 'messages' | 'offers'>('applications');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const fetchPool = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch unassigned pool
            const { data: poolData, error: poolError } = await (supabase as any)
                .from('admission_applications')
                .select('*, profiles(avatar_url)')
                .in('status', ['submitted'])
                .order('created_at', { ascending: false });

            if (poolError) throw poolError;

            // Client-side filter for unassigned
            const unassigned = (poolData || []).filter((app: any) => !app.consultant_id);
            setApplications(unassigned);

            // 2. Fetch my claimed students
            if (user) {
                const { data: myData, error: myError } = await (supabase as any)
                    .from('admission_applications')
                    .select('*, profiles(avatar_url)')
                    .eq('consultant_id', user.id)
                    .order('updated_at', { ascending: false });

                if (myError) throw myError;
                setMyStudents(myData || []);
            }

        } catch (error) {
            console.error('Error fetching dashboard:', JSON.stringify(error));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPool();
    }, [user]);

    const handleClaim = async (appId: string) => {
        try {
            const { error } = await supabase
                .from('admission_applications')
                .update({
                    consultant_id: user?.id,
                    status: 'under_review',
                    updated_at: new Date().toISOString()
                })
                .eq('id', appId);

            if (error) throw error;

            toast({
                title: "Application Claimed",
                description: "You are now assigned to this student.",
            });
            fetchPool(); // Refresh lists
        } catch (error) {
            console.error('Error claiming:', error);
            toast({
                title: "Error",
                description: "Could not claim application.",
                variant: "destructive"
            });
        }
    };

    const SidebarItem = ({ id, icon: Icon, label, count }: any) => (
        <button
            onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-200 border-l-4 ${activeTab === id
                ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold'
                : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
        >
            <Icon className={`w-5 h-5 ${activeTab === id ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="text-sm tracking-wide">{label}</span>
            {count !== undefined && count > 0 && (
                <span className="ml-auto bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {count}
                </span>
            )}
        </button>
    );

    return (
        <Layout>
            <div className="flex min-h-[calc(100vh-80px)] bg-slate-50/50">

                {/* Mobile Sidebar Toggle - Visible when sidebar is CLOSED */}
                {!isSidebarOpen && (
                    <div className="lg:hidden fixed bottom-6 right-6 z-[60]">
                        <Button
                            onClick={() => setIsSidebarOpen(true)}
                            className="rounded-full w-14 h-14 bg-indigo-600 shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
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
                    shadow-2xl lg:shadow-none
                `}>
                    <div className="p-8 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                Consultant<span className="text-indigo-600">.</span>
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Dashboard</p>
                        </div>
                        {/* Close button inside sidebar (mobile only) */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden text-slate-500 hover:text-slate-900"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <X className="w-6 h-6" />
                        </Button>
                    </div>

                    <nav className="space-y-1">
                        <SidebarItem id="applications" icon={FileText} label="Applications" count={myStudents.length + applications.length} />
                        <SidebarItem id="messages" icon={MessageCircle} label="Messages" />
                        <SidebarItem id="offers" icon={Gift} label="Offers" />
                    </nav>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-4 sm:p-6 lg:p-12 overflow-y-auto w-full">

                    {activeTab === 'applications' && (
                        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                                Consultant <span className="text-indigo-600 block sm:inline">Dashboard</span>
                            </h1>

                            {/* MY STUDENTS SECTION */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    My Active Students
                                </h2>

                                {myStudents.length === 0 ? (
                                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
                                            You haven't claimed any students yet.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {myStudents.map((app) => (
                                            <div key={app.id} className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex flex-col justify-between h-full">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-indigo-100 shadow-sm overflow-hidden">
                                                            <StudentAvatar
                                                                url={(app as any).profiles?.avatar_url}
                                                                name={`${app.application_data?.personal_info?.first_name || ''} ${app.application_data?.personal_info?.last_name || ''}`.trim() || "Student"}
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 text-sm">
                                                                {app.application_data?.personal_info?.first_name} {app.application_data?.personal_info?.last_name}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">
                                                                @{app.application_data?.personal_info?.email?.split('@')[0] || app.user_id.substring(0, 8)}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="bg-indigo-200 text-indigo-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                                                                    {app.status.replace('_', ' ')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 mb-6">
                                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                                            <FileText className="w-4 h-4 text-indigo-400" />
                                                            <span className="font-medium">{app.application_data?.program_info?.major || app.target_degree || 'Unspecified Program'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs"
                                                    onClick={() => navigate(`/consultant/application/${app.id}`)}
                                                >
                                                    View Details
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* NEW POOL SECTION */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl opacity-90">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6">
                                    New Applications Pool
                                </h2>

                                {isLoading ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                    </div>
                                ) : applications.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 font-bold uppercase text-xs tracking-widest">
                                        No new applications waiting.
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {applications.map((app) => (
                                            <div key={app.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between h-full">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden">
                                                            <StudentAvatar
                                                                url={(app as any).profiles?.avatar_url}
                                                                name={`${app.application_data?.personal_info?.first_name || ''} ${app.application_data?.personal_info?.last_name || ''}`.trim() || "Student"}
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 text-sm">
                                                                {app.application_data?.personal_info?.first_name} {app.application_data?.personal_info?.last_name}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">
                                                                @{app.application_data?.personal_info?.email?.split('@')[0] || app.user_id.substring(0, 8)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 mb-6">
                                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                                            <FileText className="w-4 h-4 text-indigo-400" />
                                                            <span className="font-medium">{app.application_data?.program_info?.major || app.target_degree || 'Unspecified Program'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                                            <Calendar className="w-4 h-4 text-indigo-400" />
                                                            <span className="font-medium">Submitted: {format(new Date(app.updated_at), 'MMM d, yyyy')}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button
                                                    onClick={() => handleClaim(app.id)}
                                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest py-6 rounded-xl shadow-lg shadow-indigo-200"
                                                >
                                                    Claim Application
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'messages' && (
                        <div className="max-w-4xl mx-auto space-y-8">
                            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Student <span className="text-indigo-600">Messages</span></h1>

                            {myStudents.length === 0 ? (
                                <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center shadow-xl">
                                    <MessageCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 font-medium">Claim an application to start chatting with students</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {myStudents.map(app => (
                                        <div
                                            key={app.id}
                                            onClick={() => navigate(`/consultant/application/${app.id}/chat`)}
                                            className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-indigo-300 transition-all cursor-pointer flex items-center justify-between group shadow-sm"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors overflow-hidden">
                                                    <StudentAvatar
                                                        url={(app as any).profiles?.avatar_url}
                                                        name={`${app.application_data?.personal_info?.first_name || ''} ${app.application_data?.personal_info?.last_name || ''}`.trim() || "Student"}
                                                        size={100}
                                                    />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900">
                                                        {app.application_data?.personal_info?.first_name} {app.application_data?.personal_info?.last_name}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 font-medium">{app.application_data?.program_info?.major || app.target_degree}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" className="text-indigo-600 font-bold group-hover:translate-x-1 transition-transform">
                                                Chat Now &rarr;
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'offers' && (
                        <div className="max-w-4xl mx-auto space-y-8">
                            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Active <span className="text-indigo-600">Offers</span></h1>

                            {myStudents.length === 0 ? (
                                <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center shadow-xl">
                                    <Gift className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 font-medium">Claim an application to send offers</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {myStudents.map(app => (
                                        <div
                                            key={app.id}
                                            onClick={() => navigate(`/consultant/application/${app.id}/offer`)}
                                            className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between group shadow-sm"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors overflow-hidden">
                                                    <StudentAvatar
                                                        url={(app as any).profiles?.avatar_url}
                                                        name={`${app.application_data?.personal_info?.first_name || ''} ${app.application_data?.personal_info?.last_name || ''}`.trim() || "Student"}
                                                        size={100}
                                                    />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900">
                                                        {app.application_data?.personal_info?.first_name} {app.application_data?.personal_info?.last_name}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 font-medium">{app.application_data?.program_info?.major || app.target_degree}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" className="text-emerald-600 font-bold group-hover:translate-x-1 transition-transform">
                                                Make Offer &rarr;
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </Layout>
    );
}
