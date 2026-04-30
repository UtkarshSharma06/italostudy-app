import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    MessageCircle,
    Video,
    Save,
    Plus,
    History,
    ExternalLink,
    Loader2,
    Calendar,
    Send,
    Search,
    AlertCircle,
    Gift,
    Upload,
    ChevronDown,
    CheckSquare,
    MapPin,
    FolderOpen,
    LayoutDashboard,
    GraduationCap,
    BadgeCheck,
    Trash2,
    Link
} from "lucide-react";
import { AdmissionChat } from "@/components/concierge/AdmissionChat";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";

interface ConsultantApplicationDetailProps {
    applicationId: string;
    hideSidebar?: boolean;
}

export default function ConsultantApplicationDetail({ applicationId, hideSidebar }: ConsultantApplicationDetailProps) {
    const [application, setApplication] = useState<any>(null);
    const [otherApplications, setOtherApplications] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [offers, setOffers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const activeTab = new URLSearchParams(location.search).get('tab') || 'application';

    // Form states
    const [meetingLink, setMeetingLink] = useState("");
    const [meetingTime, setMeetingTime] = useState("");
    const [meetingInfo, setMeetingInfo] = useState("");
    const [newTask, setNewTask] = useState({ title: "", description: "" });
    const [newOffer, setNewOffer] = useState({ title: "Positive Feedback", message: "", file: null as File | null });
    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [rejectionReasonInput, setRejectionReasonInput] = useState("");

    useEffect(() => {
        fetchApplicationData();
    }, [applicationId]);

    const handleDownload = async (filePath: string, fileName?: string) => {
        try {
            if (filePath.startsWith('http')) {
                window.open(filePath, '_blank');
                return;
            }

            const { data, error } = await supabase.storage.from('admission-docs').download(filePath);
            if (error) throw error;

            const url = window.URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName || 'document');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download failed:", err);
            toast({
                title: "Download Failed",
                description: "Could not retrieve the file. It might be private or deleted.",
                variant: "destructive"
            });
        }
    };

    const handleDeleteDocument = async (docId: string, filePath: string) => {
        if (!confirm("Are you sure you want to delete this document permanently?")) return;
        setIsLoading(true); // Re-use loading state or add specific deleting state
        try {
            // 1. Delete from Storage (only if it's a Supabase path)
            if (!filePath.startsWith('http')) {
                const { error: storageError } = await supabase.storage.from('admission-docs').remove([filePath]);
                if (storageError) console.error("Storage delete error (non-fatal):", storageError);
            }

            // 2. Delete from DB
            const { error: dbError } = await supabase
                .from('admission_documents')
                .delete()
                .eq('id', docId);

            if (dbError) throw dbError;

            toast({ title: "Deleted", description: "Document removed successfully." });
            fetchApplicationData();
        } catch (err: any) {
            console.error("Delete failed:", err);
            toast({ title: "Error", description: err.message, variant: "destructive" });
            setIsLoading(false);
        }
    };

    const fetchApplicationData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch current application
            const { data: rawAppData, error: appError } = await supabase
                .from('admission_applications')
                .select('*')
                .eq('id', applicationId)
                .single();

            const appData = rawAppData as any;

            if (appError) throw appError;

            // Fetch profile separately to be safe from relationship errors
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', appData.user_id)
                .single();

            const appWithProfile = { ...appData, profiles: profileData };
            setApplication(appWithProfile);
            setMeetingLink(appData.meeting_link || "");
            setMeetingTime(appData.meeting_time ? format(new Date(appData.meeting_time), "yyyy-MM-dd'T'HH:mm") : "");
            setMeetingInfo(appData.meeting_info || "");

            // 2. Fetch all other data in parallel
            const [docsRes, tasksRes, offersRes, otherAppsRes] = await Promise.all([
                (supabase as any).from('admission_documents').select('*').eq('user_id', appData.user_id),
                (supabase as any).from('admission_tasks').select('*').eq('application_id', applicationId).order('created_at', { ascending: false }),
                (supabase as any).from('admission_offers').select('*').eq('application_id', applicationId).order('created_at', { ascending: false }),
                (supabase as any).from('admission_applications').select('id, target_degree, created_at').eq('user_id', appData.user_id).neq('id', applicationId)
            ]);

            setDocuments(docsRes.data || []);
            setTasks(tasksRes.data || []);
            setOffers(offersRes.data || []);
            setOtherApplications(otherAppsRes.data || []);

        } catch (err) {
            console.error('Error fetching details:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const updateStatus = async (status: string, reason?: string) => {
        setIsUpdating(true);
        try {
            const updateData: any = {
                status,
                updated_at: new Date().toISOString()
            };
            if (reason) updateData.rejection_reason = reason;

            const { error } = await supabase
                .from('admission_applications')
                .update(updateData)
                .eq('id', applicationId);

            if (error) throw error;
            toast({ title: "Status Updated", description: `Application is now ${status.replace('_', ' ')}` });
            fetchApplicationData();
        } catch (err: any) {
            toast({ title: "Update Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
            setIsRejectionModalOpen(false);
        }
    };

    const saveMeetingInfo = async () => {
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('admission_applications')
                .update({
                    meeting_link: meetingLink,
                    meeting_time: meetingTime ? new Date(meetingTime).toISOString() : null,
                    meeting_info: meetingInfo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', applicationId);

            if (error) throw error;
            toast({ title: "Meeting Scheduled", description: "The candidate will be notified." });
            fetchApplicationData();
        } catch (err: any) {
            toast({ title: "Failed to Save", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteMeeting = async () => {
        if (!confirm('Are you sure you want to cancel this meeting?')) return;
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('admission_applications')
                .update({
                    meeting_link: null,
                    meeting_time: null,
                    meeting_info: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', applicationId);

            if (error) throw error;
            toast({ title: "Meeting Cancelled", description: "The meeting has been removed." });
            setMeetingLink("");
            setMeetingTime("");
            setMeetingInfo("");
            fetchApplicationData();
        } catch (err: any) {
            toast({ title: "Failed to Delete", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const createTask = async () => {
        if (!newTask.title) return;
        setIsUpdating(true);
        try {
            const { error } = await supabase.from('admission_tasks').insert({
                application_id: applicationId,
                title: newTask.title,
                description: newTask.description,
                status: 'pending'
            });

            if (error) throw error;
            toast({ title: "Task Created", description: "Student has been notified." });
            setNewTask({ title: "", description: "" });
            fetchApplicationData();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const sendOffer = async () => {
        if (!newOffer.title) return;
        setIsUpdating(true);
        try {
            let filePath = null;
            if (newOffer.file) {
                const folder = `offers/${applicationId}`;
                const result = await uploadToCloudinary(newOffer.file, folder);
                filePath = result.secure_url;
            }

            const { error } = await supabase.from('admission_offers').insert({
                application_id: applicationId,
                consultant_id: (await supabase.auth.getUser()).data.user?.id,
                title: newOffer.title,
                message: newOffer.message,
                file_path: filePath,
                file_name: newOffer.file?.name
            });

            if (error) throw error;
            toast({ title: "Offer Sent!", description: "Student has been notified of the positive feedback." });
            setNewOffer({ title: "Positive Feedback", message: "", file: null });
            fetchApplicationData();

            // Auto update status to accepted if making an offer?
            // updateStatus('accepted'); 
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    // activeTab is derived from URL at the top of the component
    const setActiveTab = (tab: string) => {
        const newParams = new URLSearchParams(location.search);
        newParams.set('tab', tab);
        navigate({ search: newParams.toString() });
    };
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const SidebarItem = ({ id, icon: Icon, label }: any) => (
        <button
            onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-200 border-l-4 ${activeTab === id
                ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold'
                : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
        >
            <Icon className={`w-5 h-5 ${activeTab === id ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="text-sm tracking-wide">{label}</span>
        </button>
    );

    if (isLoading) return <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;

    const statuses = [
        { id: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-100' },
        { id: 'under_review', label: 'Under Review', icon: Search, color: 'text-blue-600 bg-blue-50 border-blue-100' },
        { id: 'documents_required', label: 'Docs Req', icon: FileText, color: 'text-rose-600 bg-rose-50 border-rose-100' },
        { id: 'accepted', label: 'Accepted', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
        { id: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-slate-600 bg-slate-50 border-slate-100' },
    ];

    return (
        <div className={hideSidebar ? "" : "flex min-h-[calc(100vh-80px)] bg-slate-50/50"}>

            {/* Sidebar */}
            {!hideSidebar && (
                <div className={`
                    fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:relative lg:translate-x-0 lg:w-72 bg-white border-r border-slate-200 z-40 transition-transform duration-300 ease-in-out
                `}>
                    <div className="p-8">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                            Student <span className="text-indigo-600">#{application.user_id.substring(0, 4)}</span>
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            {application.profiles?.first_name} {application.profiles?.last_name}
                        </p>
                    </div>

                    <nav className="space-y-1">
                        <SidebarItem id="application" icon={LayoutDashboard} label="Overview" />
                        <SidebarItem id="documents" icon={FolderOpen} label="Documents" />
                        <SidebarItem id="messages" icon={MessageCircle} label="Messages" />
                        <SidebarItem id="meetings" icon={Video} label="Meetings" />
                        <SidebarItem id="offer" icon={Gift} label="Make Offer" />
                    </nav>

                    <div className="p-8 mt-auto">
                        <Button variant="outline" className="w-full justify-start text-slate-500" onClick={() => window.location.href = '/consultant/dashboard'}>
                            &larr; Back to Dashboard
                        </Button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className={hideSidebar ? "" : "flex-1 p-6 lg:p-12 overflow-y-auto"}>
                <div className="max-w-5xl mx-auto space-y-8">

                    {/* Header Info */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900">{application.target_degree || 'Unspecified Program'}</h1>
                            <p className="text-slate-500 font-medium">Application ID: {application.id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide border ${statuses.find(s => s.id === application.status)?.color || 'bg-slate-100 text-slate-600'
                                }`}>
                                {application.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    {activeTab === 'application' && (
                        <div className="space-y-10">
                            {/* Status Command Center */}
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6">Update Status</h3>
                                <div className="flex flex-wrap gap-3">
                                    {statuses.map((s) => (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                if (s.id === 'rejected') {
                                                    setIsRejectionModalOpen(true);
                                                } else {
                                                    updateStatus(s.id);
                                                }
                                            }}
                                            disabled={isUpdating}
                                            className={`flex items-center gap-3 px-6 py-4 rounded-xl border transition-all active:scale-95 ${application.status === s.id
                                                ? `${s.color} ring-2 ring-offset-2 ring-indigo-200`
                                                : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-slate-600'
                                                }`}
                                        >
                                            <s.icon className={`w-5 h-5 ${application.status === s.id ? '' : 'opacity-50'}`} />
                                            <span className="font-bold text-xs uppercase tracking-widest">{s.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Student Application Profile */}
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-500" /> Application Details
                                </h3>

                                <div className="space-y-8">
                                    {/* Section 1: Program & Preferences */}
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Program Selection</h4>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Target Program</p>
                                                <p className="font-bold text-slate-900 text-lg">
                                                    {application.application_data?.program_info?.major || 'Not Specified'}
                                                </p>
                                                <p className="text-sm text-slate-500 capitalize">
                                                    {application.application_data?.program_info?.degree_level || 'Unknown Degree'}
                                                </p>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">{application.application_data?.program_info?.intake ? `Intake: ${application.application_data.program_info.intake.replace('_', ' ')}` : 'No Intake Selected'}</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Preferred Country</p>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-indigo-500" />
                                                    <span className="font-bold text-slate-900 capitalize">
                                                        {application.application_data?.program_info?.preferred_country || 'Any'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="col-span-full p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">University Preferences</p>
                                                {application.application_data?.program_info?.university_preferences?.length > 0 ? (
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {application.application_data.program_info.university_preferences.map((uni: string, i: number) => (
                                                            <li key={i} className="text-sm font-medium text-slate-700">{uni}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-slate-400 italic text-sm">No preferences listed</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Personal Information */}
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Personal Information</h4>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                                                    <p className="font-bold text-slate-900">
                                                        {application.application_data?.personal_info?.first_name} {application.application_data?.personal_info?.last_name}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</p>
                                                    <p className="text-slate-700">{application.application_data?.personal_info?.email || application.profiles?.email}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                                                    <p className="text-slate-700">{application.application_data?.personal_info?.phone || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date of Birth</p>
                                                    <p className="text-slate-700">
                                                        {application.application_data?.personal_info?.date_of_birth
                                                            ? format(new Date(application.application_data.personal_info.date_of_birth), 'MMMM d, yyyy')
                                                            : 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nationality</p>
                                                    <p className="text-slate-700">{application.application_data?.personal_info?.nationality || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gender</p>
                                                    <p className="text-slate-700 capitalize">{application.application_data?.personal_info?.gender || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Passport Number</p>
                                                    <p className="text-slate-700">{application.application_data?.personal_info?.passport_number || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Address</p>
                                                    <div className="text-slate-700 text-sm mt-1">
                                                        <p>{application.application_data?.address_info?.street}</p>
                                                        <p>
                                                            {application.application_data?.address_info?.city}
                                                            {application.application_data?.address_info?.state ? `, ${application.application_data.address_info.state}` : ''}
                                                            {application.application_data?.address_info?.postal_code ? ` ${application.application_data.address_info.postal_code}` : ''}
                                                        </p>
                                                        <p>{application.application_data?.address_info?.country}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Academic History */}
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Academic History</h4>
                                        {application.application_data?.academic_history?.history?.length > 0 ? (
                                            <div className="space-y-3">
                                                {application.application_data.academic_history.history.map((edu: any, index: number) => (
                                                    <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-4">
                                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                                                            <GraduationCap className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h5 className="font-bold text-slate-900">{edu.institution}</h5>
                                                            <p className="text-sm text-slate-600 font-medium">{edu.degree}</p>
                                                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                                                <span>{edu.start_year} - {edu.end_year}</span>
                                                                {edu.grade && <span className="font-bold bg-white px-2 py-0.5 rounded border border-slate-200">Grade: {edu.grade}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-slate-400 italic">
                                                No academic history provided.
                                            </div>
                                        )}
                                    </div>

                                    {/* Section 4: Test Scores */}
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Test Scores</h4>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <BadgeCheck className="w-4 h-4 text-indigo-500" />
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">English Proficiency</p>
                                                </div>
                                                {application.application_data?.test_scores?.english_test_type && application.application_data?.test_scores?.english_test_type !== 'none' ? (
                                                    <div>
                                                        <p className="font-bold text-slate-900 uppercase">{application.application_data.test_scores.english_test_type}</p>
                                                        <p className="text-slate-700">Score: <span className="font-bold">{application.application_data.test_scores.english_score}</span></p>
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-400 italic text-sm">Not taken or not reported</p>
                                                )}
                                            </div>

                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <BadgeCheck className="w-4 h-4 text-indigo-500" />
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Standardized Tests</p>
                                                </div>
                                                {(application.application_data?.test_scores?.sat_score || application.application_data?.test_scores?.gmat_gre_score) ? (
                                                    <div className="space-y-2">
                                                        {application.application_data.test_scores.sat_score && (
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-500">SAT</p>
                                                                <p className="font-bold text-slate-900">{application.application_data.test_scores.sat_score}</p>
                                                            </div>
                                                        )}
                                                        {application.application_data.test_scores.gmat_gre_score && (
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-500">GMAT / GRE</p>
                                                                <p className="font-bold text-slate-900">{application.application_data.test_scores.gmat_gre_score}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-400 italic text-sm">No optional tests reported</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-8">
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Received Documents</h3>
                                    <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-xs">{documents.length}</span>
                                </div>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {documents.map((doc) => {
                                        const linkedTask = tasks.find(t => t.id === doc.document_type);
                                        const displayLabel = linkedTask ? linkedTask.title : doc.document_type.replace(/_/g, ' ');

                                        return (
                                            <div key={doc.id} className="p-4 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all bg-white group relative">
                                                <div className="flex flex-col h-full justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate" title={displayLabel}>{displayLabel}</p>
                                                        <p className="font-bold text-sm text-slate-900 truncate mb-1">{doc.file_name}</p>
                                                        <p className="text-[10px] text-slate-400">{format(new Date(doc.created_at), 'MMM d, HH:mm')}</p>
                                                    </div>
                                                    <div className="flex gap-2 mt-3">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="flex-1 h-8 text-xs font-bold"
                                                            onClick={() => handleDownload(doc.file_path, doc.file_name)}
                                                        >
                                                            <ExternalLink className="w-3 h-3 mr-2" /> Download
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-8 h-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                                                            onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {documents.length === 0 && (
                                        <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                                            No documents uploaded yet.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Tasks */}
                                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight mb-6">Assign Tasks</h3>
                                    <div className="space-y-4">
                                        <Input
                                            placeholder="Task Title (e.g. Upload new passport)"
                                            value={newTask.title}
                                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                            className="rounded-xl"
                                        />
                                        <Textarea
                                            placeholder="Description..."
                                            value={newTask.description}
                                            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                            className="rounded-xl"
                                        />
                                        <Button onClick={createTask} disabled={isUpdating} variant="outline" className="w-full rounded-xl font-bold">
                                            <Plus className="w-4 h-4 mr-2" /> Create Task
                                        </Button>

                                        <div className="mt-6 space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Tasks</p>
                                            {tasks.map(t => {
                                                const linkedDocs = documents.filter(d => d.document_type === t.id);
                                                return (
                                                    <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                        <div className="flex items-center gap-3">
                                                            {t.status === 'resolved' ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <Clock className="w-5 h-5 text-amber-500 shrink-0" />}
                                                            <div>
                                                                <span className="text-sm font-medium text-slate-700 block">{t.title}</span>
                                                                {linkedDocs.length > 0 && (
                                                                    <p className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 mt-0.5">
                                                                        <FileText className="w-3 h-3" /> {linkedDocs.length} Document{linkedDocs.length > 1 ? 's' : ''} Received
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {t.status === 'resolved' && (
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                                                                Resolved
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'messages' && (
                        <div className="h-[700px] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                <h2 className="font-black text-slate-900 flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5" /> Chat with Student
                                </h2>

                                {/* Application Switcher within Messages */}
                                {otherApplications.length > 0 && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="gap-2 bg-white text-xs font-bold border-slate-300">
                                                Switch Application <ChevronDown className="w-3 h-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {/* Current App Item (Disabled/Selected) */}
                                            <DropdownMenuItem disabled className="bg-slate-50 font-bold">
                                                {application.target_degree} (Current)
                                            </DropdownMenuItem>
                                            {otherApplications.map(app => (
                                                <DropdownMenuItem key={app.id} onClick={() => {
                                                    const path = hideSidebar
                                                        ? `/consultant/application/${app.id}/chat`
                                                        : `/apply-university/application/${app.id}?tab=messages`;
                                                    navigate(path);
                                                }}>
                                                    {app.target_degree} ({format(new Date(app.created_at), 'MMM d')})
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <AdmissionChat applicationId={applicationId} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'meetings' && (
                        <div className="max-w-3xl mx-auto space-y-8">
                            <div className="bg-white p-8 rounded-[2rem] border border-indigo-100 shadow-xl shadow-indigo-50/50">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                                        <Video className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Schedule Meeting</h3>
                                        <p className="text-slate-500 font-medium">Set up a video call with the student.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Meeting Link</Label>
                                        <div className="relative">
                                            <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                value={meetingLink}
                                                onChange={e => setMeetingLink(e.target.value)}
                                                className="pl-10 rounded-xl h-12 font-medium"
                                                placeholder="https://zoom.us/j/..."
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date & Time</Label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type="datetime-local"
                                                value={meetingTime}
                                                onChange={e => setMeetingTime(e.target.value)}
                                                className="pl-10 rounded-xl h-12 font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Topic / Agenda</Label>
                                        <Input
                                            value={meetingInfo}
                                            onChange={e => setMeetingInfo(e.target.value)}
                                            className="rounded-xl h-12"
                                            placeholder="e.g. Discussing application strategy..."
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <Button
                                            onClick={saveMeetingInfo}
                                            disabled={isUpdating}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black h-12 shadow-lg shadow-indigo-200"
                                        >
                                            {isUpdating ? <Loader2 className="animate-spin mr-2" /> : <Video className="w-4 h-4 mr-2" />}
                                            {meetingTime ? 'Update Schedule' : 'Schedule Meeting'}
                                        </Button>

                                        {meetingLink && (
                                            <Button
                                                onClick={handleDeleteMeeting}
                                                disabled={isUpdating}
                                                variant="outline"
                                                className="border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl h-12 px-6 font-bold"
                                            >
                                                Cancel Meeting
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'offer' && (
                        <div className="max-w-3xl mx-auto space-y-8">
                            <div className="bg-white p-8 rounded-[2rem] border border-emerald-100 shadow-sm bg-emerald-50/10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                                        <Gift className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Make an Offer</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Title</Label>
                                        <Input value={newOffer.title} onChange={e => setNewOffer({ ...newOffer, title: e.target.value })} className="rounded-xl" placeholder="Positive Feedback" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Message</Label>
                                        <Textarea value={newOffer.message} onChange={e => setNewOffer({ ...newOffer, message: e.target.value })} className="rounded-xl h-32" placeholder="Congratulations! We are pleased to inform you..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Offer Letter / Attachment</Label>
                                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors bg-white">
                                            <Input type="file" id="offer-upload" className="hidden" onChange={e => setNewOffer({ ...newOffer, file: e.target.files?.[0] || null })} />
                                            <label htmlFor="offer-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                                <Upload className="w-8 h-8 text-slate-300" />
                                                <span className="text-sm font-bold text-slate-600">{newOffer.file ? newOffer.file.name : "Click to upload PDF or Image"}</span>
                                            </label>
                                        </div>
                                    </div>
                                    <Button onClick={sendOffer} disabled={isUpdating} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black py-4 shadow-lg shadow-emerald-200">
                                        {isUpdating ? <Loader2 className="animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Send Offer
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight mb-6 flex items-center gap-2">
                                    <History className="w-5 h-5 text-slate-400" /> Offer History
                                </h3>
                                {offers.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic text-center py-8">No offers sent yet.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {offers.map(offer => (
                                            <div key={offer.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-slate-900">{offer.title}</p>
                                                    <p className="text-sm text-slate-600 truncate max-w-xs">{offer.message}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">{format(new Date(offer.created_at), 'MMM d, yyyy')}</p>
                                                </div>
                                                {offer.file_path && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleDownload(offer.file_path, offer.file_name)}>
                                                        <FileText className="w-4 h-4 text-indigo-500" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Rejection Modal */}
                <Dialog open={isRejectionModalOpen} onOpenChange={setIsRejectionModalOpen}>
                    <DialogContent className="sm:max-w-md rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Reject Application</DialogTitle>
                            <DialogDescription>
                                Please provide a reason for rejecting this application. This will be shared with the student.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="reason" className="text-xs font-bold uppercase tracking-widest text-slate-400">Rejection Reason</Label>
                                <Textarea
                                    id="reason"
                                    placeholder="e.g. Missing prerequisites, incomplete profile..."
                                    value={rejectionReasonInput}
                                    onChange={e => setRejectionReasonInput(e.target.value)}
                                    className="rounded-2xl min-h-[120px]"
                                />
                            </div>
                        </div>
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button variant="ghost" onClick={() => setIsRejectionModalOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold px-8"
                                onClick={() => updateStatus('rejected', rejectionReasonInput)}
                                disabled={!rejectionReasonInput.trim() || isUpdating}
                            >
                                Confirm Rejection
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
