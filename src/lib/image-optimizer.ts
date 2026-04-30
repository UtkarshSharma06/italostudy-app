
/**
 * Optimizes image URLs by appending transformation parameters.
 * Prefers ImageKit for transformations if available, as it works on Supabase Free Plan.
 */
const IMAGEKIT_URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/italostudy';

/**
 * Optimizes image URLs by appending transformation parameters.
 * 
 * @param url The original image URL
 * @param width The desired width
 * @param height The desired height (optional)
 * @param quality The image quality (0-100, default 80)
 * @returns The optimized URL
 */
export function getOptimizedImageUrl(url: string | null | undefined, width: number = 800, height?: number, quality: number = 80): string {
    if (!url) return '';

    // 1. Handle ImageKit URLs directly
    if (url.includes('ik.imagekit.io')) {
        const separator = url.includes('?') ? '&' : '?';
        let transform = `tr=w-${width},q-${quality}`;
        if (height) transform += `,h-${height}`;

        // Robust slash normalization: replace double slashes (except after protocol)
        const optimized = `${url}${separator}${transform}`;
        return optimized.replace(/([^:]\/)\/+/g, "$1");
    }

    // 2. Handle Supabase URLs by routing through ImageKit Proxy (Free Plan Friendly)
    if (url.includes('supabase.co/storage/v1/object/public')) {
        const path = url.split('/object/public/')[1];
        if (path) {
            const cleanPath = path.split('?')[0];
            let transform = `tr:w-${width},q-${quality}`;
            if (height) transform += `,h-${height}`;

            // Normalize endpoint and path, and remove the incorrect '/supabase/' segment
            const base = IMAGEKIT_URL_ENDPOINT.replace(/\/$/, '');
            const result = `${base}/${cleanPath}?${transform}`;
            return result.replace(/([^:]\/)\/+/g, "$1");
        }

        // Fallback to Supabase Native Render if Proxy fails
        const separator = url.includes('?') ? '&' : '?';
        let params = `width=${width}&quality=${quality}&format=origin`;
        if (height) params += `&height=${height}`;
        const nativeUrl = url.replace('/object/public/', '/render/image/public/') + separator + params;
        return nativeUrl.replace(/([^:]\/)\/+/g, "$1");
    }

    return url;
}
