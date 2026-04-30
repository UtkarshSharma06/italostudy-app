import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Message {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles?: {
        display_name: string;
        avatar_url: string;
    };
}

interface SessionChatProps {
    sessionId: string;
    isLocked: boolean;
}

export default function SessionChat({ sessionId, isLocked }: SessionChatProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const formatDisplayName = (name: string | undefined | null) => {
        if (!name) return 'User';
        // Return only the first name (first word)
        return name.split(' ')[0];
    };

    useEffect(() => {
        fetchMessages();

        // Initializing secure chat channel
        const channel = (supabase as any)
            .channel(`session_chat:${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'session_messages',
                    filter: `session_id=eq.${sessionId}`,
                },
                async (payload: any) => {
                    // Signal: New message incoming

                    // Try to fetch with profile join
                    const { data, error } = await (supabase as any)
                        .from('session_messages')
                        .select('*, profiles(display_name, avatar_url)')
                        .eq('id', payload.new.id)
                        .single();

                    if (error) {
                        console.warn('Chat: Profile join failed on real-time event, using raw data');
                        setMessages((prev) => [...prev, payload.new as Message]);
                    } else if (data) {
                        setMessages((prev) => [...prev, data as Message]);
                    }
                }
            )
            .subscribe((status: string) => {
                // Channel state synchronized
            });

        return () => {
            // Closing secure chat session
            (supabase as any).removeChannel(channel);
        };
    }, [sessionId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const fetchMessages = async () => {
        setIsLoading(true);
        // Accessing message archive

        // Strategy: First try with join, if that fails (e.g. RLS issues), fetch raw
        try {
            const { data, error } = await (supabase as any)
                .from('session_messages')
                .select('*, profiles(display_name, avatar_url)')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true })
                .limit(50);

            if (error) {
                console.warn('Chat: Primary fetch failed, attempting fallback...', error);
                const { data: rawData, error: rawError } = await (supabase as any)
                    .from('session_messages')
                    .select('*')
                    .eq('session_id', sessionId)
                    .order('created_at', { ascending: true })
                    .limit(50);

                if (rawError) throw rawError;
                setMessages(rawData || []);
            } else {
                setMessages(data || []);
            }
        } catch (err: any) {
            console.error('Chat: Critical fetch error:', err);
            toast({
                title: "Chat issue",
                description: "Messages could not be loaded. Please check your connection.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newMessage.trim() || isLocked || isSending) return;

        setIsSending(true);
        // Delivering message payload
        const { error } = await (supabase as any).from('session_messages').insert({
            session_id: sessionId,
            user_id: user.id,
            content: newMessage.trim(),
        });

        if (error) {
            console.error('Chat: Error sending message:', error);
            toast({
                title: "Wait a moment",
                description: "We couldn't deliver that message. Please try again.",
                variant: "destructive"
            });
        } else {
            setNewMessage('');
            // Delivery confirmed
        }
        setIsSending(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[400px] w-full max-w-sm bg-background border rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-sm">Session Chat</h3>
                </div>
                {isLocked && (
                    <span className="text-[10px] font-bold text-destructive uppercase tracking-widest bg-destructive/10 px-2 py-0.5 rounded-full">
                        Chat Closed
                    </span>
                )}
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-xs text-muted-foreground italic">No messages yet. Be the first to say hi!</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.user_id === user?.id;
                            // Fallback to local user data for own messages if join failed
                            const name = isMe
                                ? formatDisplayName(user?.user_metadata?.display_name || user?.email?.split('@')[0])
                                : formatDisplayName(msg.profiles?.display_name);

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                >
                                    <div className="flex items-center gap-1.5 mb-1 px-1">
                                        <span className="text-[10px] font-bold text-muted-foreground">
                                            {name}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground/60">
                                            {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : '--:--'}
                                        </span>
                                    </div>
                                    <div
                                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${isMe
                                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                                            : 'bg-secondary text-foreground rounded-tl-none'
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isLocked ? "Chat is closed 2m before exam..." : "Type a message..."}
                        disabled={isLocked || isSending}
                        className="rounded-xl h-10 text-sm"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={isLocked || !newMessage.trim() || isSending}
                        className="rounded-xl shrink-0 h-10 w-10"
                    >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </form>
            </div>
        </div>
    );
}

