import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
    MessageCircle, X, ChevronRight, Send, MessageSquare, ArrowLeft, Loader2, Clock, 
    MoreHorizontal, Headphones, Plus, ClipboardList, Mail, ShieldCheck 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Topic {
    id: string;
    question: string;
    answer: string;
}

interface Ticket {
    id: string;
    subject: string;
    status: 'open' | 'closed';
    has_unread_admin_reply: boolean;
    created_at: string;
}

interface Message {
    id: string;
    message: string;
    sender_type: 'user' | 'admin';
    created_at: string;
}

export default function SupportWidget() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    
    const [view, setView] = useState<'main' | 'new-ticket' | 'topic-list' | 'topic-detail' | 'ticket-list' | 'ticket-detail'>('main');
    
    const [topics, setTopics] = useState<Topic[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
    
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    
    const [newSubject, setNewSubject] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const unreadCount = tickets.filter(t => t.has_unread_admin_reply && t.status === 'open').length;

    useEffect(() => {
        if (user) {
            fetchTopics();
            fetchTickets();
            
            const channel = supabase.channel('user_tickets')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${user.id}` }, () => {
                    fetchTickets();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user]);

    useEffect(() => {
        if (selectedTicket && view === 'ticket-detail') {
            fetchMessages(selectedTicket.id);
            markTicketAsRead(selectedTicket.id);
            
            const channel = supabase.channel(`ticket_messages_${selectedTicket.id}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${selectedTicket.id}` }, (payload) => {
                    setMessages(prev => [...prev, payload.new as Message]);
                    scrollToBottom();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [selectedTicket, view]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const fetchTopics = async () => {
        const { data } = await (supabase as any).from('support_topics').select('*').order('order', { ascending: true });
        if (data) setTopics(data);
    };

    const fetchTickets = async () => {
        if (!user) return;
        const { data } = await (supabase as any).from('support_tickets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data) setTickets(data);
    };

    const fetchMessages = async (ticketId: string) => {
        setIsMessagesLoading(true);
        const { data } = await (supabase as any).from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
        if (data) {
            setMessages(data);
            scrollToBottom();
        }
        setIsMessagesLoading(false);
    };

    const markTicketAsRead = async (ticketId: string) => {
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket?.has_unread_admin_reply) {
            await (supabase as any).from('support_tickets').update({ has_unread_admin_reply: false }).eq('id', ticketId);
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, has_unread_admin_reply: false } : t));
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubject.trim() || !newMessage.trim() || !user) return;
        setIsSending(true);
        
        const { data: ticketData, error: ticketError } = await (supabase as any)
            .from('support_tickets')
            .insert([{ user_id: user.id, subject: newSubject.trim() }])
            .select()
            .single();
            
        if (ticketError) {
            toast({ variant: 'destructive', title: 'Error', description: ticketError.message });
            setIsSending(false);
            return;
        }

        const { error: msgError } = await (supabase as any)
            .from('support_messages')
            .insert([{ ticket_id: ticketData.id, sender_id: user.id, sender_type: 'user', message: newMessage.trim() }]);

        setIsSending(false);
        if (msgError) {
            toast({ variant: 'destructive', title: 'Error', description: msgError.message });
        } else {
            setNewSubject('');
            setNewMessage('');
            setSelectedTicket(ticketData);
            setView('ticket-detail');
            fetchTickets();
        }
    };

    const handleReplyTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !selectedTicket) return;
        setIsSending(true);
        
        const { error } = await (supabase as any)
            .from('support_messages')
            .insert([{ ticket_id: selectedTicket.id, sender_id: user.id, sender_type: 'user', message: newMessage.trim() }]);

        setIsSending(false);
        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } else {
            setNewMessage('');
        }
    };

    if (!user) return null;

    return (
        <>
            {/* Popover content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 md:inset-auto md:bottom-24 md:right-6 w-full md:w-[380px] h-full md:h-[600px] md:max-h-[calc(100vh-120px)] bg-[#F8FAFC] md:bg-white md:rounded-3xl shadow-2xl shadow-indigo-900/10 md:border md:border-slate-100 overflow-hidden flex flex-col font-sans z-[100000]"
                    >
                        {/* Global Header for all views */}
                            <div className="bg-gradient-to-br from-[#7445F6] to-[#5123D8] px-5 pt-[env(safe-area-inset-top,20px)] pb-12 shrink-0 relative md:rounded-t-3xl z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        {view !== 'main' && (
                                            <ArrowLeft 
                                                className="w-5 h-5 text-white/90 cursor-pointer hover:text-white transition-colors" 
                                                onClick={() => {
                                                    if (view === 'topic-detail') setView('main');
                                                    else if (view === 'ticket-detail') setView('ticket-list');
                                                    else if (view === 'ticket-list' || view === 'new-ticket') setView('main');
                                                }} 
                                            />
                                        )}
                                        <div>
                                            <h3 className="font-bold text-[18px] text-white leading-tight">Support</h3>
                                            {view === 'main' && (
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span>
                                                    <p className="text-white/90 text-[12px] font-medium">We typically reply in a few hours</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <X className="w-5 h-5 text-white/90 hover:text-white transition-colors cursor-pointer" onClick={() => setIsOpen(false)} />
                                    </div>
                                </div>
                            </div>

                            {/* Overlapping Card - Moved OUTSIDE scroll container to prevent clipping */}
                            {view === 'main' && (
                                <div className="px-5 -mt-8 relative z-20 shrink-0">
                                    <div className="bg-white rounded-[20px] p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100/50 flex items-center gap-4">
                                        <div className="w-[42px] h-[42px] rounded-full bg-[#F5F3FF] flex items-center justify-center shrink-0">
                                            <Headphones className="w-[20px] h-[20px] text-[#5A32FA]" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#1E293B] text-[14px]">Need help?</p>
                                            <p className="text-[13px] text-[#64748B] font-medium mt-0.5">Our team is here to assist you.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto bg-white flex flex-col relative pb-0 scrollbar-hide z-0">
                                {/* Main Menu View */}
                                {view === 'main' && (
                                    <>
                                        {/* Start New Conversation Button */}
                                        <div className="px-5 mt-5 shrink-0">
                                            <Button 
                                                onClick={() => setView('new-ticket')}
                                                className="w-full bg-[#131B2B] hover:bg-[#1E293B] text-white rounded-[14px] h-[52px] text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                                            >
                                                <Plus className="w-[18px] h-[18px] stroke-[2.5]" /> Start New Conversation
                                            </Button>
                                        </div>

                                        {/* Your Tickets Section */}
                                        <div className="px-5 mt-7 shrink-0">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-bold text-[#1E293B] text-[16px]">Your Tickets</h4>
                                                <button onClick={() => setView('ticket-list')} className="text-[12px] font-bold text-[#475569] hover:text-[#1E293B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors px-3 py-1 rounded-full">
                                                    View all
                                                </button>
                                            </div>
                                            
                                            <div className="bg-[#FCFBFF] rounded-[24px] border border-[#F1EDFD] p-8 flex flex-col items-center justify-center text-center">
                                                {tickets.length === 0 ? (
                                                    <>
                                                        <MessageSquare className="w-10 h-10 text-[#C4B5FD] mb-4 opacity-90 stroke-[1.5]" />
                                                        <p className="font-bold text-[#1E293B] text-[14px] mb-1.5">No messages yet</p>
                                                        <p className="text-[13px] font-medium text-[#64748B] leading-relaxed max-w-[200px]">
                                                            Start a conversation and we'll get back to you soon.
                                                        </p>
                                                    </>
                                                ) : (
                                                    <div className="w-full text-left space-y-3">
                                                        {tickets.slice(0, 2).map(ticket => (
                                                            <div 
                                                                key={ticket.id}
                                                                onClick={() => { setSelectedTicket(ticket); setView('ticket-detail'); }}
                                                                className="flex items-center justify-between cursor-pointer group bg-white p-3 rounded-[16px] border border-slate-100 shadow-sm"
                                                            >
                                                                <div className="min-w-0 flex-1 pr-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-semibold text-[13px] text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{ticket.subject}</span>
                                                                        {ticket.has_unread_admin_reply && ticket.status === 'open' && (
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                                        <span className={ticket.status === 'open' ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>{ticket.status === 'open' ? 'Open' : 'Closed'}</span> • {formatDistanceToNow(new Date(ticket.created_at))} ago
                                                                    </span>
                                                                </div>
                                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Popular Help Topics Section */}
                                        <div className="px-5 mt-7 shrink-0">
                                            <h4 className="font-bold text-[#64748B] text-[13px] mb-3">Popular Help Topics</h4>
                                            <div className="flex flex-col gap-2">
                                                {topics.map((topic, i) => (
                                                    <button 
                                                        key={topic.id}
                                                        onClick={() => { setSelectedTopic(topic); setView('topic-detail'); }}
                                                        className="w-full py-2.5 flex justify-between items-center group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-7 h-7 rounded-lg bg-[#F8FAFC] border border-slate-200 flex items-center justify-center shrink-0">
                                                                <ClipboardList className="w-[14px] h-[14px] text-slate-500 group-hover:text-[#5A32FA] transition-colors" />
                                                            </div>
                                                            <span className="text-[14px] font-semibold text-[#334155] group-hover:text-[#5A32FA] transition-colors">{topic.question}</span>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#5A32FA] transition-colors" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Contact Us Bottom Card */}
                                        <div className="px-5 mt-6 mb-6 shrink-0">
                                            <div className="bg-[#FCFBFF] rounded-[24px] p-5 border border-[#F1EDFD] flex items-center gap-4">
                                                <div className="w-[46px] h-[46px] rounded-full bg-[#F5F3FF] flex items-center justify-center shrink-0 border-[3px] border-white shadow-sm">
                                                    <Mail className="w-[20px] h-[20px] text-[#5A32FA]" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#1E293B] text-[14px] mb-0.5">Contact Us</p>
                                                    <p className="text-[13px] text-[#5A32FA] font-medium">contact@italostudy.com</p>
                                                    <p className="text-[12px] font-medium text-[#94A3B8] mt-0.5">We'll get back to you ASAP</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="mt-auto py-3.5 bg-[#F8FAFC] flex items-center justify-center gap-1.5 border-t border-slate-100 shrink-0">
                                            <ShieldCheck className="w-3.5 h-3.5 text-[#5A32FA]" />
                                            <span className="text-[12px] font-semibold text-[#94A3B8]">Powered by ItaloStudy Support</span>
                                        </div>
                                    </>
                                )}

                                {/* Other Views */}
                                {view === 'new-ticket' && (
                                    <form onSubmit={handleCreateTicket} className="flex flex-col h-full bg-white -mt-4 relative z-10 rounded-t-3xl pt-2">
                                        <div className="p-5 flex-1 overflow-y-auto space-y-4">
                                            <h3 className="font-bold text-slate-900 text-lg mb-2">New Conversation</h3>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Subject</label>
                                                <Input 
                                                    value={newSubject}
                                                    onChange={e => setNewSubject(e.target.value)}
                                                    placeholder="Brief summary of your issue..."
                                                    className="rounded-xl border-slate-200 bg-slate-50 h-11 focus-visible:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">How can we help?</label>
                                                <Textarea 
                                                    value={newMessage}
                                                    onChange={e => setNewMessage(e.target.value)}
                                                    placeholder="Provide details so we can assist you better..."
                                                    className="rounded-xl border-slate-200 bg-slate-50 min-h-[140px] resize-none focus-visible:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="p-5 pt-2 border-t border-slate-50 shrink-0">
                                            <Button type="submit" className="w-full rounded-xl h-[48px] bg-[#6344d4] hover:bg-[#512da8] font-semibold" disabled={isSending || !newSubject.trim() || !newMessage.trim()}>
                                                {isSending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                                Send Message
                                            </Button>
                                        </div>
                                    </form>
                                )}

                                {view === 'ticket-list' && (
                                    <div className="flex-1 overflow-y-auto bg-white -mt-4 relative z-10 rounded-t-3xl pt-4">
                                        <div className="px-5 mb-4"><h3 className="font-bold text-slate-900 text-lg">Your Tickets</h3></div>
                                        {tickets.length === 0 ? (
                                            <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                                                <MessageSquare className="w-10 h-10 mb-4 opacity-30" />
                                                <p className="text-sm font-medium">You haven't started any conversations yet.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-50 px-2">
                                                {tickets.map(ticket => (
                                                    <button 
                                                        key={ticket.id}
                                                        onClick={() => { setSelectedTicket(ticket); setView('ticket-detail'); }}
                                                        className="w-full p-4 text-left hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between gap-4 group"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-semibold text-sm text-slate-900 truncate">{ticket.subject}</span>
                                                                {ticket.has_unread_admin_reply && ticket.status === 'open' && (
                                                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                                                <span className={`px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                                                                    ticket.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                                                }`}>
                                                                    {ticket.status}
                                                                </span>
                                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(ticket.created_at))} ago</span>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {view === 'ticket-detail' && selectedTicket && (
                                    <div className="flex flex-col h-full bg-slate-50/50 -mt-4 relative z-10 rounded-t-3xl overflow-hidden">
                                        <div className="bg-white px-5 py-4 border-b border-slate-100 shadow-sm z-10 shrink-0">
                                            <h4 className="font-bold text-slate-900 text-sm truncate">{selectedTicket.subject}</h4>
                                            <span className="text-[10px] text-slate-500 font-medium">Started {formatDistanceToNow(new Date(selectedTicket.created_at))} ago</span>
                                        </div>
                                        
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {isMessagesLoading ? (
                                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                                            ) : (
                                                messages.map((msg) => {
                                                    const isUser = msg.sender_type === 'user';
                                                    return (
                                                        <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`max-w-[85%] rounded-[20px] p-3.5 px-4 ${
                                                                isUser 
                                                                ? 'bg-[#6344d4] text-white rounded-tr-[4px]' 
                                                                : 'bg-white border border-slate-100 rounded-tl-[4px] shadow-sm text-slate-800'
                                                            }`}>
                                                                <div className={`text-[13px] whitespace-pre-wrap leading-relaxed ${isUser ? '[&_p]:text-white [&_math]:text-white' : '[&_p]:text-slate-800'}`}>
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {msg.message}
        </ReactMarkdown>
    </div>
                                                                <span className={`text-[9px] font-medium mt-1 block text-right ${isUser ? 'opacity-80' : 'text-slate-400'}`}>
                                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>
                                        
                                        <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                                            {selectedTicket.status === 'closed' ? (
                                                <div className="text-center text-xs font-medium text-slate-500 py-2">
                                                    This conversation has been closed.
                                                </div>
                                            ) : (
                                                <form onSubmit={handleReplyTicket} className="flex gap-2 items-end">
                                                    <Textarea 
                                                        value={newMessage}
                                                        onChange={e => setNewMessage(e.target.value)}
                                                        placeholder="Type your message..."
                                                        className="resize-none rounded-xl min-h-[48px] text-[13px] border-slate-200 focus-visible:ring-indigo-500 py-3"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleReplyTicket(e);
                                                            }
                                                        }}
                                                    />
                                                    <Button type="submit" size="icon" className="h-[48px] w-[48px] rounded-xl shrink-0 bg-[#6344d4] hover:bg-[#512da8]" disabled={isSending || !newMessage.trim()}>
                                                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                    </Button>
                                                </form>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {view === 'topic-list' && (
                                    <div className="flex-1 overflow-y-auto bg-white -mt-4 relative z-10 rounded-t-3xl pt-4">
                                        <div className="px-5 mb-4"><h3 className="font-bold text-slate-900 text-lg">Help Topics</h3></div>
                                        <div className="divide-y divide-slate-50 px-2">
                                            {topics.map(topic => (
                                                <button 
                                                    key={topic.id}
                                                    onClick={() => { setSelectedTopic(topic); setView('topic-detail'); }}
                                                    className="w-full p-4 text-left hover:bg-slate-50 rounded-xl transition-colors flex justify-between items-center group"
                                                >
                                                    <span className="text-[13px] font-semibold text-slate-700 group-hover:text-indigo-600 pr-4">{topic.question}</span>
                                                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 group-hover:text-indigo-500" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {view === 'topic-detail' && selectedTopic && (
                                    <div className="flex-1 overflow-y-auto bg-white -mt-4 relative z-10 rounded-t-3xl pt-6 px-6 space-y-4">
                                        <h2 className="text-[17px] font-bold text-slate-900 leading-snug">{selectedTopic.question}</h2>
                                        <div className="w-10 h-1 bg-indigo-100 rounded-full" />
                                        <p className="text-[14px] text-slate-600 whitespace-pre-wrap leading-relaxed font-medium">
                                            {selectedTopic.answer}
                                        </p>
                                        
                                        <div className="pt-8 mt-8 text-center pb-6">
                                            <p className="text-xs font-semibold text-slate-500 mb-3">Still need help?</p>
                                            <Button variant="outline" className="w-full rounded-xl text-[13px] h-10 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50" onClick={() => setView('new-ticket')}>
                                                Contact Support
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            
            {/* Floating Button */}
            <div className="fixed bottom-[100px] right-4 md:bottom-6 md:right-6 z-[9999]">
                <div className="relative">
                    <Button 
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#5A32FA] hover:bg-[#4d28d8] text-white shadow-xl shadow-indigo-600/30 transition-transform hover:scale-105 p-0 border-none"
                    >
                        {isOpen ? <X className="w-6 h-6" /> : <Headphones className="w-6 h-6" />}
                    </Button>
                    
                    {!isOpen && unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                            {unreadCount}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
