import { useState, useEffect } from "react";
import _ from "lodash";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import PencilLoader from '@/components/PencilLoader';
import { DocumentUploader } from "@/components/concierge/DocumentUploader";
import { AdmissionChat } from "@/components/concierge/AdmissionChat";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    MessageSquare,
    Gift,
    CheckSquare,
    Calendar,
    Edit,
    Eye,
    Plus,
    Loader2,
    FileText,
    LogOut,
    Menu,
    X,
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    Mail,
    Search,
    Landmark,
    MapPin,
    RotateCcw,
    Video,
    ExternalLink,
    Info,
    Globe,
    GraduationCap,
    Plane,
    Users,
    Zap,
    Heart,
    Lock,
    Phone,
    Trash2
} from "lucide-react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Concierge() {
    const { user, profile, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [applications, setApplications] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [offers, setOffers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'applications' | 'messages' | 'offers' | 'tasks' | 'meetings' | 'about' | 'contact'>('applications');
    const [isInitializing, setIsInitializing] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Task Detail Modal State
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [taskOption, setTaskOption] = useState("attached");

    const [unreadMessages, setUnreadMessages] = useState(0);
    const [selectedOffer, setSelectedOffer] = useState<any>(null);

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

    // Check subscription tier and redirect if not Global
    useEffect(() => {
        const checkAccess = async () => {
            if (authLoading) return;

            if (!user) {
                navigate('/auth');
                return;
            }

            // Use context profile if available and it has the fields we need
            // This prevents redundant DB calls
            const currentProfile = (profile as any);

            // Server-side Global plan check via RPC (primary validation)
            const { data: accessData, error: accessError } = await (supabase as any).rpc('check_concierge_access', {
                user_uuid: user.id
            });

            const hasServerAccess = !accessError && accessData && accessData.length > 0 && accessData[0].allowed;

            // Define access conditions (backup client-side check)
            const hasGlobalTier = currentProfile?.subscription_tier === 'global';
            const hasElitePlan = currentProfile?.selected_plan === 'global';
            const isStaff = currentProfile?.role === 'admin' || currentProfile?.role === 'sub_admin' || currentProfile?.role === 'consultant' || currentProfile?.is_consultant;

            // Access check handled by server RPC, subscription tier, or staff role
            if (hasServerAccess || isStaff || hasGlobalTier || hasElitePlan) {
                return;
            }

            // Fallback: If profile in context is missing or says no access, double check with a fresh fetch
            // But only if we haven't already confirmed access
            try {
                const { data: freshProfile } = await supabase
                    .from('profiles')
                    .select('subscription_tier, selected_plan, role, is_consultant')
                    .eq('id', user.id)
                    .single();

                if (freshProfile?.role === 'admin' || freshProfile?.role === 'sub_admin' || freshProfile?.role === 'consultant' || freshProfile?.is_consultant ||
                    freshProfile?.subscription_tier === 'global' || freshProfile?.selected_plan === 'global') {
                    return;
                }

                console.warn('Redirecting to upgrade: No Global plan detected.');
                navigate('/apply-university/upgrade');
            } catch (error) {
                console.error('Error in secondary access check:', error);
                navigate('/apply-university/upgrade');
            }
        };

        checkAccess();
    }, [user, profile, navigate, authLoading]);

    useEffect(() => {
        if (user) {
            fetchData();

            // Real-time subscription for new messages or offers
            const channel = supabase
                .channel('concierge_updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'admission_messages' }, () => fetchData())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'admission_offers' }, () => fetchData())
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user]);

    const fetchData = async () => {
        try {
            const [appRes, docRes, taskRes, offerRes, msgRes] = await Promise.all([
                supabase.from('admission_applications' as any).select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
                supabase.from('admission_documents' as any).select('*').eq('user_id', user?.id),
                supabase.from('admission_tasks' as any).select('*'),
                supabase.from('admission_offers' as any).select('*'),
                supabase.from('admission_messages' as any).select('id, is_read, is_from_consultant')
            ]);

            setApplications(appRes.data || []);
            setDocuments(docRes.data || []);
            setTasks(taskRes.data || []);
            setOffers(offerRes.data || []);

            // Count unread from consultant
            const unreadMsgs = ((msgRes.data || []) as any[]).filter(m => m.is_from_consultant && !m.is_read).length;
            setUnreadMessages(unreadMsgs);
        } catch (err) {
            console.error('Error fetching data:', err);
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

            if (data) window.location.href = `/apply-university/apply/${data.id}`;
        } catch (err) {
            console.error('Init error:', err);
        } finally {
            setIsInitializing(false);
        }
    };

    const handleDeleteApplication = async (appId: string) => {
        if (!confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('admission_applications')
                .delete()
                .eq('id', appId)
                .eq('user_id', user?.id);

            if (error) throw error;

            toast({
                title: "Application Withdrawn",
                description: "Your application has been successfully withdrawn.",
            });

            fetchData(); // Refresh the list
        } catch (err: any) {
            console.error('Delete error:', err);
            toast({
                title: "Error",
                description: err.message || "Could not withdraw application.",
                variant: "destructive"
            });
        }
    };

    const handleTaskClick = (task: any) => {
        // Now we allow clicking resolved tasks to View or Add More
        setSelectedTask(task);

        if (task.status === 'resolved') {
            // For resolved tasks, stick to 'attached' view to show the file and upload button
            setTaskOption("attached");
        } else {
            setTaskOption("attached");
        }
    };

    const handleTaskSubmit = async () => {
        if (!selectedTask) return;

        // If they chose something other than upload, we might want to save that state.
        // For now, since the Requirement is strict about files, we'll just show a toast if they try to skip without a file
        // UNLESS we implement a "Waive Request" backend logic.

        if (taskOption === 'attached') {
            // Logic is handled by Uploader component directly
            return;
        }

        toast({
            title: "Response Recorded",
            description: "Your status for this requirement has been updated.",
        });
        setSelectedTask(null);
    };

    const deleteDocument = async (docId: string, filePath: string) => {
        try {
            // 1. Delete from Storage (only if it's a Supabase path)
            if (!filePath.startsWith('http')) {
                const { error: storageError } = await supabase.storage.from('admission-docs').remove([filePath]);
                if (storageError) {
                    console.error('Storage delete error:', storageError);
                    // Continue anyway to clean up DB
                }
            }

            // 2. Delete from DB
            const { error: dbError } = await supabase.from('admission_documents').delete().eq('id', docId);
            if (dbError) throw dbError;

            // 3. Update Task Status if no files remain
            // We need to check if this was the last file for a task
            if (selectedTask?.type === 'task' && selectedTask.files?.length === 1) {
                await supabase
                    .from('admission_tasks')
                    .update({ status: 'action_required' })
                    .eq('id', selectedTask.id);
            }

            toast({ title: "Deleted", description: "Document removed successfully." });
            fetchData();

            // Close modal if no files remain? No, let them upload another.
            // But we need to update selectedTask local state to remove the file visually immediately?
            // Since we refetch data, selectedTask (which is a copy) might be stale until we re-open or update it.
            // We should reload selectedTask from the new data.
            // For now, simpler to close modal:
            setSelectedTask(null);

        } catch (error) {
            console.error('Delete error:', error);
            toast({ title: "Error", description: "Failed to delete document.", variant: "destructive" });
        }
    };

    const SidebarItem = ({ id, icon: Icon, label, count }: any) => (
        <button
            onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-200 border-l-4 ${activeTab === id
                ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-600 text-indigo-900 dark:text-indigo-100 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
                }`}
        >
            <Icon className={`w-5 h-5 ${activeTab === id ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="text-sm tracking-wide">{label}</span>
            {count > 0 && (
                <span className="ml-auto bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-red-200 animate-pulse">
                    {count}
                </span>
            )}
        </button>
    );

    // define mandatory docs for the checklist
    const mandatoryDocs = [
        { id: 'passport', label: 'Passport (or Government ID)' },
        { id: 'academic_transcripts', label: 'Academic Transcripts' },
        { id: 'degree_certificate', label: 'Degree Certificate' },
        { id: 'cv', label: 'Resume / CV' },
        { id: 'english_proficiency', label: 'English Proficiency Test' },
        { id: 'sop', label: 'Statement of Purpose (SOP)' },
    ];

    // Helper: Group documents by type
    const docsByType = documents.reduce((acc: any, doc: any) => {
        const type = doc.document_type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(doc);
        return acc;
    }, {});

    const unifiedTasks = (() => {
        const processedTypes = new Set();
        const result: any[] = [];

        // 1. Process Database Tasks
        tasks.forEach(t => {
            // Find docs that match this task's ID (common for custom tasks) 
            // OR match the task's type (if it effectively maps to a standard doc)
            // We'll prioritize exact ID match if we used task.id as doc_type
            const docsByTaskId = docsByType[t.id] || [];
            // We assume some tasks might have a 'task_type' that matches a standard doc slug
            const docsByTaskType = (t.task_type && docsByType[t.task_type]) || [];

            const relevantDocs = [...docsByTaskId, ...docsByTaskType];

            // Deduplicate docs if found in both
            const uniqueDocs = _.uniqBy(relevantDocs, 'id');

            if (uniqueDocs.length > 0) {
                result.push({
                    ...t,
                    status: 'resolved',
                    type: 'task',
                    files: uniqueDocs,
                    description: `${uniqueDocs.length} document${uniqueDocs.length > 1 ? 's' : ''} uploaded`
                });
                // Mark these doc types as processed so we don't add them again as standalone documents
                if (docsByTaskId.length > 0) processedTypes.add(t.id);
                if (t.task_type && docsByTaskType.length > 0) processedTypes.add(t.task_type);
            } else {
                result.push({
                    ...t,
                    type: 'task',
                    files: []
                });
            }
        });

        // 2. Process Mandatory Docs
        mandatoryDocs.forEach(m => {
            // If we already have a task for this (e.g. "Passport Request" task), skip mandatory check to avoid duplicate
            // However, usually mandatory docs are implicit.

            const relevantDocs = docsByType[m.id] || [];

            if (relevantDocs.length > 0) {
                // Even if it was processed by a task, if it was a SPECIFIC task, the generic passport type might not remain?
                // Actually, if we have docs for 'passport', we show them.
                // Unless they were already claimed by a task?
                // If a task claimed 'passport' type, we shouldn't show it again.
                if (!processedTypes.has(m.id)) {
                    result.push({
                        id: m.id,
                        title: m.label,
                        status: 'resolved',
                        type: 'missing_doc', // Effectively resolved though
                        files: relevantDocs,
                        description: `${relevantDocs.length} document${relevantDocs.length > 1 ? 's' : ''} uploaded`,
                        updated_at: relevantDocs[0].created_at
                    });
                    processedTypes.add(m.id);
                }
            } else {
                // Check if any processed task covers this? 
                // Hard to know without explicit mapping. 
                // We'll assume if no 'passport' type doc exists, it's missing.
                result.push({
                    id: m.id,
                    uniqueId: `missing-${m.id}`,
                    title: m.label,
                    description: 'Required document not yet uploaded',
                    status: 'pending',
                    updated_at: new Date().toISOString(),
                    type: 'missing_doc',
                    files: []
                });
            }
        });

        // 3. Process Leftover Documents
        // Any document types that weren't caught by Tasks or Mandatory Docs
        Object.keys(docsByType).forEach(type => {
            if (!processedTypes.has(type)) {
                const docs = docsByType[type];
                // Try to find a nice title?
                const displayTitle = type.replace(/_/g, ' ').toUpperCase();

                result.push({
                    id: type, // Group ID is the type
                    title: displayTitle,
                    description: `${docs.length} document${docs.length > 1 ? 's' : ''} uploaded`,
                    status: 'resolved',
                    updated_at: docs[0].created_at,
                    type: 'document_group',
                    files: docs,
                    original_doc_type: type
                });
            }
        });

        return result.sort((a, b) => {
            if (a.status !== 'resolved' && b.status === 'resolved') return -1;
            if (a.status === 'resolved' && b.status !== 'resolved') return 1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
    })();

    const hasSubmittedApps = applications.some(a => a.status !== 'draft');

    if (authLoading) return <PencilLoader />;

    return (
        <Layout>
            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] bg-slate-50/50 dark:bg-slate-950/50 relative">

                {/* Mobile Sidebar Toggle */}
                <div className="lg:hidden fixed bottom-6 right-6 z-50">
                    <Button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="rounded-full w-12 h-12 bg-indigo-600 shadow-xl"
                    >
                        {isSidebarOpen ? <X /> : <Menu />}
                    </Button>
                </div>

                {/* Sidebar */}
                <div className={`
                    fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 transition-transform duration-300 ease-in-out flex flex-col
                    w-72 shadow-xl lg:shadow-none
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:relative lg:translate-x-0 lg:flex lg:w-72 lg:shrink-0 lg:border-r lg:h-auto lg:min-h-full
                `}>
                    <div className="p-8">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            ITALOSTUDY<span className="text-indigo-600">.</span>
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Study Dashboard</p>
                    </div>

                    <nav className="space-y-1">
                        <SidebarItem id="applications" icon={LayoutDashboard} label="My applications" count={applications.length} />
                        <SidebarItem id="messages" icon={MessageSquare} label="Messages" count={unreadMessages} />
                        <SidebarItem id="meetings" icon={Video} label="Meetings" count={applications.filter(a => a.meeting_link && a.meeting_time).length} />
                        <SidebarItem id="offers" icon={Gift} label="Offers" count={offers.filter(o => !o.is_read).length} />
                        {hasSubmittedApps && (
                            <SidebarItem id="tasks" icon={CheckSquare} label="Tasks" count={unifiedTasks.filter(t => t.status !== 'resolved').length} />
                        )}
                    </nav>

                    <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-800 mb-6 space-y-2">
                        <SidebarItem id="about" icon={Users} label="Who We Are" />
                        <SidebarItem id="contact" icon={Phone} label="Contact Us" />
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6 lg:p-12 overflow-y-auto">

                    {activeTab === 'about' && (
                        <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in duration-500">
                            {/* Hero Section */}
                            <div className="text-center space-y-6 py-12">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-bold uppercase tracking-wide">
                                    <Globe className="w-4 h-4" /> Your Global Future Starts Here
                                </div>
                                <h1 className="text-5xl font-black text-slate-900 dark:text-white leading-tight">
                                    We Guide You From <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Application to Visa</span>
                                </h1>
                                <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                                    ITALOSTUDY is an intelligent consultancy dedicated to making your study abroad dreams a reality. We combine human expertise with smart technology to simplify every step of your journey.
                                </p>
                            </div>

                            {/* Timeline Section */}
                            <div className="relative">
                                <div className="absolute left-1/2 -translate-x-1/2 h-full w-1 bg-gradient-to-b from-indigo-100 via-purple-100 to-transparent rounded-full hidden md:block"></div>
                                <div className="space-y-12 relative z-10">
                                    {[
                                        { icon: FileText, title: "Smart Application", desc: "We help you select the best universities and craft a winning profile.", color: "bg-blue-500" },
                                        { icon: Users, title: "Expert Counselling", desc: "One-on-one sessions with our top consultants to refine your strategy.", color: "bg-indigo-500" },
                                        { icon: GraduationCap, title: "Admission Secured", desc: "We handle the paperwork and negotiations to get you that Offer Letter.", color: "bg-purple-500" },
                                        { icon: Plane, title: "Visa Assistance", desc: "End-to-end guidance on financial proof, interviews, and visa filing.", color: "bg-emerald-500" }
                                    ].map((step, idx) => (
                                        <div key={idx} className={`flex flex-col md:flex-row items-center gap-8 ${idx % 2 === 0 ? 'md:text-right' : 'md:flex-row-reverse md:text-left'}`}>
                                            <div className="flex-1 w-full">
                                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{step.title}</h3>
                                                <p className="text-slate-500 dark:text-slate-400 font-medium">{step.desc}</p>
                                            </div>
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200 dark:shadow-none shrink-0 ${step.color}`}>
                                                <step.icon className="w-8 h-8" />
                                            </div>
                                            <div className="flex-1 hidden md:block"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Features Grid */}
                            <div className="grid md:grid-cols-3 gap-6">
                                {[
                                    { icon: ShieldCheck, title: "Verified Partners", desc: "We work directly with top-tier universities worldwide." },
                                    { icon: Zap, title: "Fast-Track", desc: "Our system speeds up the application process by 3x." },
                                    { icon: Heart, title: "Student First", desc: "Your career goals are our top priority, always." }
                                ].map((feat, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                        <feat.icon className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-4" />
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-2">{feat.title}</h4>
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-2">{feat.title}</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{feat.desc}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Safety Section */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8">
                                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg dark:shadow-none text-emerald-500 shrink-0">
                                    <Lock className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Your Documents are Safe</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-slate-500">
                                        We use bank-level encryption and secure storage buckets to ensure your personal documents (passports, transcripts, etc.) are never compromised. Only authorized consultants can view your files.
                                    </p>
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="bg-slate-900 rounded-[3rem] p-12 text-center text-white relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                <div className="relative z-10 space-y-6">
                                    <h2 className="text-3xl font-black">Ready to launch your career?</h2>
                                    <p className="text-slate-300 max-w-xl mx-auto">
                                        Start your application today and let us handle the rest. Your dream university is closer than you think.
                                    </p>
                                    <Button onClick={() => setActiveTab('applications')} className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl px-8 py-6 font-black text-lg">
                                        Start Application
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'contact' && (
                        <div className="max-w-2xl mx-auto py-12 animate-in fade-in zoom-in duration-300">
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-12 text-center border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/50 rounded-3xl mx-auto flex items-center justify-center mb-8 text-indigo-600 dark:text-indigo-400">
                                    <Mail className="w-10 h-10" />
                                </div>
                                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Get in Touch</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-lg mb-8">
                                    Have questions about your application? Needed technical support? We're here to help!
                                </p>

                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 inline-block w-full">
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Support Email</p>
                                    <a href="mailto:contact@italostudy.com" className="text-xl md:text-2xl font-black text-indigo-600 dark:text-indigo-400 hover:underline break-all">
                                        contact@italostudy.com
                                    </a>
                                </div>

                                <p className="text-slate-400 dark:text-slate-500 text-sm mt-8">
                                    Our team typically replies within 24 hours.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'applications' && (
                        <div className="max-w-5xl mx-auto space-y-12">

                            {/* Offers Banner - Moved to Main Tab */}
                            {offers.length > 0 && (
                                <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 text-slate-900 dark:text-white px-6 py-4 rounded-xl shadow-sm flex items-center gap-4 mb-4" onClick={() => setActiveTab('offers')} role="button">
                                    <Mail className="w-8 h-8 text-slate-700 dark:text-slate-300" />
                                    <div>
                                        <h3 className="font-bold text-lg">You have received {offers.length} reply !</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">You have responded to all offers.</p>
                                    </div>
                                </div>
                            )}


                            <div className="text-center space-y-6">
                                <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-slate-800">
                                    <Calendar className="w-10 h-10 text-slate-900 dark:text-white" />
                                </div>
                                <h1 className="text-3xl font-black text-slate-900 dark:text-white">My Applications</h1>

                                {/* New Application Button */}
                                {applications.length < 2 && (
                                    <Button
                                        onClick={handleInitialize}
                                        disabled={isInitializing}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg"
                                    >
                                        {isInitializing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} New Application
                                    </Button>
                                )}

                                {applications.length >= 2 && (
                                    <p className="text-sm text-slate-500 italic">You have reached the maximum of 2 applications</p>
                                )}
                            </div>

                            {/* Main Grouped Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

                                {/* Status Header Bar */}
                                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        {hasSubmittedApps ? (
                                            <CheckCircle2 className="w-8 h-8 text-slate-900 dark:text-white" />
                                        ) : (
                                            <Edit className="w-8 h-8 text-slate-900 dark:text-white" />
                                        )}
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                                {hasSubmittedApps ? 'The application has been submitted' : 'Application in Progress'}
                                            </h2>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {applications.length < 2 && (
                                            <Button
                                                className="bg-[#004e58] hover:bg-[#003d45] text-white px-8 h-12 font-bold rounded-xl shadow-lg shadow-[#004e58]/20 transition-all hover:scale-105"
                                                onClick={handleInitialize}
                                            >
                                                {applications.length === 0 ? 'Start Application' : 'New Application'}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Numbered List */}
                                <div className="bg-white dark:bg-slate-900">
                                    {applications.map((app, index) => {
                                        const prog = app.application_data?.program_info || {};
                                        const degreeLabels: Record<string, string> = {
                                            'bachelor': 'Bachelors',
                                            'master': 'Masters',
                                            'phd': 'PhD / Doctorate',
                                            'foundation': 'Foundation Year'
                                        };
                                        const degreeBadge: Record<string, string> = {
                                            'bachelor': 'Bachelors',
                                            'master': 'Masters',
                                            'phd': 'PhD / Doctorate',
                                            'foundation': 'Foundation Year'
                                        };

                                        return (
                                            <div key={app.id} className="p-8 flex items-start gap-8 border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <span className="text-3xl font-bold text-slate-200 dark:text-slate-800 leading-none">{index + 1}</span>
                                                <div className="flex-1">
                                                    <div className="flex gap-2 items-center mb-2">
                                                        <span className="border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                                            {degreeBadge[prog.degree_level] || degreeLabels[prog.degree_level] || 'BSc'}
                                                        </span>
                                                        <h3
                                                            onClick={() => app.status !== 'draft' ? navigate(`/apply-university/status/${app.id}`) : navigate(`/apply-university/apply/${app.id}`)}
                                                            className="text-base font-medium text-[#2d5c9e] dark:text-[#5c98e6] hover:underline cursor-pointer"
                                                        >
                                                            {prog.major || 'Unspecified Program'}
                                                        </h3>
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                                                            app.status === 'accepted' ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900" :
                                                                app.status === 'rejected' ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900" :
                                                                    app.status === 'under_review' ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900" :
                                                                        "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900"
                                                        )}>
                                                            {app.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium">
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full bg-slate-200"></span>
                                                            {degreeLabels[prog.degree_level] || 'Undergraduate'} Programs
                                                        </span>
                                                        {prog.university_preferences?.[0] ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <Landmark className="w-3 h-3" />
                                                                {prog.university_preferences[0]}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 text-slate-400 italic">
                                                                <Landmark className="w-3 h-3" />
                                                                Not decided yet
                                                            </span>
                                                        )}
                                                        {prog.preferred_country && (
                                                            <span className="flex items-center gap-1.5 capitalize">
                                                                <MapPin className="w-3 h-3" />
                                                                {prog.preferred_country}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {app.status === 'rejected' && app.rejection_reason && (
                                                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-2xl text-xs text-red-700 dark:text-red-400 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <AlertCircle className="w-4 h-4" />
                                                                <span className="font-black uppercase tracking-widest text-[10px]">Feedback from ITALO STUDY</span>
                                                            </div>
                                                            <p className="font-medium">{app.rejection_reason}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                                    {app.status === 'draft' ? (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 h-9 font-bold rounded-lg"
                                                            onClick={() => navigate(`/apply-university/apply/${app.id}`)}
                                                        >
                                                            <Edit className="w-3.5 h-3.5 mr-2" /> Resume
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="bg-indigo-600 text-white hover:bg-indigo-700 h-9 font-bold rounded-lg"
                                                            onClick={() => navigate(`/apply-university/status/${app.id}`)}
                                                        >
                                                            <FileText className="w-3.5 h-3.5 mr-2" /> View Status
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-slate-400 dark:text-slate-500 hover:text-red-500 h-9 rounded-lg"
                                                        onClick={() => handleDeleteApplication(app.id)}
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5 mr-2" /> Withdraw
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {applications.length === 0 && (
                                        <div className="p-12 text-center text-slate-400 dark:text-slate-500 italic">
                                            No programs selected yet. Start an application to add programs.
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    )}

                    {activeTab === 'tasks' && (
                        <div className="max-w-5xl mx-auto">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 text-center">Academic Year 2026/27</h2>
                            <p className="text-center text-slate-400 dark:text-slate-500 mb-8">Detailed Checklist</p>

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm shadow-sm">
                                {unifiedTasks.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">No tasks or documents found.</div>
                                ) : (
                                    unifiedTasks.map((item, i) => (
                                        <div
                                            key={item.uniqueId || item.id}
                                            className={`flex items-start gap-6 p-6 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer`}
                                            onClick={() => handleTaskClick(item)}
                                        >
                                            <div className="mt-1">
                                                {item.status === 'resolved' ? (
                                                    <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                                                ) : (
                                                    <AlertTriangle className="w-6 h-6 text-amber-500 dark:text-amber-400" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{item.title}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 italic">{item.description}</p>
                                                {item.status !== 'resolved' && (
                                                    <span className="inline-block mt-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 text-[10px] font-bold uppercase rounded">
                                                        Follow-up Required
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                    {format(new Date(item.updated_at), 'MMM d, yyyy, HH:mm')}
                                                </span>
                                                {item.status === 'resolved' && (
                                                    <div className="mt-1">
                                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Resolved</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'messages' && (
                        <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl mt-4">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                <h2 className="font-black text-slate-900 dark:text-white">Messages</h2>
                            </div>
                            {applications.length > 0 ? (
                                <AdmissionChat applicationId={applications[0].id} />
                            ) : (
                                <div className="h-full flex items-center justify-center p-8">
                                    <p className="text-slate-400">Start an application to chat.</p>
                                </div>
                            )}
                        </div>
                    )}


                    {activeTab === 'meetings' && (
                        <div className="max-w-4xl mx-auto space-y-8">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">My Meetings</h2>
                            {applications.filter(a => a.meeting_link && a.meeting_time).length === 0 ? (
                                <div className="bg-white dark:bg-slate-900 p-12 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-center shadow-lg dark:shadow-none">
                                    <Video className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                                    <p className="text-slate-400 dark:text-slate-500 font-medium">No meetings scheduled yet.</p>
                                    <p className="text-xs text-slate-300 dark:text-slate-600 mt-2">We will notify you when a consultant schedules a meeting.</p>
                                </div>
                            ) : (
                                applications.map(app => {
                                    if (!app.meeting_link || !app.meeting_time) return null;
                                    const isLive = new Date() >= new Date(app.meeting_time);

                                    return (
                                        <div key={app.id} className={`border px-8 py-6 rounded-[2rem] shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300 ${isLive
                                            ? 'bg-rose-600 border-rose-500 text-white shadow-rose-200'
                                            : 'bg-slate-900 border-slate-800 text-white shadow-slate-200'
                                            }`}>
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 "></div>

                                            <div className="flex items-center gap-6 relative z-10">
                                                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 relative">
                                                    <Video className="w-8 h-8 text-white" />
                                                    {isLive && (
                                                        <span className="absolute top-0 right-0 flex h-4 w-4 -mt-1 -mr-1">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-xl tracking-tight mb-1 flex items-center gap-2">
                                                        {isLive ? '🔴 Live Meeting' : 'Upcoming Meeting'}
                                                    </h3>
                                                    <p className={`font-medium flex items-center gap-2 ${isLive ? 'text-rose-100' : 'text-slate-300'}`}>
                                                        <Calendar className="w-4 h-4" />
                                                        {format(new Date(app.meeting_time), 'MMMM d, yyyy')} at {format(new Date(app.meeting_time), 'HH:mm')}
                                                    </p>
                                                    {app.meeting_info && (
                                                        <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 text-sm ${isLive ? 'bg-rose-700/30 border border-rose-500/30' : 'bg-slate-800/50 border border-slate-700/50'}`}>
                                                            <Info className="w-4 h-4 mt-0.5 shrink-0 opacity-70" />
                                                            <p className="opacity-90 leading-snug">{app.meeting_info}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => window.open(app.meeting_link, '_blank')}
                                                className={`px-8 py-6 rounded-xl font-bold text-lg shadow-lg transition-all hover:scale-105 active:scale-95 relative z-10 w-full md:w-auto ${isLive
                                                    ? 'bg-white text-rose-600 hover:bg-rose-50 shadow-rose-900/20'
                                                    : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-900/50'
                                                    }`}
                                            >
                                                {isLive ? 'Join Now!' : 'Join Meeting'} <ExternalLink className="w-5 h-5 ml-2" />
                                            </Button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {activeTab === 'offers' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* Offers Banner */}
                            {offers.length > 0 && (
                                <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 text-slate-900 dark:text-white px-6 py-4 rounded-xl shadow-sm flex items-center gap-4">
                                    <Mail className="w-8 h-8 text-slate-700 dark:text-slate-300" />
                                    <div>
                                        <h3 className="font-bold text-lg">You have received {offers.length} reply!</h3>
                                    </div>
                                </div>
                            )}

                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">My Offers</h2>
                            {offers.length === 0 ? (
                                <div className="bg-white dark:bg-slate-900 p-12 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-center shadow-lg dark:shadow-none">
                                    <Gift className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                                    <p className="text-slate-400 dark:text-slate-500 font-medium">No offers received yet.</p>
                                    <p className="text-xs text-slate-300 dark:text-slate-600 mt-2">Your application is being processed.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {offers.map(offer => (
                                        <div key={offer.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                                    <Gift className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white">{offer.title}</h3>
                                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                        Received {offer.created_at && format(new Date(offer.created_at), 'MMM d, yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="secondary"
                                                onClick={async () => {
                                                    setSelectedOffer(offer);
                                                    if (!offer.is_read) {
                                                        await (supabase as any).from('admission_offers').update({ is_read: true }).eq('id', offer.id);
                                                        fetchData();
                                                    }
                                                }}
                                                className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800/30 font-bold text-xs px-6 rounded-xl"
                                            >
                                                View Details
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Task Detail Modal */}
                <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>{selectedTask?.title}</DialogTitle>
                            <DialogDescription>
                                Please select the status that best describes your situation regarding this requirement.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-6 space-y-6">
                            <RadioGroup value={taskOption} onValueChange={setTaskOption}>
                                {(function () {
                                    const options = {
                                        passport: [
                                            { value: 'not_taken', label: 'I do not have my passport yet' },
                                            { value: 'attached', label: 'I have attached my passport' }
                                        ],
                                        academic_transcripts: [
                                            { value: 'attached', label: 'Transcripts submitted' }
                                        ],
                                        degree_certificate: [
                                            { value: 'not_taken', label: 'I do not have my degree yet' },
                                            { value: 'final_year', label: 'I am in my final year' },
                                            { value: 'not_needed', label: 'I am applying for bachelors (degree not needed)' },
                                            { value: 'attached', label: 'I have attached my degree certificate' }
                                        ],
                                        cv: [
                                            { value: 'attached', label: 'I have attached my CV / Resume' }
                                        ],
                                        english_proficiency: [
                                            { value: 'not_taken', label: 'I have NOT yet taken this test / obtained this document' },
                                            { value: 'waiting', label: 'I have taken a language test and I am waiting for the results' },
                                            { value: 'not_needed', label: 'I do not need to take a language test (e.g. I am a native speaker)' },
                                            { value: 'attached', label: 'I have attached sufficient proof of my English level' },
                                            { value: 'registered', label: 'I have registered for a language test' }
                                        ],
                                        sop: [
                                            { value: 'attached', label: 'I have attached my SOP' }
                                        ]
                                    };

                                    // Fallback for custom tasks created by consultant
                                    const defaultOptions = [
                                        { value: 'not_taken', label: 'I have not completed this yet' },
                                        { value: 'attached', label: 'I have completed this / Attached proof' }
                                    ];

                                    // Determine which options to show
                                    // Tasks from 'mandatoryDocs' have an 'id' that matches the keys above.
                                    // Custom tasks might have a UUID.
                                    const currentOptions = (selectedTask?.id && options[selectedTask.id as keyof typeof options])
                                        ? options[selectedTask.id as keyof typeof options]
                                        : defaultOptions;

                                    return currentOptions.map((opt) => (
                                        <div key={opt.value} className="flex items-center space-x-2">
                                            <RadioGroupItem value={opt.value} id={opt.value} />
                                            <Label htmlFor={opt.value} className={opt.value === 'attached' ? "font-bold text-slate-900" : "font-normal text-slate-700"}>
                                                {opt.label}
                                            </Label>
                                        </div>
                                    ));
                                })()}
                            </RadioGroup>

                            {taskOption === 'attached' && applications.length > 0 && (selectedTask?.type === 'missing_doc' || selectedTask?.type === 'task') && (
                                <div className="border-t border-slate-100 pt-6 animate-in fade-in slide-in-from-top-2">
                                    <Label className="mb-2 block text-sm font-bold text-slate-900">Upload Document</Label>

                                    {/* Show existing files if resolved */}
                                    {selectedTask.files && selectedTask.files.length > 0 && (
                                        <div className="space-y-3 mb-6">
                                            {selectedTask.files.map((file: any) => (
                                                <div key={file.id} className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                                                            <FileText className="w-5 h-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-900 truncate">{file.file_name}</p>
                                                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Uploaded {format(new Date(file.created_at || new Date()), 'MMM d, HH:mm')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                if (file.file_path) handleDownload(file.file_path, file.file_name);
                                                            }}
                                                            className="h-8 w-8 p-0 border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => deleteDocument(file.id, file.file_path)}
                                                            className="h-8 w-8 p-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-lg"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="text-center">
                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-2">- Or -</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className={selectedTask.files && selectedTask.files.length > 0 ? "" : ""}>
                                        {selectedTask.files && selectedTask.files.length > 0 && (
                                            <Label className="mb-3 block text-xs font-bold text-slate-500 uppercase tracking-widest">Upload Another / Replace</Label>
                                        )}
                                        <DocumentUploader
                                            applicationId={applications[0]?.id}
                                            documentType={selectedTask.original_doc_type || selectedTask.id}
                                            label={selectedTask.title}
                                            onComplete={async () => {
                                                if (selectedTask.type === 'task') {
                                                    await supabase
                                                        .from('admission_tasks')
                                                        .update({ status: 'resolved' })
                                                        .eq('id', selectedTask.id);
                                                }
                                                fetchData();
                                                setSelectedTask(null);
                                                toast({ title: "Document Uploaded", description: "Requirement marked as resolved." });
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {taskOption !== 'attached' && (
                                <div className="flex justify-end pt-4">
                                    <Button onClick={handleTaskSubmit}>Save Response</Button>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Offer Detail Modal */}
                <Dialog open={!!selectedOffer} onOpenChange={(open) => !open && setSelectedOffer(null)}>
                    <DialogContent className="max-w-2xl p-0 overflow-hidden border-none bg-slate-50">
                        <DialogHeader className="p-8 bg-white border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                                    <Gift className="w-7 h-7" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">{selectedOffer?.title}</DialogTitle>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        Received on {selectedOffer && format(new Date(selectedOffer.created_at), 'MMMM d, yyyy')}
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="p-8 space-y-8">
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Message from ITALOSTUDY</h4>
                                <div className="prose prose-slate max-w-none">
                                    <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                                        {selectedOffer?.message || "No message provided."}
                                    </p>
                                </div>
                            </div>

                            {selectedOffer?.file_path && (
                                <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-200 flex items-center justify-between group transition-all hover:scale-[1.02]">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                                            <FileText className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold">Official Document</h4>
                                            <p className="text-indigo-100 text-xs">Download or view your official letter</p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleDownload(selectedOffer.file_path, selectedOffer.file_name)}
                                        className="bg-white text-indigo-600 hover:bg-indigo-50 font-black px-6 rounded-xl"
                                    >
                                        Download Letter
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-white border-t border-slate-100 flex justify-end">
                            <Button variant="ghost" onClick={() => setSelectedOffer(null)} className="font-bold text-slate-500 hover:text-slate-900">
                                Close
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

            </div>
        </Layout>
    );
}
