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
    RotateCcw, RotateCw, Loader2, Settings, ChevronDown, Subtitles
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
    const [ccEnabled, setCcEnabled] = useState(false);

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
                    cc_load_policy: 1,    // default to captions loaded so module is available
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
                        setTimeout(() => {
                            if (!playerRef.current) return;
                            let q = playerRef.current.getAvailableQualityLevels?.() || [];
                            if (q.length <= 1) {
                                // Provide static fallback because YouTube API often hides qualities
                                q = ['hd1080', 'hd720', 'large', 'medium', 'small', 'auto'];
                            }
                            setAvailableQualities(q);
                            setQuality(playerRef.current.getPlaybackQuality?.() || 'auto');
                            // Turn off default captions initially to respect ccEnabled=false state
                            playerRef.current.unloadModule?.('captions');
                        }, 500);
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

    const [cssFullscreen, setCssFullscreen] = useState(false);
    const [isPortrait, setIsPortrait] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleFullscreen = useCallback(async () => {
        const el = containerRef.current as any;
        const doc = document as any;

        const isNativeFullscreen = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);

        if (!isNativeFullscreen && !cssFullscreen) {
            try {
                if (el?.requestFullscreen) {
                    await el.requestFullscreen();
                } else if (el?.webkitRequestFullscreen) {
                    await el.webkitRequestFullscreen();
                } else if (el?.mozRequestFullScreen) {
                    await el.mozRequestFullScreen();
                } else if (el?.msRequestFullscreen) {
                    await el.msRequestFullscreen();
                } else {
                    setCssFullscreen(true);
                }
                
                if (window.screen && (window.screen.orientation as any)?.lock) {
                    try { await (window.screen.orientation as any).lock('landscape'); } catch (e) { /* ignore */ }
                }
            } catch (error) {
                setCssFullscreen(true);
            }
            setFullscreen(true);
        } else {
            if (isNativeFullscreen) {
                if (doc.exitFullscreen) {
                    doc.exitFullscreen();
                } else if (doc.webkitExitFullscreen) {
                    doc.webkitExitFullscreen();
                } else if (doc.mozCancelFullScreen) {
                    doc.mozCancelFullScreen();
                } else if (doc.msExitFullscreen) {
                    doc.msExitFullscreen();
                }
            }
            if (cssFullscreen) {
                setCssFullscreen(false);
            }
            if (window.screen && window.screen.orientation?.unlock) {
                try { window.screen.orientation.unlock(); } catch (e) { /* ignore */ }
            }
            setFullscreen(false);
        }
    }, [cssFullscreen]);

    const toggleCC = useCallback(() => {
        if (!playerRef.current) return;
        if (ccEnabled) {
            playerRef.current.unloadModule?.('captions');
            setCcEnabled(false);
        } else {
            playerRef.current.loadModule?.('captions');
            playerRef.current.setOption?.('captions', 'track', { languageCode: 'en' });
            setCcEnabled(true);
        }
    }, [ccEnabled]);

    useEffect(() => {
        const h = () => {
            const doc = document as any;
            const isNativeFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
            if (!isNativeFs && !cssFullscreen) {
                setFullscreen(false);
            }
        };
        document.addEventListener('fullscreenchange', h);
        document.addEventListener('webkitfullscreenchange', h);
        document.addEventListener('mozfullscreenchange', h);
        document.addEventListener('MSFullscreenChange', h);
        return () => {
            document.removeEventListener('fullscreenchange', h);
            document.removeEventListener('webkitfullscreenchange', h);
            document.removeEventListener('mozfullscreenchange', h);
            document.removeEventListener('MSFullscreenChange', h);
        };
    }, [cssFullscreen]);

    // ── Seek bar drag (Mouse + Touch) ─────────────────────────────────────────
    const handleSeekStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setIsDragging(true);
        
        const getPct = (ev: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
            const clientX = 'touches' in ev ? ev.touches[0].clientX : (ev as any).clientX;
            const rect = seekBarRef.current?.getBoundingClientRect();
            if (!rect) return 0;
            return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
        };
        
        seek(getPct(e));

        const onMove = (ev: MouseEvent | TouchEvent) => seek(getPct(ev));
        const onUp = () => { 
            setIsDragging(false); 
            document.removeEventListener('mousemove', onMove); 
            document.removeEventListener('mouseup', onUp); 
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onUp);
        };
        
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
    };

    // ── Auto-hide controls ────────────────────────────────────────────────────
    const bumpControls = () => {
        setShowControls(true);
        clearTimeout(hideTimer.current);
        if (state === 'playing') hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    };

    useEffect(() => { 
        if (state !== 'playing') { 
            setShowControls(true); 
            clearTimeout(hideTimer.current); 
        } else {
            // When transitioning to playing, auto-hide after 3 seconds
            clearTimeout(hideTimer.current);
            hideTimer.current = setTimeout(() => setShowControls(false), 3000);
        }
    }, [state]);

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

    // ── Overlay Click / Double Tap ────────────────────────────────────────────
    const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
    const tapTimerRef = useRef<any>(null);

    const handleOverlayClick = (e: React.MouseEvent) => {
        const now = Date.now();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        if (now - lastTapRef.current.time < 300) {
            // Double tap detected
            clearTimeout(tapTimerRef.current);
            if (x < rect.width / 3) {
                skip(-10);
                bumpControls();
            } else if (x > (rect.width * 2) / 3) {
                skip(10);
                bumpControls();
            } else {
                toggleFullscreen();
            }
            lastTapRef.current = { time: 0, x: 0 };
            return;
        }
        
        lastTapRef.current = { time: now, x };

        // Schedule single tap action
        tapTimerRef.current = setTimeout(() => {
            if (!showControls) {
                bumpControls();
            } else {
                togglePlay();
            }
        }, 300);
    };

    const isPlaying = state === 'playing';
    const showOverlayPlay = state === 'ready' || state === 'paused' || state === 'ended';

    const getFullscreenStyle = (): React.CSSProperties => {
        if (!cssFullscreen) return { aspectRatio: '16/9' };
        if (isPortrait) {
            return {
                position: 'fixed',
                top: '50%',
                left: '50%',
                width: `${window.innerHeight}px`,
                height: `${window.innerWidth}px`,
                transform: 'translate(-50%, -50%) rotate(90deg)',
                transformOrigin: 'center center',
                zIndex: 999999,
            };
        }
        return {
            position: 'fixed',
            inset: 0,
            width: '100dvw',
            height: '100dvh',
            zIndex: 999999,
        };
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "bg-black select-none group",
                cssFullscreen ? "" : "relative w-full"
            )}
            style={getFullscreenStyle()}
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
                    onClick={handleOverlayClick}
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
                    'absolute top-0 inset-x-0 z-50 bg-gradient-to-b from-black/80 via-black/40 to-transparent px-5 pt-4 pb-10 transition-opacity duration-300 pointer-events-none flex justify-between items-start',
                    showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
                )}>
                    <p className="text-white text-sm font-bold drop-shadow max-w-xl line-clamp-1 flex-1">{title}</p>
                    <div className="flex-shrink-0 flex items-center gap-2">
                        <img src="/logo-dark-full.webp" alt="Italostudy" className="h-5 object-contain opacity-90 drop-shadow-md" onError={(e) => e.currentTarget.src = '/logo.png'} />
                        <div className="bg-red-600 w-2 h-2 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                    </div>
                </div>
            )}

            {/* ── Controls bar ── */}
            <div className={cn(
                'absolute bottom-0 inset-x-0 z-50 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-3 md:px-4 pt-10 pb-4 md:pb-3 transition-opacity duration-300',
                showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}>
                {/* ── Seek bar ── */}
                <div className="mb-3">
                    <div
                        ref={seekBarRef}
                        className="relative w-full h-1 rounded-full cursor-pointer group/seek hover:h-2.5 transition-all duration-150"
                        style={{ background: 'rgba(255,255,255,0.2)' }}
                        onMouseDown={handleSeekStart}
                        onTouchStart={handleSeekStart}
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
                <div className="flex items-center gap-1 md:gap-1.5">
                    {/* Skip back 10s */}
                    <button
                        onClick={e => { e.stopPropagation(); skip(-10); }}
                        className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10 shrink-0"
                    >
                        <RotateCcw className="w-4 h-4 md:w-4 md:h-4" />
                    </button>

                    {/* Play / Pause */}
                    <button
                        onClick={e => { e.stopPropagation(); togglePlay(); }}
                        className="w-11 h-11 md:w-9 md:h-9 flex items-center justify-center text-white hover:text-white/80 transition-colors rounded-lg hover:bg-white/10 shrink-0"
                    >
                        {isPlaying
                            ? <Pause className="w-5 h-5 md:w-5 md:h-5" fill="white" />
                            : <Play className="w-5 h-5 md:w-5 md:h-5 ml-0.5" fill="white" />}
                    </button>

                    {/* Skip forward 10s */}
                    <button
                        onClick={e => { e.stopPropagation(); skip(10); }}
                        className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10 shrink-0"
                    >
                        <RotateCw className="w-4 h-4 md:w-4 md:h-4" />
                    </button>

                    {/* Mute */}
                    <button
                        onClick={e => { e.stopPropagation(); toggleMute(); }}
                        className="w-10 h-10 md:w-8 md:h-8 hidden sm:flex items-center justify-center text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10 shrink-0"
                    >
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    {/* Time */}
                    <span className="text-white/70 text-[10px] md:text-xs font-mono ml-1 flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                        {fmtTime(current)} / {fmtTime(duration)}
                    </span>

                    {/* CC Toggle */}
                    <button
                        onClick={e => { e.stopPropagation(); toggleCC(); }}
                        className={cn(
                            "w-10 h-10 md:w-8 md:h-8 flex items-center justify-center transition-colors rounded-lg hover:bg-white/10 shrink-0",
                            ccEnabled ? "text-red-400" : "text-white/80 hover:text-white"
                        )}
                        title="Closed Captions"
                    >
                        <Subtitles className="w-4 h-4" />
                    </button>

                    {/* ── Speed picker ── */}
                    <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => { setShowSpeedMenu(s => !s); setShowQualityMenu(false); }}
                            className="flex items-center gap-1 text-white/80 hover:text-white text-[11px] md:text-xs font-bold px-2 h-10 md:h-8 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
                        >
                            {speed === 1 ? '1×' : `${speed}×`}
                        </button>
                        {showSpeedMenu && (
                            <div className="absolute bottom-full mb-2 right-0 bg-black/95 border border-white/10 rounded-xl py-1 min-w-[100px] md:min-w-[90px] shadow-2xl z-[60]">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 px-3 py-1">Speed</p>
                                {SPEEDS.map(s => (
                                    <button key={s} onClick={() => setSpeedVal(s)}
                                        className={cn('w-full text-left px-4 py-2.5 md:px-3 md:py-1.5 text-xs font-bold hover:bg-white/10 transition-colors',
                                            speed === s ? 'text-red-400' : 'text-white/80')}>
                                        {s === 1 ? '1× (Normal)' : `${s}×`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Quality picker ── */}
                    {availableQualities.length > 1 && (
                        <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => { setShowQualityMenu(s => !s); setShowSpeedMenu(false); }}
                                className="flex items-center gap-1 text-white/80 hover:text-white text-[11px] md:text-xs font-bold px-2 h-10 md:h-8 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
                            >
                                <Settings className="w-3.5 h-3.5 md:w-3.5 md:h-3.5" />
                                {QUALITY_LABELS[quality] || quality}
                            </button>
                            {showQualityMenu && (
                                <div className="absolute bottom-full mb-2 right-0 bg-black/95 border border-white/10 rounded-xl py-1 min-w-[120px] md:min-w-[110px] shadow-2xl z-[60]">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40 px-3 py-1">Quality</p>
                                    {availableQualities.map(q => (
                                        <button key={q} onClick={() => setQualityVal(q)}
                                            className={cn('w-full text-left px-4 py-2.5 md:px-3 md:py-1.5 text-xs font-bold hover:bg-white/10 transition-colors',
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
                        className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10 shrink-0"
                    >
                        {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
