import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { DodoPayments } from 'dodopayments-checkout';
import {
    Euro, Lock, GraduationCap, ShieldCheck, Loader2, X,
    Clock, CheckCircle, AlertCircle, CreditCard, Zap,
    Package, ChevronRight, Sparkles, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Plan } from '@/context/PricingContext';
import { useCurrency } from '@/hooks/useCurrency';

declare global {
    interface Window { Razorpay: any; paypal: any; }
}

interface Course {
    id: string;
    title: string;
    price_eur: number;
    discount_price_eur?: number | null;
    expiry_days: number;
    description?: string;
    thumbnail_url?: string;
    regional_prices?: Record<string, number>;
}

interface BundleCheckoutModalProps {
    course: Course;
    plan: Plan;
    onClose: () => void;
}

type ModalState = 'select' | 'course_processing' | 'subscription_processing' | 'success' | 'error';

function formatExpiry(days: number) {
    if (days >= 365) return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''}`;
    if (days >= 30) return `${Math.floor(days / 30)} months`;
    return `${days} days`;
}

export default function BundleCheckoutModal({ course, plan, onClose }: BundleCheckoutModalProps) {
    const { user } = useAuth() as any;
    const { formatPrice, getRegionalPrice } = useCurrency();
    const [state, setState] = useState<ModalState>('select');
    const [errorMsg, setErrorMsg] = useState('');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly'>('monthly');
    const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
    const [gateways, setGateways] = useState<any>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [courseTxnId, setCourseTxnId] = useState<string | null>(null);
    const paypalContainerRef = useRef<HTMLDivElement>(null);
    const paypalRendered = useRef(false);

    const abandonmentTracked = useRef(false);
    const isProcessingRef = useRef(isProcessing);
    const stateRef = useRef(state);
    
    useEffect(() => {
        isProcessingRef.current = isProcessing;
        stateRef.current = state;
    }, [isProcessing, state]);

    useEffect(() => {
        return () => {
            if (!isProcessingRef.current && !abandonmentTracked.current && user && stateRef.current === 'select') {
                abandonmentTracked.current = true;
                supabase.from('checkout_abandonments').insert({
                    user_id: user.id,
                    email: user.email,
                    plan_name: `Bundle: ${course.title} + ${plan.name}`
                }).then(({ error }) => {
                    if (error) console.error("Failed to log checkout abandonment:", error);
                });
            }
        };
    }, [user, course.title, plan.name]);

    const getPlanCycle = (plan: Plan) => {
        if (plan.cycles && plan.cycles.length > 0) {
            const index = billingCycle === 'monthly' ? 0 : 1;
            return plan.cycles[Math.min(index, plan.cycles.length - 1)];
        }
        return null;
    };

    const cycle = getPlanCycle(plan);
    const planBasePrice = cycle ? cycle.price : (billingCycle === 'monthly' ? plan.monthlyPrice : plan.quarterlyPrice);
    const planRegionalPrices = cycle ? cycle.regionalPrices : plan.regionalPrices;
    
    // Calculate local prices
    const hasDiscount = !!course.discount_price_eur || !!course.regional_prices?.INR_discount;
    const localCourse = hasDiscount
        ? getRegionalPrice(course.discount_price_eur || course.price_eur, course.regional_prices?.INR_discount ? { INR: course.regional_prices.INR_discount } : undefined)
        : getRegionalPrice(course.price_eur, course.regional_prices);
    const localPlan = getRegionalPrice(planBasePrice, planRegionalPrices);
    const totalTodayAmount = localCourse.amount + localPlan.amount;

    const isINR = typeof navigator !== 'undefined' && (
        Intl.DateTimeFormat().resolvedOptions().timeZone?.includes('Calcutta') ||
        Intl.DateTimeFormat().resolvedOptions().timeZone?.includes('Kolkata')
    );

    useEffect(() => {
        (supabase as any).rpc('get_payment_config').then(({ data }: any) => {
            if (data) {
                setGateways(data);
                if (!document.querySelector('script[src*="razorpay"]')) {
                    const s = document.createElement('script');
                    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    s.async = true;
                    document.body.appendChild(s);
                }
                if (data.paypal?.enabled && data.paypal?.client_id && !document.querySelector('script[src*="paypal.com/sdk/js"]')) {
                    const s = document.createElement('script');
                    s.src = `https://www.paypal.com/sdk/js?client-id=${data.paypal.client_id}&currency=EUR&intent=capture`;
                    s.async = true;
                    document.body.appendChild(s);
                }
            }
        });
    }, []);

    const showError = (msg: string) => {
        setErrorMsg(msg);
        setState('error');
        setIsProcessing(false);
    };

    // ── Step 1: Create course transaction record ─────────────────────────────
    const createCourseOrder = async (gateway: string): Promise<string | null> => {
        const res = await supabase.functions.invoke('create-course-order', {
            body: { course_id: course.id, gateway },
        });
        const data = res.data as any;
        if (res.error || data?.error) throw new Error(data?.error || res.error?.message);
        if (!data?.transaction_id) throw new Error('No transaction ID returned');
        return data.transaction_id;
    };

    // ── Step 2: After course paid → redirect to bundle callback ──────────────
    const redirectToBundleCallback = (txnId: string, extra = '') => {
        onClose();
        window.location.href = `/bundle-payment/callback?course_order_id=${txnId}&plan_id=${plan.id}&billing_cycle=${billingCycle}${extra}`;
    };

    // ── Dodo: Course first, then subscription ────────────────────────────────
    const handleDodo = async () => {
        setIsProcessing(true);
        setState('course_processing');
        try {
            const res = await supabase.functions.invoke('create-course-order', {
                body: { course_id: course.id },
            });
            const data = res.data as any;
            if (res.error || data?.error) throw new Error(data?.error || res.error?.message);
            if (!data?.checkout_url) throw new Error('No checkout URL returned');

            const { checkout_url, transaction_id } = data;
            const environment = import.meta.env.VITE_DODO_ENVIRONMENT || 'test';

            DodoPayments.Initialize({
                mode: ['live_mode', 'live', 'production'].includes(environment) ? 'live' : 'test',
                displayType: 'overlay',
                onEvent: (event: any) => {
                    switch (event.event_type) {
                        case 'checkout.opened': setIsProcessing(false); break;
                        case 'checkout.redirect':
                            DodoPayments.Checkout.close();
                            redirectToBundleCallback(transaction_id);
                            break;
                        case 'checkout.closed':
                            setIsProcessing(false);
                            setState('select');
                            toast.info('Payment window closed.');
                            break;
                        case 'checkout.error':
                            showError(event.data?.message || 'Checkout error. Please try again.');
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
                            bgPrimary: '#FFFFFF', bgSecondary: '#F9FAFB',
                            buttonPrimary: '#7C3AED', buttonPrimaryHover: '#6D28D9',
                            buttonTextPrimary: '#FFFFFF', textPrimary: '#1E293B', textSecondary: '#64748B',
                        },
                        radius: '12px',
                    },
                },
            });
        } catch (err: any) {
            showError(err.message || 'Failed to open payment. Please try again.');
        }
    };

    // ── Razorpay ─────────────────────────────────────────────────────────────
    const handleRazorpay = async () => {
        setIsProcessing(true);
        setState('course_processing');
        try {
            const txnId = await createCourseOrder('razorpay');
            if (!txnId) throw new Error('Failed to create order');
            setCourseTxnId(txnId);

            const rzpRes = await supabase.functions.invoke('create-course-razorpay', {
                body: { course_transaction_id: txnId },
            });
            const rzpData = rzpRes.data as any;
            if (rzpRes.error || rzpData?.error) throw new Error(rzpData?.error || rzpRes.error?.message);
            if (!window.Razorpay) throw new Error('Razorpay not loaded. Please refresh and try again.');

            const rzp = new window.Razorpay({
                key: rzpData.key_id,
                order_id: rzpData.order_id,
                amount: rzpData.amount,
                currency: rzpData.currency,
                name: rzpData.name,
                description: `Bundle: ${course.title} + ${plan.name}`,
                prefill: { email: user?.email || '' },
                handler: async (response: any) => {
                    redirectToBundleCallback(txnId, `&payment_id=${response.razorpay_payment_id}&dodo_status=succeeded&gateway=razorpay`);
                },
                modal: {
                    ondismiss: () => {
                        setIsProcessing(false);
                        setState('select');
                        toast.info('Payment cancelled.');
                    }
                },
                theme: { color: '#7C3AED' },
            });
            rzp.open();
            setIsProcessing(false);
        } catch (err: any) {
            showError(err.message || 'Razorpay failed. Please try again.');
        }
    };

    // ── PayPal ────────────────────────────────────────────────────────────────
    const handlePayPal = async () => {
        setIsProcessing(true);
        paypalRendered.current = false;
        setState('course_processing');
        try {
            const txnId = await createCourseOrder('paypal');
            if (!txnId) throw new Error('Failed to create order');
            setCourseTxnId(txnId);
            if (!window.paypal) throw new Error('PayPal not loaded. Please refresh and try again.');

            toast.info('Click the PayPal button below to pay for your course first');
            setIsProcessing(false);

            if (paypalContainerRef.current) paypalContainerRef.current.innerHTML = '';
            paypalRendered.current = true;

            window.paypal.Buttons({
                style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' },
                createOrder: (_data: any, actions: any) => {
                    return actions.order.create({
                        intent: 'CAPTURE',
                        purchase_units: [{
                            amount: { value: course.price_eur.toString(), currency_code: 'EUR' },
                            description: `${course.title} — ItaloStudy Course`,
                            custom_id: txnId,
                        }],
                    });
                },
                onApprove: async (_data: any, actions: any) => {
                    const order = await actions.order.capture();
                    if (order.status === 'COMPLETED') {
                        redirectToBundleCallback(txnId, `&payment_id=${order.id}&dodo_status=succeeded&gateway=paypal`);
                    } else {
                        showError('PayPal payment not completed. Please try again.');
                    }
                },
                onError: (err: any) => {
                    console.error('PayPal error:', err);
                    showError('PayPal payment failed. Please try again.');
                },
                onCancel: () => {
                    toast.info('PayPal payment cancelled.');
                    if (paypalContainerRef.current) paypalContainerRef.current.innerHTML = '';
                    paypalRendered.current = false;
                    setState('select');
                },
            }).render('#bundle-paypal-btn-container');
        } catch (err: any) {
            showError(err.message || 'PayPal failed. Please try again.');
        }
    };

    const handlePayNow = () => {
        if (!selectedGateway) { toast.error('Please select a payment method'); return; }
        if (selectedGateway === 'dodo') handleDodo();
        else if (selectedGateway === 'razorpay') handleRazorpay();
        else if (selectedGateway === 'paypal') handlePayPal();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={!isProcessing ? onClose : undefined}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 24 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl"
            >
                {/* Premium gradient accent bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

                {/* Close button */}
                {!isProcessing && (
                    <button onClick={onClose}
                        className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-10">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                )}

                <div className="p-7 space-y-5 max-h-[90vh] overflow-y-auto">
                    <AnimatePresence mode="wait">

                        {/* ── Gateway Select State ─────────────────────────────── */}
                        {state === 'select' && (
                            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

                                {/* Bundle header */}
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30">
                                            <Sparkles className="w-3 h-3 text-violet-600" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-violet-600">Bundle Deal</span>
                                        </div>
                                    </div>
                                    <h2 className="font-black text-slate-900 dark:text-white text-xl leading-tight tracking-tight">
                                        Complete Study Package
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Course access + subscription plan, paid separately & securely</p>
                                </div>
                                
                                {/* Billing Toggle */}
                                <div className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                    <button
                                        onClick={() => setBillingCycle('monthly')}
                                        className={cn(
                                            "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            billingCycle === 'monthly' ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                        )}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => setBillingCycle('quarterly')}
                                        className={cn(
                                            "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            billingCycle === 'quarterly' ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                        )}
                                    >
                                        Quarterly
                                    </button>
                                </div>

                                {/* Bundle items breakdown */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">

                                    {/* Course item */}
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                            {course.thumbnail_url
                                                ? <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                                : <GraduationCap className="w-5 h-5 text-indigo-600" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Course · One-time</p>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">{course.title}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {formatExpiry(course.expiry_days)} access · No auto-renewal
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="font-black text-slate-900 dark:text-white">{formatPrice(localCourse.amount, localCourse.currency)}</p>
                                                    <p className="text-[9px] text-slate-400">one-time</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Plan item */}
                                    <div className="p-4 flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
                                            <Zap className="w-5 h-5 text-violet-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-violet-500">Subscription · {billingCycle}</p>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{plan.name}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                        <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />
                                                        Unlimited Practice · Mock Exams
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="font-black text-slate-900 dark:text-white">{formatPrice(localPlan.amount, localPlan.currency)}</p>
                                                    <p className="text-[9px] text-slate-400">per {billingCycle === 'monthly' ? 'month' : 'quarter'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Total row */}
                                    <div className="px-4 py-3 bg-violet-50 dark:bg-violet-900/20 border-t border-violet-100 dark:border-violet-800/40 flex items-center justify-between">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-violet-600">Today you pay</p>
                                            <p className="text-[9px] text-slate-400 mt-0.5">Then {formatPrice(localPlan.amount, localPlan.currency)}/{billingCycle === 'monthly' ? 'mo' : 'qtr'} for subscription</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-violet-700 dark:text-violet-300">{formatPrice(totalTodayAmount, localCourse.currency)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* How it works note */}
                                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                                        <strong>Two-step checkout:</strong> You'll pay for the course first, then be redirected to complete your subscription. Both are processed securely and independently.
                                    </p>
                                </div>

                                {/* Payment method selection */}
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <CreditCard className="w-3 h-3" /> Step 1 — Pay Course ({formatPrice(localCourse.amount, localCourse.currency)})
                                    </p>

                                    {/* Razorpay — India */}
                                    {isINR && gateways.razorpay?.enabled && (
                                        <div className="space-y-1.5">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 px-1">India</p>
                                            <button onClick={() => setSelectedGateway('razorpay')}
                                                className={cn('w-full p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2',
                                                    selectedGateway === 'razorpay' ? 'border-violet-600 bg-violet-50/50 dark:bg-violet-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700')}>
                                                <img src="/payments/razorpay.webp" alt="Razorpay" className="h-6 w-auto object-contain" />
                                                <div className="flex items-center gap-2 opacity-60">
                                                    <img src="/payments/upi.webp" alt="UPI" className="h-3 w-auto" />
                                                    <img src="/payments/visa.webp" alt="Visa" className="h-3 w-auto" />
                                                    <img src="/payments/mastercard.webp" alt="MC" className="h-3 w-auto" />
                                                </div>
                                            </button>
                                        </div>
                                    )}

                                    {/* Dodo — International */}
                                    {gateways.dodo?.enabled && (
                                        <div className="space-y-1.5">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 px-1">Cards & Digital Wallets</p>
                                            <button onClick={() => setSelectedGateway('dodo')}
                                                className={cn('w-full p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2',
                                                    selectedGateway === 'dodo' ? 'border-violet-600 bg-violet-50/50 dark:bg-violet-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700')}>
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

                                    {/* PayPal */}
                                    {gateways.paypal?.enabled && (
                                        <div className="space-y-1.5">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 px-1">PayPal</p>
                                            <button onClick={() => setSelectedGateway('paypal')}
                                                className={cn('w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-center',
                                                    selectedGateway === 'paypal' ? 'border-violet-600 bg-violet-50/50 dark:bg-violet-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700')}>
                                                <img src="/payments/paypal.webp" alt="PayPal" className="h-6 w-auto object-contain" />
                                            </button>
                                        </div>
                                    )}

                                    {!gateways.dodo?.enabled && !gateways.razorpay?.enabled && !gateways.paypal?.enabled && (
                                        <div className="text-center py-6 text-slate-400 text-sm">
                                            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                            <p>Payment methods loading…</p>
                                        </div>
                                    )}

                                    {/* PayPal buttons render zone */}
                                    <div id="bundle-paypal-btn-container" ref={paypalContainerRef} className="empty:hidden mt-2" />

                                    {/* Pay Now */}
                                    {selectedGateway && selectedGateway !== 'paypal' && (
                                        <motion.button
                                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                            onClick={handlePayNow}
                                            disabled={isProcessing}
                                            className="w-full h-13 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-violet-500/25 py-3.5">
                                            {isProcessing
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <><Lock className="w-3.5 h-3.5" />Start Bundle — Pay Course {formatPrice(localCourse.amount, localCourse.currency)} First</>}
                                        </motion.button>
                                    )}

                                    {selectedGateway === 'paypal' && !paypalRendered.current && (
                                        <motion.button
                                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                            onClick={handlePayNow}
                                            disabled={isProcessing}
                                            className="w-full h-12 rounded-2xl bg-[#0070ba] hover:bg-[#005ea6] disabled:opacity-60 text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all active:scale-95">
                                            {isProcessing
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <><img src="/payments/paypal.webp" alt="PayPal" className="h-4 w-auto brightness-0 invert" />Pay Course with PayPal</>}
                                        </motion.button>
                                    )}
                                </div>

                                {/* Security footer */}
                                <div className="flex items-center justify-center gap-4 pt-1">
                                    <div className="flex items-center gap-1.5 text-slate-300 dark:text-slate-600">
                                        <Lock className="w-3 h-3" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">256-bit SSL</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-300 dark:text-slate-600">
                                        <ShieldCheck className="w-3 h-3" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Secure Checkout</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-300 dark:text-slate-600">
                                        <Package className="w-3 h-3" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">2 Items</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Course Processing State ──────────────────────────── */}
                        {state === 'course_processing' && (
                            <motion.div key="course_proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-center py-10 space-y-4">
                                <div className="relative w-20 h-20 mx-auto">
                                    <div className="absolute inset-0 rounded-full bg-indigo-50 dark:bg-indigo-900/30" />
                                    <div className="absolute inset-1 rounded-full border-[3px] border-t-indigo-500 border-r-indigo-300 border-b-transparent border-l-transparent animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <GraduationCap className="w-7 h-7 text-indigo-500" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1">Step 1 of 2</p>
                                    <h3 className="font-black text-slate-900 dark:text-white text-lg">Processing Course Payment</h3>
                                    <p className="text-sm text-slate-400 mt-1">Opening secure payment window…</p>
                                </div>
                                <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-indigo-100 border-2 border-indigo-500 flex items-center justify-center">
                                            <span className="text-[9px] font-black text-indigo-600">1</span>
                                        </div>
                                        <span className="font-bold">Course</span>
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-slate-300" />
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                                            <span className="text-[9px] font-black text-slate-400">2</span>
                                        </div>
                                        <span className="text-slate-300">Subscription</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Error State ──────────────────────────────────────── */}
                        {state === 'error' && (
                            <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-center py-6 space-y-5">
                                <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-900/30 border-2 border-rose-200 flex items-center justify-center mx-auto">
                                    <AlertCircle className="w-7 h-7 text-rose-500" />
                                </div>
                                <div>
                                    <h3 className="font-black text-rose-700 dark:text-rose-400 text-lg">Payment Failed</h3>
                                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">{errorMsg}</p>
                                </div>
                                <div className="space-y-2">
                                    <button onClick={() => { setState('select'); setSelectedGateway(null); paypalRendered.current = false; }}
                                        className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm">
                                        Try Again
                                    </button>
                                    <button onClick={onClose} className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 py-1 transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
