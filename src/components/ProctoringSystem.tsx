import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import {
    AlertTriangle,
    Monitor,
    Camera,
    ShieldAlert,
    ChevronDown,
    ChevronUp,
    ScanFace,
    EyeOff,
    Smartphone
} from 'lucide-react';
import { Button } from './ui/button';
import { useProctoring } from '@/hooks/useProctoring';

interface ProctoringSystemProps {
    testId: string;
    onViolationThresholdReached: () => void;
    isActive: boolean;
}

/**
 * ProctoringSystem — Performance Optimized
 * - Removed framer-motion (no animated width/height)
 * - Removed backdrop-blur
 * - Removed scanning line animation
 * - Camera preview is hidden by default (minimized) — video still feeds AI, just not displayed
 * - Simple CSS transitions only
 */
export default function ProctoringSystem({ testId, onViolationThresholdReached, isActive }: ProctoringSystemProps) {
    const { user } = useAuth();
    // Start minimized to avoid rendering the camera preview (saves GPU)
    const [isMinimized, setIsMinimized] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null); // Preview (only rendered when expanded)
    const hiddenVideoRef = useRef<HTMLVideoElement>(null); // Always runs for AI detection

    const {
        aiState,
        violationCount,
        isFullscreen,
        cameraAllowed,
        videoStream,
        enterFullscreen,
        requestPermissions,
        setVideoElement
    } = useProctoring({
        testId,
        userId: user?.id || '',
        enabled: isActive,
        onDisqualify: onViolationThresholdReached
    });

    useEffect(() => {
        if (isActive) {
            requestPermissions();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive]);

    // Wire the HIDDEN video element always for AI — this keeps detection alive when minimized
    useEffect(() => {
        if (hiddenVideoRef.current && videoStream) {
            hiddenVideoRef.current.srcObject = videoStream;
            hiddenVideoRef.current.play().catch(() => {});
            setVideoElement(hiddenVideoRef.current);
        }
    }, [videoStream, setVideoElement]);

    // Also wire the visible preview when expanded
    useEffect(() => {
        if (videoRef.current && videoStream && !isMinimized) {
            videoRef.current.srcObject = videoStream;
            videoRef.current.play().catch(() => {});
        }
    }, [videoStream, isMinimized]);

    if (!isActive) return null;

    const MAX_WARNINGS = 5;
    const integrityScore = Math.max(0, 100 - (violationCount * 20));

    const statusItems = [
        { label: 'Camera', ok: cameraAllowed, icon: Camera },
        { label: 'Fullscreen', ok: isFullscreen, icon: Monitor },
        { label: 'Face', ok: aiState.facePresent, icon: ScanFace },
        { label: 'Screen', ok: aiState.screenFocused, icon: EyeOff },
        { label: 'No Phone', ok: !aiState.phoneDetected, icon: Smartphone },
        { label: 'One Person', ok: aiState.faceCount <= 1, icon: ShieldAlert },
    ];

    return (
        <div className="fixed bottom-28 left-4 z-[60]">
            {/* Hidden video — always active for AI, never displayed */}
            <video
                ref={hiddenVideoRef}
                autoPlay
                muted
                playsInline
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            />
            <div
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden"
                style={{ width: isMinimized ? '160px' : '280px' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 h-11 cursor-pointer border-b border-slate-100 dark:border-slate-800"
                    onClick={() => setIsMinimized(!isMinimized)}
                >
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${violationCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Proctor</span>
                        {violationCount > 0 && (
                            <span className="text-[8px] font-black text-rose-600">{violationCount}/{MAX_WARNINGS}</span>
                        )}
                    </div>
                    {isMinimized
                        ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    }
                </div>

                {/* Expanded panel — only rendered when open */}
                {!isMinimized && (
                    <div className="p-4 space-y-3">
                        {/* Camera preview — only loaded when panel is open */}
                        <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-video border border-slate-200 dark:border-slate-700">
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover scale-x-[-1]"
                            />
                            {/* Bounding box overlays */}
                            {aiState.detections?.map((d, i) => {
                                const sw = videoRef.current?.videoWidth || 640;
                                const sh = videoRef.current?.videoHeight || 480;
                                const [x, y, w, h] = d.bbox;
                                const isPhone = ['cell phone', 'phone', 'tablet', 'laptop'].includes(d.label);
                                return (
                                    <div
                                        key={i}
                                        className={`absolute border-2 pointer-events-none ${isPhone ? 'border-rose-500' : d.label === 'person' ? 'border-amber-400' : 'border-blue-500'}`}
                                        style={{
                                            left: `${((sw - (x + w)) / sw) * 100}%`,
                                            top: `${(y / sh) * 100}%`,
                                            width: `${(w / sw) * 100}%`,
                                            height: `${(h / sh) * 100}%`,
                                        }}
                                    />
                                );
                            })}
                        </div>

                        {/* Status grid */}
                        <div className="grid grid-cols-2 gap-1.5">
                            {statusItems.map((item) => (
                                <div key={item.label} className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    <item.icon className={`w-3 h-3 ${item.ok ? 'text-slate-400' : 'text-rose-500'}`} />
                                    <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wide">{item.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Integrity bar */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-[8px] text-slate-400 uppercase tracking-widest">Integrity</span>
                                <span className={`text-[8px] font-bold ${violationCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{integrityScore}%</span>
                            </div>
                            <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${violationCount === 0 ? 'bg-emerald-500' : violationCount < 3 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                    style={{ width: `${integrityScore}%` }}
                                />
                            </div>
                        </div>

                        {!isFullscreen && (
                            <Button
                                onClick={(e) => { e.stopPropagation(); enterFullscreen(); }}
                                className="w-full h-9 bg-slate-900 text-white text-[9px] font-bold uppercase tracking-widest rounded-xl"
                            >
                                Restore Fullscreen
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
