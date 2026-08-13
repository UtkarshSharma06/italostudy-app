import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, CreditCard, Lock, ShieldCheck, Ticket, Zap, FileText, PlaySquare, BarChart2, Target, MessageSquare, Globe, Circle, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { initializePaddle, Paddle } from '@paddle/paddle-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePricing } from '@/context/PricingContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuth } from '@/lib/auth';
import { DodoPayments } from 'dodopayments-checkout';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    planId: string;
    planName: string;
    amount: number;
    currency: string;
    billingCycle: string;
    durationValue?: number;
    durationUnit?: string;
    regionalPrices?: Record<string, number>;
}

declare global {
    interface Window {
        Razorpay: any;
        Stripe: any;
        paypal: any;
        Cashfree: any;
    }
}

interface CouponValidationResponse {
    valid: boolean;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    id: string;
    code: string;
    message?: string;
}

interface RazorpayOrderResponse {
    key_id: string;
    amount: number;
    currency: string;
    transaction_id: string;
    name: string;
    description: string;
    error?: string;
}

interface StripeSessionResponse {
    public_key: string;
    transaction_id: string;
    error?: string;
}

interface CashfreeOrderResponse {
    app_id: string;
    environment: string;
    transaction_id: string;
    customer_id: string;
    customer_email: string;
    customer_phone: string;
    session_id?: string;
    error?: string;
}

interface LemonSqueezyOrderResponse {
    checkout_url: string;
    transaction_id: string;
    error?: string;
}

interface PayPalOrderResponse {
    transaction_id: string;
    error?: string;
}

interface VerifyPaymentResponse {
    success: boolean;
    plan: string;
    tier: string;
    error?: string;
}

export default function CheckoutModal({
    isOpen,
    onClose,
    planId,
    planName,
    amount,
    currency,
    billingCycle,
    durationValue,
    durationUnit,
    regionalPrices
}: CheckoutModalProps) {
    // Determine actual duration values with better defaults
    const actualDurationValue = durationValue || (
        billingCycle?.toLowerCase().includes('quarter') ? 3 :
            billingCycle?.toLowerCase().includes('year') ? 1 :
                billingCycle?.toLowerCase().includes('annual') ? 1 :
                    billingCycle?.toLowerCase().includes('day') ? 1 :
                        billingCycle?.toLowerCase().includes('daily') ? 1 :
                            billingCycle?.toLowerCase().includes('week') ? 7 :
                                1
    );

    const actualDurationUnit = durationUnit || (
        (billingCycle?.toLowerCase().includes('day') || billingCycle?.toLowerCase().includes('daily') || billingCycle?.toLowerCase().includes('week')) ? 'days' :
            (billingCycle?.toLowerCase().includes('year') || billingCycle?.toLowerCase().includes('annual')) ? 'years' :
                'months'
    ) as 'days' | 'months' | 'years';

    const [couponCode, setCouponCode] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [discount, setDiscount] = useState<{ type: 'percent' | 'fixed', value: number, id: string } | null>(null);
    const [isMobileCouponOpen, setIsMobileCouponOpen] = useState(false);
    const [gateways, setGateways] = useState<any>({});
    const [isLoadingGateways, setIsLoadingGateways] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
    const { getPaymentDetails, formatPrice, getRegionalPrice, currency: currentCurrency } = useCurrency();
    const { user } = useAuth() as any;
    const [hasLoggedAbandonment, setHasLoggedAbandonment] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setHasLoggedAbandonment(false);
        } else if (!isOpen && !isProcessing && !hasLoggedAbandonment && user) {
            setHasLoggedAbandonment(true);
            supabase.from('checkout_abandonments').insert({
                user_id: user.id,
                email: user.email,
                plan_name: planName
            }).then(({ error }) => {
                if (error) console.error("Failed to log checkout abandonment:", error);
            });
        }
    }, [isOpen, isProcessing, hasLoggedAbandonment, user, planName]);

    const getDurationLabel = () => {
        if (actualDurationValue && actualDurationUnit) {
            if (actualDurationValue === 1 && actualDurationUnit === 'days') return 'Daily';
            if (actualDurationValue === 7 && actualDurationUnit === 'days') return 'Weekly';
            if (actualDurationValue === 1 && actualDurationUnit === 'months') return 'Monthly';
            if (actualDurationValue === 3 && actualDurationUnit === 'months') return 'Quarterly';
            if (actualDurationValue === 1 && actualDurationUnit === 'years') return 'Annual';
            return `${actualDurationValue} ${actualDurationUnit}`;
        }
        return billingCycle === 'monthly' ? 'Monthly' : 'Quarterly';
    };

    // Determine actual amount and currency based on regional prices or conversion
    const priceInfo = getRegionalPrice(amount, regionalPrices);
    const amountInTargetCurrency = priceInfo.amount;
    const targetCurrency = priceInfo.currency;

    const [paddle, setPaddle] = useState<Paddle>();

    useEffect(() => {
        if (isOpen) {
            fetchGateways();
        } else {
            // Reset selection when modal closes so it auto-selects again next time
            setSelectedGateway(null);
        }
    }, [isOpen]);

    // Auto-select recommended gateway
    useEffect(() => {
        if (isOpen && !isLoadingGateways && !selectedGateway) {
            if (targetCurrency === 'INR' && gateways.razorpay?.enabled) {
                setSelectedGateway('razorpay');
            } else if (targetCurrency !== 'INR' && gateways.dodo?.enabled) {
                setSelectedGateway('dodo');
            }
        }
    }, [isOpen, isLoadingGateways, selectedGateway, targetCurrency, gateways]);

    const fetchGateways = async (retries = 3) => {
        setIsLoadingGateways(true);
        for (let i = 0; i < retries; i++) {
            const { data, error } = await (supabase as any).rpc('get_payment_config');

            if (data) {
                setGateways(data);
                setIsLoadingGateways(false);
                loadPaymentScripts(data); // Pass data directly to ensure immediate loading

                // Initialize Paddle
                if (data.paddle?.enabled && data.paddle?.client_token && !paddle) {
                    initializePaddle({
                        environment: data.paddle.environment || 'sandbox',
                        token: data.paddle.client_token
                    }).then(paddleInstance => setPaddle(paddleInstance));
                }
                return; // Success, exit retry loop
            } else if (error) {
                console.warn(`Failed to load payment config (attempt ${i + 1}/${retries})`, error);
                if (i < retries - 1) {
                    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // 1s, 2s, 4s
                }
            }
        }

        // All retries failed
        console.error('All attempts to load payment config failed');
        toast.error('Failed to load payment options. Please try again later or contact support.');
        setIsLoadingGateways(false);
    };

    const loadPaymentScripts = (config?: any) => {
        const currentGateways = config || gateways;

        // Load Razorpay
        if (!document.querySelector('script[src*="razorpay"]')) {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);
        }

        // Load Stripe
        if (!document.querySelector('script[src*="stripe"]')) {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.async = true;
            document.body.appendChild(script);
        }

        // Load PayPal — vault=true + intent=subscription are REQUIRED for createSubscription API
        if (currentGateways.paypal?.enabled && currentGateways.paypal?.client_id && !document.querySelector('script[src*="paypal.com/sdk/js"]')) {
            const script = document.createElement('script');
            script.src = `https://www.paypal.com/sdk/js?client-id=${currentGateways.paypal.client_id}&currency=EUR&vault=true&intent=subscription`;
            script.async = true;
            document.body.appendChild(script);
        }

        // Load Cashfree
        if (currentGateways.cashfree?.enabled && !document.querySelector('script[src*="cashfree.com/js/v3/cashfree.js"]')) {
            const script = document.createElement('script');
            script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
            script.async = true;
            document.body.appendChild(script);
        }
    };

    const handleValidateCoupon = async () => {
        if (!couponCode.trim()) return;
        setIsValidating(true);
        try {
            const { data: rawData, error } = await (supabase as any).rpc('validate_coupon', { code_input: couponCode });
            if (error) throw error;

            const data = rawData as CouponValidationResponse;

            if (data.valid) {
                const discountObj = {
                    type: data.discount_type,
                    value: data.discount_value,
                    id: data.id
                };

                setDiscount(discountObj);
                toast.success('Coupon applied successfully!');
            } else {
                setDiscount(null);
                toast.error(data.message || 'Invalid coupon');
            }
        } catch (err) {
            console.error('Coupon validation error:', err);
            toast.error('Failed to validate');
        } finally {
            setIsValidating(false);
        }
    };

    const calculateTotal = () => {
        if (!discount) return amountInTargetCurrency;

        let final = amountInTargetCurrency;
        let discountAmount = 0;

        if (discount.type === 'percent') {
            discountAmount = amountInTargetCurrency * (discount.value / 100);
            final = amountInTargetCurrency - discountAmount;
        } else {
            // If fixed discount, we need to know if it's in the target currency or EUR
            // For simplicity, let's assume fixed discounts in the DB are always in EUR
            // So we convert them to target currency if needed
            const rate = amountInTargetCurrency / amount; // Simple ratio if not manually fixed
            const fixedDiscountInTarget = priceInfo.isFixed ? discount.value * (amountInTargetCurrency / amount) : discount.value * rate;

            discountAmount = fixedDiscountInTarget;
            final = amountInTargetCurrency - discountAmount;
        }

        return Math.max(0, final);
    };

    const { config } = usePricing();

    const handlePaddle = async () => {
        if (!paddle) {
            toast.error("Paddle not initialized");
            return;
        }

        setIsProcessing(true);
        try {
            // Find Paddle Price ID
            const plan = config?.plans.find(p => p.name === planName || p.id === planId);
            // Note: planId prop might be 'pro' or 'global', but pricing config might use different IDs. 
            // Robust lookup needed.

            let paddlePriceId = plan?.paddleId;

            // Check cycles if applicable
            if (plan?.cycles && billingCycle) {
                const cycle = plan.cycles.find(c =>
                    c.name.toLowerCase().includes(billingCycle.toLowerCase()) ||
                    (c.durationValue === filterDurationValue(billingCycle) && c.durationUnit === filterDurationUnit(billingCycle))
                );
                if (cycle?.paddleId) {
                    paddlePriceId = cycle.paddleId;
                }
            }

            // Fallback for demo/development if no ID found in config, 
            // strict mode would return error here.
            // For now, we will proceed assuming the user might not have set it yet
            // and Paddle might error out or we assume a default.

            if (!paddlePriceId) {
                console.warn("Paddle Price ID not found for this plan/cycle. Using default if available or erroring.");
                // If you want to block: 
                // throw new Error("Paddle Price ID not configured for this plan.");
            }

            // Create local transaction record via RPC
            const { data: transaction, error: rpcError } = await (supabase as any).rpc('create_paddle_transaction', {
                p_plan_id: planId,
                p_amount: calculateTotal(),
                p_currency: targetCurrency
            });

            if (rpcError) throw rpcError;

            if (transaction?.transaction_id) {
                const checkoutOptions: any = {
                    settings: {
                        displayMode: 'overlay',
                        theme: 'light',
                        locale: 'en'
                    },
                    customData: {
                        transaction_id: transaction.transaction_id // Pass local ID for reconciliation
                    },
                    successCallback: (data: any) => {
                        verifyPayment(transaction.transaction_id, data.transaction_id || 'paddle_txn');
                    },
                    closeCallback: () => {
                        setIsProcessing(false);
                    }
                };

                // If we have a price ID, use items
                if (paddlePriceId) {
                    checkoutOptions.items = [{ priceId: paddlePriceId, quantity: 1 }];

                    // Apply discount if exists? 
                    // Paddle client-side discounts are tricky without ID.
                } else {
                    // Fallback to custom amounts if possible (only works if enabled on Paddle account)
                    // Or allow "Flexible" items?
                    // For now, let's try passing items with null priceId and custom amount? No, that's not standard.
                    // We'll throw an error if no price ID is found to prompt the user to config it.
                    throw new Error("Paddle Price ID configuration missing for this plan.");
                }

                paddle.Checkout.open(checkoutOptions);
            } else {
                throw new Error("Failed to create local transaction");
            }

        } catch (error: any) {
            console.error('Paddle Error:', error);
            toast.error(error.message || 'Failed to initiate Paddle checkout');
            setIsProcessing(false);
        }
    };

    // Helper to match duration roughly — NOTE: check 'quarter' BEFORE 'month' to avoid false-positive
    const filterDurationValue = (cycle: string) => {
        if (cycle.includes('quarter')) return 3;
        if (cycle.includes('month')) return 1;
        if (cycle.includes('year')) return 1;
        return 1;
    }

    const filterDurationUnit = (cycle: string) => {
        if (cycle.includes('day')) return 'days';
        if (cycle.includes('year')) return 'years';
        return 'months';
    }

    /**
     * Finds the correct cycle for a plan using multiple strategies in priority order:
     * 1. Match by the actualDurationValue/actualDurationUnit props (most reliable — already resolved by parent)
     * 2. Match by cycle name containing billingCycle string
     * 3. Match by filterDurationValue/filterDurationUnit derived from billingCycle string
     * Falls back to undefined (caller handles missing ID).
     */
    const findMatchingCycle = (plan: any) => {
        if (!plan?.cycles) return undefined;
        // Priority 1: exact durationValue + durationUnit match using already-resolved props
        const byProps = plan.cycles.find((c: any) =>
            c.durationValue === actualDurationValue && c.durationUnit === actualDurationUnit
        );
        if (byProps) return byProps;

        // Priority 2: name contains billing cycle keyword
        const byName = plan.cycles.find((c: any) =>
            c.name.toLowerCase().includes(billingCycle.toLowerCase())
        );
        if (byName) return byName;

        // Priority 3: derive from billingCycle string
        return plan.cycles.find((c: any) =>
            c.durationValue === filterDurationValue(billingCycle) &&
            c.durationUnit === filterDurationUnit(billingCycle)
        );
    };

    // ── Edge Function Retry Helper ───────────────────────────────────────────
    // Invokes an edge function with up to 3 retries and exponential backoff on failure.
    const invokeWithRetry = async (fn: string, body: object, retries = 3): Promise<any> => {
        for (let i = 0; i < retries; i++) {
            const res = await supabase.functions.invoke(fn, { body });
            if (!res.error) return res;

            console.warn(`Edge function '${fn}' failed (attempt ${i + 1}/${retries})...`, res.error);
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // 1s, 2s, 4s
            } else {
                return res; // Return the final error if all retries fail
            }
        }
    };

    const handleRazorpay = async () => {
        setIsProcessing(true);
        try {
            const totalAmount = calculateTotal();

            // 1. Get the Gateway Plan ID for Razorpay Subscriptions
            const plan = config?.plans.find(p => p.id === planId);
            const matchedCycle = findMatchingCycle(plan);
            const gatewayPlanId = matchedCycle?.razorpayId ?? null;

            if (!gatewayPlanId) {
                throw new Error('Razorpay Subscription Plan ID is not configured for this cycle.');
            }

            console.log('💳 Razorpay Auto-Pay Initiation:', {
                amount: totalAmount,
                currency: targetCurrency,
                gatewayPlanId
            });

            // 2. Create Transaction purely via RPC
            const { data: rawData, error } = await (supabase as any).rpc('create_razorpay_order', {
                p_amount: totalAmount,
                p_currency: targetCurrency,
                p_plan_id: planId,
                p_coupon_id: discount?.id,
                p_duration_value: actualDurationValue,
                p_duration_unit: actualDurationUnit
            });

            if (error) throw error;
            const data = rawData as RazorpayOrderResponse;
            if (data.error) throw new Error(data.error);

            // 3. Create Subscription on Razorpay Server (with retry)
            // Pass discountedAmount so the edge function can create a temp plan at the discounted price
            const { data: subData, error: subError } = await invokeWithRetry('create-razorpay-order', {
                transactionId: data.transaction_id,
                gatewayPlanId: gatewayPlanId,
                discountedAmount: discount ? totalAmount : undefined,
                currency: targetCurrency,
                couponCode: discount ? couponCode : undefined,
            });

            if (subError) throw new Error('Payment server unavailable. Please try again or contact support@italostudy.com');
            if (subData?.error) throw new Error(subData.error);

            // 4. Open Razorpay Checkout for Auto-Pay
            const options = {
                key: data.key_id,
                subscription_id: subData.subscription_id,
                name: data.name,
                description: data.description,
                handler: async (response: any) => {
                    await verifyPayment(data.transaction_id, response.razorpay_payment_id || response.razorpay_subscription_id);
                },
                modal: {
                    ondismiss: () => {
                        setIsProcessing(false);
                        toast.error('Payment cancelled');
                    }
                },
                theme: { color: '#4F46E5' }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
            setIsProcessing(false);
        } catch (err: any) {
            console.error('Razorpay error:', err);
            toast.error(err?.message || 'Failed to initialize Razorpay. Please try again or contact support@italostudy.com');
            setIsProcessing(false);
        }
    };

    const handleStripe = async () => {
        setIsProcessing(true);
        try {
            const totalAmount = calculateTotal();

            const { data: rawData, error } = await (supabase as any).rpc('create_stripe_session', {
                p_amount: totalAmount,
                p_currency: targetCurrency,
                p_plan_id: planId,
                p_coupon_id: discount?.id,
                p_duration_value: actualDurationValue,
                p_duration_unit: actualDurationUnit
            });

            if (error) throw error;
            const data = rawData as StripeSessionResponse;
            if (data.error) throw new Error(data.error);

            // Stripe requires a real server-side Checkout Session (Secret Key).
            // The public_key alone cannot create a confirmed payment — this gateway
            // must be configured with a backend that creates sessions and returns a redirect URL.
            // Please disable Stripe in Admin Panel until the server-side integration is complete.
            throw new Error(
                'Stripe checkout requires server-side session creation. Please contact support or use another payment method.'
            );

        } catch (err: any) {
            console.error('Stripe error:', err);
            toast.error(err?.message || 'Failed to initialize Stripe');
            setIsProcessing(false);
        }
    };

    const handlePayPal = async () => {
        setIsProcessing(true);
        try {
            const totalAmount = calculateTotal();

            // 1. Get the Gateway Plan ID for PayPal Subscriptions
            const plan = config?.plans.find(p => p.id === planId);
            const matchedCycle = findMatchingCycle(plan);
            const gatewayPlanId = matchedCycle?.paypalId ?? null;

            if (!gatewayPlanId) {
                throw new Error('PayPal Subscription Plan ID is not configured for this cycle.');
            }

            // PayPal doesn't support all currencies (like INR), so we fall back to EUR if needed
            const supportedByPayPal = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'HKD', 'JPY', 'BRL'];
            const paymentCurrency = supportedByPayPal.includes(targetCurrency) ? targetCurrency : 'EUR';
            const paymentAmount = paymentCurrency === targetCurrency ? totalAmount : (totalAmount / (amountInTargetCurrency / amount));

            console.log('💳 PayPal Auto-Pay Initiation:', {
                amount: paymentAmount,
                currency: paymentCurrency,
                gatewayPlanId
            });

            // 2. Create Transaction purely via RPC
            const { data: rawData, error } = await (supabase as any).rpc('create_paypal_order', {
                p_amount: paymentAmount,
                p_currency: paymentCurrency,
                p_plan_id: planId,
                p_coupon_id: discount?.id,
                p_duration_value: actualDurationValue,
                p_duration_unit: actualDurationUnit
            });

            if (error) throw error;
            const data = rawData as PayPalOrderResponse;
            if (data.error) throw new Error(data.error);

            if (!window.paypal) {
                toast.error('PayPal SDK not loaded. Please try again.');
                setIsProcessing(false);
                return;
            }

            // 3. Render PayPal JS SDK Subscriptions Button
            toast.info('Please click the PayPal button below to complete payment');

            // Clear existing buttons if any
            const container = document.getElementById('paypal-button-container');
            if (container) container.innerHTML = '';

            window.paypal.Buttons({
                vault: true,  // Required for createSubscription
                createSubscription: (_data: any, actions: any) => {
                    const req: any = {
                        'plan_id': gatewayPlanId
                    };

                    if (discount) {
                        // PayPal requires singular interval_unit: MONTH, DAY, YEAR (NOT MONTHS/DAYS/YEARS)
                        const unitMap: Record<string, string> = {
                            days: 'DAY',
                            months: 'MONTH',
                            years: 'YEAR',
                        };
                        const pUnit = unitMap[actualDurationUnit.toLowerCase()] || 'MONTH';
                        const originalPaymentAmount = paymentCurrency === targetCurrency ? amountInTargetCurrency : amount;

                        // PayPal discount strategy: override billing cycles.
                        // Sequence 1 = TRIAL (1 billing cycle at discounted price)
                        // Sequence 2 = REGULAR (ongoing at full price)
                        req['plan'] = {
                            billing_cycles: [
                                {
                                    sequence: 1,
                                    tenure_type: 'TRIAL',
                                    total_cycles: 1, // Only ONE discounted cycle
                                    frequency: {
                                        interval_unit: pUnit,
                                        interval_count: actualDurationValue,
                                    },
                                    pricing_scheme: {
                                        fixed_price: {
                                            value: paymentAmount.toFixed(2),
                                            currency_code: paymentCurrency
                                        }
                                    }
                                },
                                {
                                    sequence: 2,
                                    tenure_type: 'REGULAR',
                                    total_cycles: 0, // 0 = infinite
                                    frequency: {
                                        interval_unit: pUnit,
                                        interval_count: actualDurationValue,
                                    },
                                    pricing_scheme: {
                                        fixed_price: {
                                            value: originalPaymentAmount.toFixed(2),
                                            currency_code: paymentCurrency
                                        }
                                    }
                                }
                            ]
                        };
                    }

                    return actions.subscription.create(req);
                },
                onApprove: async (data_pp: any, _actions: any) => {
                    toast.loading('Verifying subscription...');
                    await verifyPayment(data.transaction_id, data_pp.subscriptionID, data_pp);
                },
                onError: (err: any) => {
                    console.error('PayPal Checkout Error:', err);
                    toast.error('PayPal payment failed or was cancelled');
                    setIsProcessing(false);
                },
                onCancel: () => {
                    toast.info('PayPal payment cancelled.');
                    setIsProcessing(false);
                }
            }).render('#paypal-button-container');

            setIsProcessing(false);
        } catch (err: any) {
            console.error('PayPal error:', err);
            toast.error(err?.message || 'Failed to initialize PayPal Subscription');
            setIsProcessing(false);
        }
    };

    const verifyPayment = async (transactionId: string, providerTransactionId: string, metadata: any = {}) => {
        try {
            console.log('🔐 Verifying Payment:', {
                transactionId,
                providerTransactionId,
                metadata
            });

            const { data: rawData, error } = await (supabase as any).rpc('verify_payment', {
                p_transaction_id: transactionId,
                p_provider_transaction_id: providerTransactionId
            });

            if (error) throw error;
            const data = rawData as VerifyPaymentResponse;

            console.log('✅ Payment Verification Response:', data);

            if (!data.success) {
                // Handle retryable errors (e.g. gateway verification temporarily unavailable)
                if ((data as any).retry) {
                    toast.error(data.error || (data as any).message || 'Payment verification temporarily unavailable. Your order is saved — please contact support@italostudy.com');
                } else {
                    toast.error(data.error || 'Payment verification failed. Contact support@italostudy.com');
                }
                console.error('❌ Verification failed:', data.error);
                throw new Error(data.error || 'Payment verification failed');
            }

            console.log('🎉 Payment Successful! Plan Updated:', {
                plan: data.plan,
                tier: data.tier
            });

            toast.success(`Payment successful! Upgraded to ${data.plan.toUpperCase()}`);

            // Trigger confetti animation globally
            window.dispatchEvent(new Event('premium-upgrade-success'));

            // Force profile refresh to get updated plan
            setTimeout(() => {
                window.location.href = '/dashboard?upgraded=1';
            }, 2500); // Increased delay to let animation play
        } catch (err: any) {
            console.error('Payment verification error:', err);
            toast.error(err?.message || 'Payment verification failed');
        }
    };



    const handleLemonSqueezy = async () => {
        setIsProcessing(true);
        try {
            const totalAmount = calculateTotal();

            const { data: rawData, error } = await (supabase as any).rpc('create_ls_order', {
                p_amount: totalAmount,
                p_currency: targetCurrency,
                p_plan_id: planId,
                p_coupon_id: discount?.id,
                p_duration_value: actualDurationValue,
                p_duration_unit: actualDurationUnit
            });

            if (error) throw error;
            const data = rawData as LemonSqueezyOrderResponse;
            if (data.error) throw new Error(data.error);

            // Construct Lemon Squeezy Checkout URL (Simulated)
            // In production, you'd use your Store ID and Variant ID
            const LS_CHECKOUT_URL = `https://italostudy.lemonsqueezy.com/checkout/buy/${planId}?embed=1&checkout[custom][transaction_id]=${data.transaction_id}`;

            window.location.href = LS_CHECKOUT_URL;
        } catch (err: any) {
            console.error('Lemon Squeezy error:', err);
            toast.error(err?.message || 'Failed to initialize Lemon Squeezy');
            setIsProcessing(false);
        }
    };

    const handleDodoPayment = async () => {
        setIsProcessing(true);
        try {
            const totalAmount = calculateTotal();

            // 1. Get the Gateway Plan ID for Dodo Subscriptions
            const plan = config?.plans.find(p => p.id === planId);
            const matchedCycle = findMatchingCycle(plan);
            
            let gatewayPlanId = matchedCycle?.dodoId ?? null;
            if (targetCurrency === 'PKR' && matchedCycle?.dodoPkrId) {
                gatewayPlanId = matchedCycle.dodoPkrId;
            } else if (targetCurrency === 'BDT' && matchedCycle?.dodoBdtId) {
                gatewayPlanId = matchedCycle.dodoBdtId;
            }

            if (!gatewayPlanId) {
                throw new Error('Dodo Subscription Plan ID is not configured for this cycle. Please contact support.');
            }

            // 2. Create Transaction via RPC
            const { data: rpcData, error: rpcError } = await (supabase as any).rpc('create_dodo_order', {
                p_amount: totalAmount,
                p_currency: targetCurrency,
                p_plan_id: planId,
                p_coupon_id: discount?.id,
                p_duration_value: actualDurationValue,
                p_duration_unit: actualDurationUnit
            });

            if (rpcError) throw rpcError;
            if (rpcData.error) throw new Error(rpcData.error);

            const transactionId = rpcData.transaction_id;

            // 3. Invoke Edge Function → get Dodo checkout_url (with retry)
            const { data: edgeData, error: edgeError } = await invokeWithRetry('create-dodo-order', {
                transactionId,
                gatewayPlanId,
                amount: totalAmount,
                currency: targetCurrency,
                couponCode: discount ? couponCode : undefined
            });

            if (edgeError) throw new Error('Payment server unavailable. Please try again or contact support@italostudy.com');
            if (edgeData?.error) throw new Error(edgeData.error);
            if (!edgeData?.checkout_url) throw new Error('Invalid session response from Payment Server');

            const { checkout_url } = edgeData;
            const environment = import.meta.env.VITE_DODO_ENVIRONMENT || 'test';

            // 4. Open Dodo Overlay — payment happens inside a modal on this page
            DodoPayments.Initialize({
                mode: environment === 'live_mode' ? 'live' : 'test',
                displayType: 'overlay',
                onEvent: (event: any) => {
                    console.log('Dodo overlay event:', event.event_type);
                    switch (event.event_type) {
                        case 'checkout.opened':
                            setIsProcessing(false);
                            break;

                        case 'checkout.redirect':
                            // Payment complete — Dodo will redirect; intercept and show our callback page
                            DodoPayments.Checkout.close();
                            onClose();
                            window.location.href = `/payment/callback?order_id=${transactionId}`;
                            break;

                        case 'checkout.closed':
                            setIsProcessing(false);
                            toast.info('Payment window closed.');
                            break;

                        case 'checkout.error':
                            setIsProcessing(false);
                            toast.error(event.data?.message || 'Checkout error. Please try again.');
                            break;

                        case 'checkout.link_expired':
                            setIsProcessing(false);
                            toast.error('This checkout session has expired. Please try again.');
                            break;
                    }
                },
            });

            await DodoPayments.Checkout.open({
                checkoutUrl: checkout_url,
                options: {
                    showTimer: true,
                    showSecurityBadge: true,
                    themeConfig: {
                        light: {
                            bgPrimary: '#FFFFFF',
                            bgSecondary: '#F9FAFB',
                            buttonPrimary: '#4F46E5',
                            buttonPrimaryHover: '#4338CA',
                            buttonTextPrimary: '#FFFFFF',
                            textPrimary: '#1E293B',
                            textSecondary: '#64748B',
                        },
                        radius: '12px',
                    },
                },
            });

        } catch (err: any) {
            console.error('Dodo Payments error:', err);
            toast.error(err?.message || 'Failed to initialize Dodo Payments');
            setIsProcessing(false);
        }
    };

    const handleCashfree = async () => {
        setIsProcessing(true);
        try {
            const totalAmount = calculateTotal();

            // 1. Create Transaction via RPC (Simplified)
            const { data: rpcData, error: rpcError } = await (supabase as any).rpc('create_cashfree_order', {
                p_amount: totalAmount,
                p_currency: targetCurrency,
                p_plan_id: planId,
                p_coupon_id: discount?.id,
                p_duration_value: actualDurationValue,
                p_duration_unit: actualDurationUnit
            });

            if (rpcError) throw rpcError;
            if (rpcData.error) throw new Error(rpcData.error);

            const transactionId = rpcData.transaction_id;

            // 2. Invoke Edge Function for Cashfree Session
            const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-cashfree-order', {
                body: {
                    transactionId,
                    amount: totalAmount,
                    currency: targetCurrency,
                    customerPhone: '9999999999' // Initial fallback, can be refined
                }
            });

            if (edgeError) throw edgeError;
            if (edgeData.error) throw new Error(edgeData.error);

            if (!edgeData.payment_session_id) {
                throw new Error('Invalid session response from Payment Server');
            }

            if (!window.Cashfree) {
                toast.error('Cashfree SDK not loaded');
                setIsProcessing(false);
                return;
            }

            const cashfree = new window.Cashfree({
                mode: edgeData.environment === 'production' ? 'production' : 'sandbox'
            });

            const checkoutOptions = {
                paymentSessionId: edgeData.payment_session_id,
                redirectTarget: "_modal"
            };

            cashfree.checkout(checkoutOptions).then((result: any) => {
                if (result.error) {
                    toast.error(result.error.message || 'Payment failed');
                    setIsProcessing(false);
                } else if (result.paymentDetails) {
                    verifyPayment(transactionId, result.paymentDetails.paymentId || 'CSHF_' + transactionId);
                }
            });

        } catch (err: any) {
            console.error('Cashfree error:', err);
            toast.error(err?.message || 'Failed to initialize Cashfree. Please try again or contact support@italostudy.com');
            setIsProcessing(false);
        }
    };

    const handleCashfreeSimulation = (txnId: string) => {
        toast.warning('Simulation Mode: Using dev-fallback as Edge Function is not deployed.');
        setIsProcessing(true);
        setTimeout(async () => {
            const confirmed = window.confirm("SIMULATION: Do you want to simulate a successful Cashfree payment?");
            if (confirmed) {
                await verifyPayment(txnId, 'SIM_CSHF_' + Math.random().toString(36).substr(2, 9));
            } else {
                setIsProcessing(false);
                toast.error('Simulation payment cancelled');
            }
        }, 1500);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{ willChange: 'opacity' }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 optimize-blur z-[200]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        style={{ willChange: 'transform, opacity' }}
                        className="fixed inset-0 flex items-center justify-center z-[210] p-0 pointer-events-none"
                    >
                        <div className="w-full h-[100dvh] md:h-auto md:min-h-[600px] max-w-[1000px] max-h-[100dvh] bg-[#f8f9fc] md:bg-white dark:bg-slate-950 md:dark:bg-slate-900 md:rounded-none shadow-2xl overflow-hidden pointer-events-auto border-0 md:border md:border-slate-100 dark:border-slate-800 flex flex-col relative font-sans">
                            {/* Header row (Title + Close) */}
                            <div className="px-5 md:px-8 pt-12 md:pt-8 pb-4 flex items-start justify-between shrink-0 bg-[#f8f9fc] md:bg-transparent dark:bg-slate-950 md:dark:bg-transparent">
                                <div className="flex flex-col">
                                    <h2 className="text-[26px] md:text-[28px] font-black text-[#131131] dark:text-white tracking-tight leading-tight">Checkout</h2>
                                    <p className="text-[12px] md:text-sm text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                                        <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" /> Secure & Encrypted Payment
                                    </p>
                                </div>
                                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-white md:bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors shadow-sm md:shadow-none mt-1 md:mt-0">
                                    <X className="w-4 h-4 text-[#131131] md:text-slate-500 dark:text-white" />
                                </button>
                            </div>

                            {/* Scrollable Content: 2-column Grid */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 md:px-8 pb-6 md:pb-8 flex flex-col md:flex-row gap-5 md:gap-8 bg-[#f8f9fc] md:bg-transparent dark:bg-slate-950 md:dark:bg-transparent">

                                {/* LEFT COLUMN: Plan Details & Features */}
                                <div className="flex-1 flex flex-col gap-6">
                                    {/* YOU'RE BUYING Card */}
                                    <div className="border border-slate-200/60 md:border-slate-200 dark:border-slate-800 md:dark:border-slate-700 rounded-2xl p-4 md:p-5 relative bg-white dark:bg-slate-900 md:dark:bg-slate-800 shadow-sm">
                                        <div className="absolute top-0 right-0 bg-[#D81865] text-white text-[9px] md:text-[10px] font-black px-3 md:px-4 py-1 rounded-bl-xl md:rounded-bl-2xl rounded-tr-2xl tracking-wider uppercase shadow-sm">
                                            Best Value
                                        </div>
                                        <h4 className="hidden md:block text-[10px] font-bold text-indigo-600 tracking-widest uppercase mb-4">You're Buying</h4>
                                        <div className="flex gap-3 md:gap-4 items-center">
                                            <div className="w-14 h-14 bg-[#5022f5] md:bg-indigo-600 rounded-[14px] flex items-center justify-center shrink-0 shadow-sm md:shadow-md">
                                                <Globe className="w-7 h-7 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-[17px] md:text-lg font-black text-[#131131] dark:text-white leading-tight truncate">{planName}</h3>
                                                <p className="text-[11px] md:text-[12px] text-slate-500 font-medium mt-0.5 md:mt-0.5 truncate">All premium features. Everywhere.</p>
                                                <div className="mt-1 md:mt-1.5 inline-block bg-[#f3f0ff] md:bg-slate-100 dark:bg-indigo-500/10 md:dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] md:text-[11px] font-bold text-[#5022f5] md:text-slate-600 dark:text-indigo-300 md:dark:text-slate-300">
                                                    Billed {getDurationLabel()}
                                                </div>
                                            </div>
                                            <div className="text-right pl-2 shrink-0">
                                                {discount && (
                                                    <p className="text-[10px] md:text-xs font-bold text-rose-500 line-through mb-0.5">
                                                        {formatPrice(amountInTargetCurrency, targetCurrency)}
                                                    </p>
                                                )}
                                                <div className={cn("text-[22px] md:text-2xl font-black tracking-tight", discount ? "text-emerald-500" : "text-[#5022f5] md:text-indigo-600 dark:text-indigo-400")}>
                                                    {formatPrice(calculateTotal(), targetCurrency)}
                                                </div>
                                                <div className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                                    per {actualDurationUnit === 'days' ? (actualDurationValue === 7 ? 'week' : 'day') : (actualDurationUnit === 'months' ? 'month' : 'year')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* YOU'LL GET Section */}
                                    <div className="hidden md:flex flex-col gap-4">
                                        <h4 className="text-[10px] font-bold text-indigo-600 tracking-widest uppercase ml-1">You'll Get</h4>
                                        <div className="flex flex-col gap-1">
                                            {[
                                                { title: "Unlimited Access", sub: "All premium content & resources", icon: FileText, color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-500/20" },
                                                { title: "Mock Tests & Analysis", sub: "Full-length mocks with detailed analytics", icon: Target, color: "text-blue-600 bg-blue-100 dark:bg-blue-500/20" },
                                                { title: "Priority Support", sub: "Faster response & dedicated support", icon: MessageSquare, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20" },
                                                { title: "24/7 Cent-s Slot Tracker", sub: "Never miss a test slot", icon: Zap, color: "text-purple-600 bg-purple-100 dark:bg-purple-500/20" },
                                                { title: "Cancel Anytime", sub: "No questions asked", icon: Lock, color: "text-slate-600 bg-slate-100 dark:bg-slate-700" }
                                            ].map((f, i) => (
                                                <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", f.color)}>
                                                        <f.icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex flex-col flex-1">
                                                        <span className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight mb-0.5">{f.title}</span>
                                                        <span className="text-[11px] text-slate-500">{f.sub}</span>
                                                    </div>
                                                    <div className="w-5 h-5 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                                                        <Check className="w-3 h-3 text-emerald-500" strokeWidth={3} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>


                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Coupons & Payments */}
                                <div className="flex-1 flex flex-col gap-6 w-full max-w-[420px] mx-auto md:mx-0">

                                    {/* Coupon Code Box */}
                                    <div className="border border-slate-200/60 md:border-slate-200 dark:border-slate-800 md:dark:border-slate-700 rounded-xl md:rounded-2xl bg-white dark:bg-slate-900 md:dark:bg-slate-800 shadow-sm overflow-hidden flex flex-col">
                                        {/* Mobile Accordion Header */}
                                        <div
                                            className="p-3.5 md:p-4 flex items-center justify-between cursor-pointer md:cursor-default"
                                            onClick={() => {
                                                if (window.innerWidth < 768) {
                                                    setIsMobileCouponOpen(!isMobileCouponOpen);
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 md:w-8 md:h-8 bg-slate-50 md:bg-indigo-50 dark:bg-slate-800 md:dark:bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0">
                                                    <Ticket className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-600 md:text-indigo-600 dark:text-slate-400 md:dark:text-indigo-400" />
                                                </div>
                                                <div>
                                                    <h5 className="text-[13px] font-bold text-[#131131] dark:text-white leading-tight">
                                                        <span className="md:hidden">Coupon code</span>
                                                        <span className="hidden md:inline">Have a coupon code?</span>
                                                    </h5>
                                                    <p className="hidden md:block text-[11px] text-slate-500 mt-0.5">Enter it to get exciting discounts</p>
                                                </div>
                                            </div>
                                            <div className="md:hidden flex items-center gap-1 text-[#5022f5] font-bold text-[12px]">
                                                {discount ? 'Applied' : 'Add code'}
                                                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isMobileCouponOpen ? "rotate-180" : "")} />
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "p-4 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800 md:border-slate-100 md:dark:border-slate-700/50",
                                            isMobileCouponOpen ? "block" : "hidden md:block"
                                        )}>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={couponCode}
                                                    onChange={e => setCouponCode(e.target.value)}
                                                    placeholder="Enter coupon code"
                                                    className="uppercase tracking-widest text-xs h-10 bg-white dark:bg-slate-800 border-slate-200"
                                                    disabled={!!discount}
                                                />
                                                {discount ? (
                                                    <Button variant="outline" onClick={() => { setDiscount(null); setCouponCode(''); }} className="h-10 text-rose-500 hover:text-rose-600 border-rose-200 hover:bg-rose-50">
                                                        Remove
                                                    </Button>
                                                ) : (
                                                    <Button variant="secondary" onClick={handleValidateCoupon} disabled={isValidating || !couponCode} className="h-10 bg-indigo-50 md:bg-indigo-50 text-[#5022f5] md:text-indigo-600 hover:bg-indigo-100 border border-indigo-100 px-6 font-bold text-xs">
                                                        {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Methods */}
                                    <div className="flex flex-col gap-2.5 md:gap-3">
                                        <h4 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-1">Choose Payment Method</h4>

                                        {isLoadingGateways ? (
                                            <div className="space-y-3">
                                                <div className="w-full h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                                                <div className="w-full h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2 md:gap-2">
                                                {/* INDIA SPECIFIC: Razorpay */}
                                                {targetCurrency === 'INR' && gateways.razorpay?.enabled && (
                                                    <>
                                                        <button
                                                            onClick={() => setSelectedGateway('razorpay')}
                                                            className={cn(
                                                                "w-full h-[52px] md:h-[92px] px-4 md:px-5 rounded-xl border flex items-center justify-between transition-all group bg-white dark:bg-slate-900 md:bg-transparent",
                                                                selectedGateway === 'razorpay' ? "border-[#5022f5] md:border-indigo-600 bg-[#fbfaff] md:bg-indigo-50/30 dark:bg-indigo-500/10 shadow-sm" : "border-slate-200/80 md:border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-3 md:gap-5">
                                                                <div className={cn("w-4 h-4 md:w-5 md:h-5 rounded-full border-[1.5px] md:border-2 flex items-center justify-center shrink-0", selectedGateway === 'razorpay' ? "border-[#5022f5] md:border-indigo-600" : "border-slate-300 dark:border-slate-600")}>
                                                                    {selectedGateway === 'razorpay' && <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#5022f5] md:bg-indigo-600" />}
                                                                </div>
                                                                <div className="flex flex-col items-start gap-0.5 md:gap-1.5 mt-0.5 md:mt-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <img src="/payments/razorpay.webp" alt="Razorpay" className="h-3.5 md:h-6 w-auto object-contain" />
                                                                    </div>
                                                                    <div className="hidden md:flex items-center gap-1.5 opacity-60">
                                                                        <img src="/payments/upi.webp" alt="UPI" className="h-3 w-auto dark:invert" />
                                                                        <img src="/payments/visa.webp" alt="Visa" className="h-3 w-auto" />
                                                                        <img src="/payments/mastercard.webp" alt="MC" className="h-3 w-auto" />
                                                                        <img src="/payments/amex.webp" alt="Amex" className="h-3 w-auto" />
                                                                    </div>
                                                                </div>
                                                                <div className="md:hidden flex items-center gap-1.5 opacity-80 ml-1">
                                                                    <img src="/payments/upi.webp" alt="UPI" className="h-2.5 w-auto dark:invert" />
                                                                    <img src="/payments/visa.webp" alt="Visa" className="h-2.5 w-auto" />
                                                                    <img src="/payments/mastercard.webp" alt="MC" className="h-2.5 w-auto" />
                                                                    <img src="/payments/amex.webp" alt="Amex" className="h-2.5 w-auto" />
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-3 shrink-0">
                                                                <div className="bg-emerald-50 md:bg-emerald-100/80 text-emerald-600 md:text-emerald-700 text-[8px] md:text-[10px] font-black px-1.5 md:px-2.5 py-0.5 md:py-1 rounded uppercase tracking-wider">Recommended</div>
                                                            </div>
                                                        </button>

                                                    </>
                                                )}

                                                {/* GLOBAL SPECIFIC: Dodo */}
                                                {targetCurrency !== 'INR' && gateways.dodo?.enabled && (
                                                    <button
                                                        onClick={() => setSelectedGateway('dodo')}
                                                        className={cn(
                                                            "w-full h-[52px] md:h-[92px] px-4 md:px-5 rounded-xl border flex items-center justify-between transition-all group bg-white dark:bg-slate-900 md:bg-transparent",
                                                            selectedGateway === 'dodo' ? "border-[#5022f5] md:border-indigo-600 bg-indigo-50/10 md:bg-indigo-50/30 dark:bg-indigo-500/10 shadow-sm" : "border-slate-200/80 md:border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3 md:gap-5">
                                                            <div className={cn("w-4 h-4 md:w-5 md:h-5 rounded-full border-[1.5px] md:border-2 flex items-center justify-center shrink-0", selectedGateway === 'dodo' ? "border-[#5022f5] md:border-indigo-600" : "border-slate-300 dark:border-slate-600")}>
                                                                {selectedGateway === 'dodo' && <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#5022f5] md:bg-indigo-600" />}
                                                            </div>
                                                            <div className="flex flex-col items-start gap-0.5 md:gap-1.5 mt-0.5 md:mt-0">
                                                                <div className="flex items-center gap-2">
                                                                    <img src="/payments/dodopayments.webp" alt="Dodo Payments" className="h-6 md:h-9 w-auto object-contain" />
                                                                </div>
                                                                <div className="hidden md:flex items-center gap-1.5 opacity-60">
                                                                    <img src="/payments/stripe.webp" alt="Stripe" className="h-3 w-auto" />
                                                                    <img src="/payments/visa.webp" alt="Visa" className="h-3 w-auto" />
                                                                    <img src="/payments/mastercard.webp" alt="MC" className="h-3 w-auto" />
                                                                    <img src="/payments/amex.webp" alt="Amex" className="h-3 w-auto" />
                                                                    <img src="/payments/googlepay.webp" alt="Google Pay" className="h-3 w-auto dark:invert" />
                                                                    <img src="/payments/applepay.webp" alt="Apple Pay" className="h-3 w-auto dark:invert" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <div className="bg-emerald-50 md:bg-emerald-100/80 text-emerald-600 md:text-emerald-700 text-[8px] md:text-[10px] font-black px-1.5 md:px-2.5 py-0.5 md:py-1 rounded uppercase tracking-wider">Recommended</div>
                                                        </div>
                                                    </button>
                                                )}

                                                {/* PayPal (All Regions) */}
                                                {gateways.paypal?.enabled && targetCurrency !== 'INR' && (
                                                    <button
                                                        onClick={() => setSelectedGateway('paypal')}
                                                        className={cn(
                                                            "w-full h-[52px] md:h-16 px-4 rounded-xl border flex items-center justify-between transition-all group bg-white dark:bg-slate-900 md:bg-transparent",
                                                            selectedGateway === 'paypal' ? "border-[#5022f5] md:border-indigo-600 bg-indigo-50/10 md:bg-indigo-50/30 dark:bg-indigo-500/10 shadow-sm" : "border-slate-200/80 md:border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("w-4 h-4 rounded-full border-[1.5px] md:border-2 flex items-center justify-center", selectedGateway === 'paypal' ? "border-[#5022f5] md:border-indigo-600" : "border-slate-300 dark:border-slate-600")}>
                                                                {selectedGateway === 'paypal' && <div className="w-2 h-2 rounded-full bg-[#5022f5] md:bg-indigo-600" />}
                                                            </div>
                                                            <div className="flex flex-col items-start">
                                                                <img src="/payments/paypal.webp" alt="PayPal" className="h-3.5 md:h-4 w-auto object-contain mb-0.5" />
                                                                {targetCurrency === 'INR' && <span className="text-[9px] text-slate-400">Charges in EUR</span>}
                                                            </div>
                                                        </div>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {/* PayPal Subscriptions JS Button Container */}
                                        <div id="paypal-button-container" className={cn("empty:hidden", selectedGateway === 'paypal' ? "mt-2" : "hidden")}></div>
                                    </div>

                                    {/* Mobile Secure Banner */}
                                    <div className="md:hidden mt-2 mb-2 w-full bg-[#f6f4ff] dark:bg-indigo-500/10 rounded-xl p-4 flex items-center gap-4 border border-[#e4dfff] dark:border-indigo-500/20">
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700">
                                            <ShieldCheck className="w-4 h-4 text-[#5022f5] dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <h5 className="text-[12px] font-bold text-[#131131] dark:text-white leading-tight mb-0.5">100% Secure Payment</h5>
                                            <p className="text-[11px] text-slate-500">Your payment details are safe with us.</p>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Footer / CTA Row */}
                            <div className="bg-white md:bg-slate-50 dark:bg-slate-900 md:dark:bg-slate-800/50 p-4 md:p-6 border-t border-slate-200/80 md:border-slate-200 dark:border-slate-800 md:dark:border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] md:shadow-none z-10">

                                {/* Trust Badges */}
                                <div className="hidden md:flex items-center gap-6 shrink-0 order-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><ShieldCheck className="w-3.5 h-3.5" /></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight">100% Secure</span>
                                            <span className="text-[9px] text-slate-500">SSL Encrypted</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Zap className="w-3.5 h-3.5" /></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight">Instant Access</span>
                                            <span className="text-[9px] text-slate-500">Start learning immediately</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center"><Circle className="w-3 h-3" /></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight">Cancel Anytime</span>
                                            <span className="text-[9px] text-slate-500">No questions asked</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Pay Button & Total */}
                                <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-6 order-2">
                                    <div className="flex flex-col items-start md:items-end">
                                        <span className="text-[10px] md:text-[10px] font-bold text-slate-500 md:text-slate-400 md:uppercase tracking-widest">Total Amount</span>
                                        <span className="text-[22px] md:text-xl font-black text-[#5022f5] md:text-slate-900 dark:text-white leading-none mt-0.5 md:mt-1">{formatPrice(calculateTotal(), targetCurrency)}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (selectedGateway === 'razorpay') handleRazorpay();
                                            else if (selectedGateway === 'dodo') handleDodoPayment();
                                            else if (selectedGateway === 'paypal') handlePayPal();
                                        }}
                                        disabled={isProcessing || !selectedGateway}
                                        className="h-[52px] md:h-12 px-5 md:px-6 flex-1 md:flex-none bg-gradient-to-r from-[#8134e7] to-[#d81865] hover:from-[#6c2bbd] hover:to-[#be1558] md:bg-none md:bg-[#6332F6] md:hover:bg-[#5326D4] text-white rounded-[14px] md:rounded-xl font-bold flex items-center justify-center md:justify-start gap-2.5 md:gap-3 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-purple-500/25 md:shadow-indigo-500/20"
                                    >
                                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <>
                                                <Lock className="w-4 h-4 md:w-4 md:h-4 opacity-90" />
                                                <span className="text-[15px] md:text-base">Pay {formatPrice(calculateTotal(), targetCurrency)} <span className="hidden sm:inline">Securely</span></span>
                                                <svg className="w-4 h-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
