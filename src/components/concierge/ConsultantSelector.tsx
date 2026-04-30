import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getOptimizedImageUrl } from "@/lib/image-optimizer";

interface Consultant {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    role: string;
}

interface ConsultantSelectorProps {
    onSelect: (consultantId: string) => void;
    selectedId?: string;
}

export function ConsultantSelector({ onSelect, selectedId }: ConsultantSelectorProps) {
    const [consultants, setConsultants] = useState<Consultant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchConsultants = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, avatar_url, role, is_consultant')
                    .or('role.eq.consultant,is_consultant.eq.true');

                if (error) throw error;
                setConsultants(data || []);
            } catch (error) {
                console.error('Error fetching consultants:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConsultants();
    }, []);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
            </div>
        );
    }

    if (consultants.length === 0) {
        return (
            <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">No active consultants available.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {consultants.map((consultant) => (
                <div
                    key={consultant.id}
                    onClick={() => onSelect(consultant.id)}
                    className={`relative cursor-pointer group p-6 rounded-3xl border transition-all duration-300 ${selectedId === consultant.id
                        ? 'bg-indigo-50 border-indigo-200 shadow-xl shadow-indigo-100/50 scale-[1.02]'
                        : 'bg-white border-slate-100 hover:border-indigo-100 hover:shadow-lg hover:-translate-y-1'
                        }`}
                >
                    {selectedId === consultant.id && (
                        <div className="absolute top-4 right-4 text-indigo-600 bg-white rounded-full p-1 shadow-sm">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    )}

                    <div className="flex flex-col items-center text-center space-y-4">
                        <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                            <AvatarImage src={getOptimizedImageUrl(consultant.avatar_url, 128, 128)} />
                            <AvatarFallback className="bg-slate-100 text-slate-400 font-bold">
                                {consultant.full_name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        <div>
                            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">
                                {consultant.full_name}
                            </h3>
                            <div className="flex items-center justify-center gap-1.5 mt-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                                    Certified Consultant
                                </p>
                            </div>
                        </div>

                        <Button
                            variant={selectedId === consultant.id ? "default" : "outline"}
                            className={`w-full rounded-xl font-black text-[10px] uppercase tracking-widest ${selectedId === consultant.id ? "bg-indigo-600 hover:bg-indigo-700" : "border-slate-200"
                                }`}
                        >
                            {selectedId === consultant.id ? "Selected" : "Select Consultant"}
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
