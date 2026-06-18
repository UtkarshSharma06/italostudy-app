/**
 * SecureYouTubePlayer — PW-style full-width protected player
 *
 * ✅ Autoplay on click (user gesture satisfies browser policy)
 * ✅ Custom controls: play/pause, skip ±10s, seek bar, mute, speed, quality, fullscreen
 * ✅ Hides YouTube logo / share / "Watch on YouTube" via overlay + nocookie embed
 * ✅ Transparent overlay blocks right-click, drag, context menu on iframe
 * ✅ Blocks F12 / Ctrl+Shift+I / Ctrl+U inside the player
 * ✅ Dark PW-style controls bar
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    RotateCcw, RotateCw, Loader2, Settings, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
        _ytApiLoading?: boolean;
        _ytApiReady?: boolean;
    }
}

interface Props {
    videoId: string;
    title?: string;
    thumbnail?: string;
    startSeconds?: number;
    onProgress?: (seconds: number) => void;
    onEnded?: () => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const QUALITY_LABELS: Record<string, string> = {
    highres: '4K', hd1080: '1080p', hd720: '720p',
    large: '480p', medium: '360p', small: '240p', auto: 'Auto',
};

function loadYTApi(): Promise<void> {
    if (window.YT?.Player && window._ytApiReady) return Promise.resolve();
    return new Promise(resolve => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            window._ytApiReady = true;
            prev?.();
            resolve();
        };
        if (!window._ytApiLoading) {
            window._ytApiLoading = true;
            const s = document.createElement('script');
            s.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(s);
        }
    });
}

function fmtTime(sec: number) {
    const s = Math.floor(sec) || 0;
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export default function SecureYouTubePlayer({ videoId, title, thumbnail, startSeconds, onProgress, onEnded }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const iframeContainerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const seekBarRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<any>(null);
    const hideTimer = useRef<any>(null);

    type State = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error';
    const [state, setState] = useState<State>('idle');
    const [progress, setProgress] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [duration, setDuration] = useState(0);
    const [current, setCurrent] = useState(0);
    const [muted, setMuted] = useState(false);
    const [volume, setVolume] = useState(100);
    const [fullscreen, setFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [speed, setSpeed] = useState(1);
    const [quality, setQuality] = useState('auto');
    const [availableQualities, setAvailableQualities] = useState<string[]>([]);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const ytThumb = thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // ── Destroy old player when videoId changes ───────────────────────────────
    useEffect(() => {
        if (playerRef.current) {
            try { playerRef.current.loadVideoById(videoId); }
            catch { /* ignore */ }
            setState('ready');
            setProgress(0); setCurrent(0); setDuration(0);
        }
    }, [videoId]);

    // ── Init player (triggered by user click = allows autoplay) ──────────────
    const initPlayer = useCallback(async () => {
        if (state === 'loading') return;
        setState('loading');
        try {
            await loadYTApi();
            if (!iframeContainerRef.current) return;

            // Destroy previous instance
            try { playerRef.current?.destroy(); } catch { /* ok */ }
            playerRef.current = null;

            // Create inner div for YT to replace
            const div = document.createElement('div');
            iframeContainerRef.current.innerHTML = '';
            iframeContainerRef.current.appendChild(div);

            playerRef.current = new window.YT.Player(div, {
                videoId,
                width: '100%',
                height: '100%',
                playerVars: {
                    autoplay: 1,          // ← autoplay since triggered by user click
                    controls: 0,          // hide native controls
                    disablekb: 1,         // disable native keyboard
                    rel: 0,               // no related videos
                    modestbranding: 1,    // minimal branding
                    iv_load_policy: 3,    // no annotations
                    fs: 0,                // disable native fullscreen button
                    playsinline: 1,
                    showinfo: 0,          // hide video title/share bar
                    cc_load_policy: 0,    // no auto captions
                    start: startSeconds ? Math.floor(startSeconds) : undefined,
                    origin: window.location.origin,
                    enablejsapi: 1,
                    host: 'https://www.youtube-nocookie.com',
                },
                events: {
                    onReady: (e: any) => {
                        setState('playing'); // will be confirmed by onStateChange
                        const d = e.target.getDuration?.() || 0;
                        setDuration(d);
                        setVolume(e.target.getVolume?.() || 100);
                        e.target.setPlaybackRate?.(speed);
                        // Fetch available quality levels after a short delay
                        setTimeout(() => {
                            const qs: string[] = e.target.getAvailableQualityLevels?.() || [];
                            if (qs.length > 0) setAvailableQualities(['auto', ...qs.filter(q => q !== 'auto')]);
                        }, 2000);
                    },
                    onStateChange: (e: any) => {
                        const s = e.data;
                        const YT = window.YT.PlayerState;
                        if (s === YT.PLAYING) { setState('playing'); startTicker(); }
                        else if (s === YT.PAUSED) { setState('paused'); stopTicker(); }
                        else if (s === YT.ENDED) { setState('ended'); stopTicker(); onEnded?.(); }
                        else if (s === -1) { setState('ready'); }
                    },
                    onError: () => setState('error'),
                },
            });
        } catch { setState('error'); }
    }, [videoId, state, speed]);

    // ── Ticker ────────────────────────────────────────────────────────────────
    function startTicker() {
        stopTicker();
        intervalRef.current = setInterval(() => {
            if (!playerRef.current) return;
            try {
                const t = playerRef.current.getCurrentTime?.() || 0;
                const d = playerRef.current.getDuration?.() || 1;
                const buf = playerRef.current.getVideoLoadedFraction?.() || 0;
                setCurrent(t);
                setDuration(d);
                setProgress((t / d) * 100);
                setBuffered(buf * 100);
                if (onProgress) onProgress(t);
            } catch { /* ok */ }
        }, 250);
    }
    function stopTicker() {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    useEffect(() => () => stopTicker(), []);

    // ── Controls ──────────────────────────────────────────────────────────────
    const togglePlay = () => {
        if (state === 'idle' || state === 'error') { initPlayer(); return; }
        if (!playerRef.current) return;
        if (state === 'playing') playerRef.current.pauseVideo?.();
        else playerRef.current.playVideo?.();
    };

    const seek = (pct: number) => {
        if (!playerRef.current || !duration) return;
        const t = duration * (pct / 100);
        playerRef.current.seekTo?.(t, true);
        setCurrent(t);
        setProgress(pct);
    };

    const skip = (secs: number) => {
        if (!playerRef.current) return;
        const t = (playerRef.current.getCurrentTime?.() || 0) + secs;
        playerRef.current.seekTo?.(Math.max(0, t), true);
    };

    const toggleMute = () => {
        if (!playerRef.current) return;
        if (muted) { playerRef.current.unMute?.(); setMuted(false); }
        else { playerRef.current.mute?.(); setMuted(true); }
    };

    const setSpeedVal = (s: number) => {
        playerRef.current?.setPlaybackRate?.(s);
        setSpeed(s);
        setShowSpeedMenu(false);
    };

    const setQualityVal = (q: string) => {
        if (q === 'auto') playerRef.current?.setPlaybackQuality?.('default');
        else playerRef.current?.setPlaybackQuality?.(q);
        setQuality(q);
        setShowQualityMenu(false);
    };

    const toggleFullscreen = () => {
        const el = containerRef.current;
        if (!el) return;
        if (!document.fullscreenElement) {
            el.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    };

    useEffect(() => {
        const h = () => setFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', h);
        return () => document.removeEventListener('fullscreenchange', h);
    }, []);

    // ── Seek bar drag ─────────────────────────────────────────────────────────
    const calcSeekPct = (e: MouseEvent | React.MouseEvent) => {
        const rect = seekBarRef.current?.getBoundingClientRect();
        if (!rect) return 0;
        return Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    };

    const handleSeekMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        seek(calcSeekPct(e));
        const onMove = (ev: MouseEvent) => seek(calcSeekPct(ev));
        const onUp = () => { setIsDragging(false); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    // ── Auto-hide controls ────────────────────────────────────────────────────
    const bumpControls = () => {
        setShowControls(true);
        clearTimeout(hideTimer.current);
        if (state === 'playing') hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    };

    useEffect(() => { if (state !== 'playing') { setShowControls(true); clearTimeout(hideTimer.current); } }, [state]);

    // Close menus on outside click
    useEffect(() => {
        const h = () => { setShowSpeedMenu(false); setShowQualityMenu(false); };
        document.addEventListener('click', h);
        return () => document.removeEventListener('click', h);
    }, []);

    // ── Security: block context menu events & keyboard shortcuts ─────────────
    const blockContext = (e: React.MouseEvent) => e.preventDefault();
    const blockDrag = (e: React.DragEvent) => e.preventDefault();

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const blockKeys = (e: KeyboardEvent) => {
            if (e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
                (e.ctrlKey && ['s', 'u', 'S', 'U'].includes(e.key))) {
                e.preventDefault(); e.stopPropagation();
            }
        };
        el.addEventListener('keydown', blockKeys, true);
        return () => el.removeEventListener('keydown', blockKeys, true);
    }, []);

    const isPlaying = state === 'playing';
    const showOverlayPlay = state === 'ready' || state === 'paused' || state === 'ended';

    return (
        <div
            ref={containerRef}
            className="relative w-full bg-black select-none group"
            style={{ aspectRatio: '16/9' }}
            onMouseMove={bumpControls}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            onContextMenu={blockContext}
            onDragStart={blockDrag}
            tabIndex={0}
            onKeyDown={e => {
                if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
                else if (e.key === 'ArrowRight') skip(10);
                else if (e.key === 'ArrowLeft') skip(-10);
                else if (e.key === 'f') toggleFullscreen();
                else if (e.key === 'm') toggleMute();
            }}
        >
            {/* ── YouTube iframe container ── */}
            <div
                ref={iframeContainerRef}
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: 'none' }}
            />

            {/* ── Poster / idle state ── */}
            {(state === 'idle' || state === 'error') && (
                <div className="absolute inset-0 z-10 cursor-pointer" onClick={initPlayer}>
                    <img
                        src={ytThumb}
                        alt={title || 'Video'}
                        className="w-full h-full object-cover"
                        onError={e => {
                            const img = e.target as HTMLImageElement;
                            if (!img.src.includes('hqdefault')) {
                                img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                            }
                        }}
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 bg-white/15 backdrop-blur-sm border-2 border-white/40 rounded-full flex items-center justify-center hover:scale-110 hover:bg-white/25 transition-all duration-200 shadow-2xl">
                            <Play className="w-9 h-9 text-white ml-1.5" fill="white" />
                        </div>
                    </div>
                    {state === 'error' && (
                        <div className="absolute bottom-4 inset-x-0 text-center">
                            <span className="text-xs text-white/80 bg-black/60 px-3 py-1.5 rounded-full">Failed to load — click to retry</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Loading ── */}
            {state === 'loading' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                </div>
            )}

            {/* ── Transparent security overlay (sits on top of iframe) ── */}
            {state !== 'idle' && state !== 'loading' && (
                <div
                    className="absolute inset-0 z-30"
                    style={{
                        cursor: isPlaying && !showControls ? 'none' : 'pointer',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                    }}
                    onContextMenu={blockContext}
                    onDragStart={blockDrag}
                    onClick={togglePlay}
                    onDoubleClick={toggleFullscreen}
                />
            )}

            {/* ── Center pause/play flash ── */}
            {showOverlayPlay && (
                <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
                        {state === 'ended'
                            ? <RotateCcw className="w-7 h-7 text-white" />
                            : <Play className="w-7 h-7 text-white ml-0.5" fill="white" />}
                    </div>
                </div>
            )}

            {/* ── Title overlay (top) ── */}
            {title && (
                <div className={cn(
                    'absolute top-0 inset-x-0 z-50 bg-gradient-to-b from-black/80 via-black/40 to-transparent px-5 pt-4 pb-10 transition-opacity duration-300 pointer-events-none',
                    showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
                )}>
                    <p className="text-white text-sm font-bold drop-shadow max-w-2xl line-clamp-1">{title}</p>
                </div>
            )}

            {/* ── Controls bar ── */}
            <div className={cn(
                'absolute bottom-0 inset-x-0 z-50 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pt-10 pb-3 transition-opacity duration-300',
                showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}>
                {/* ── Seek bar ── */}
                <div className="mb-3">
                    <div
                        ref={seekBarRef}
                        className="relative w-full h-1 rounded-full cursor-pointer group/seek hover:h-2.5 transition-all duration-150"
                        style={{ background: 'rgba(255,255,255,0.2)' }}
                        onMouseDown={handleSeekMouseDown}
                    >
                        {/* Buffered */}
                        <div className="absolute inset-y-0 left-0 rounded-full bg-white/20" style={{ width: `${buffered}%` }} />
                        {/* Progress */}
                        <div className="absolute inset-y-0 left-0 rounded-full bg-red-500" style={{ width: `${progress}%` }}>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-red-500 rounded-full shadow-md opacity-0 group-hover/seek:opacity-100 transition-opacity" />
                        </div>
                    </div>
                </div>

                {/* ── Button row ── */}
                <div className="flex items-center gap-1.5">
                    {/* Skip back 10s */}
                    <button
                        onClick={e => { e.stopPropagation(); skip(-10); }}
                        className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Play / Pause */}
                    <button
                        onClick={e => { e.stopPropagation(); togglePlay(); }}
                        className="w-9 h-9 flex items-center justify-center text-white hover:text-white/80 transition-colors rounded-lg hover:bg-white/10"
                    >
                        {isPlaying
                            ? <Pause className="w-5 h-5" fill="white" />
                            : <Play className="w-5 h-5 ml-0.5" fill="white" />}
                    </button>

                    {/* Skip forward 10s */}
                    <button
                        onClick={e => { e.stopPropagation(); skip(10); }}
                        className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                    >
                        <RotateCw className="w-4 h-4" />
                    </button>

                    {/* Mute */}
                    <button
                        onClick={e => { e.stopPropagation(); toggleMute(); }}
                        className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                    >
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    {/* Time */}
                    <span className="text-white/70 text-xs font-mono ml-1 flex-1 whitespace-nowrap">
                        {fmtTime(current)} / {fmtTime(duration)}
                    </span>

                    {/* ── Speed picker ── */}
                    <div className="relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => { setShowSpeedMenu(s => !s); setShowQualityMenu(false); }}
                            className="flex items-center gap-1 text-white/80 hover:text-white text-xs font-bold px-2 h-8 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
                        >
                            {speed === 1 ? '1×' : `${speed}×`}
                        </button>
                        {showSpeedMenu && (
                            <div className="absolute bottom-full mb-2 right-0 bg-black/95 border border-white/10 rounded-xl py-1 min-w-[90px] shadow-2xl z-[60]">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 px-3 py-1">Speed</p>
                                {SPEEDS.map(s => (
                                    <button key={s} onClick={() => setSpeedVal(s)}
                                        className={cn('w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-white/10 transition-colors',
                                            speed === s ? 'text-red-400' : 'text-white/80')}>
                                        {s === 1 ? '1× (Normal)' : `${s}×`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Quality picker ── */}
                    {availableQualities.length > 1 && (
                        <div className="relative" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => { setShowQualityMenu(s => !s); setShowSpeedMenu(false); }}
                                className="flex items-center gap-1 text-white/80 hover:text-white text-xs font-bold px-2 h-8 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
                            >
                                <Settings className="w-3.5 h-3.5" />
                                {QUALITY_LABELS[quality] || quality}
                            </button>
                            {showQualityMenu && (
                                <div className="absolute bottom-full mb-2 right-0 bg-black/95 border border-white/10 rounded-xl py-1 min-w-[110px] shadow-2xl z-[60]">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40 px-3 py-1">Quality</p>
                                    {availableQualities.map(q => (
                                        <button key={q} onClick={() => setQualityVal(q)}
                                            className={cn('w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-white/10 transition-colors',
                                                quality === q ? 'text-red-400' : 'text-white/80')}>
                                            {QUALITY_LABELS[q] || q}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fullscreen */}
                    <button
                        onClick={e => { e.stopPropagation(); toggleFullscreen(); }}
                        className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                    >
                        {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
