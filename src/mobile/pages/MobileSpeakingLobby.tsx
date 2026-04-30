import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Mic, Video, ShieldCheck, ArrowLeft, Zap, Globe, Sparkles, Trophy, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileSpeakingLobby() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isSearching, setIsSearching] = useState(false);
    const [searchTime, setSearchTime] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isSearching) {
            interval = setInterval(() => setSearchTime(prev => prev + 1), 1000);
        } else {
            setSearchTime(0);
        }
        return () => clearInterval(interval);
    }, [isSearching]);

    useEffect(() => {
        if (!isSearching || !user) return;

        const channel = supabase
            .channel('speaking_matchmaking')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'speaking_sessions',
                filter: `interviewer_id=eq.${user.id}`,
            }, handleMatch)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'speaking_sessions',
                filter: `candidate_id=eq.${user.id}`,
            }, handleMatch)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isSearching, user]);

    const handleMatch = (payload: any) => {
        setIsSearching(false);
        toast({ title: 'Match Found!', description: 'Establishing secure link...' });
        navigate(`/speaking/${payload.new.id}`);
    };

    const handleFindPartner = async () => {
        if (!user) return;
        setIsSearching(true);
        try {
            await supabase.from('speaking_queue').upsert({
                user_id: user.id,
                exam_id: 'ielts-academic'
            }, { onConflict: 'user_id' });
            await attemptMatchmake();
        } catch (error: any) {
            toast({ title: 'Connection Error', description: error.message, variant: 'destructive' });
            setIsSearching(false);
        }
    };

    const attemptMatchmake = async () => {
        if (!user) return;
        const { data: others } = await supabase
            .from('speaking_queue')
            .select('*')
            .neq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1);

        if (others && others.length > 0) {
            const partner = others[0];
            const { data: session, error } = await supabase
                .from('speaking_sessions')
                .insert({ interviewer_id: user.id, candidate_id: partner.user_id })
                .select()
                .single();

            if (!error && session) {
                await supabase.from('speaking_queue').delete().in('user_id', [user.id, partner.user_id]);
                navigate(`/speaking/${session.id}`);
            }
        }
    };

    const handleCancel = async () => {
        if (!user) return;
        setIsSearching(false);
        await supabase.from('speaking_queue').delete().eq('user_id', user.id);
    };

    return (
        <div className="flex flex-col min-h-screen bg-background pb-10 overflow-hidden">
            {/* Header */}
            <header className="p-6 pt-10 flex items-center justify-between z-20">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground"><ArrowLeft /></button>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-secondary/30 rounded-full border border-border/40 backdrop-blur-sm">
                    <Globe className="w-3 h-3 text-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Global Network</span>
                </div>
            </header>

            <div className="flex-1 px-6 flex flex-col items-center justify-center text-center relative">
                {/* Background Glows */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full aspect-square bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute top-[20%] right-[-10%] w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

                <AnimatePresence mode="wait">
                    {isSearching ? (
                        <motion.div
                            key="searching"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="w-full space-y-12"
                        >
                            <div className="relative flex justify-center">
                                {/* Radars */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-primary/20 rounded-full animate-ping" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-primary/10 rounded-full animate-ping [animation-delay:0.5s]" />

                                <div className="relative z-10 w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-primary/40">
                                    <Users className="w-10 h-10 animate-bounce" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-3xl font-black uppercase tracking-tight italic">Scanning for <span className="text-primary underline decoration-primary/30">Partner</span></h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-60">Elapsed: {searchTime}s</p>
                            </div>

                            <div className="max-w-xs mx-auto space-y-6">
                                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-primary"
                                        animate={{ width: ["0%", "100%"] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    onClick={handleCancel}
                                    className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border/40 hover:bg-red-500/10 hover:text-red-500 transition-all"
                                >
                                    Abort Search
                                </Button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="lobby"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full space-y-12"
                        >
                            <div className="space-y-6">
                                <div className="relative inline-block">
                                    <div className="absolute -top-4 -right-4">
                                        <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
                                    </div>
                                    <div className="w-24 h-24 bg-secondary/40 border-2 border-primary/20 rounded-[2.5rem] flex items-center justify-center mx-auto">
                                        <Mic className="w-12 h-12 text-primary" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h1 className="text-4xl font-black uppercase tracking-tight leading-none italic">
                                        Speaking <span className="text-primary">Mastery</span>
                                    </h1>
                                    <p className="text-sm font-bold text-muted-foreground max-w-[280px] mx-auto opacity-70">
                                        Execute high-fidelity peer simulations with serious scholars.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto">
                                <div className="p-4 bg-secondary/20 border border-border/40 rounded-3xl text-left space-y-1">
                                    <Trophy className="w-4 h-4 text-primary mb-2" />
                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Evaluation</p>
                                    <p className="text-[10px] font-black uppercase tracking-tight">IELTS Rubric</p>
                                </div>
                                <div className="p-4 bg-secondary/20 border border-border/40 rounded-3xl text-left space-y-1">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500 mb-2" />
                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Security</p>
                                    <p className="text-[10px] font-black uppercase tracking-tight">Standard</p>
                                </div>
                            </div>

                            <div className="space-y-4 w-full max-w-xs mx-auto">
                                <Button
                                    onClick={handleFindPartner}
                                    className="w-full h-20 bg-primary text-white rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all"
                                >
                                    Initiate Link
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => navigate('/speaking/history')}
                                    className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 border border-border/40"
                                >
                                    <History className="w-4 h-4" /> Mission History
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Status */}
            <div className="px-10 py-6 text-center">
                <div className="inline-flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.3em] opacity-30">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Experts Online Now
                </div>
            </div>
        </div>
    );
}
