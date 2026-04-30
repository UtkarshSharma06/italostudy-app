import { Preferences } from '@capacitor/preferences';

const CapacitorStorage = {
    getItem: async (key: string): Promise<string | null> => {
        try {
            const { value } = await Preferences.get({ key });
            console.log(`[CapacitorStorage] Get ${key}:`, value ? 'Found' : 'Null');
            return value;
        } catch (e) {
            console.error(`[CapacitorStorage] Get Error ${key}:`, e);
            return null;
        }
    },
    setItem: async (key: string, value: string): Promise<void> => {
        try {
            await Preferences.set({ key, value });
            console.log(`[CapacitorStorage] Set ${key}: Success`);
        } catch (e) {
            console.error(`[CapacitorStorage] Set Error ${key}:`, e);
        }
    },
    removeItem: async (key: string): Promise<void> => {
        try {
            await Preferences.remove({ key });
            console.log(`[CapacitorStorage] Remove ${key}`);
        } catch (e) {
            console.error(`[CapacitorStorage] Remove Error ${key}:`, e);
        }
    },
};

export default CapacitorStorage;
