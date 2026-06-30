import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSystemSettings } from '@/context/SystemSettingsContext';

export interface Plan {
    id: string;
    name: string;
    description: string;
    monthlyPrice: number;
    quarterlyPrice: number;
    icon: string;
    color: string;
    isPopular: boolean;
    badge: string;
    isVisible: boolean;
    features?: string[];
    paddleId?: string; // Plan-level Paddle ID
    regionalPrices?: Record<string, number>; // New: Fixed regional prices (e.g. { "INR": 499, "TRY": 199 })
    cycles?: {
        id: string;
        name: string;
        price: number;
        durationValue: number;
        durationUnit: 'days' | 'months' | 'years';
        paddleId?: string; // Cycle-specific Paddle ID (Price ID)
        razorpayId?: string; // Auto-Pay Plan ID for Razorpay
        paypalId?: string; // Auto-Pay Plan ID for PayPal
        dodoId?: string; // Auto-Pay Plan ID for Dodo Payments
        regionalPrices?: Record<string, number>; // New: Fixed regional prices for this specific cycle
    }[];
}

export interface Feature {
    name: string;
    [key: string]: any;
}

export interface PricingConfig {
    plans: Plan[];
    comparison: Feature[];
    mode: 'beta' | 'live';
}

interface PricingContextType {
    isPricingModalOpen: boolean;
    openPricingModal: () => void;
    closePricingModal: () => void;
    isCheckoutOpen: boolean;
    openCheckout: () => void;
    closeCheckout: () => void;
    config: PricingConfig | null;
    couponMessage: string | null;
    isLoading: boolean;
    refreshPricing: () => Promise<void>;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

const DEFAULT_CONFIG: PricingConfig = {
    plans: [],
    comparison: [],
    mode: 'beta'
};

/**
 * PricingProvider
 * ────────────────
 * Reads pricing_plans and pricing_coupon_message from SystemSettingsContext
 * instead of running its own Supabase queries or maintaining its own realtime
 * channel. All return values are identical to the previous implementation.
 */
export const PricingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [config, setConfig] = useState<PricingConfig>(DEFAULT_CONFIG);
    const [couponMessage, setCouponMessage] = useState<string | null>(null);

    const { getSetting, loading: settingsLoading, refresh } = useSystemSettings();

    // Derive pricing config from shared settings
    useEffect(() => {
        const plansData = getSetting('pricing_plans');
        if (plansData) {
            setConfig(plansData as PricingConfig);
        } else {
            setConfig(DEFAULT_CONFIG);
        }
    }, [getSetting]);

    // Derive coupon message from shared settings
    useEffect(() => {
        const val = getSetting('pricing_coupon_message');
        if (val === undefined || val === null) {
            setCouponMessage(null);
        } else if (typeof val === 'string') {
            setCouponMessage(val);
        } else if (val && typeof val === 'object' && (val as any).message) {
            setCouponMessage(String((val as any).message));
        } else if (val && typeof val === 'object' && (val as any).text) {
            setCouponMessage(String((val as any).text));
        } else if (val !== null) {
            setCouponMessage(String(val));
        } else {
            setCouponMessage(null);
        }
    }, [getSetting]);

    const openPricingModal = () => setIsPricingModalOpen(true);
    const closePricingModal = () => setIsPricingModalOpen(false);

    // Checkout handlers
    const openCheckout = () => setIsCheckoutOpen(true);
    const closeCheckout = () => setIsCheckoutOpen(false);

    return (
        <PricingContext.Provider value={{
            isPricingModalOpen,
            openPricingModal,
            closePricingModal,
            isCheckoutOpen,
            openCheckout,
            closeCheckout,
            config,
            couponMessage,
            isLoading: settingsLoading,
            refreshPricing: refresh,
        }}>
            {children}
        </PricingContext.Provider>
    );
};

export const usePricing = () => {
    const context = useContext(PricingContext);
    if (context === undefined) {
        throw new Error('usePricing must be used within a PricingProvider');
    }
    return context;
};
