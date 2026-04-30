import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ChatInterface, { ChatSkeleton } from "@/components/chat/ChatInterface";
import { useAuth } from "@/lib/auth";
import { MessageSquareOff, Loader2, ZapOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Community() {
    const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
    const { profile } = useAuth();
    const [isGlobalEnabled, setIsGlobalEnabled] = useState<boolean | null>(null);

    useEffect(() => {
        const loadGeneralCommunity = async () => {
            const { data } = await (supabase as any)
                .from('communities')
                .select('id')
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle();

            if (data) {
                setActiveCommunityId(data.id);
            }
        };

        const checkGlobal = async () => {
            const { data } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'enable_community')
                .maybeSingle();
            setIsGlobalEnabled(data?.value !== false);
        };

        checkGlobal();
        loadGeneralCommunity();
    }, []);

    if (isGlobalEnabled === false && profile?.role !== 'admin' && profile?.role !== 'sub_admin') {
        return (
            <Layout>
                <div className="flex-1 h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-full">
                        <ZapOff className="w-12 h-12 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">Community Maintenance</h2>
                    <p className="text-slate-500 max-w-md font-bold">The internal chat platform is currently undergoing scheduled maintenance. Please check back later.</p>
                </div>
            </Layout>
        );
    }

    if (profile && profile.community_enabled === false) {
        return (
            <Layout>
                <div className="flex-1 h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-full">
                        <MessageSquareOff className="w-12 h-12 text-rose-600" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">Access Restricted</h2>
                    <p className="text-slate-500 max-w-md font-bold">Your access to the community has been suspended by an administrator.</p>
                </div>
            </Layout>
        );
    }

    if (!activeCommunityId) {
        return (
            <Layout isLoading={true}>
                <div />
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex-1 min-h-0 w-full flex overflow-hidden bg-white dark:bg-black">
                <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                    <ChatInterface
                        communityId={activeCommunityId}
                    />
                </div>
            </div>
        </Layout>
    );
}
