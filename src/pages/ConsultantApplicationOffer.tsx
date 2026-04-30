import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary";
import ConsultantApplicationLayout from "@/components/consultant/ConsultantApplicationLayout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Plus, ExternalLink, Trash2, Upload, Loader2, CheckCircle2, History } from "lucide-react";
import { format } from "date-fns";

export default function ConsultantApplicationOffer() {
    const { id } = useParams();
    const { toast } = useToast();
    const [offers, setOffers] = useState<any[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [newOffer, setNewOffer] = useState({ title: "Positive Feedback", message: "", file: null as File | null });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data } = await supabase
                .from('admission_offers')
                .select('*')
                .eq('application_id', id)
                .order('created_at', { ascending: false });
            setOffers(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const sendOffer = async () => {
        if (!newOffer.title) return;
        setIsUpdating(true);
        try {
            let filePath = null;
            if (newOffer.file) {
                const folder = `offers/${id}`;
                const result = await uploadToCloudinary(newOffer.file, folder);
                filePath = result.secure_url;
            }

            const { error } = await supabase.from('admission_offers').insert({
                application_id: id,
                consultant_id: (await supabase.auth.getUser()).data.user?.id,
                title: newOffer.title,
                message: newOffer.message,
                file_path: filePath,
                file_name: newOffer.file?.name
            });

            if (error) throw error;
            toast({ title: "Offer Sent!", description: "Student has been notified." });
            setNewOffer({ title: "Positive Feedback", message: "", file: null });
            fetchData();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const deleteOffer = async (offerId: string) => {
        if (!window.confirm("Are you sure you want to delete this offer?")) return;

        try {
            const { error } = await supabase
                .from('admission_offers')
                .delete()
                .eq('id', offerId);

            if (error) throw error;

            toast({ title: "Offer Deleted", description: "The offer has been removed." });
            fetchData();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    const handleDownload = async (url: string, fileName?: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName || 'offer-file';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Download failed:", err);
            window.open(url, '_blank');
        }
    };

    return (
        <ConsultantApplicationLayout activeTab="offer">
            <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Make <span className="text-indigo-600">Offer</span></h1>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                                <Gift className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">New Offer / Feedback</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Offer Title</Label>
                                <Input
                                    placeholder="e.g. Admission Letter, Scholarship Offer"
                                    value={newOffer.title}
                                    onChange={e => setNewOffer({ ...newOffer, title: e.target.value })}
                                    className="rounded-xl border-slate-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message (Optional)</Label>
                                <Textarea
                                    placeholder="Add a personalized message..."
                                    value={newOffer.message}
                                    onChange={e => setNewOffer({ ...newOffer, message: e.target.value })}
                                    className="rounded-xl border-slate-200 min-h-[120px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attachment (PDF/Image)</Label>
                                <div className="relative group">
                                    <Input
                                        type="file"
                                        onChange={e => setNewOffer({ ...newOffer, file: e.target.files?.[0] || null })}
                                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                                    />
                                    <div className="border-2 border-dashed border-slate-100 rounded-xl p-4 flex items-center justify-center gap-2 group-hover:border-indigo-200 group-hover:bg-indigo-50/30 transition-all">
                                        <Upload className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500">
                                            {newOffer.file ? newOffer.file.name : "Select Document"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                onClick={sendOffer}
                                disabled={isUpdating}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-2xl shadow-lg shadow-indigo-100 mt-4"
                            >
                                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                Send Offer to Student
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm min-h-[400px]">
                            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-6 flex items-center gap-2">
                                <History className="w-5 h-5 text-indigo-400" />
                                Sent Offers
                            </h3>

                            {isLoading ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                </div>
                            ) : offers.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No offers sent yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {offers.map(offer => (
                                        <div key={offer.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 text-sm">{offer.title}</h4>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        Sent {format(new Date(offer.created_at), 'MMM d, yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {offer.file_path && (
                                                    <Button size="icon" variant="ghost" onClick={() => handleDownload(offer.file_path, offer.file_name)} className="text-slate-400 hover:text-indigo-600">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => deleteOffer(offer.id)}
                                                    className="text-slate-300 hover:text-red-500 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ConsultantApplicationLayout>
    );
}

