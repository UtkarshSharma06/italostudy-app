/**
 * Country Detection Utility
 * Detects user's country via IP geolocation and caches the result
 */

export async function getCountryCode(): Promise<string> {
    // Check for URL parameter override first (for testing)
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const override = urlParams.get('country');
        if (override) {
            console.log('Country detection: Using URL override:', override);
            sessionStorage.setItem('user_country', override.toUpperCase());
            return override.toUpperCase();
        }
    }

    // Check cache next
    const cached = sessionStorage.getItem('user_country');
    if (cached) {
        console.log('Country detection: Using cached value:', cached);
        return cached;
    }

    try {
        // Try api.country.is first
        const response = await fetch('https://api.country.is/');
        const data = await response.json();
        
        const country = data.country || 'XX';

        // Cache the result
        sessionStorage.setItem('user_country', country);
        return country;
    } catch (error) {
        console.warn('Country detection failed or timed out, falling back to global');
        // Fast fallback to prevent render block
        return 'XX';
    }
}

/**
 * Manual override for testing purposes
 * Call this in console: window.setTestCountry('TR')
 */
if (typeof window !== 'undefined') {
    (window as any).setTestCountry = (code: string) => {
        sessionStorage.setItem('user_country', code);
        console.log('Test country set to:', code, '- Reload page to see changes');
    };
}
