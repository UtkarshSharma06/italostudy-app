import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Mic, Video, ShieldCheck, ArrowRight, Zap, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function SpeakingLobby() {
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
        toast({ title: 'Match Found!', description: 'Entering the speaking session now...' });
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
        <Layout showFooter={false}>
            <div className="min-h-[calc(100vh-4.5rem)] flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-[#020617] relative overflow-hidden selection:bg-indigo-500/30">
                {/* Modern Fluid Background */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute top-[10%] left-[5%] w-[40%] h-[40%] bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[10%] right-[5%] w-[35%] h-[35%] bg-indigo-400/10 dark:bg-indigo-600/10 rounded-full blur-[100px]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-30 dark:opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
                </div>

                <div className="container max-w-7xl px-6 relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                    {/* Visual Brand Section */}
                    <div className="flex-1 space-y-8 text-center lg:text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-full"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Global Peer Network Active</span>
                        </motion.div>

                        <div className="space-y-4">
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 dark:text-white tracking-tight leading-[0.9] flex flex-col"
                            >
                                <span className="text-indigo-600 dark:text-indigo-400">Expert</span>
                                <span>IELTS Speaking</span>
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed"
                            >
                                Engage in high-fidelity mock sessions with serious scholars worldwide.
                                <span className="hidden md:inline"> Master fluency, vocabulary, and confidence through real-time peer evaluation.</span>
                            </motion.p>
                        </div>

                        <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                            {[
                                { icon: ShieldCheck, label: 'Peer Evaluation', detail: 'Based on IELTS Rubric' },
                                { icon: Video, label: 'Crystal Clear', detail: 'HD Video & Audio' },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 + (i * 0.1) }}
                                    className="px-6 py-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-md flex items-center gap-4 group hover:border-indigo-500/30 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider leading-none mb-1">{item.label}</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-500 font-medium">{item.detail}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Interaction Card Section */}
                    <div className="w-full max-w-lg relative">
                        {/* Decorative floating elements */}
                        <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
                        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl animate-pulse" />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: "spring", stiffness: 100, damping: 15 }}
                            className="bg-white dark:bg-slate-900/40 backdrop-blur-3xl border border-slate-200 dark:border-white/10 p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-2xl flex flex-col items-center text-center gap-8 relative overflow-hidden"
                        >
                            <AnimatePresence mode="wait">
                                {isSearching ? (
                                    <motion.div
                                        key="searching"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 1.1 }}
                                        className="w-full space-y-8 py-4"
                                    >
                                        <div className="flex justify-center relative">
                                            {/* Pulse rings */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/20 rounded-full animate-ping" />
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-indigo-500/30 rounded-full animate-ping [animation-delay:0.5s]" />

                                            <div className="h-20 w-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 relative z-10">
                                                <Users className="w-10 h-10 animate-bounce" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Finding Expert Partner</h3>
                                            <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2">
                                                Active Search: <span className="text-indigo-600 dark:text-indigo-400 font-black">{searchTime}s</span>
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-indigo-600"
                                                    animate={{ width: ["0%", "100%"] }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                onClick={handleCancel}
                                                className="text-slate-500 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50/50 dark:hover:bg-white/10 font-black uppercase tracking-widest text-[11px] h-14 rounded-2xl transition-all"
                                            >
                                                Abort Matchmaking
                                            </Button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="lobby"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 1.1 }}
                                        className="w-full space-y-10"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex justify-center">
                                                <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                                                    <Mic className="w-10 h-10" />
                                                </div>
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Ready to Speak?</h2>
                                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Join the queue and get matched with an IELTS learner in seconds.</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <Button
                                                onClick={handleFindPartner}
                                                className="w-full h-20 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base uppercase tracking-[0.2em] rounded-3xl shadow-xl shadow-indigo-600/30 group transition-all active:scale-[0.98]"
                                            >
                                                <span className="flex items-center gap-4">
                                                    Start Session
                                                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                                                </span>
                                            </Button>

                                            <Button
                                                variant="outline"
                                                onClick={() => navigate('/speaking/history')}
                                                className="w-full h-16 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 font-black uppercase tracking-widest text-[10px] rounded-3xl transition-all"
                                            >
                                                Analyze Past Performance
                                            </Button>
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-4">
                                            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">
                                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                                Online Now
                                            </div>
                                            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 border-l border-slate-100 dark:border-white/5">
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                Verified P2P
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

