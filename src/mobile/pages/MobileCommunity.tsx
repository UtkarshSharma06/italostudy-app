import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import ChatInterface from "@/components/chat/ChatInterface";

export default function MobileCommunity() {
    const { user } = useAuth() as any;
    const navigate = useNavigate();

    // App State
    const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const { data: general } = await supabase
                .from('communities')
                .select('id')
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle();

            if (general) {
                setActiveCommunityId(general.id);
            }
        } catch (e) {
            console.error("Community Load Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading || !activeCommunityId) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden">
            <ChatInterface
                communityId={activeCommunityId}
            />
        </div>
    );
}

// End of MobileCommunity
