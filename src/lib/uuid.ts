/**
 * Generates a UUID v4.
 * Uses the native crypto.randomUUID() if available (Secure Contexts),
 * otherwise falls back to a custom implementation.
 */
export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // Fallback for non-secure contexts (HTTP, IP-based access)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};
