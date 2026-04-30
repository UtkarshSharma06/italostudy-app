import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Mic, MicOff, Video, VideoOff, PhoneOff, RefreshCcw, FileText, CheckCircle2, AlertTriangle, ChevronUp, MoreVertical, LayoutGrid, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Device } from '@capacitor/device';

const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export default function MobileSpeakingSession() {
    const { sessionId } = useParams();
    const { user, profile } = useAuth() as any;
    const navigate = useNavigate();
    const { toast } = useToast();

    // Session State
    const [sessionData, setSessionData] = useState<any>(null);
    const [role, setRole] = useState<'interviewer' | 'candidate' | 'observer'>('observer');
    const [connectionStatus, setConnectionStatus] = useState('Starting...');
    const [isInterfaceVisible, setIsInterfaceVisible] = useState(true);

    // Media State
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);

    // Scoring State
    const [scores, setScores] = useState({ fluency: 6.0, vocab: 6.0, grammar: 6.0, pron: 6.0 });
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        if (!sessionId || !user) return;
        initializeSession();
        return () => cleanupSession();
    }, [sessionId, user]);

    const initializeSession = async () => {
        try {
            const { data, error } = await supabase.from('speaking_sessions').select('*').eq('id', sessionId).single();
            if (error) throw error;
            setSessionData(data);

            if (user?.id === data.interviewer_id) setRole('interviewer');
            else if (user?.id === data.candidate_id) setRole('candidate');

            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStream.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            setPermissionError(null);

            setupWebRTC(data.interviewer_id === user?.id);
        } catch (err: any) {
            console.error(err);
            setPermissionError(err.message || "Permissions denied");
            toast({ title: 'Hardware Error', description: "Camera/Mic access required.", variant: 'destructive' });
        }
    };

    const setupWebRTC = (isInitiator: boolean) => {
        const pc = new RTCPeerConnection(rtcConfig);
        peerConnection.current = pc;

        localStream.current?.getTracks().forEach(track => pc.addTrack(track, localStream.current!));

        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) sendSignal('ice-candidate', event.candidate);
        };

        pc.onconnectionstatechange = () => setConnectionStatus(pc.connectionState);

        supabase.channel(`speaking_${sessionId}`)
            .on('broadcast', { event: 'signal' }, async ({ payload }) => {
                if (!peerConnection.current) return;
                if (payload.type === 'offer' && !isInitiator) {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendSignal('answer', answer);
                } else if (payload.type === 'answer' && isInitiator) {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
                } else if (payload.type === 'ice-candidate') {
                    await pc.addIceCandidate(new RTCIceCandidate(payload.data));
                } else if (payload.type === 'swap-roles') {
                    setRole(prev => prev === 'interviewer' ? 'candidate' : 'interviewer');
                    toast({ title: 'Roles Swapped' });
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && isInitiator) {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    sendSignal('offer', offer);
                }
            });
    };

    const sendSignal = async (type: string, data: any) => {
        await supabase.channel(`speaking_${sessionId}`).send({
            type: 'broadcast',
            event: 'signal',
            payload: { type, data }
        });
    };

    const cleanupSession = () => {
        localStream.current?.getTracks().forEach(track => track.stop());
        peerConnection.current?.close();
        supabase.removeAllChannels();
    };

    const handleSwapRoles = () => {
        sendSignal('swap-roles', {});
        setRole(prev => prev === 'interviewer' ? 'candidate' : 'interviewer');
    };

    const handleLeave = () => {
        cleanupSession();
        navigate('/speaking');
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
            {/* Background Grain */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            {/* Remote Video (Full Screen) */}
            <div className="flex-1 relative bg-slate-900 overflow-hidden" onClick={() => setIsInterfaceVisible(!isInterfaceVisible)}>
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />

                {/* Local Video PIP */}
                <motion.div
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    className="absolute bottom-24 right-4 w-32 aspect-[3/4] rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-slate-800 z-20"
                >
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
                </motion.div>

                {/* Connection Status & Header */}
                <AnimatePresence>
                    {isInterfaceVisible && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute top-0 inset-x-0 p-6 flex items-center justify-between z-30 bg-gradient-to-b from-black/60 to-transparent"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse'}`} />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                    {connectionStatus === 'connected' ? 'Secure Connection' : 'Connecting...'}
                                </span>
                            </div>
                            <Button variant="ghost" size="icon" className="text-white bg-white/10 rounded-full" onClick={handleLeave}>
                                <X className="w-5 h-5" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Assessment & Script Drawer */}
            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <DrawerTrigger asChild>
                    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30">
                        <Button variant="secondary" className="rounded-full gap-2 px-6 h-10 border-white/10 bg-black/40 backdrop-blur-xl text-white">
                            <ChevronUp className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Assessment Drawer</span>
                        </Button>
                    </div>
                </DrawerTrigger>
                <DrawerContent className="bg-background max-h-[85vh] rounded-t-[3rem]">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-4 mt-2" />
                    <DrawerHeader>
                        <div className="flex items-center justify-between w-full px-2">
                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
                                {role === 'interviewer' ? 'Role: Interviewer' : 'Role: Candidate'}
                            </span>
                            <Button variant="ghost" size="sm" onClick={handleSwapRoles} className="h-8 gap-2 text-[10px] font-black uppercase tracking-widest">
                                <RefreshCcw className="w-3 h-3" /> Swap
                            </Button>
                        </div>
                        <DrawerTitle className="text-2xl font-black uppercase italic text-center">Session Interface</DrawerTitle>
                    </DrawerHeader>

                    <ScrollArea className="flex-1 px-6 pb-20">
                        <div className="space-y-8 py-4">
                            {role === 'interviewer' ? (
                                <>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-primary">
                                            <FileText className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Active Script: Part 1</span>
                                        </div>
                                        <div className="p-5 bg-secondary/30 rounded-3xl border border-border/40 text-sm font-medium leading-relaxed">
                                            “Describe your ideal workspace. Why is it important for you to have such a space?”
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-40">Evaluation Matrix</h3>
                                        {[
                                            { label: 'Fluency', key: 'fluency' },
                                            { label: 'Vocabulary', key: 'vocab' },
                                            { label: 'Grammar', key: 'grammar' },
                                            { label: 'Pronunciation', key: 'pron' }
                                        ].map(metric => (
                                            <div key={metric.key} className="space-y-3">
                                                <div className="flex justify-between items-center text-xs font-bold px-2">
                                                    <span className="opacity-60 uppercase tracking-widest">{metric.label}</span>
                                                    <span className="text-primary font-black">{(scores as any)[metric.key].toFixed(1)}</span>
                                                </div>
                                                <Slider
                                                    value={[(scores as any)[metric.key]]}
                                                    min={1} max={9} step={0.5}
                                                    onValueChange={([val]) => setScores(p => ({ ...p, [metric.key]: val }))}
                                                />
                                            </div>
                                        ))}

                                        <Button
                                            onClick={async () => {
                                                try {
                                                    const { error } = await supabase.from('speaking_scores').insert({
                                                        session_id: sessionId,
                                                        scorer_id: user?.id,
                                                        candidate_id: sessionData?.candidate_id === user?.id ? sessionData?.interviewer_id : sessionData?.candidate_id,
                                                        fluency_score: scores.fluency,
                                                        vocabulary_score: scores.vocab,
                                                        grammar_score: scores.grammar,
                                                        pronunciation_score: scores.pron,
                                                        overall_score: Number(((scores.fluency + scores.vocab + scores.grammar + scores.pron) / 4).toFixed(1))
                                                    });
                                                    if (error) throw error;
                                                    toast({ title: 'Session Evaluated' });
                                                    handleSwapRoles();
                                                    setIsDrawerOpen(false);
                                                } catch (e) { toast({ title: 'System Error', variant: 'destructive' }); }
                                            }}
                                            className="w-full h-16 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20"
                                        >
                                            Commit & Swap Roles
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-20 space-y-6">
                                    <div className="relative w-32 h-32 mx-auto">
                                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                                        <div className="relative w-full h-full bg-primary/5 border border-primary/20 rounded-full flex items-center justify-center">
                                            <Mic className="w-12 h-12 text-primary animate-bounce" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black uppercase tracking-tight italic">Focus Mode Active</h3>
                                        <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-[240px] mx-auto">
                                            Maintain clarity and lexical diversity. You are being evaluated in real-time.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DrawerContent>
            </Drawer>

            {/* Persistent Controls Bar */}
            <AnimatePresence>
                {isInterfaceVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 px-6 py-4 flex items-center gap-6 bg-black/60 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl"
                    >
                        <button onClick={() => {
                            localStream.current?.getAudioTracks().forEach(t => t.enabled = !t.enabled);
                            setIsMuted(!isMuted);
                        }} className={`p-3 rounded-full transition-all ${isMuted ? 'text-red-500 bg-red-500/10' : 'text-white bg-white/10'}`}>
                            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>

                        <button onClick={handleLeave} className="p-4 bg-red-500 rounded-full text-white shadow-xl shadow-red-500/30 active:scale-90 transition-transform">
                            <PhoneOff className="w-6 h-6" />
                        </button>

                        <button onClick={() => {
                            localStream.current?.getVideoTracks().forEach(t => t.enabled = !t.enabled);
                            setIsVideoOff(!isVideoOff);
                        }} className={`p-3 rounded-full transition-all ${isVideoOff ? 'text-red-500 bg-red-500/10' : 'text-white bg-white/10'}`}>
                            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error Overlay */}
            {permissionError && (
                <div className="absolute inset-0 z-[60] bg-background flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-6">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Access Denied</h2>
                    <p className="text-xs text-muted-foreground mb-8">Audio/Video access was reserved. Please check device settings.</p>
                    <Button onClick={initializeSession} className="h-14 px-10 rounded-2xl bg-primary text-white font-black uppercase tracking-widest gap-2">
                        <RefreshCcw className="w-5 h-5" /> Retry Connection
                    </Button>
                </div>
            )}
        </div>
    );
}
