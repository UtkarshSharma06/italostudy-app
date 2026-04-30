import { useParams } from "react-router-dom";
import ConsultantApplicationLayout from "@/components/consultant/ConsultantApplicationLayout";
import { AdmissionChat } from "@/components/concierge/AdmissionChat";
import { MessageCircle } from "lucide-react";

export default function ApplicationChatPage() {
    const { id } = useParams();

    return (
        <ConsultantApplicationLayout activeTab="messages">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Student <span className="text-indigo-600">Messages</span></h1>
                        <p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-2">
                            <MessageCircle className="w-3.5 h-3.5" />
                            Direct secure communication with the applicant
                        </p>
                    </div>
                </div>

                <div className="h-[700px] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                    <div className="flex-1 overflow-hidden">
                        <AdmissionChat applicationId={id!} isConsultant={true} />
                    </div>
                </div>
            </div>
        </ConsultantApplicationLayout>
    );
}
