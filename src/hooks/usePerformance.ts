import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to prefetch route components based on user navigation patterns
 * This improves perceived performance by preloading likely next pages
 */
export const useRoutePrefetch = () => {
    const location = useLocation();

    useEffect(() => {
        const prefetchMap: Record<string, string[]> = {
            '/': ['/dashboard'],
            '/dashboard': ['/practice', '/mock-exams'],
            '/practice': ['/start-test'],
            '/subjects': ['/practice'],
        };

        const currentPath = location.pathname;
        const prefetchRoutes = prefetchMap[currentPath];

        if (prefetchRoutes && 'connection' in navigator) {
            // Only prefetch on good network conditions
            const connection = (navigator as any).connection;
            if (connection && (connection.effectiveType === '4g' || connection.effectiveType === 'wifi')) {
                prefetchRoutes.forEach((route) => {
                    // Use link prefetch hint for route components
                    const link = document.createElement('link');
                    link.rel = 'prefetch';
                    link.href = route;
                    document.head.appendChild(link);
                });
            }
        }
    }, [location.pathname]);
};

/**
 * Add minimum loading time to prevent jarring flashes
 */
export const useMinimumLoadingTime = (isLoading: boolean, minTime: number = 300) => {
    const [showLoading, setShowLoading] = React.useState(isLoading);

    React.useEffect(() => {
        if (isLoading) {
            setShowLoading(true);
        } else {
            const timer = setTimeout(() => {
                setShowLoading(false);
            }, minTime);
            return () => clearTimeout(timer);
        }
    }, [isLoading, minTime]);

    return showLoading;
};
