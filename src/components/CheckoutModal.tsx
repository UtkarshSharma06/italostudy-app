import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, CreditCard, Lock, ShieldCheck, Ticket, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { initializePaddle, Paddle } from '@paddle/paddle-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePricing } from '@/context/PricingContext';
import { useCurrency } from '@/hooks/useCurrency';
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
    const [gateways, setGateways] = useState<any>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
    const { getPaymentDetails, formatPrice, getRegionalPrice, currency: currentCurrency } = useCurrency();

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
        }
    }, [isOpen]);

    const fetchGateways = async () => {
        const { data, error } = await (supabase as any).rpc('get_payment_config');

        if (data) {
            setGateways(data);
            loadPaymentScripts(data); // Pass data directly to ensure immediate loading

            // Initialize Paddle
            if (data.paddle?.enabled && data.paddle?.client_token && !paddle) {
                initializePaddle({
                    environment: data.paddle.environment || 'sandbox',
                    token: data.paddle.client_token
                }).then(paddleInstance => setPaddle(paddleInstance));
            }
        } else if (error) {
            console.error('Failed to load payment config', error);
        }
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

    // Helper to match duration roughly
    const filterDurationValue = (cycle: string) => {
        if (cycle.includes('month')) return 1;
        if (cycle.includes('quarter')) return 3;
        if (cycle.includes('year')) return 1;
        return 1;
    }

    const filterDurationUnit = (cycle: string) => {
        if (cycle.includes('day')) return 'days';
        if (cycle.includes('year')) return 'years';
        return 'months';
    }

    const handleRazorpay = async () => {
        setIsProcessing(true);
        try {
            const totalAmount = calculateTotal();

            // 1. Get the Gateway Plan ID for Razorpay Subscriptions
            const plan = config?.plans.find(p => p.id === planId);
            let gatewayPlanId = null;
            if (plan?.cycles) {
                const cycle = plan.cycles.find(c => 
                    (c.durationValue === filterDurationValue(billingCycle) && c.durationUnit === filterDurationUnit(billingCycle)) || 
                    c.name.toLowerCase().includes(billingCycle.toLowerCase())
                );
                gatewayPlanId = cycle?.razorpayId;
            }

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

            // 3. Create Subscription on Razorpay Server
            const { data: subData, error: subError } = await supabase.functions.invoke('create-razorpay-order', {
                body: {
                    transactionId: data.transaction_id,
                    gatewayPlanId: gatewayPlanId
                }
            });

            if (subError) throw subError;
            if (subData.error) throw new Error(subData.error);

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
            toast.error(err?.message || 'Failed to initialize Razorpay Subscription');
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
            let gatewayPlanId = null;
            if (plan?.cycles) {
                const cycle = plan.cycles.find(c => 
                    (c.durationValue === filterDurationValue(billingCycle) && c.durationUnit === filterDurationUnit(billingCycle)) || 
                    c.name.toLowerCase().includes(billingCycle.toLowerCase())
                );
                gatewayPlanId = cycle?.paypalId;
            }

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
                    return actions.subscription.create({
                        'plan_id': gatewayPlanId
                    });
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
                toast.error(data.error || 'Payment verification failed');
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
                window.location.href = '/dashboard';
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
            let gatewayPlanId = null;
            if (plan?.cycles) {
                const cycle = plan.cycles.find(c =>
                    (c.durationValue === filterDurationValue(billingCycle) && c.durationUnit === filterDurationUnit(billingCycle)) ||
                    c.name.toLowerCase().includes(billingCycle.toLowerCase())
                );
                gatewayPlanId = cycle?.dodoId;
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

            // 3. Invoke Edge Function → get Dodo checkout_url
            const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-dodo-order', {
                body: {
                    transactionId,
                    gatewayPlanId,
                    amount: totalAmount,
                    currency: targetCurrency
                }
            });

            if (edgeError) throw edgeError;
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
            toast.error(err?.message || 'Failed to initialize Cashfree');
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
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-[110] p-4 pointer-events-none"
                    >
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden pointer-events-auto border border-slate-100 dark:border-slate-800">
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Checkout</h2>
                                    <p className="text-sm text-slate-400 font-medium">Secure Payment</p>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar">
                                <div className="p-6 space-y-6">
                                    {/* Plan Summary */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{getDurationLabel()} Plan</p>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{planName}</h3>
                                        </div>
                                        <div className="text-right">
                                            {discount && (
                                                <p className="text-xs font-bold text-rose-500 line-through">
                                                    {formatPrice(amountInTargetCurrency, targetCurrency)}
                                                </p>
                                            )}
                                            <p className={cn("text-xl font-black tracking-tight", discount ? "text-emerald-500" : "text-slate-900 dark:text-white")}>
                                                {formatPrice(calculateTotal(), targetCurrency)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Coupon */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                            <Ticket className="w-3 h-3" /> Coupon Code
                                        </label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={couponCode}
                                                onChange={e => setCouponCode(e.target.value)}
                                                placeholder="ENTER CODE"
                                                className="uppercase font-mono tracking-widest"
                                                disabled={!!discount}
                                            />
                                            {discount ? (
                                                <Button variant="ghost" onClick={() => { setDiscount(null); setCouponCode(''); }} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            ) : (
                                                <Button onClick={handleValidateCoupon} disabled={isValidating || !couponCode} className="min-w-[80px]">
                                                    {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Method Tiles — same style as store */}
                                    <div className="space-y-4 pt-2">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                            <CreditCard className="w-3 h-3" /> Select Payment Method
                                        </p>

                                        {/* India section */}
                                        {targetCurrency === 'INR' && gateways.razorpay?.enabled && (
                                            <div className="space-y-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 px-1">India</p>
                                                <button
                                                    onClick={() => setSelectedGateway('razorpay')}
                                                    className={cn(
                                                        "w-full p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2.5",
                                                        selectedGateway === 'razorpay' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 hover:border-slate-200"
                                                    )}
                                                >
                                                    <img src="/payments/razorpay.webp" alt="Razorpay" className="h-6 w-auto object-contain" />
                                                    <div className="flex items-center gap-2 opacity-60">
                                                        <img src="/payments/upi.webp" alt="UPI" className="h-3 w-auto" />
                                                        <img src="/payments/visa.webp" alt="Visa" className="h-3 w-auto" />
                                                        <img src="/payments/mastercard.webp" alt="MC" className="h-3 w-auto" />
                                                    </div>
                                                </button>
                                            </div>
                                        )}

                                        {/* International: Dodo */}
                                        {targetCurrency !== 'INR' && gateways.dodo?.enabled && (
                                            <div className="space-y-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 px-1">Cards & Digital Wallets</p>
                                                <button
                                                    onClick={() => setSelectedGateway('dodo')}
                                                    className={cn(
                                                        "w-full p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2.5",
                                                        selectedGateway === 'dodo' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 hover:border-slate-200"
                                                    )}
                                                >
                                                    <img src="/payments/dodopayments.webp" alt="Dodo Payments" className="h-6 w-auto object-contain" />
                                                    <div className="flex flex-wrap items-center justify-center gap-1.5 opacity-60">
                                                        <img src="/payments/googlepay.webp" alt="Google Pay" className="h-3 w-auto" />
                                                        <img src="/payments/applepay.webp" alt="Apple Pay" className="h-3 w-auto" />
                                                        <img src="/payments/visa.webp" alt="Visa" className="h-3 w-auto" />
                                                        <img src="/payments/mastercard.webp" alt="Mastercard" className="h-3 w-auto" />
                                                    </div>
                                                </button>
                                            </div>
                                        )}

                                        {/* PayPal — all regions */}
                                        {gateways.paypal?.enabled && (
                                            <div className="space-y-2">
                                                {targetCurrency !== 'INR' && <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 px-1">PayPal</p>}
                                                {targetCurrency === 'INR' && <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 px-1">PayPal (charges in EUR)</p>}
                                                <button
                                                    onClick={() => setSelectedGateway('paypal')}
                                                    className={cn(
                                                        "w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-center",
                                                        selectedGateway === 'paypal' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 hover:border-slate-200"
                                                    )}
                                                >
                                                    <img src="/payments/paypal.webp" alt="PayPal" className="h-6 w-auto object-contain" />
                                                </button>
                                                {/* PayPal buttons render here after selection */}
                                                <div id="paypal-button-container" className="mt-2 empty:hidden"></div>
                                            </div>
                                        )}

                                        {/* Pay Now button */}
                                        {selectedGateway && (
                                            <button
                                                onClick={() => {
                                                    if (selectedGateway === 'razorpay') handleRazorpay();
                                                    else if (selectedGateway === 'dodo') handleDodoPayment();
                                                    else if (selectedGateway === 'paypal') handlePayPal();
                                                }}
                                                disabled={isProcessing}
                                                className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                                            >
                                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-3.5 h-3.5" /> Pay Now &middot; {formatPrice(calculateTotal(), targetCurrency)}</>}
                                            </button>
                                        )}

                                    </div>
                                </div>

                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 text-center shrink-0 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] text-slate-400 flex items-center justify-center gap-2">
                                    <Lock className="w-3 h-3" /> SSL Encrypted & Secure
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
