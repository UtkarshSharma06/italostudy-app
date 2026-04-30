import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Layout from "@/components/Layout";
import { StepReview } from "@/components/concierge/steps/StepReview";

import { DocumentUploader } from "@/components/concierge/DocumentUploader";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, FileText, CheckCircle2, AlertCircle, Clock, Edit } from "lucide-react";

export default function StudentApplicationStatus() {
    const { id } = useParams();
    const { user, profile } = useAuth();
    const navigate = useNavigate();

    const [application, setApplication] = useState<any>(null);
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Check subscription tier and redirect if not Global
    useEffect(() => {
        const checkAccess = async () => {
            if (!user) return;

            // Use context profile if available
            const currentProfile = (profile as any);

            if (currentProfile?.role === 'admin' || currentProfile?.role === 'sub_admin' || currentProfile?.role === 'consultant' || currentProfile?.is_consultant ||
                currentProfile?.subscription_tier === 'global' || currentProfile?.selected_plan === 'global') {
                return;
            }

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

                navigate('/apply-university/upgrade');
            } catch (error) {
                console.error('Error checking subscription tier:', error);
            }
        };

        checkAccess();
    }, [user, profile, navigate]);

    useEffect(() => {
        if (!user || !id) return;
        fetchData();

        // Realtime subscription for status updates
        const sub = supabase
            .channel(`app_status:${id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'admission_applications',
                filter: `id=eq.${id}`
            }, (payload) => {
                setApplication(prev => ({ ...prev, ...payload.new }));
            })
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, [user, id]);

    const fetchData = async () => {
        try {
            const [appRes, docRes] = await Promise.all([
                supabase.from('admission_applications').select('*').eq('id', id).single(),
                supabase.from('admission_documents').select('*').eq('application_id', id)
            ]);

            if (appRes.error) throw appRes.error;
            setApplication(appRes.data);
            setDocuments(docRes.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUploadComplete = async () => {
        // Should we assume that if they uploaded something, they addressed the requirement?
        // Updating to 'under_review' will hide the "Action Required" box.
        const { error } = await supabase
            .from('admission_applications')
            .update({ status: 'under_review' })
            .eq('id', id);

        if (error) {
            console.error("Failed to update status:", error);
        }

        fetchData();
    };

    if (isLoading) return <Layout><div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div></Layout>;
    if (!application) return <Layout><div className="text-center py-20">Application not found</div></Layout>;

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'accepted': return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900';
            case 'rejected': return 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900';
            case 'documents_required': return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900';
            default: return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800';
        }
    };

    return (
        <Layout>
            <div className="container mx-auto px-6 py-12 max-w-5xl">
                <Button variant="ghost" onClick={() => navigate('/apply-university')} className="mb-6 -ml-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Apply University
                </Button>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Col: Status & Chat */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Status Card */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl dark:shadow-none">
                            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Current Status</h2>
                            <div className={`p-4 rounded-xl border ${getStatusColor(application.status)} flex items-center gap-3`}>
                                {application.status === 'accepted' ? <CheckCircle2 className="w-6 h-6" /> :
                                    application.status === 'documents_required' ? <AlertCircle className="w-6 h-6" /> :
                                        <Clock className="w-6 h-6" />}
                                <div>
                                    <p className="font-black text-sm uppercase">{application.status.replace('_', ' ')}</p>
                                    <p className="text-[10px] font-bold opacity-80">Last updated: {new Date(application.updated_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Documents Section */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl dark:shadow-none">
                            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                                <span>Uploaded Documents</span>
                                <span className="text-indigo-600 dark:text-indigo-400">{documents.length}</span>
                            </h2>

                            <div className="space-y-3 mb-6">
                                {documents.map(doc => (
                                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{doc.document_type.replace('_', ' ').toUpperCase()}</p>
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{doc.file_name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* UPLOAD AREA - Only if Documents Required */}
                            {application.status === 'documents_required' && (
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                    <p className="text-xs font-bold text-amber-700 mb-3 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> Action Required
                                    </p>
                                    <DocumentUploader
                                        applicationId={id!}
                                        documentType="additional_docs"
                                        label="Upload Requested Records"
                                        onComplete={handleUploadComplete}
                                    />
                                </div>
                            )}
                        </div>


                    </div>

                    {/* Right Col: Application Review */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl dark:shadow-none">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">Application Summary</h2>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/apply-university/apply/${id}`)}
                                    className="rounded-xl font-bold border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-700"
                                >
                                    <Edit className="w-4 h-4 mr-2" /> Edit Application
                                </Button>
                            </div>
                            <StepReview formData={application.application_data || {}} />
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
