interface YouTubePlayerProps {
    videoId: string;
    title?: string;
    className?: string;
}

/**
 * Secure YouTube embed using youtube-nocookie.com.
 * Only accepts a videoId (never a full URL), builds the embed URL server-side.
 * No jsapi enabled → no programmatic URL extraction.
 * Right-click blocked via overlay div.
 */
export default function YouTubePlayer({ videoId, title = 'Lecture', className = '' }: YouTubePlayerProps) {
    if (!videoId) return null;

    // Extra safety: strip any accidental full-URL input
    const cleanId = videoId.match(/^[a-zA-Z0-9_-]{11}$/) ? videoId : '';
    if (!cleanId) return (
        <div className="aspect-video bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 text-sm font-medium">
            Invalid video ID
        </div>
    );

    const src = `https://www.youtube-nocookie.com/embed/${cleanId}?rel=0&modestbranding=1&iv_load_policy=3&color=white`;

    return (
        <div className={`relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 shadow-xl ${className}`}>
            <iframe
                src={src}
                title={title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
            />
            {/* Transparent overlay to block right-click context menu on the iframe */}
            <div
                className="absolute inset-0 pointer-events-none select-none"
                onContextMenu={e => e.preventDefault()}
                style={{ zIndex: 1 }}
            />
        </div>
    );
}
