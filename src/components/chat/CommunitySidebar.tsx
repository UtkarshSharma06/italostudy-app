import { useEffect, useState } from "react";
import { Plus, Hash, Users, Search, MoreVertical, Pencil, Trash, Sparkles, Zap, Shield, ArrowRight, Pin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { getOptimizedImageUrl } from "@/lib/image-optimizer";

interface Community {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    created_by: string;
    member_count: number;
    category: string;
}

interface CommunitySidebarProps {
    activeCommunityId: string | null;
    onSelectCommunity: (id: string) => void;
}

export function CommunitySidebar({ activeCommunityId, onSelectCommunity }: CommunitySidebarProps) {
    const { user, profile } = useAuth() as any;
    const { toast } = useToast();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, { count: number, hasMention: boolean }>>({});
    const [newCommunityName, setNewCommunityName] = useState("");
    const [newCommunityCategory, setNewCommunityCategory] = useState("GLOBAL");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'chats' | 'requests' | 'new'>('chats');
    const [joinedCommunityIds, setJoinedCommunityIds] = useState<Set<string>>(new Set());
    const [pinnedCommunityIds, setPinnedCommunityIds] = useState<Set<string>>(new Set());
    const [activeCalls, setActiveCalls] = useState<Record<string, boolean>>({});
    const [isPrivate, setIsPrivate] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user?.id) return;

        fetchCommunities();

        // Subscribe to read status changes (Stable - only depends on user ID)
        const readStatusChannel = supabase
            .channel(`read_status_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'community_read_status',
                    filter: `user_id=eq.${user.id}`
                },
                () => fetchUnreadCounts()
            )
            .subscribe();

        // Subscribe to messages (Stable)
        const messageChannel = supabase
            .channel('sidebar_unread_messages')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events to be safe
                    schema: 'public',
                    table: 'community_messages'
                },
                () => fetchUnreadCounts()
            )
            .subscribe();

        // Subscribe to Community Updates
        const communityChannel = supabase
            .channel('communities_sidebar')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'communities'
                },
                (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        setCommunities(prev => [...prev, payload.new as Community]);
                    } else if (payload.eventType === 'DELETE') {
                        setCommunities(prev => prev.filter(c => c.id !== payload.old.id));
                    } else if (payload.eventType === 'UPDATE') {
                        setCommunities(prev => prev.map(c => c.id === payload.new.id ? payload.new as Community : c));
                    }
                    fetchUnreadCounts();
                }
            )
            .subscribe();

        // Global Call Status Subscription
        const callChannel = supabase
            .channel('global_calls')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'community_calls'
            }, (payload: any) => {
                if (payload.eventType === 'INSERT' || (payload.eventType === 'UPDATE' && payload.new.is_active)) {
                    setActiveCalls(prev => ({ ...prev, [payload.new.community_id]: true }));
                } else if (payload.eventType === 'UPDATE' && !payload.new.is_active) {
                    setActiveCalls(prev => {
                        const next = { ...prev };
                        delete next[payload.new.community_id];
                        return next;
                    });
                } else if (payload.eventType === 'DELETE') {
                    setActiveCalls(prev => {
                        const next = { ...prev };
                        delete next[payload.old.community_id]; // payload.old contains the deleted record's ID/keys
                        return next;
                    });
                }
            })
            .subscribe();

        fetchRequests();

        return () => {
            supabase.removeChannel(readStatusChannel);
            supabase.removeChannel(messageChannel);
            supabase.removeChannel(communityChannel);
            supabase.removeChannel(callChannel);
        };
    }, [user?.id, communities.length]); // Added communities.length to refresh subscription closure when list loads

    const fetchCommunities = async () => {
        const { data, error } = await (supabase as any)
            .from('communities')
            .select('*')
            .order('created_at', { ascending: true });

        if (data) {
            setCommunities(data);
        }

        if (user) {
            const { data: members } = await (supabase as any)
                .from('community_members')
                .select('community_id, is_pinned')
                .eq('user_id', user.id)
                .in('status', ['approved', 'member']);

            // Fetch active calls
            const { data: calls } = await (supabase as any)
                .from('community_calls')
                .select('community_id')
                .eq('is_active', true);

            if (calls) {
                const callMap: Record<string, boolean> = {};
                calls.forEach((c: any) => callMap[c.community_id] = true);
                setActiveCalls(callMap);
            }

            if (members) {
                const joinedIds: Set<string> = new Set(members.map((m: any) => m.community_id as string));
                const pinnedIds: Set<string> = new Set(members.filter((m: any) => m.is_pinned).map((m: any) => m.community_id as string));

                // Users are implicitly members of communities they created
                data?.forEach((c: any) => {
                    if (c.created_by === user.id) joinedIds.add(c.id);
                });

                setJoinedCommunityIds(joinedIds);
                setPinnedCommunityIds(pinnedIds);

                await fetchUnreadCounts();

                // Auto-join General if not joined
                const general = data?.find((c: any) => c.name === 'General');
                if (general && user && !joinedIds.has(general.id)) {
                    console.log("Auto-joining General community...");
                    const { error: joinError } = await (supabase as any)
                        .from('community_members')
                        .insert({
                            community_id: general.id,
                            user_id: user.id,
                            status: 'approved'
                        });

                    if (!joinError) {
                        // Send private join message
                        await (supabase as any).from('community_messages').insert({
                            community_id: general.id,
                            user_id: user.id,
                            content: `Welcome to community, ${profile?.display_name || 'User'}`,
                            recipient_id: user.id
                        });

                        joinedIds.add(general.id);
                        setJoinedCommunityIds(new Set<string>(Array.from(joinedIds)));
                    }
                }
            }
        }
    };

    const handleTogglePin = async (e: React.MouseEvent, communityId: string) => {
        e.stopPropagation();
        if (!user) return;

        const isPinned = pinnedCommunityIds.has(communityId);
        const { error } = await (supabase as any)
            .from('community_members')
            .update({ is_pinned: !isPinned })
            .eq('user_id', user.id)
            .eq('community_id', communityId);

        if (error) {
            toast({ title: "Error", description: "Failed to pin chat", variant: "destructive" });
            return;
        }

        const newPinned = new Set(pinnedCommunityIds);
        if (isPinned) newPinned.delete(communityId);
        else newPinned.add(communityId);
        setPinnedCommunityIds(newPinned);

        toast({
            title: isPinned ? "Unpinned" : "Pinned",
            description: `Chat ${isPinned ? 'removed from' : 'pinned to'} top.`
        });
    };

    const fetchRequests = async () => {
        if (!user) return;
        // Get communities owned by user
        const { data: myCommunities } = await (supabase as any)
            .from('communities')
            .select('id')
            .eq('created_by', user.id);

        if (myCommunities && myCommunities.length > 0) {
            const communityIds = myCommunities.map((c: any) => c.id);
            const { data: pending } = await (supabase as any)
                .from('community_members')
                .select('*, profiles(display_name, avatar_url, username), communities:community_id(name)')
                .in('community_id', communityIds)
                .eq('status', 'pending');

            if (pending) setRequests(pending);
        }
    };

    const fetchUnreadCounts = async () => {
        if (!user) return;

        try {
            const { data, error } = await (supabase as any).rpc('get_unread_counts', { p_user_id: user.id });
            if (error) {
                // If RPC is missing, fail silently to avoid console spam
                if (error.code === 'PGRST202' || error.message?.includes('404')) return;
                throw error;
            }

            const counts: Record<string, { count: number, hasMention: boolean }> = {};
            (data as any[])?.forEach((row: any) => {
                const id = String(row.comm_id).toLowerCase();
                counts[id] = {
                    count: parseInt(row.unread_count) || 0,
                    hasMention: row.mention_status || false
                };
            });

            setUnreadCounts(counts);
        } catch (err: any) {
            // Silencing expected missing RPC error
        }
    };

    const handleSaveCommunity = async () => {
        if (!newCommunityName.trim() || !user) return;

        setIsCreating(true);
        try {
            let imageUrl = editingCommunity?.image_url || null;

            if (selectedImage) {
                // Upload to Cloudinary instead of Supabase Storage
                const result = await uploadToCloudinary(selectedImage, 'community-covers');
                imageUrl = result.secure_url;
            }

            if (editingCommunity) {
                const { data, error } = await (supabase as any)
                    .from('communities')
                    .update({
                        name: newCommunityName.trim(),
                        image_url: imageUrl,
                        category: newCommunityCategory
                    })
                    .eq('id', editingCommunity.id)
                    .select()
                    .single();

                if (error) throw error;
                setCommunities(prev => prev.map(c => c.id === data.id ? data : c));
                toast({ title: "Success", description: "Community updated!" });
            } else {
                const { data, error } = await (supabase as any)
                    .from('communities')
                    .insert({
                        name: newCommunityName.trim(),
                        created_by: user.id,
                        image_url: imageUrl,
                        is_private: isPrivate,
                        category: newCommunityCategory
                    })
                    .select()
                    .single();

                if (error) throw error;
                setCommunities(prev => [...prev, data]);
                onSelectCommunity(data.id);
                toast({ title: "Success", description: "Community created!" });
            }

            setIsDialogOpen(false);
            setNewCommunityName("");
            setNewCommunityCategory("GLOBAL");
            setSelectedImage(null);
            setEditingCommunity(null);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteCommunity = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this community?")) return;

        try {
            const { error } = await (supabase as any).from('communities').delete().eq('id', id);
            if (error) throw error;

            setCommunities(prev => prev.filter(c => c.id !== id));
            if (activeCommunityId === id) onSelectCommunity("");
            toast({ title: "Deleted", description: "Community deleted." });
        } catch (error: any) {
            toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
        }
    };

    const handleRequestAction = async (requestId: string, action: 'approved' | 'rejected', requestData?: any) => {
        try {
            if (action === 'rejected') {
                await (supabase as any).from('community_members').delete().eq('id', requestId);
                toast({ title: "Rejected", description: "Request has been rejected." });
            } else {
                await (supabase as any).from('community_members').update({ status: 'approved' }).eq('id', requestId);

                // Send Welcome Message
                if (requestData) {
                    await (supabase as any).from('community_messages').insert({
                        community_id: requestData.community_id,
                        user_id: user.id,
                        content: `Welcome to community, ${requestData.profiles?.display_name || 'User'}`,
                        recipient_id: requestData.user_id
                    });
                }
                toast({ title: "Approved", description: "User added to community." });
            }
            setRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (error) {
            toast({ title: "Error", description: "Failed to update request", variant: "destructive" });
        }
    };

    const handleCreateButton = () => {
        const canCreate = ['elite', 'global', 'admin', 'sub_admin', 'consultant'].includes(profile?.subscription_tier || profile?.role) || profile?.is_consultant;
        if (isPrivate && !canCreate) {
            toast({ title: "Restricted", description: "Only Elite & Global users can create private communities.", variant: "destructive" });
            return;
        }
        handleSaveCommunity();
    };

    return (
        <div className="w-80 h-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-black/40 flex flex-col md:w-96">
            {/* Header with Tabs */}
            <div className="flex-none p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-r border-[#e9edef] dark:border-[#2f3b43]">
                <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full md:hidden"
                            onClick={() => navigate('/dashboard')}
                        >
                            <ArrowRight className="h-5 w-5 rotate-180" />
                        </Button>
                        <h2 
                            className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={() => navigate('/dashboard')}
                        >
                            Communities
                        </h2>
                    </div>
                    <div className="flex gap-2">
                        <Dialog open={isDialogOpen} onOpenChange={(open) => {
                            if (open) {
                                const tier = profile?.subscription_tier?.toLowerCase();
                                const isPremium = tier === 'elite' || tier === 'global' || profile?.role === 'admin' || profile?.role === 'sub_admin' || profile?.role === 'consultant' || profile?.is_consultant;
                                if (!isPremium) {
                                    setIsUpgradeDialogOpen(true);
                                    return;
                                }
                            }
                            setIsDialogOpen(open);
                            if (!open) {
                                setEditingCommunity(null);
                                setNewCommunityName("");
                                setSelectedImage(null);
                            }
                        }}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
                                    <Plus className="h-5 w-5" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{editingCommunity ? "Edit Community" : "Create New Community"}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Community Name</label>
                                        <Input
                                            placeholder="e.g. IELTS Study Group"
                                            value={newCommunityName}
                                            onChange={(e) => setNewCommunityName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Category</label>
                                        <select
                                            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            value={newCommunityCategory}
                                            onChange={(e) => setNewCommunityCategory(e.target.value)}
                                        >
                                            <option value="GLOBAL">Global</option>
                                            <option value="EXAM PREP">Exam Prep</option>
                                            <option value="UNIVERSITY">University</option>
                                            <option value="RESOURCES">Resources</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Cover Image (Optional)</label>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                                            className="cursor-pointer"
                                        />
                                    </div>

                                    {/* Privacy Option for Elite/Global */}
                                    {(['elite', 'global', 'admin', 'sub_admin', 'consultant'].includes(profile?.subscription_tier?.toLowerCase() || '') || profile?.role === 'admin' || profile?.role === 'sub_admin' || profile?.is_consultant) && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="isPrivate"
                                                checked={isPrivate}
                                                onChange={(e) => setIsPrivate(e.target.checked)}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <label htmlFor="isPrivate" className="text-sm font-medium cursor-pointer">Private Community (Approval Required)</label>
                                        </div>
                                    )}
                                    <Button
                                        onClick={handleCreateButton}
                                        className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white font-bold"
                                        disabled={isCreating || !newCommunityName.trim()}
                                    >
                                        {isCreating ? "Saving..." : (editingCommunity ? "Save Changes" : "Create Community")}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-200 dark:bg-slate-700/50 p-1 rounded-lg mb-2">
                    <button
                        onClick={() => setViewMode('chats')}
                        className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'chats' ? 'bg-white dark:bg-slate-600 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Chats
                    </button>
                    <button
                        onClick={() => setViewMode('new')}
                        className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'new' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        New
                    </button>
                    <button
                        onClick={() => setViewMode('requests')}
                        className={`flex-1 py-1 rounded-md text-xs font-bold transition-all relative ${viewMode === 'requests' ? 'bg-white dark:bg-slate-600 shadow text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Requests
                        {requests.length > 0 && <span className="ml-1 inline-flex items-center justify-center bg-red-500 text-white text-[9px] h-4 w-4 rounded-full">{requests.length}</span>}
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-100 dark:bg-slate-900 border-none h-9 rounded-lg text-sm placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-slate-300"
                    />
                </div>
            </div>

            {/* Upgrade Dialog */}
            <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
                <DialogContent className="p-0 overflow-hidden border-none max-w-lg rounded-[2rem] bg-transparent">
                    <div className="relative w-full bg-slate-950 p-10 overflow-hidden border border-white/10 rounded-[2rem]">
                        <div className="relative z-10 text-center">
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black text-white mb-4">Upgrade to Premium</DialogTitle>
                            </DialogHeader>
                            <Button onClick={() => navigate('/community/upgrade')} className="w-full bg-emerald-500 text-white">Upgrade</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Community List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {viewMode === 'requests' ? (
                    requests.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">No pending requests</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {requests.map(req => (
                                <div key={req.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Avatar className="h-10 w-10 border border-slate-200">
                                            <AvatarImage src={getOptimizedImageUrl(req.profiles?.avatar_url, 64, 64)} />
                                            <AvatarFallback>{req.profiles?.display_name?.[0] || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{req.profiles?.display_name}</p>
                                            <p className="text-xs text-slate-500 truncate">wants to join <span className="text-indigo-500 font-medium">{req.communities?.name}</span></p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-xs font-bold"
                                            onClick={() => handleRequestAction(req.id, 'approved', req)}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-8 text-xs font-bold border-slate-200 text-slate-600 hover:text-red-500 hover:bg-red-50"
                                            onClick={() => handleRequestAction(req.id, 'rejected')}
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="flex flex-col">
                        {(() => {
                            const filtered = communities
                                .filter(c => {
                                    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
                                    if (!matchesSearch) return false;

                                    const isMember = joinedCommunityIds.has(c.id);
                                    if (viewMode === 'chats') return isMember;
                                    if (viewMode === 'new') return !isMember;
                                    return true;
                                });

                            const categories = Array.from(new Set(filtered.map(c => c.category || 'GLOBAL')));
                            // Sort categories to have GLOBAL first
                            categories.sort((a, b) => {
                                if (a === 'GLOBAL') return -1;
                                if (b === 'GLOBAL') return 1;
                                return a.localeCompare(b);
                            });

                            return categories.map(cat => {
                                const catCommunities = filtered
                                    .filter(c => (c.category || 'GLOBAL') === cat)
                                    .sort((a, b) => {
                                        const aPinned = pinnedCommunityIds.has(a.id) ? 1 : 0;
                                        const bPinned = pinnedCommunityIds.has(b.id) ? 1 : 0;
                                        return bPinned - aPinned;
                                    });

                                if (catCommunities.length === 0) return null;

                                return (
                                    <div key={cat} className="mb-4">
                                        <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/20 border-y border-slate-100 dark:border-slate-800/50">
                                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                {cat} CHATS
                                            </h4>
                                        </div>
                                        {catCommunities.map((community) => (
                                            <div
                                                key={community.id}
                                                onClick={() => {
                                                    onSelectCommunity(community.id);
                                                    setUnreadCounts(prev => ({
                                                        ...prev,
                                                        [community.id]: { count: 0, hasMention: false }
                                                    }));
                                                }}
                                                className={`group flex items-center gap-3 px-3 py-3 w-full transition-colors border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${activeCommunityId === community.id
                                                    ? 'bg-slate-100 dark:bg-slate-800'
                                                    : ''
                                                    }`}
                                            >
                                                <div className="relative shrink-0">
                                                    <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-slate-200 dark:bg-slate-700 overflow-hidden text-slate-500">
                                                        <img 
                                                            src={community.image_url ? getOptimizedImageUrl(community.image_url, 64, 64) : "https://res.cloudinary.com/dy1w1to9c/image/upload/v1777477492/sh1n8sjummb5eawr4zeg.png"} 
                                                            className="w-full h-full object-cover" 
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = "https://res.cloudinary.com/dy1w1to9c/image/upload/v1777477492/sh1n8sjummb5eawr4zeg.png";
                                                            }}
                                                        />
                                                    </div>
                                                    {unreadCounts[community.id.toLowerCase()] && unreadCounts[community.id.toLowerCase()].count > 0 && viewMode === 'chats' && (
                                                        <div className="absolute -top-1.5 -right-1.5 h-5 min-w-[1.25rem] px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-black shadow-sm animate-in zoom-in duration-300 z-10">
                                                            {unreadCounts[community.id].hasMention && (
                                                                <span className="mr-0.5 text-[9px]">@</span>
                                                            )}
                                                            {unreadCounts[community.id].count > 99 ? '99+' : unreadCounts[community.id].count}
                                                        </div>
                                                    )}
                                                    {pinnedCommunityIds.has(community.id) && viewMode === 'chats' && (
                                                        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                                                            <Pin className="h-2.5 w-2.5 text-indigo-500 fill-indigo-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 text-left">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <h3 className="font-semibold text-[15px] text-slate-900 dark:text-slate-100 truncate">
                                                                {community.name}
                                                            </h3>
                                                            {activeCalls[community.id] && (
                                                                <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-emerald-500/20 animate-pulse">
                                                                    <span className="h-1 w-1 rounded-full bg-emerald-500" />
                                                                    Live
                                                                </div>
                                                            )}
                                                            {community.member_count > 0 && (
                                                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-500 font-medium">
                                                                    {community.member_count}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {viewMode === 'chats' && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <MoreVertical className="h-3 w-3" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={(e) => handleTogglePin(e, community.id)}>
                                                                        <Pin className={`mr-2 h-3 w-3 ${pinnedCommunityIds.has(community.id) ? 'fill-slate-400' : ''}`} />
                                                                        {pinnedCommunityIds.has(community.id) ? 'Unpin Chat' : 'Pin Chat'}
                                                                    </DropdownMenuItem>
                                                                    {community.created_by === user?.id && (
                                                                        <>
                                                                            <DropdownMenuItem onClick={() => {
                                                                                setEditingCommunity(community);
                                                                                setNewCommunityName(community.name);
                                                                                setNewCommunityCategory(community.category || "GLOBAL");
                                                                                setIsDialogOpen(true);
                                                                            }}>
                                                                                <Pencil className="mr-2 h-3 w-3" /> Edit
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={(e) => handleDeleteCommunity(community.id, e)}
                                                                                className="text-red-500 focus:text-red-500"
                                                                            >
                                                                                <Trash className="mr-2 h-3 w-3" /> Delete
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>
                                                    <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
                                                        {viewMode === 'new' ? 'Tap to view info' : (
                                                            (unreadCounts[community.id]?.count || 0) > 0 ? (
                                                                <span className="font-bold text-slate-900 dark:text-slate-200">
                                                                    New Message
                                                                </span>
                                                            ) : "Click to open chat"
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            });
                        })()}
                        {communities.filter(c => viewMode === 'chats' ? joinedCommunityIds.has(c.id) : !joinedCommunityIds.has(c.id)).length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>{viewMode === 'chats' ? 'No joined communities' : 'No new communities found'}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
