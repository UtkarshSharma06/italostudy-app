import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Mic, MicOff, Video, VideoOff, PhoneOff, RefreshCcw, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Device } from '@capacitor/device';

// Setup WebRTC config
const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export default function SpeakingSession() {
    const { sessionId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Session State
    const [sessionData, setSessionData] = useState<any>(null);
    const [role, setRole] = useState<'interviewer' | 'candidate' | 'observer'>('observer');
    const [connectionStatus, setConnectionStatus] = useState('Initializing...');

    // Media State
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);

    // Scoring State (Interviewer Only)
    const [scores, setScores] = useState({ fluency: 6.0, vocab: 6.0, grammar: 6.0, pron: 6.0 });
    const [permissionError, setPermissionError] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionId || !user) return;
        initializeSession();
        return () => cleanupSession();
    }, [sessionId, user]);

    const initializeSession = async () => {
        try {
            // 1. Fetch Session Data
            const { data, error } = await supabase.from('speaking_sessions').select('*').eq('id', sessionId).single();
            if (error) throw error;
            setSessionData(data);

            // 2. Determine Role
            const session = data as any;
            if (user?.id === session.interviewer_id) setRole('interviewer');
            else if (user?.id === session.candidate_id) setRole('candidate');

            // 3. Initialize Media
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Camera/Microphone access is only available in secure contexts (HTTPS or localhost).");
            }

            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStream.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            setPermissionError(null);

            // 4. Setup Peer Connection
            setupWebRTC(session.interviewer_id === user?.id);

        } catch (err: any) {
            console.error(err);
            const info = await Device.getInfo();
            if (info.platform !== 'web') {
                setPermissionError("Camera/Microphone access was denied. Please check your app permissions in Settings.");
            } else {
                setPermissionError(err.message);
            }
            toast({ title: 'Hardware Error', description: "Permission denied. Tap the retry button.", variant: 'destructive' });
        }
    };

    const setupWebRTC = (isInitiator: boolean) => {
        const pc = new RTCPeerConnection(rtcConfig);
        peerConnection.current = pc;

        // Add Local Tracks
        localStream.current?.getTracks().forEach(track => pc.addTrack(track, localStream.current!));

        // Handle Remote Stream
        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        // Handle ICE Candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal('ice-candidate', event.candidate);
            }
        };

        pc.onconnectionstatechange = () => setConnectionStatus(pc.connectionState);

        // Listen for Signaling
        const channel = supabase.channel(`speaking_${sessionId}`)
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
                    toast({
                        title: 'Roles Swapped',
                        description: `You are now the ${role === 'interviewer' ? 'Candidate' : 'Interviewer'}`
                    });
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
        <Layout showFooter={false}>
            <div className="h-[calc(100vh-4.5rem)] flex flex-col lg:flex-row bg-[#020617] relative">
                {/* STUDIO VIEW (Main Interaction Area) */}
                <div className="flex-1 relative bg-black/40 lg:m-4 lg:rounded-[2rem] overflow-hidden flex items-center justify-center border border-white/5 shadow-2xl">
                    {/* Background Texture for "Studio" feel */}
                    <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

                    {permissionError && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md p-6 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Access Required</h2>
                            <p className="text-sm text-muted-foreground max-w-xs mb-8">{permissionError}</p>
                            <Button
                                onClick={() => initializeSession()}
                                className="h-14 px-8 rounded-2xl bg-primary text-white font-black uppercase tracking-widest gap-2"
                            >
                                <RefreshCcw className="w-5 h-5" /> Retry Connection
                            </Button>
                        </div>
                    )}

                    {/* Remote Participant Video */}
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover bg-slate-900 transition-opacity duration-1000"
                    />

                    {/* Connection Status Badge */}
                    <div className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                        <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 animate-pulse'}`} />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            {connectionStatus === 'connected' ? 'Secure Link Established' : `Connecting: ${connectionStatus}`}
                        </span>
                    </div>

                    {/* Local PIP (Speaker Self-View) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute bottom-24 lg:bottom-10 right-10 w-48 md:w-64 aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/20 z-20 bg-slate-800"
                    >
                        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[9px] font-bold text-white uppercase tracking-wider">
                            You
                        </div>
                    </motion.div>

                    {/* Floating Controls Bar */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 p-3 lg:p-4 rounded-[2rem] bg-white/10 dark:bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl transition-all hover:scale-105">
                        <Button
                            size="icon"
                            variant={isMuted ? "destructive" : "ghost"}
                            className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full transition-all ${!isMuted ? 'text-white hover:bg-white/10' : ''}`}
                            onClick={() => {
                                localStream.current?.getAudioTracks().forEach(t => t.enabled = !t.enabled);
                                setIsMuted(!isMuted);
                            }}
                        >
                            {isMuted ? <MicOff className="w-5 h-5 lg:w-6 lg:h-6" /> : <Mic className="w-5 h-5 lg:w-6 lg:h-6" />}
                        </Button>
                        <Button
                            size="icon"
                            variant={isVideoOff ? "destructive" : "ghost"}
                            className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full transition-all ${!isVideoOff ? 'text-white hover:bg-white/10' : ''}`}
                            onClick={() => {
                                localStream.current?.getVideoTracks().forEach(t => t.enabled = !t.enabled);
                                setIsVideoOff(!isVideoOff);
                            }}
                        >
                            {isVideoOff ? <VideoOff className="w-5 h-5 lg:w-6 lg:h-6" /> : <Video className="w-5 h-5 lg:w-6 lg:h-6" />}
                        </Button>
                        <div className="w-px h-8 bg-white/10 mx-1" />
                        <Button
                            size="icon"
                            variant="destructive"
                            className="w-12 h-12 lg:w-14 lg:h-14 rounded-full shadow-lg shadow-red-500/20 active:scale-90 transition-transform"
                            onClick={handleLeave}
                        >
                            <PhoneOff className="w-5 h-5 lg:w-6 lg:h-6" />
                        </Button>
                    </div>
                </div>

                {/* SIDEBAR VIEW (Script & Assessment Area) */}
                <div className="w-full lg:w-[450px] xl:w-[500px] h-full bg-white dark:bg-[#020617] lg:m-4 lg:ml-0 lg:rounded-[2rem] border border-slate-200 dark:border-white/10 flex flex-col shadow-xl overflow-hidden">
                    {/* Sidebar Header */}
                    <div className="p-8 pb-6 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {role === 'interviewer' ? 'Current: Interviewer' : 'Current: Candidate'}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSwapRoles}
                                className="h-8 gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-500 dark:text-slate-400"
                            >
                                <RefreshCcw className="w-3 h-3" /> Swap Roles
                            </Button>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">IELTS Simulation</h2>
                    </div>

                    <ScrollArea className="flex-1 px-8 py-6">
                        <AnimatePresence mode="wait">
                            {role === 'interviewer' ? (
                                <motion.div
                                    key="expert-mode"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-10"
                                >
                                    {/* Expert Script */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                            <FileText className="w-4 h-4" />
                                            <span className="text-xs font-black uppercase tracking-widest">Part 1: Initial Interview</span>
                                        </div>
                                        <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Procedural Script:</p>
                                            <div className="space-y-4 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                                <p>“Tell me about your hometown. What is it like?”</p>
                                                <p>“Do you work or are you a student?”</p>
                                                <p>“Do you think it's important to have a hobby? Why?”</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Evaluation Matrix */}
                                    <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-white/5">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Live Assessment (0.0 - 9.0)</h3>
                                        {[
                                            { label: 'Fluency & Coherence', key: 'fluency' },
                                            { label: 'Lexical Resource', key: 'vocab' },
                                            { label: 'Grammar Range', key: 'grammar' },
                                            { label: 'Pronunciation', key: 'pron' }
                                        ].map(metric => (
                                            <div key={metric.key} className="space-y-3">
                                                <div className="flex justify-between items-center bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-100 dark:border-white/5">
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{metric.label}</span>
                                                    <span className="text-lg font-black text-indigo-600 tracking-tighter">{(scores as any)[metric.key].toFixed(1)}</span>
                                                </div>
                                                <Slider
                                                    value={[(scores as any)[metric.key]]}
                                                    min={1} max={9} step={0.5}
                                                    onValueChange={([val]) => setScores(p => ({ ...p, [metric.key]: val }))}
                                                    className="[&>.relative>.absolute]:bg-indigo-600 py-2"
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
                                                    toast({ title: 'Evaluation Recorded', description: 'Swapping roles for the next phase...' });
                                                    handleSwapRoles();
                                                } catch (err: any) {
                                                    toast({ title: 'Error', description: 'Failed to save scores', variant: 'destructive' });
                                                }
                                            }}
                                            className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all"
                                        >
                                            Submit Evaluation & Swap
                                        </Button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="candidate-mode"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col items-center justify-center text-center space-y-8 pt-20"
                                >
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                                        <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 relative z-10 border border-indigo-100 dark:border-indigo-500/20">
                                            <Mic className="w-14 h-14 animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="space-y-4 px-6">
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Speak with Clarity</h3>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                            Your performance is being evaluated by a peer expert. Focus on your delivery, intonation, and vocabulary range.
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </ScrollArea>
                </div>
            </div>
        </Layout>
    );
}

