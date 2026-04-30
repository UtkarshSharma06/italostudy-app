
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Layout from "@/components/Layout";
import { StepReview } from "@/components/concierge/steps/StepReview";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, FileText, MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ApplicationDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [application, setApplication] = useState<any>(null);
    const [docs, setDocs] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");

    useEffect(() => {
        const checkSubscriptionTier = async () => {
            if (!user) return;

            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('subscription_tier, role, is_consultant')
                    .eq('id', user.id)
                    .single();

                // Allow admins and consultants to access regardless of tier
                if (profile?.role === 'admin' || profile?.role === 'sub_admin' || profile?.role === 'consultant' || profile?.is_consultant) {
                    return;
                }

                // Redirect non-Global users to upgrade page
                if (profile?.subscription_tier !== 'global') {
                    navigate('/apply-university/upgrade');
                }
            } catch (error) {
                console.error('Error checking subscription tier:', error);
            }
        };

        checkSubscriptionTier();
    }, [user, navigate]);

    useEffect(() => {
        if (!user || !id) return;

        const fetchData = async () => {
            try {
                // 1. Fetch Application Data
                const { data: appData, error: appError } = await supabase
                    .from('admission_applications')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (appError) throw appError;
                setApplication(appData);

                // 2. Fetch Docs
                const { data: docData, error: docError } = await supabase
                    .from('admission_documents')
                    .select('*')
                    .eq('application_id', id);

                if (docError) console.error("Doc fetch error:", docError); // Don't block page
                setDocs(docData || []);

                // 3. Fetch Messages
                const { data: msgData, error: msgError } = await supabase
                    .from('admission_messages')
                    .select('*')
                    .eq('application_id', id)
                    .order('created_at', { ascending: true });

                if (msgError) console.error("Msg fetch error:", msgError);
                setMessages(msgData || []);

            } catch (error) {
                console.error('Error loading details:', JSON.stringify(error));
                toast({
                    title: "Error",
                    description: "Could not load application details",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user, id]);

    const handleStatusUpdate = async (newStatus: string) => {
        try {
            const { error } = await supabase
                .from('admission_applications')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            toast({
                title: `Application ${newStatus === 'accepted' ? 'Approved' : 'Rejected'}`,
                description: `Student has been notified.`,
                className: newStatus === 'accepted' ? "bg-emerald-600 text-white border-0" : "bg-rose-600 text-white border-0"
            });

            // Refresh Data
            setApplication({ ...application, status: newStatus });
            navigate('/consultant/dashboard');
        } catch (error) {
            console.error('Update error:', error);
            toast({
                title: "Update Failed",
                variant: "destructive"
            });
        }
    };

    const handleSendMessage = async (text: string, isAction = false) => {
        if (!text.trim()) return;
        try {
            const { error } = await (supabase
                .from('admission_messages') as any)
                .insert({
                    application_id: id,
                    user_id: user?.id,
                    message: text,
                    is_from_consultant: true
                });

            if (error) throw error;

            // Optimistic update
            const newMsg = {
                message: text,
                is_from_consultant: true,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, newMsg]);
            setNewMessage("");

        } catch (error) {
            console.error('Send error:', error);
            toast({ title: "Failed to send message", variant: "destructive" });
        }
    };

    const handleDownload = async (filePath: string, fileName: string) => {
        try {
            if (filePath.startsWith('http')) {
                window.open(filePath, '_blank');
                return;
            }

            const { data, error } = await supabase.storage
                .from('admission-docs')
                .download(filePath);

            if (error) throw error;

            // Create download link
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Download error:', error);
            toast({
                title: "Download Failed",
                description: "Could not download file.",
                variant: "destructive"
            });
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            </Layout>
        );
    }

    if (!application) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-screen text-center">
                    <h1 className="text-2xl font-bold text-slate-900">Application Not Found</h1>
                    <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto px-6 py-12 max-w-5xl">
                <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    className="mb-6 hover:bg-slate-100 -ml-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </Button>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">
                            Student <span className="text-indigo-600">Review</span>
                        </h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                            Application ID: {id?.substring(0, 8)} • Status: {application.status}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold"
                            onClick={() => handleStatusUpdate('rejected')}
                        >
                            Reject Application
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200"
                            onClick={() => handleStatusUpdate('accepted')}
                        >
                            Approve & Accept
                        </Button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content: Reusing StepReview */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                            <StepReview formData={application.application_data || {}} />
                        </div>
                    </div>

                    {/* Sidebar: Documents */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-500" />
                                Documents
                            </h3>

                            {docs.length === 0 ? (
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center py-4">
                                    No documents uploaded
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {docs.map((doc) => (
                                        <div key={doc.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group hover:bg-indigo-50 transition-colors">
                                            <div className="overflow-hidden">
                                                <p className="font-bold text-slate-900 text-xs truncate">
                                                    {doc.document_type.replace('_', ' ').toUpperCase()}
                                                </p>
                                                <p className="text-[10px] text-slate-400 truncate">
                                                    {doc.file_name}
                                                </p>
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-white"
                                                onClick={() => handleDownload(doc.file_path, doc.file_name)}
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* CHAT & REQUESTS SECTION */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl flex flex-col h-[500px]">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-indigo-500" />
                                Consultant Chat
                            </h3>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                                {messages.length === 0 ? (
                                    <p className="text-center text-slate-300 text-xs font-bold uppercase tracking-widest py-10">
                                        No messages yet.
                                    </p>
                                ) : (
                                    messages.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.is_from_consultant ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium ${msg.is_from_consultant
                                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                                : 'bg-slate-100 text-slate-700 rounded-tl-none'
                                                }`}>
                                                {msg.message}
                                                <div className={`text-[9px] mt-1 font-bold uppercase tracking-wider ${msg.is_from_consultant ? 'text-indigo-200' : 'text-slate-400'
                                                    }`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="space-y-3">
                                {/* Quick Actions */}
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-[10px] font-bold uppercase tracking-wider h-7 whitespace-nowrap border-amber-200 text-amber-700 hover:bg-amber-50"
                                        onClick={() => {
                                            const docName = prompt("What document do you need? (e.g. Passport, Transcript)");
                                            if (docName) {
                                                handleSendMessage(`ACTION REQUIRED: Please upload your ${docName}`, true);
                                                handleStatusUpdate('documents_required');
                                            }
                                        }}
                                    >
                                        Request Document
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-[10px] font-bold uppercase tracking-wider h-7 whitespace-nowrap"
                                        onClick={() => handleSendMessage("We received your documents. Proceeding to review.")}
                                    >
                                        Ack Receipt
                                    </Button>
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(newMessage)}
                                    />
                                    <Button
                                        size="icon"
                                        className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                                        onClick={() => handleSendMessage(newMessage)}
                                        disabled={!newMessage.trim()}
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
