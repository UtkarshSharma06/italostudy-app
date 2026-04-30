import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Send,
    Users,
    MessageCircle,
    Loader2,
    Clock,
    ShieldCheck,
    Upload
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AdmissionChatProps {
    applicationId: string;
    isConsultant?: boolean;
}

export function AdmissionChat({ applicationId, isConsultant: propIsConsultant }: AdmissionChatProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isConsultant, setIsConsultant] = useState(!!propIsConsultant);
    const [counterpart, setCounterpart] = useState<{ name: string, role: string } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkRoleAndCounterpart = async () => {
            if (!user || !applicationId) return;

            // Fetch application and counterpart info
            const { data: appData } = await (supabase
                .from('admission_applications') as any)
                .select(`
                    user_id,
                    consultant_id
                `)
                .eq('id', applicationId)
                .single();

            if (!appData) return;

            // Determine my role and counterpart ID
            let currentIsConsultant = propIsConsultant;
            if (currentIsConsultant === undefined) {
                const { data: profile } = await (supabase.from('profiles') as any).select('role, is_consultant').eq('id', user.id).single();
                currentIsConsultant = profile?.role === 'consultant' || profile?.is_consultant || profile?.role === 'admin' || profile?.role === 'sub_admin';
                setIsConsultant(currentIsConsultant);
            }

            const counterpartId = currentIsConsultant ? appData.user_id : appData.consultant_id;

            if (counterpartId) {
                const { data: cpProfile } = await (supabase
                    .from('profiles') as any)
                    .select('first_name, last_name, role')
                    .eq('id', counterpartId)
                    .single();

                if (cpProfile) {
                    setCounterpart({
                        name: `${cpProfile.first_name || ''} ${cpProfile.last_name || ''}`.trim() || (currentIsConsultant ? "Student" : "Consultant"),
                        role: cpProfile.role
                    });
                }
            } else if (!currentIsConsultant) {
                setCounterpart({ name: "Assigning Consultant...", role: "system" });
            }
        };

        checkRoleAndCounterpart();
    }, [user, propIsConsultant, applicationId]);

    useEffect(() => {
        if (applicationId) {
            fetchMessages();
            markAsRead();

            const subscription = supabase
                .channel(`admission_messages:${applicationId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'admission_messages',
                    filter: `application_id=eq.${applicationId}`
                }, (payload) => {
                    setMessages(prev => [...prev, payload.new]);
                    markAsRead();
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'admission_messages',
                    filter: `application_id=eq.${applicationId}`
                }, () => fetchMessages())
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [applicationId, isConsultant]);

    const markAsRead = async () => {
        if (!applicationId) return;
        try {
            // Mark messages from the OTHER side as read
            const { error } = await (supabase
                .from('admission_messages') as any)
                .update({ is_read: true })
                .eq('application_id', applicationId)
                .eq('is_from_consultant', !isConsultant)
                .eq('is_read', false);

            if (error) throw error;
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('admission_messages')
                .select('*')
                .eq('application_id', applicationId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !user || isSending) return;

        setIsSending(true);
        try {
            const { error } = await (supabase
                .from('admission_messages') as any)
                .insert({
                    application_id: applicationId,
                    user_id: user.id,
                    message: newMessage.trim(),
                    is_from_consultant: isConsultant
                });

            if (error) throw error;
            setNewMessage("");
        } catch (err) {
            console.error('Error sending message:', err);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="bg-slate-50/30 dark:bg-slate-950/30 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-lg dark:shadow-none">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1.5 uppercase tracking-tight">
                            {counterpart?.name || (isConsultant ? "Student" : "Consultant")}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-full border border-emerald-100 dark:border-emerald-900">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Online
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-800">
                                {counterpart?.role || "Team"}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors">
                        <Clock className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
            >
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secure Channel Encrypting...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-6">
                        <div className="w-24 h-24 bg-gradient-to-tr from-indigo-50 dark:from-indigo-950/30 to-white dark:to-slate-900 rounded-[2.5rem] flex items-center justify-center border border-indigo-100 dark:border-indigo-900 shadow-inner dark:shadow-none">
                            <MessageCircle className="w-10 h-10 text-indigo-200 dark:text-indigo-900 animate-pulse" />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider mb-2">Initialize Communication</h4>
                            <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                Our platform uses mission-critical encryption. Type below to begin your consultation protocol.
                            </p>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        const isMe = isConsultant ? msg.is_from_consultant : (!msg.is_from_consultant && msg.user_id === user?.id);
                        return (
                            <div key={i} className={cn(
                                "flex flex-col group",
                                isMe ? "items-end" : "items-start"
                            )}>
                                <div className={cn(
                                    "max-w-[80%] p-4 rounded-[1.5rem] text-[13px] font-medium leading-relaxed transition-all duration-300",
                                    isMe
                                        ? "bg-slate-900 dark:bg-indigo-600 text-white rounded-tr-none shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-1"
                                        : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-1"
                                )}>
                                    {msg.message}
                                </div>
                                <div className={cn(
                                    "flex items-center gap-2 mt-2 px-2 transition-opacity duration-300",
                                    "opacity-40 group-hover:opacity-100"
                                )}>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                        {format(new Date(msg.created_at), 'HH:mm')}
                                    </span>
                                    {isMe && (
                                        <div className={cn(
                                            "w-3 h-3 rounded-full flex items-center justify-center",
                                            msg.is_read ? "text-indigo-500" : "text-slate-200"
                                        )}>
                                            <ShieldCheck className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-t border-slate-100 dark:border-slate-800">
                <form onSubmit={handleSend} className="relative group">
                    <div className="absolute inset-0 bg-indigo-600/5 rounded-2xl blur-xl group-focus-within:bg-indigo-600/10 transition-all duration-500"></div>
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Secure message..."
                        className="relative h-16 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-2xl pl-6 pr-20 text-sm font-bold shadow-lg shadow-slate-100/50 dark:shadow-none text-slate-900 dark:text-white focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all"
                        disabled={isSending}
                    />
                    <div className="absolute right-2 top-2 bottom-2 flex items-center pr-1">
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!newMessage.trim() || isSending}
                            className={cn(
                                "h-12 w-12 rounded-xl shadow-lg transition-all duration-300 active:scale-90",
                                newMessage.trim()
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
                            )}
                        >
                            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </Button>
                    </div>
                </form>
                <div className="mt-4 flex justify-center">
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">End-to-End Encrypted Node: Admission-v2</p>
                </div>
            </div>
        </div>
    );
}
