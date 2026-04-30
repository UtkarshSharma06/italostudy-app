import React, { useState, useEffect } from 'react';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff, Settings, Monitor, Minimize2, Hash,
    Users, MessageSquare, Hand, Layout
} from 'lucide-react';
import {
    LiveKitRoom,
    RoomAudioRenderer,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface VoiceCallViewProps {
    roomName: string;
    displayName: string;
    avatarUrl?: string;
    token: string;
    serverUrl: string;
    isCreator: boolean;
    onClose: () => void;
    onEndSession: () => void;
}

export function VoiceCallView({
    roomName,
    displayName,
    avatarUrl,
    token,
    serverUrl,
    isCreator,
    onClose,
    onEndSession
}: VoiceCallViewProps) {
    const [callDuration, setCallDuration] = useState(0);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#0b141a] flex flex-col items-center justify-between animate-in fade-in duration-500 overflow-hidden font-sans text-white">
            {connectionError ? (
                <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md px-6 text-center z-50">
                    <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                        <PhoneOff className="h-10 w-10 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Connection Failed</h3>
                    <p className="text-gray-400 text-sm mb-8">
                        {connectionError === 'Unauthorized'
                            ? "Authentication failed. Your LiveKit API Secret might be incorrect or has expired. Please verify your Supabase secrets."
                            : connectionError}
                    </p>
                    <div className="flex flex-col w-full gap-3">
                        <Button
                            onClick={onClose}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/10"
                        >
                            Close Overlay
                        </Button>
                    </div>

                    {/* Branding footer in error state */}
                    <div className="mt-12 opacity-20 flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">ITALOSTUDY Protocol</span>
                    </div>
                </div>
            ) : (
                <LiveKitRoom
                    video={false}
                    audio={true}
                    token={token}
                    serverUrl={serverUrl}
                    onDisconnected={() => {
                        onClose();
                    }}
                    onError={(err) => {
                        console.error('LiveKit connection error event:', err);
                        setConnectionError(err.message || 'Unauthorized');
                    }}
                    className="flex flex-col flex-1 w-full relative"
                >
                    {/* Background Texture/Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#111b21]/50 to-black/80 pointer-events-none z-0" />

                    {/* Call Info Header */}
                    <div className="relative z-10 w-full text-center flex flex-col items-center gap-2 mt-16 px-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10 mb-2">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">
                                LiveKit Secure Link
                            </span>
                        </div>

                        <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                            {roomName.replace('comm_', '').split('_')[0]} Room
                        </h2>
                        <div className="text-emerald-400 font-mono text-sm font-bold tracking-wider">
                            {formatTime(callDuration)}
                        </div>
                    </div>

                    {/* Central Focus (Native Audio Renderer) */}
                    <RoomAudioRenderer />

                    <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-xl px-4">
                        <div className="relative">
                            <Avatar className="h-32 w-32 md:h-44 md:w-44 border-4 border-[#202c33] shadow-2xl ring-2 ring-emerald-500/50">
                                <AvatarImage src={avatarUrl} className="object-cover" />
                                <AvatarFallback className="bg-[#202c33] text-white text-4xl font-bold">
                                    {displayName?.[0] || 'U'}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        <p className="text-white font-black mt-8 text-2xl tracking-tight leading-none text-center">
                            {displayName}
                        </p>
                        <div className="flex items-center gap-2 mt-4">
                            <span className="text-emerald-500 text-[11px] font-black uppercase tracking-[0.3em] animate-pulse">
                                Active Session
                            </span>
                        </div>
                    </div>

                    {/* Native Control Bar (WhatsApp Style) */}
                    <div className="relative z-20 pb-16 pt-8 w-full flex flex-col items-center gap-8 bg-gradient-to-t from-black/60 to-transparent">
                        <div className="flex items-center justify-center gap-6 md:gap-10">
                            <CallControls
                                isCreator={isCreator}
                                onEndSession={onEndSession}
                                onClose={onClose}
                            />
                        </div>

                        {/* Footer Branding */}
                        <div className="flex items-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default pb-4">
                            <Hash className="h-4 w-4 text-emerald-500" />
                            <span className="text-[10px] font-black text-white uppercase tracking-tighter">ITALOSTUDY Protocol</span>
                        </div>
                    </div>

                    {/* Close Cross (Top Right) */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="absolute top-8 right-8 z-30 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                    >
                        <Minimize2 className="h-5 w-5" />
                    </Button>
                </LiveKitRoom>
            )}
        </div>
    );
}

// Sub-component for controls to access LiveKit hooks
function CallControls({ isCreator, onEndSession, onClose }: { isCreator: boolean, onEndSession: () => void, onClose: () => void }) {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // Note: LiveKit provided components can be used or custom buttons linked to Room object
    // For simplicity and custom look, we use standard buttons that will trigger room state

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                className={`h-14 w-14 md:h-16 md:w-16 rounded-full border-2 transition-all duration-300 shadow-lg ${isMuted
                    ? 'bg-red-500/20 border-red-500/50 text-red-500'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
            >
                {isMuted ? <MicOff className="h-6 w-6 md:h-7 md:w-7" /> : <Mic className="h-6 w-6 md:h-7 md:w-7" />}
            </Button>

            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={`h-14 w-14 md:h-16 md:w-16 rounded-full border-2 transition-all duration-300 shadow-lg ${!isVideoOn
                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500'}`}
            >
                {!isVideoOn ? <VideoOff className="h-6 w-6 md:h-7 md:w-7" /> : <Video className="h-6 w-6 md:h-7 md:w-7" />}
            </Button>

            <Button
                variant="destructive"
                size="icon"
                onClick={isCreator ? onEndSession : onClose}
                className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-red-600 hover:bg-red-700 border-4 border-[#0b141a] shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center p-0"
            >
                <PhoneOff className="h-8 w-8 md:h-10 md:w-10 fill-current" />
            </Button>

            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsScreenSharing(!isScreenSharing)}
                className={`h-14 w-14 md:h-16 md:w-16 rounded-full border-2 transition-all duration-300 shadow-lg ${!isScreenSharing
                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-500'}`}
            >
                <Monitor className="h-6 w-6 md:h-7 md:w-7" />
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-white/10 border-2 border-white/20 text-white hover:bg-white/20 shadow-lg"
            >
                <Settings className="h-6 w-6 md:h-7 md:w-7" />
            </Button>
        </>
    );
}
