import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateUUID } from "@/lib/uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { MessageItem, Message } from "./MessageItem";
import { MessageInput } from "./MessageInput";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Hash, Users, ChevronLeft, Lock, Unlock, Shield, Trash2, Ban, Pin, Phone, Video, Mic, Search, Image as ImageIcon, Link as LinkIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { VoiceCallView } from "./VoiceCallView";
import { ImageLightbox } from "./ImageLightbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/image-optimizer";

interface ChatInterfaceProps {
    communityId: string;
}

// 00. Skeleton Loader Component
export const ChatSkeleton = () => (
    <div className="flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] animate-pulse">
        {/* Header Skeleton */}
        <div className="h-16 flex items-center px-4 md:px-6 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-700 z-10">
            <div className="flex items-center gap-3 w-full">
                <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-2 w-16 bg-slate-200 dark:bg-slate-700 rounded opacity-50" />
                </div>
            </div>
        </div>

        {/* Messages Skeleton */}
        <div className="flex-1 overflow-hidden p-4 space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <div className="flex items-end gap-2 max-w-[70%]">
                        {i % 2 !== 0 && <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />}
                        <div className={`space-y-2 p-3 rounded-2xl ${i % 2 === 0 ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-white dark:bg-slate-800'}`}>
                            <div className="h-2 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                            <div className="h-2 w-48 bg-slate-200 dark:bg-slate-700 rounded opacity-70" />
                            {i === 3 && <div className="h-32 w-48 bg-slate-200 dark:bg-slate-700 rounded mt-2" />}
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Input Skeleton */}
        <div className="p-3 bg-[#f0f2f5] dark:bg-[#202c33]">
            <div className="h-12 w-full bg-white dark:bg-slate-800 rounded-xl" />
        </div>
    </div>
);

export default function ChatInterface({ communityId }: ChatInterfaceProps) {
    const { user, profile } = useAuth() as any;
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [reactions, setReactions] = useState<Record<string, any[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [communityName, setCommunityName] = useState("Loading...");
    const [communityImage, setCommunityImage] = useState<string | null>(null);
    const [isRestricted, setIsRestricted] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const profileCacheRef = useRef<Record<string, any>>({});
    const processedMessageIds = useRef<Set<string>>(new Set());
    const lastMessageTimeRef = useRef<string | null>(null);
    const viewedMessageIds = useRef<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isAdmin = profile?.role === 'admin';
    const navigate = useNavigate();

    const [isConnected, setIsConnected] = useState(false);
    const [accessStatus, setAccessStatus] = useState<'loading' | 'member' | 'pending' | 'rejected' | 'none' | 'approved'>('loading');
    const [creatorName, setCreatorName] = useState<string>("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [isCreator, setIsCreator] = useState(false);
    const [memberCount, setMemberCount] = useState<number>(0);
    const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
    const [activeCall, setActiveCall] = useState<any>(null);
    const [isCalling, setIsCalling] = useState(false);
    const [livekitToken, setLivekitToken] = useState<string | null>(null);

    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [showLightbox, setShowLightbox] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'media' | 'links'>('chat');
    const [imageError, setImageError] = useState(false);

// 0. Standalone Functions
    const fetchDetails = async () => {
        if (!user || !communityId) return;
        setAccessStatus('loading');
        try {
            const { data: commData } = await (supabase as any)
                .from('communities')
                .select('name, image_url, is_restricted, is_private, created_by, member_count, pinned_message_id, profiles:profiles!communities_created_by_fkey(display_name)')
                .eq('id', communityId)
                .single();

            if (commData) {
                setCommunityName(commData.name);
                setCommunityImage(commData.image_url);
                setIsRestricted(commData.is_restricted || false);
                setIsPrivate(commData.is_private || false);
                const pData = commData.profiles;
                const profileData = Array.isArray(pData) ? pData[0] : pData;
                setCreatorName(profileData?.display_name || "Unknown");
                setIsCreator(commData.created_by === user.id);
                setMemberCount(commData.member_count || 0);

                if (commData.pinned_message_id) {
                    fetchPinnedMessage(commData.pinned_message_id);
                } else {
                    setPinnedMessage(null);
                }

                const [callRes, membershipRes] = await Promise.all([
                    (supabase as any).from('community_calls').select('*').eq('community_id', communityId).eq('is_active', true).maybeSingle(),
                    (commData.created_by === user.id || profile?.role === 'admin')
                        ? Promise.resolve({ data: { status: 'member' } })
                        : (supabase as any).from('community_members').select('status').eq('community_id', communityId).eq('user_id', user.id).maybeSingle()
                ]);

                if (callRes.data) setActiveCall(callRes.data);

                if (commData.created_by === user.id || profile?.role === 'admin') {
                    setAccessStatus('member');
                } else if (membershipRes.data) {
                    setAccessStatus(membershipRes.data.status);
                } else {
                    setAccessStatus('none');
                }
            }
        } catch (err: any) {
            console.error('Error fetching community details:', err);
            setAccessStatus('none');
        } finally {
            setIsLoading(false);
        }
    };

    const incrementView = async (msgId: string) => {
        if (viewedMessageIds.current.has(msgId)) return;
        viewedMessageIds.current.add(msgId);
        try {
            await (supabase as any).rpc('increment_message_view', { p_message_id: msgId });
        } catch (e) { }
    };

    const handleScrollToMessage = (messageId: string) => {
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-amber-100/50', 'dark:bg-amber-900/30', 'ring-4', 'ring-amber-500/20', 'transition-all', 'duration-500');
            setTimeout(() => {
                element.classList.remove('bg-amber-100/50', 'dark:bg-amber-900/30', 'ring-4', 'ring-amber-500/20');
            }, 2000);
        }
    };

    const fetchMessages = async () => {
        if (!communityId) return;
        setIsLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('community_messages')
                .select(`
                    *,
                    profiles:profiles!community_messages_user_id_fkey (username, display_name, avatar_url, email)
                `)
                .eq('community_id', communityId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const messageIds = data?.map((m: any) => m.id) || [];
            if (messageIds.length > 0) {
                const { data: reactData } = await supabase.from('message_reactions').select('*').in('message_id', messageIds);
                const reactMap: Record<string, any[]> = {};
                reactData?.forEach(re => {
                    if (!reactMap[re.message_id]) reactMap[re.message_id] = [];
                    reactMap[re.message_id].push(re);
                });
                setReactions(reactMap);
            }

            if (data) {
                // Build a lookup map so we can resolve reply_to_id -> parent message
                const msgMap = new Map<string, any>();
                data.forEach((msg: any) => {
                    const p = (Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles) || { display_name: 'Unknown', avatar_url: null, username: 'unknown', email: 'unknown' };
                    msgMap.set(msg.id, { ...msg, profiles: p });
                });

                const formatted = data.map((msg: any) => {
                    const profiles = msgMap.get(msg.id)!.profiles;
                    const parent = msg.reply_to_id ? msgMap.get(msg.reply_to_id) : null;
                    return {
                        ...msg,
                        profiles,
                        reply_to: parent ? {
                            id: parent.id,
                            content: parent.content,
                            file_url: parent.file_url,
                            file_type: parent.file_type,
                            file_name: parent.file_name,
                            profiles: { display_name: parent.profiles?.display_name || 'Unknown' }
                        } : null
                    };
                });
                setMessages(formatted);
                if (formatted.length > 0) {
                    lastMessageTimeRef.current = formatted[formatted.length - 1].created_at;
                }
                setTimeout(() => scrollToBottom(true), 150);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPinnedMessage = async (messageId: string) => {
        const { data, error } = await (supabase as any)
            .from('community_messages')
            .select(`*, profiles:profiles!community_messages_user_id_fkey ( display_name, avatar_url, username, email )`)
            .eq('id', messageId)
            .single();
        if (data && !error) {
            setPinnedMessage({
                ...data,
                profiles: data.profiles || { display_name: 'User', avatar_url: null, username: 'unknown', email: 'unknown' }
            });
        }
    };

    const fetchNewMessages = async () => {
        if (!lastMessageTimeRef.current || !communityId) return;
        try {
            const { data } = await (supabase as any)
                .from('community_messages')
                .select(`
                    *,
                    profiles:profiles!community_messages_user_id_fkey (username, display_name, avatar_url, email)
                `)
                .eq('community_id', communityId)
                .gt('created_at', lastMessageTimeRef.current)
                .order('created_at', { ascending: true });

            if (data && data.length > 0) {
                const uniqueNew = data
                    .map((msg: any) => {
                        const profiles = (Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles) || { display_name: 'Unknown', avatar_url: null, username: 'unknown', email: 'unknown' };
                        return { ...msg, profiles };
                    })
                    .filter((m: any) => !processedMessageIds.current.has(m.id));

                if (uniqueNew.length > 0) {
                    uniqueNew.forEach((m: any) => processedMessageIds.current.add(m.id));
                    // Resolve reply_to from existing messages + new batch
                    setMessages(prev => {
                        const allMsgs = [...prev, ...uniqueNew];
                        const msgMap = new Map<string, any>(allMsgs.map((m: any) => [m.id, m]));
                        // Resolve replies for ONLY the new messages
                        const resolved = uniqueNew.map((msg: any) => {
                            const parent = msg.reply_to_id ? msgMap.get(msg.reply_to_id) : null;
                            return {
                                ...msg,
                                reply_to: parent ? {
                                    id: parent.id,
                                    content: parent.content,
                                    file_url: parent.file_url,
                                    file_type: parent.file_type,
                                    file_name: parent.file_name,
                                    profiles: { display_name: parent.profiles?.display_name || 'Unknown' }
                                } : null
                            };
                        });
                        return [...prev, ...resolved];
                    });
                    lastMessageTimeRef.current = uniqueNew[uniqueNew.length - 1].created_at;
                    setTimeout(scrollToBottom, 50);
                }
            }
        } catch (err) { }
    };

    const fetchSingleMessage = async (id: string): Promise<Message | null> => {
        const { data } = await (supabase as any)
            .from('community_messages')
            .select(`
                *,
                profiles:profiles!community_messages_user_id_fkey (username, display_name, avatar_url, email)
            `)
            .eq('id', id)
            .single();

        if (data) {
            const profiles = (Array.isArray(data.profiles) ? data.profiles[0] : data.profiles) || { display_name: 'Unknown', avatar_url: null, username: 'unknown', email: 'unknown' };
            let reply_to = null;

            // If this message replies to another, fetch the parent separately
            if (data.reply_to_id) {
                const { data: parentData } = await (supabase as any)
                    .from('community_messages')
                    .select(`
                        id, content, file_url, file_type, file_name,
                        profiles:profiles!community_messages_user_id_fkey (display_name, username)
                    `)
                    .eq('id', data.reply_to_id)
                    .single();

                if (parentData) {
                    const parentProfiles = (Array.isArray(parentData.profiles) ? parentData.profiles[0] : parentData.profiles) || { display_name: 'Unknown' };
                    reply_to = {
                        id: parentData.id,
                        content: parentData.content,
                        file_url: parentData.file_url,
                        file_type: parentData.file_type,
                        file_name: parentData.file_name,
                        profiles: { display_name: parentProfiles.display_name || 'Unknown' }
                    };
                }
            }

            return { ...data, profiles, reply_to };
        }
        return null;
    };

    // 1. Initial Load
    useEffect(() => {
        if (user && communityId) {
            processedMessageIds.current.clear();
            lastMessageTimeRef.current = null;
            setMessages([]);
            setReactions({});
            Promise.all([fetchDetails(), fetchMessages()]);
        }
    }, [communityId, user?.id]);

    // Extra trigger for mobile scroll to bottom
    useEffect(() => {
        if (messages.length > 0) {
            const timer = setTimeout(() => scrollToBottom(true), 300);
            return () => clearTimeout(timer);
        }
    }, [messages.length]);

    // 2. Realtime Subscriptions
    useEffect(() => {
        if (!user || !communityId) return;

        const pinnedChannel = supabase
            .channel(`community_pins_${communityId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'communities', filter: `id=eq.${communityId}` }, (payload: any) => {
                if (payload.new.pinned_message_id) fetchPinnedMessage(payload.new.pinned_message_id);
                else setPinnedMessage(null);
                if (payload.new.member_count !== undefined) setMemberCount(payload.new.member_count);
            })
            .subscribe();

        const channel = supabase
            .channel(`public:community_messages:${communityId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages', filter: `community_id=eq.${communityId}` }, async (payload: any) => {
                if (payload.eventType === 'INSERT') {
                    if (processedMessageIds.current.has(payload.new.id)) return;
                    if (payload.new.user_id === user?.id) return;
                    fetchNewMessages();
                } else if (payload.eventType === 'UPDATE') {
                    const updatedId = payload.new.id;
                    if (payload.new.is_deleted) {
                        setMessages(prev => prev.map(m => m.id === updatedId ? { ...m, is_deleted: true, content: null, file_url: null } : m));
                    } else if (payload.new.view_count !== undefined && !payload.new.content) {
                        setMessages(prev => prev.map(m => m.id === updatedId ? { ...m, view_count: payload.new.view_count } : m));
                    } else {
                        const fullMsg = await fetchSingleMessage(updatedId);
                        if (fullMsg) setMessages(prev => prev.map(m => m.id === updatedId ? fullMsg : m));
                    }
                } else if (payload.eventType === 'DELETE') {
                    setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                }
            })
            .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));

        const communityChannel = supabase
            .channel(`public:communities:${communityId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'communities', filter: `id=eq.${communityId}` }, (payload: any) => {
                if (payload.new.is_restricted !== undefined) setIsRestricted(payload.new.is_restricted);
            })
            .subscribe();

        const reactionChannel = supabase
            .channel(`message_reactions:${communityId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, (payload: any) => {
                if (payload.eventType === 'INSERT') {
                    setReactions(prev => ({ ...prev, [payload.new.message_id]: [...(prev[payload.new.message_id] || []), payload.new] }));
                } else if (payload.eventType === 'DELETE') {
                    setReactions(prev => ({ ...prev, [payload.old.message_id]: prev[payload.old.message_id]?.filter(r => r.id !== payload.old.id) || [] }));
                }
            })
            .subscribe();

        const pollInterval = setInterval(fetchNewMessages, 30000);

        return () => {
            pinnedChannel.unsubscribe();
            channel.unsubscribe();
            communityChannel.unsubscribe();
            reactionChannel.unsubscribe();
            clearInterval(pollInterval);
        };
    }, [communityId, user?.id]);

    // 3. Mark Read and Scroll
    useEffect(() => {
        const markAsRead = async () => {
            if (!user || !communityId) return;
            try { await (supabase as any).rpc('update_read_status', { p_community_id: communityId }); } catch (err) { }
        };
        markAsRead();
    }, [communityId, messages.length, user?.id]);

    // 4. Mentions Read
    useEffect(() => {
        const markMentionsRead = async () => {
            if (!user || !communityId) return;
            await (supabase as any).from('chat_mentions').update({ is_read: true }).eq('community_id', communityId).eq('user_id', user.id);
        };
        markMentionsRead();
    }, [communityId, user?.id]);

    // 5. LiveKit Token
    useEffect(() => {
        const fetchToken = async () => {
            if (isCalling && activeCall && !livekitToken) {
                try {
                    const { data, error } = await supabase.functions.invoke('get-livekit-token', {
                        body: { roomName: activeCall.room_name, participantName: profile?.display_name || user?.email?.split('@')[0] || 'User' }
                    });
                    if (error) throw error;
                    const token = typeof data === 'string' ? data : data?.token;
                    if (token) setLivekitToken(token);
                } catch (error) {
                    toast({ title: "Connection Error", description: "Failed to connect to voice server.", variant: "destructive" });
                    setIsCalling(false);
                }
            }
        };
        fetchToken();
        if (!isCalling) setLivekitToken(null);
    }, [isCalling, activeCall, user?.id]);

    const scrollToBottom = (instant = false) => {
        messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    };

    const handleSend = async (content: string | null, files: File[]) => {
        if (!user) return;
        const batchId = files.length > 1 ? generateUUID() : null;

        const sendSingle = async (c: string | null, f: File | null, isFirst: boolean) => {
            const tempId = `temp-${Date.now()}-${Math.random()}`;
            const optimistic: Message = {
                id: tempId, content: c, file_url: f ? URL.createObjectURL(f) : null,
                file_type: f?.type || null, file_name: f?.name || null,
                created_at: new Date().toISOString(), user_id: user.id, is_deleted: false,
                community_id: communityId, batch_id: batchId,
                reply_to_id: isFirst ? replyTo?.id || null : null,
                view_count: 0,
                profiles: {
                    display_name: profile?.display_name || 'Me',
                    avatar_url: profile?.avatar_url || null,
                    username: profile?.username || 'me',
                    email: user.email || ''
                },
                reply_to: isFirst && replyTo ? {
                    id: replyTo.id,
                    content: replyTo.content || "",
                    file_url: replyTo.file_url || undefined,
                    file_type: replyTo.file_type || undefined,
                    file_name: replyTo.file_name || undefined,
                    profiles: { display_name: replyTo.profiles?.display_name || 'Unknown' }
                } : undefined
            };
            setMessages(prev => [...prev, optimistic]);
            setTimeout(scrollToBottom, 0);

            try {
                let fileUrl = null;
                if (f) {
                    const folder = `community/${communityId}`;
                    const result = await uploadToCloudinary(f, folder);
                    fileUrl = result.secure_url;
                }
                const { data: dbId, error: dbErr } = await (supabase as any).rpc('send_community_message', {
                    p_community_id: communityId, p_content: c, p_file_url: fileUrl,
                    p_file_type: f?.type, p_file_name: f?.name, p_batch_id: batchId,
                    p_reply_to_id: isFirst ? replyTo?.id : null
                });
                if (dbErr) throw dbErr;
                processedMessageIds.current.add(dbId);
                setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: dbId, file_url: fileUrl } : m));

                // Trigger Push Notification
                try {
                    const previewText = content
                        ? (content.length > 60 ? content.substring(0, 60) + '...' : content)
                        : (f ? 'Shared a file' : 'New message');

                    supabase.functions.invoke('send-push', {
                        body: {
                            title: communityName || 'New Message',
                            body: `${profile?.display_name || 'Someone'}: ${previewText}`,
                            community_id: communityId,
                            sender_id: user.id,
                            data: {
                                url: `/community`,
                                community_id: communityId,
                                push_type: 'chat'
                            }
                        }
                    });
                } catch (pushErr) {
                    console.error('Error triggering push notification:', pushErr);
                }
            } catch (e: any) {
                toast({ title: "Error", description: e.message, variant: "destructive" });
                setMessages(prev => prev.filter(m => m.id !== tempId));
            }
        };

        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) await sendSingle(i === 0 ? content : null, files[i], i === 0);
        } else {
            await sendSingle(content, null, true);
        }
        setReplyTo(null);
    };

    const handlePinMessage = async (id: string | null) => {
        if (!isAdmin && !isCreator) return;
        const { error } = await (supabase as any)
            .from('communities')
            .update({ pinned_message_id: id })
            .eq('id', communityId);
        if (error) toast({ title: "Error", description: "Failed to pin message", variant: "destructive" });
        else toast({ title: id ? "Pinned" : "Unpinned" });
    };

    const handleToggleRestricted = async () => {
        if (!isAdmin && !isCreator) return;
        const newRestricted = !isRestricted;
        const { error } = await (supabase as any)
            .from('communities')
            .update({ is_restricted: newRestricted })
            .eq('id', communityId);

        if (error) {
            toast({ title: "Error", description: "Failed to update restrictions", variant: "destructive" });
        } else {
            setIsRestricted(newRestricted);
            toast({
                title: newRestricted ? "Chat Locked" : "Chat Unlocked",
                description: newRestricted ? "Only admins can message now." : "Everyone can message now."
            });
        }
    };

    const handleDeleteMessage = async (id: string) => {
        const { error } = await (supabase as any).from('community_messages').update({ is_deleted: true, content: null, file_url: null }).eq('id', id);
        if (error) toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    };

    const handleStartCall = async () => {
        if (activeCall) { setIsCalling(true); return; }
        const roomName = `comm_${communityId}_${Date.now()}`;
        const { data, error } = await (supabase as any).from('community_calls').insert({ community_id: communityId, created_by: user.id, room_name: roomName, is_active: true }).select().single();
        if (!error) { setActiveCall(data); setIsCalling(true); }
    };

    const handleJoinCommunity = async () => {
        if (!user || !communityId) return;
        setIsLoading(true);
        try {
            const { error } = await (supabase as any).from('community_members').insert({
                user_id: user.id,
                community_id: communityId,
                role: 'member',
                status: 'approved'
            });

            if (error) {
                // If unique constraint violation, it means user is already a member or pending
                if (error.code === '23505') {
                    toast({ title: "Already a member", description: "You are already in this community." });
                    // Refresh details to get correct status
                    fetchDetails();
                    return;
                }
                throw error;
            }

            toast({ title: "Joined!", description: "You have successfully joined the community." });
            setAccessStatus('member');
            fetchDetails(); // Refresh to get latest counts/state
        } catch (err: any) {
            console.error("Join Error:", err);
            toast({ title: "Error", description: err.message || "Failed to join community", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    const handleImageClick = (url: string) => {
        const allImages = messages
            .filter(msg => !msg.is_deleted && msg.file_url && msg.file_type?.startsWith('image/'))
            .map(msg => msg.file_url!);

        const index = allImages.indexOf(url);
        if (index !== -1) {
            setLightboxImages(allImages);
            setLightboxIndex(index);
            setShowLightbox(true);
        } else {
            setLightboxImages([url]);
            setLightboxIndex(0);
            setShowLightbox(true);
        }
    };



    const filteredMessages = useMemo(() => {
        return messages.filter(msg => {
            if (showSearch && searchQuery) {
                return msg.content?.toLowerCase().includes(searchQuery.toLowerCase());
            }
            if (activeTab === 'chat') return true;
            if (activeTab === 'media') return msg.file_url && (msg.file_type?.startsWith('image/') || msg.file_type?.startsWith('video/'));
            if (activeTab === 'links') return msg.content?.includes('http');
            return true;
        });
    }, [messages, showSearch, searchQuery, activeTab]);

    if (isLoading || accessStatus === 'loading') {
        return <ChatSkeleton />;
    }

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-[#efeae2] dark:bg-[#0b141a] relative overflow-hidden w-full">
            <div className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239ca3af' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")` }} />

            <div className="h-16 flex items-center px-4 md:px-6 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-700 z-10 shrink-0 shadow-sm">
                <div className="flex items-center gap-3 w-full">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="-ml-2 h-9 w-9 text-slate-500 hover:text-indigo-600 transition-colors" 
                        onClick={() => navigate('/dashboard')}
                        title="Back to Dashboard"
                    >
                        <ChevronLeft />
                    </Button>
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 border border-slate-100 dark:border-slate-600">
                        <img 
                            src={communityImage && !imageError ? getOptimizedImageUrl(communityImage, 64, 64) : "https://res.cloudinary.com/dy1w1to9c/image/upload/v1777478678/ajcdz3q9sm9a33v5ltsw.jpg"} 
                            className="w-full h-full object-cover" 
                            onError={() => setImageError(true)} 
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-bold text-base truncate">{communityName}</h1>
                        <div className="text-[11px] text-slate-500 truncate">
                            {isConnected ? (
                                (creatorName && creatorName !== "Unknown") ? `Created by ${creatorName}` : 'Created by Italostudy'
                            ) : 'connecting...'}
                        </div>
                    </div>

                    {/* Toolbar Actions */}
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)} className="h-9 w-9 text-slate-500" title="Search">
                            <Search className="h-5 w-5" />
                        </Button>

                        <div className="hidden md:block w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
                            <Button variant={activeTab === 'chat' ? 'secondary' : 'ghost'} size="icon" onClick={() => setActiveTab('chat')} className={`h-8 w-8 rounded-lg ${activeTab === 'chat' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-500' : 'text-slate-500'}`} title="All Messages">
                                <Hash className="h-4 w-4" />
                            </Button>
                            <Button variant={activeTab === 'media' ? 'secondary' : 'ghost'} size="icon" onClick={() => setActiveTab('media')} className={`h-8 w-8 rounded-lg ${activeTab === 'media' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-500' : 'text-slate-500'}`} title="Media Only">
                                <ImageIcon className="h-4 w-4" />
                            </Button>
                            <Button variant={activeTab === 'links' ? 'secondary' : 'ghost'} size="icon" onClick={() => setActiveTab('links')} className={`h-8 w-8 rounded-lg ${activeTab === 'links' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-500' : 'text-slate-500'}`} title="Links Only">
                                <LinkIcon className="h-4 w-4" />
                            </Button>
                        </div>

                        {(isAdmin || isCreator) && (
                            <>
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("h-9 w-9", isRestricted ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" : "text-slate-500")}
                                    onClick={handleToggleRestricted}
                                    title={isRestricted ? "Only admins can message" : "Everyone can message"}
                                >
                                    {isRestricted ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500/70 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20" title="Danger Zone">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <AnimatePresence>
                {showSearch && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-white dark:bg-[#202c33] px-4 py-2 border-b border-slate-200 dark:border-slate-700 z-10 shrink-0"
                    >
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                autoFocus
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search messages..."
                                className="pl-10 h-10 bg-slate-100 dark:bg-[#2a3942] border-none rounded-xl"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            <div 
                className="flex-[1_1_0%] min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 z-10 space-y-4" 
                ref={scrollRef}
                style={{ 
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y'
                }}
            >
                {pinnedMessage && (
                    <div className="sticky top-2 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 mb-4">
                        <Pin className="h-4 w-4 text-indigo-500 shrink-0" />
                        <div className="flex-1 min-w-0 text-sm truncate text-slate-600 dark:text-slate-300">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{pinnedMessage.profiles?.display_name}: </span>
                            {pinnedMessage.content || 'Pinned Attachment'}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePinMessage(null)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                )}

                {filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50">
                        <Hash className="h-12 w-12 mb-2" />
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    (() => {
                        let lastDate = "";
                        return filteredMessages.map((msg, i) => {
                            const msgDate = new Date(msg.created_at);
                            const today = new Date();
                            const yesterday = new Date();
                            yesterday.setDate(today.getDate() - 1);

                            let dateHeader = "";
                            const dateStr = msgDate.toLocaleDateString();
                            
                            if (dateStr !== lastDate) {
                                if (dateStr === today.toLocaleDateString()) {
                                    dateHeader = "Today";
                                } else if (dateStr === yesterday.toLocaleDateString()) {
                                    dateHeader = "Yesterday";
                                } else {
                                    dateHeader = msgDate.toLocaleDateString(undefined, { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    });
                                }
                                lastDate = dateStr;
                            }

                            return (
                                <div key={msg.id} className="space-y-4">
                                    {dateHeader && (
                                        <div className="flex justify-center my-4">
                                            <div className="bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-sm px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                                                {dateHeader}
                                            </div>
                                        </div>
                                    )}
                                    <MessageItem
                                        message={msg}
                                        onReply={setReplyTo}
                                        onDelete={() => handleDeleteMessage(msg.id)}
                                        onPin={() => handlePinMessage(msg.id)}
                                        onImageClick={handleImageClick}
                                        isAdmin={isAdmin || isCreator}
                                        reactions={reactions[msg.id] || []}
                                        onView={() => incrementView(msg.id)}
                                        onScrollToMessage={handleScrollToMessage}
                                    />
                                </div>
                            );
                        });
                    })()
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-2 md:p-3 bg-[#f0f2f5] dark:bg-[#202c33] z-20 border-t border-slate-200 dark:border-slate-700 shrink-0">
                {accessStatus === 'member' || accessStatus === 'approved' ? (
                    isRestricted && !isAdmin && !isCreator ? (
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-center text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
                            <Lock className="h-4 w-4" /> This chat is restricted to admins only.
                        </div>
                    ) : (
                        <MessageInput
                            onSend={handleSend}
                            replyTo={replyTo ? { 
                                id: replyTo.id, 
                                user: replyTo.profiles?.display_name || replyTo.profiles?.username || 'Unknown', 
                                content: replyTo.content?.trim() || (replyTo.file_type?.startsWith('image/') ? '📷 Photo' : replyTo.file_type?.startsWith('video/') ? '🎥 Video' : replyTo.file_name || '📎 Attachment')
                            } : null}
                            onCancelReply={() => setReplyTo(null)}
                            disabled={isLoading}
                        />
                    )
                ) : (
                    <div className="flex flex-col gap-2">
                        <Button onClick={handleJoinCommunity} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">Join Community to Chat</Button>
                    </div>
                )}
            </div>

            {showLightbox && <ImageLightbox images={lightboxImages} initialIndex={lightboxIndex} onClose={() => setShowLightbox(false)} />}
        </div>
    );
}
