import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StepReview } from "@/components/concierge/steps/StepReview";
import { DocumentUploader } from "@/components/concierge/DocumentUploader";
import { Button } from "@/components/ui/button";
import {
    Loader2, ArrowLeft, FileText, CheckCircle2,
    AlertCircle, Clock, Edit, Landmark,
    Calendar, ShieldCheck, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import MobileLayout from '../components/MobileLayout';

export default function MobileStudentApplicationStatus() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [application, setApplication] = useState<any>(null);
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || !id) return;
        fetchData();

        const sub = supabase
            .channel(`mobile_app_status:${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admission_applications', filter: `id=eq.${id}` }, (payload) => {
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
            setApplication(appRes.data);
            setDocuments(docRes.data || []);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUploadComplete = () => {
        fetchData();
        toast({ title: "Authorized", description: "Intelligence records updated." });
    };

    const getStatusConfig = (status: string) => {
        const configs: any = {
            pending: { label: "Initialized", color: "text-amber-500", bg: "bg-amber-500/10", icon: Clock },
            processing: { label: "Synchronizing", color: "text-indigo-500", bg: "bg-indigo-500/10", icon: Loader2 },
            documents_required: { label: "Assets Needed", color: "text-rose-500", bg: "bg-rose-500/10", icon: AlertCircle },
            submitted: { label: "Transmitted", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: ShieldCheck },
            approved: { label: "Authorized", color: "text-emerald-600", bg: "bg-emerald-600/20", icon: CheckCircle2 },
            rejected: { label: "Redacted", color: "text-red-500", bg: "bg-red-500/10", icon: AlertCircle }
        };
        return configs[status] || configs.pending;
    };

    if (isLoading || !application) {
        return <MobileLayout isLoading={true}><div className="flex items-center justify-center min-h-screen text-indigo-500"><Loader2 className="animate-spin" /></div></MobileLayout>;
    }

    const s = getStatusConfig(application.status || 'pending');

    return (
        <MobileLayout isLoading={isLoading} hideHeader={true}>
            <div className="flex flex-col min-h-screen bg-background pb-32 animate-in fade-in duration-500">
            {/* Native Header */}
            <header className="p-6 pt-10 sticky top-0 bg-background/80 backdrop-blur-xl z-50 border-b border-border/40">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/apply-university')} className="p-2 -ml-2"><ArrowLeft /></button>
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Protocol Status</h2>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">Mission Code: {id?.substring(0, 8)}</p>
                    </div>
                </div>
            </header>

            <main className="px-6 pt-8 space-y-8">
                {/* Live Status Card */}
                <div className={cn("p-8 rounded-[2.5rem] border shadow-2xl shadow-black/5 relative overflow-hidden", s.bg, "border-none")}>
                    <div className="absolute top-0 right-0 p-8 opacity-10"><s.icon size={80} /></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-4">Current Intelligence</p>
                    <h3 className={cn("text-3xl font-black uppercase tracking-tighter mb-2", s.color)}>{s.label}</h3>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Sync Time: {new Date(application.updated_at).toLocaleDateString()}</p>

                    {application.status === 'documents_required' && (
                        <div className="mt-8 p-6 bg-background/50 backdrop-blur-sm rounded-3xl border border-amber-500/20">
                            <DocumentUploader
                                applicationId={id!}
                                documentType="additional_docs"
                                label="Upload Required Records"
                                onComplete={handleUploadComplete}
                            />
                        </div>
                    )}
                </div>

                {/* Tactical Summary */}
                <section>
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">Briefing Summary</h4>
                        <button
                            onClick={() => navigate(`/apply-university/apply/${id}`)}
                            className="text-[9px] font-black text-primary uppercase tracking-widest"
                        >
                            Modify Profile
                        </button>
                    </div>
                    <div className="bg-secondary/10 rounded-[2.5rem] p-6 border border-border/40 shadow-inner">
                        <StepReview formData={application.application_data || {}} />
                    </div>
                </section>

                {/* Uploaded Assets */}
                <section>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50 mb-4 px-2">Localized Assets ({documents.length})</h4>
                    <div className="space-y-3">
                        {documents.map(doc => (
                            <div key={doc.id} className="flex items-center gap-4 p-4 bg-secondary/20 rounded-2xl border border-border/40 group active:scale-[0.98] transition-all">
                                <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center text-primary/40"><FileText size={18} /></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-tight truncate">{doc.document_type.replace('_', ' ')}</p>
                                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-40 truncate">{doc.file_name}</p>
                                </div>
                                <ChevronRight className="opacity-10" />
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            </div>
        </MobileLayout>
    );
}
