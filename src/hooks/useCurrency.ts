import { useState, useEffect, useCallback } from 'react';

export interface CurrencyInfo {
    code: string;
    symbol: string;
    country: string;
}

const DEFAULT_CURRENCY: CurrencyInfo = {
    code: 'EUR',
    symbol: '€',
    country: 'IT'
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
    IN: 'INR', 
    PK: 'PKR', 
    BD: 'BDT'
    // All other countries will naturally fall back to 'EUR' in the code below
};

export const SUPPORTED_CURRENCIES = [
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' }
];

export function useCurrency() {
    const [currency, setCurrency] = useState<CurrencyInfo>(DEFAULT_CURRENCY);
    const [isLoading, setIsLoading] = useState(true);
    const [rates, setRates] = useState<Record<string, number>>({});

    // Manual Override
    const setManualCurrency = useCallback((code: string) => {
        const found = SUPPORTED_CURRENCIES.find(c => c.code === code);
        const newCurrency = {
            code: code,
            symbol: found?.symbol || '',
            country: 'MANUAL'
        };
        setCurrency(newCurrency);
        localStorage.setItem('userCurrency_v2', JSON.stringify({
            data: newCurrency,
            timestamp: Date.now(),
            isManual: true
        }));
    }, []);

    useEffect(() => {
        const detectCurrency = async () => {
            try {
                // 1. Check sessionStorage (fastest, prevents any re-fetch during active session)
                const sessionCached = sessionStorage.getItem('userCurrency_v2');
                if (sessionCached) {
                    try {
                        const parsedCache = JSON.parse(sessionCached);
                        if (parsedCache.data) {
                            setCurrency(parsedCache.data);
                            setIsLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.warn('Failed to parse session cached currency');
                    }
                }

                // 2. Check localStorage cache (prevents fetch across tabs/reloads for 24 hours)
                const cached = localStorage.getItem('userCurrency_v2');
                if (cached) {
                    try {
                        const parsedCache = JSON.parse(cached);
                        const cacheAge = Date.now() - parsedCache.timestamp;
                        if (parsedCache.data && cacheAge < 24 * 60 * 60 * 1000) {
                            setCurrency(parsedCache.data);
                        sessionStorage.setItem('userCurrency_v2', JSON.stringify(parsedCache)); // upgrade to session
                            setIsLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.warn('Failed to parse local cached currency');
                    }
                }

                // 3. PRIMARY API: api.country.is (Best for localhost, CORS-friendly)
                let data: any = null;
                try {
                    const response = await fetch('https://api.country.is/');
                    data = await response.json();
                } catch (e) {
                    // SECONDARY API: ipapi.co
                    try {
                        const response = await fetch('https://ipapi.co/json/');
                        data = await response.json();
                    } catch (e2) {
                        // TERTIARY API: ipwhois.app
                        try {
                            const response = await fetch('https://ipwhois.app/json/');
                            data = await response.json();
                        } catch (e3) {
                            console.error('All IP detection APIs failed');
                        }
                    }
                }

                if (data && (data.status === 'success' || data.success !== false || data.status !== 'fail' || data.country)) {
                    const countryCode = data.countryCode || data.country_code || data.country;
                    
                    const currencyCode = COUNTRY_TO_CURRENCY[countryCode] || 'EUR';
                    const symbolMap: Record<string, string> = { 'EUR': '€', 'INR': '₹', 'USD': '$', 'GBP': '£', 'PKR': '₨', 'BDT': '৳' };
                    
                    const currencyInfo: CurrencyInfo = {
                        code: currencyCode,
                        symbol: symbolMap[currencyCode] || currencyCode,
                        country: countryCode || 'XX'
                    };

                    // Cache the result in both storages
                    const cachePayload = JSON.stringify({
                        data: currencyInfo,
                        timestamp: Date.now(),
                        isManual: false
                    });
                    localStorage.setItem('userCurrency_v2', cachePayload);
                    sessionStorage.setItem('userCurrency_v2', cachePayload);

                    setCurrency(currencyInfo);
                } else {
                    // Final Guess: Navigator Language
                    const language = navigator.language;
                    const region = language.split('-')[1];
                    const currencyCode = COUNTRY_TO_CURRENCY[region] || 'EUR';
                    const symbolMap: Record<string, string> = { 'EUR': '€', 'INR': '₹', 'USD': '$', 'GBP': '£', 'PKR': '₨', 'BDT': '৳' };
                    
                    const guessedInfo = {
                        code: currencyCode,
                        symbol: symbolMap[currencyCode] || currencyCode,
                        country: region || 'XX'
                    };
                    setCurrency(guessedInfo);
                }
            } catch (error) {
                console.error('Currency detection totally failed:', error);
                setCurrency(DEFAULT_CURRENCY);
            } finally {
                setIsLoading(false);
            }
        };

        detectCurrency();
    }, []);

    useEffect(() => {
        const fetchRates = async () => {
            // 1. Check Cache
            const cachedRates = localStorage.getItem('exchangeRates');
            if (cachedRates) {
                try {
                    const parsed = JSON.parse(cachedRates);
                    const age = Date.now() - parsed.timestamp;
                    // REFRESH EVERY 1 HOUR (instead of 24h)
                    if (age < 1 * 60 * 60 * 1000) {
                        setRates(parsed.data);
                        return;
                    }
                } catch (e) {
                    console.warn('Failed to parse cached rates');
                }
            }

            // 2. Fetch Live Rates
            try {
                // Use a reliable proxy/API
                const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
                const data = await response.json();

                if (data && data.rates) {
                    setRates(data.rates);
                    localStorage.setItem('exchangeRates', JSON.stringify({
                        data: data.rates,
                        timestamp: Date.now()
                    }));
                }
            } catch (err) {
                console.error('Failed to fetch live rates, using fallback', err);
            }
        };

        fetchRates();
    }, []);

    const convertPrice = useCallback((priceInEUR: number): number => {
        const fallbackRates: Record<string, number> = {
            'EUR': 1, 'USD': 1.08, 'GBP': 0.86, 'INR': 106.6, 'NGN': 1750, 'TRY': 33.5
        };

        const rate = rates[currency.code] || fallbackRates[currency.code];

        if (!rate && currency.code !== 'EUR') {
            return priceInEUR;
        }

        return priceInEUR * (rate || 1);
    }, [currency.code, rates]);

    const getPaymentDetails = useCallback((amountInEUR: number) => {
        const fallbackRates: Record<string, number> = {
            'EUR': 1, 'USD': 1.08, 'GBP': 0.86, 'INR': 106.6, 'NGN': 1750, 'TRY': 33.5
        };
        const rate = rates[currency.code] || fallbackRates[currency.code];

        if (!rate && currency.code !== 'EUR') {
            return { amount: amountInEUR, currency: 'EUR' };
        }

        return { amount: amountInEUR * (rate || 1), currency: currency.code };
    }, [currency.code, rates]);

    const formatPrice = useCallback((amount: number, fromCurrency = 'EUR', forceCurrency?: string): string => {
        if (amount === 0) return 'Free';

        try {
            const targetCurrency = forceCurrency || (fromCurrency === 'EUR' ? currency.code : fromCurrency);
            const details = fromCurrency === 'EUR' ? getPaymentDetails(amount) : { amount, currency: fromCurrency };

            // If we're forcing a currency that isn't the detected one
            if (forceCurrency && forceCurrency !== details.currency) {
                const rate = rates[forceCurrency] || 1;
                details.amount = (amount / (rates[fromCurrency] || 1)) * rate;
                details.currency = forceCurrency;
            }

            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: details.currency,
                minimumFractionDigits: (details.currency === 'INR' || details.currency === 'IDR' || details.currency === 'TRY') ? 0 : 2,
                maximumFractionDigits: 2
            }).format(details.amount);
        } catch (e) {
            return `${amount} ${fromCurrency}`;
        }
    }, [currency.code, getPaymentDetails, rates]);

    const getRegionalPrice = useCallback((basePriceEUR: number, regionalPrices?: Record<string, number>): { amount: number, currency: string, isFixed: boolean } => {
        if (regionalPrices && regionalPrices[currency.code] !== undefined) {
            return {
                amount: regionalPrices[currency.code],
                currency: currency.code,
                isFixed: true
            };
        }

        const details = getPaymentDetails(basePriceEUR);
        return {
            ...details,
            isFixed: false
        };
    }, [currency.code, getPaymentDetails]);

    return {
        currency,
        isLoading,
        formatPrice,
        convertPrice,
        getPaymentDetails,
        getRegionalPrice,
        setManualCurrency,
        rates
    };
}
