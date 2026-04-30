/**
 * Proxies a Supabase storage URL to a local /assets path to hide the Supabase domain.
 * Example: https://xxx.supabase.co/storage/v1/object/public/learning-assets/file.pdf 
 * becomes /assets/learning-assets/file.pdf
 */
export const getProxiedUrl = (url: string | null | undefined): string => {
    if (!url) return '';

    // Check if it's a Supabase storage URL
    if (url.includes('.supabase.co/storage/v1/object/public/')) {
        const parts = url.split('/storage/v1/object/public/');
        if (parts.length === 2) {
            // return `/assets/${parts[1]}`;
            // Proxy is not configured in Vite, returning original URL
            return url;
        }
    }

    return url;
};

/**
 * Transforms a standard video or document URL into an embeddable format.
 * Handles:
 * - YouTube (watch?v=... -> embed/...)
 * - Vimeo (vimeo.com/... -> player.vimeo.com/video/...)
 * - Google Drive (file/d/.../view -> file/d/.../preview)
 */
export const getEmbedUrl = (url: string | null | undefined): string => {
    if (!url) return '';

    try {
        // YouTube handling
        if (url.includes('youtube.com/watch')) {
            const videoId = new URL(url).searchParams.get('v');
            if (videoId) return `https://www.youtube.com/embed/${videoId}?modestbranding=1`;
        }
        if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1].split('?')[0];
            if (videoId) return `https://www.youtube.com/embed/${videoId}?modestbranding=1`;
        }

        // Vimeo handling
        if (url.includes('vimeo.com/') && !url.includes('player.vimeo.com')) {
            const videoId = url.split('vimeo.com/')[1].split('?')[0];
            if (videoId && !isNaN(Number(videoId))) {
                return `https://player.vimeo.com/video/${videoId}`;
            }
        }

        // Google Drive handling
        if (url.includes('drive.google.com/file/d/')) {
            if (url.endsWith('/view') || url.includes('/view?')) {
                return url.replace('/view', '/preview');
            }
            if (!url.includes('/preview')) {
                // Ensure it ends with /preview if it's a file link
                const base = url.split('?')[0];
                return `${base}/preview`;
            }
        }

        return url;
    } catch (e) {
        return url;
    }
};

/**
 * Checks if a URL is likely to be embeddable in an iframe.
 * If not, we should provide a link to open in a new tab.
 */
export const isEmbeddable = (url: string | null | undefined): boolean => {
    if (!url) return false;

    // Explicitly non-embeddable common domains
    const nonEmbeddable = [
        'google.com',
        'facebook.com',
        'instagram.com',
        'twitter.com',
        'linkedin.com'
    ];

    try {
        const hostname = new URL(url).hostname.replace('www.', '');

        // If it's a Google Drive preview/embed link, it is embeddable
        if (url.includes('drive.google.com') && (url.includes('/preview') || url.includes('/embed'))) {
            return true;
        }

        // If it's a YouTube embed link, it is embeddable
        if (url.includes('youtube.com/embed') || url.includes('player.vimeo.com')) {
            return true;
        }

        // If it's in the blacklist and not an embed URL, it's blocked
        if (nonEmbeddable.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
            return false;
        }

        return true; // Assume others are okay or handled by server CSP
    } catch (e) {
        return false;
    }
};
