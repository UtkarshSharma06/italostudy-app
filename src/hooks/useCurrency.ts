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
    IT: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', AT: 'EUR', NL: 'EUR', BE: 'EUR', PT: 'EUR',
    US: 'USD', GB: 'GBP', IN: 'INR', NG: 'NGN', EG: 'EGP', PK: 'PKR', BD: 'BDT',
    TR: 'TRY', BR: 'BRL', CA: 'CAD', AU: 'AUD', SG: 'SGD', AE: 'AED', SA: 'SAR'
};

export const SUPPORTED_CURRENCIES = [
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' }
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
        localStorage.setItem('userCurrency', JSON.stringify({
            data: newCurrency,
            timestamp: Date.now(),
            isManual: true
        }));
    }, []);

    useEffect(() => {
        const detectCurrency = async () => {
            try {
                // 1. Check localStorage cache first
                const cached = localStorage.getItem('userCurrency');
                if (cached) {
                    try {
                        const parsedCache = JSON.parse(cached);
                        const cacheAge = Date.now() - parsedCache.timestamp;
                        if (parsedCache.data && cacheAge < 24 * 60 * 60 * 1000) {
                            setCurrency(parsedCache.data);
                            setIsLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.warn('Failed to parse cached currency');
                    }
                }

                // 2. PRIMARY API: ipapi.co (HTTPS stable)
                let data: any = null;
                try {
                    const response = await fetch('https://ipapi.co/json/');
                    data = await response.json();
                } catch (e) {
                    // 3. SECONDARY API FALLBACK: ipwhois.app (HTTPS)
                    try {
                        console.log('Primary IP API failed, trying ipwhois...');
                        const response = await fetch('https://ipwhois.app/json/');
                        data = await response.json();
                    } catch (e2) {
                        console.error('All IP detection APIs failed');
                    }
                }

                if (data && (data.status === 'success' || data.success !== false || data.status !== 'fail')) {
                    const countryCode = data.countryCode || data.country_code || data.country;
                    const apiCurrencyCode = data.currency || data.currency_code;

                    let currencyInfo: CurrencyInfo;

                    if (apiCurrencyCode && apiCurrencyCode.length === 3) {
                        currencyInfo = {
                            code: apiCurrencyCode,
                            symbol: data.currency_symbol || data.symbol || '',
                            country: countryCode || 'XX'
                        };
                    } else {
                        const code = COUNTRY_TO_CURRENCY[countryCode] || 'EUR';
                        currencyInfo = {
                            code,
                            symbol: '',
                            country: countryCode || 'XX'
                        };
                    }

                    // Cache the result
                    localStorage.setItem('userCurrency', JSON.stringify({
                        data: currencyInfo,
                        timestamp: Date.now(),
                        isManual: false
                    }));

                    setCurrency(currencyInfo);
                } else {
                    // Final Guess: Navigator Language
                    const language = navigator.language;
                    const region = language.split('-')[1];
                    if (region && COUNTRY_TO_CURRENCY[region]) {
                        const guessedInfo = {
                            code: COUNTRY_TO_CURRENCY[region],
                            symbol: '',
                            country: region
                        };
                        setCurrency(guessedInfo);
                    } else {
                        setCurrency(DEFAULT_CURRENCY);
                    }
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
