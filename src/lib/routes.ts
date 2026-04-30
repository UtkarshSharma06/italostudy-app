/**
 * Centralized Route Configuration for ItaloStudy
 * Used for authentication exceptions, maintenance mode whitelisting, and SEO indexing.
 */

export const PUBLIC_ROUTES = [
    '/auth',
    '/waiting-room',
    '/download-app',
    '/solutions',
    '/pricing',
    '/payment/callback',
    '/reset-password'
];

/**
 * Helper to check if a path is public
 * Handles exact matches, prefix matches, and mobile-prefixed routes
 */
export const isPublicRoute = (pathname: string): boolean => {
    // Normalize path (remove trailing slash)
    const path = pathname === '/' ? pathname : pathname.replace(/\/$/, "");
    
    return PUBLIC_ROUTES.some(route => {
        if (route === '/') return path === '/';
        
        return (
            path === route ||
            path.startsWith(route + '/') ||
            path.startsWith('/mobile' + route) ||
            (route === '/imat-' && path.includes('/imat-')) ||
            (route === '/cent-s-' && path.includes('/cent-s-')) ||
            (route === '/study-in-italy' && path.includes('/study-in-italy'))
        );
    });
};
