import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { DodoPayments } from 'dodopayments-checkout';
import {
    Euro, Lock, GraduationCap, ShieldCheck, Loader2, X,
    Clock, CheckCircle, AlertCircle, CreditCard, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { getCountryCode } from '@/utils/countryDetection';

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

interface CoursePaymentModalProps {
    course: Course;
    onClose: () => void;
}

type ModalState = 'select' | 'processing' | 'error';

function formatExpiry(days: number) {
    if (days >= 365) return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''}`;
    if (days >= 30) return `${Math.floor(days / 30)} months`;
    return `${days} days`;
}

export default function CoursePaymentModal({ course, onClose }: CoursePaymentModalProps) {
    const { user } = useAuth() as any;
    const { formatPrice, getRegionalPrice } = useCurrency();
    const [state, setState] = useState<ModalState>('select');
    const [errorMsg, setErrorMsg] = useState('');
    const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
    const [gateways, setGateways] = useState<any>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [isIndia, setIsIndia] = useState(false);
    const paypalContainerRef = useRef<HTMLDivElement>(null);
    const paypalRendered = useRef(false);

    // ── Detect country via IP (accurate, not just timezone) ──────────────────
    useEffect(() => {
        getCountryCode().then(code => {
            setIsIndia(code === 'IN');
        });
    }, []);

    // ── Load payment gateways from system_settings ────────────────────────────
    useEffect(() => {
        (supabase as any).rpc('get_payment_config').then(({ data }: any) => {
            if (data) {
                setGateways(data);
                // Preload Razorpay script (always, in case needed)
                if (!document.querySelector('script[src*="razorpay"]')) {
                    const s = document.createElement('script');
                    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    s.async = true;
                    document.body.appendChild(s);
                }
                // Preload PayPal script if enabled
                if (data.paypal?.enabled && data.paypal?.client_id && !document.querySelector('script[src*="paypal.com/sdk/js"]')) {
                    const s = document.createElement('script');
                    s.src = `https://www.paypal.com/sdk/js?client-id=${data.paypal.client_id}&currency=EUR&intent=capture`;
                    s.async = true;
                    document.body.appendChild(s);
                }
            }
        });
    }, []);

    // ── Auto-select the only available gateway ────────────────────────────────
    // If there's only one option visible, pre-select it so user doesn't need an extra tap
    useEffect(() => {
        if (!gateways || selectedGateway) return;

        const showRazorpay = isIndia && gateways.razorpay?.enabled;
        const showDodo = !isIndia && gateways.dodo?.enabled;
        const showPaypal = !isIndia && gateways.paypal?.enabled;

        // Count available options for non-India
        if (showRazorpay && !showDodo && !showPaypal) {
            setSelectedGateway('razorpay');
        } else if (showDodo && !showPaypal) {
            setSelectedGateway('dodo');
        }
        // If multiple options, let the user pick
    }, [gateways, isIndia]);

    const showError = (msg: string) => {
        setErrorMsg(msg);
        setState('error');
        setIsProcessing(false);
    };

    // ── Dodo ──────────────────────────────────────────────────────────────────
    const handleDodo = async () => {
        setIsProcessing(true);
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
                            onClose();
                            window.location.href = `/course-payment/callback?order_id=${transaction_id}`;
                            break;
                        case 'checkout.closed':
                            setIsProcessing(false);
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
                            buttonPrimary: '#4F46E5', buttonPrimaryHover: '#4338CA',
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

    // ── Razorpay ──────────────────────────────────────────────────────────────
    const handleRazorpay = async () => {
        setIsProcessing(true);
        try {
            const initRes = await supabase.functions.invoke('create-course-order', {
                body: { course_id: course.id, gateway: 'razorpay' },
            });
            const initData = initRes.data as any;
            if (initRes.error || initData?.error) throw new Error(initData?.error || initRes.error?.message);
            const txnId = initData.transaction_id;

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
                description: rzpData.description,
                prefill: { email: user?.email || '' },
                handler: async (response: any) => {
                    onClose();
                    window.location.href = `/course-payment/callback?order_id=${txnId}&payment_id=${response.razorpay_payment_id}&dodo_status=succeeded&gateway=razorpay`;
                },
                modal: {
                    ondismiss: () => {
                        setIsProcessing(false);
                        toast.info('Payment cancelled.');
                    }
                },
                theme: { color: '#4F46E5' },
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

        try {
            const initRes = await supabase.functions.invoke('create-course-order', {
                body: { course_id: course.id, gateway: 'paypal' },
            });
            const initData = initRes.data as any;
            if (initRes.error || initData?.error) throw new Error(initData?.error || initRes.error?.message);
            const txnId = initData.transaction_id;

            if (!window.paypal) throw new Error('PayPal not loaded. Please refresh and try again.');

            toast.info('Click the PayPal button below to complete your payment');
            setIsProcessing(false);

            if (paypalContainerRef.current) paypalContainerRef.current.innerHTML = '';
            paypalRendered.current = true;

            window.paypal.Buttons({
                style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' },
                createOrder: (_data: any, actions: any) => {
                    return actions.order.create({
                        intent: 'CAPTURE',
                        purchase_units: [{
                            // ✅ Use the pre-calculated regional/discounted price
                            amount: { value: localCourse.amount.toFixed(2), currency_code: localCourse.currency === 'INR' ? 'EUR' : (localCourse.currency || 'EUR') },
                            description: `${course.title} — ItaloStudy Course`,
                            custom_id: txnId,
                        }],
                    });
                },
                onApprove: async (_data: any, actions: any) => {
                    const order = await actions.order.capture();
                    if (order.status === 'COMPLETED') {
                        onClose();
                        window.location.href = `/course-payment/callback?order_id=${txnId}&payment_id=${order.id}&dodo_status=succeeded&gateway=paypal`;
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
                },
            }).render('#course-paypal-btn-container');

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

    const hasDiscount = !!course.discount_price_eur || !!course.regional_prices?.INR_discount;
    const localCourse = hasDiscount
        ? getRegionalPrice(course.discount_price_eur || course.price_eur, course.regional_prices?.INR_discount ? { INR: course.regional_prices.INR_discount } : undefined)
        : getRegionalPrice(course.price_eur, course.regional_prices);

    // ── Gateway visibility rules ──────────────────────────────────────────────
    // India → Razorpay only  |  Rest of world → Dodo + PayPal (no Razorpay)
    const showRazorpay = isIndia && gateways.razorpay?.enabled;
    const showDodo     = !isIndia && gateways.dodo?.enabled;
    const showPaypal   = !isIndia && gateways.paypal?.enabled;
    const noGateways   = !showRazorpay && !showDodo && !showPaypal;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={!isProcessing ? onClose : undefined}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
            >
                {/* Accent bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                {/* Close button */}
                {!isProcessing && (
                    <button onClick={onClose}
                        className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-10">
                        <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </button>
                )}

                <div className="p-7 space-y-5 max-h-[90vh] overflow-y-auto">
                    <AnimatePresence mode="wait">

                        {/* ── Gateway Select ── */}
                        {state === 'select' && (
                            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

                                {/* Course info */}
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {course.thumbnail_url
                                            ? <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                            : <GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />}
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Course Enrollment</p>
                                        <h2 className="font-black text-slate-900 dark:text-white text-base leading-tight">{course.title}</h2>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">{formatExpiry(course.expiry_days)} access · One-time payment</p>
                                    </div>
                                </div>

                                {/* Price box */}
                                <div className="bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl p-4 flex items-center justify-between border border-indigo-100 dark:border-indigo-900/40">
                                    <div className="space-y-0.5">
                                        {[
                                            { icon: Clock, text: `${formatExpiry(course.expiry_days)} access` },
                                            { icon: CheckCircle, text: 'No auto-renewal' },
                                        ].map(i => (
                                            <div key={i.text} className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                                                <i.icon className="w-3 h-3" /> {i.text}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">Total</p>
                                        <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
                                            {formatPrice(localCourse.amount, localCourse.currency)}
                                        </span>
                                    </div>
                                </div>

                                {/* Payment method selection */}
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                        <CreditCard className="w-3 h-3" /> Select Payment Method
                                    </p>

                                    {/* ── Razorpay — India only ── */}
                                    {showRazorpay && (
                                        <div className="space-y-1.5">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">India</p>
                                            <button onClick={() => setSelectedGateway('razorpay')}
                                                className={cn('w-full p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 bg-white dark:bg-slate-800',
                                                    selectedGateway === 'razorpay'
                                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                                                        : 'border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600')}>
                                                <img src="/payments/razorpay.webp" alt="Razorpay" className="h-6 w-auto object-contain" />
                                                <div className="flex items-center gap-2 opacity-60">
                                                    <img src="/payments/upi.webp" alt="UPI" className="h-3 w-auto" />
                                                    <img src="/payments/visa.webp" alt="Visa" className="h-3 w-auto" />
                                                    <img src="/payments/mastercard.webp" alt="MC" className="h-3 w-auto" />
                                                </div>
                                            </button>
                                        </div>
                                    )}

                                    {/* ── Dodo — International (non-India) ── */}
                                    {showDodo && (
                                        <div className="space-y-1.5">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Cards &amp; Digital Wallets</p>
                                            <button onClick={() => setSelectedGateway('dodo')}
                                                className={cn('w-full p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 bg-white dark:bg-slate-800',
                                                    selectedGateway === 'dodo'
                                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                                                        : 'border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600')}>
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

                                    {/* ── PayPal — International (non-India) ── */}
                                    {showPaypal && (
                                        <div className="space-y-1.5">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">PayPal</p>
                                            <button onClick={() => setSelectedGateway('paypal')}
                                                className={cn('w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-center bg-white dark:bg-slate-800',
                                                    selectedGateway === 'paypal'
                                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                                                        : 'border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600')}>
                                                <img src="/payments/paypal.webp" alt="PayPal" className="h-6 w-auto object-contain" />
                                            </button>
                                        </div>
                                    )}

                                    {/* No gateways configured yet (loading or misconfigured) */}
                                    {noGateways && (
                                        <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
                                            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                            <p>Payment methods loading…</p>
                                        </div>
                                    )}

                                    {/* PayPal buttons render target */}
                                    <div id="course-paypal-btn-container" ref={paypalContainerRef} className="empty:hidden mt-2" />

                                    {/* Pay Now button — non-PayPal gateways */}
                                    {selectedGateway && selectedGateway !== 'paypal' && (
                                        <motion.button
                                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                            onClick={handlePayNow}
                                            disabled={isProcessing}
                                            className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all active:scale-95">
                                            {isProcessing
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <><Lock className="w-3.5 h-3.5" />Pay {formatPrice(localCourse.amount, localCourse.currency)}</>}
                                        </motion.button>
                                    )}

                                    {/* PayPal render trigger */}
                                    {selectedGateway === 'paypal' && !paypalRendered.current && (
                                        <motion.button
                                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                            onClick={handlePayNow}
                                            disabled={isProcessing}
                                            className="w-full h-12 rounded-2xl bg-[#0070ba] hover:bg-[#005ea6] disabled:opacity-60 text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all active:scale-95">
                                            {isProcessing
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <><img src="/payments/paypal.webp" alt="PayPal" className="h-4 w-auto brightness-0 invert" />Pay with PayPal</>}
                                        </motion.button>
                                    )}
                                </div>

                                {/* Security footer */}
                                <div className="flex items-center justify-center gap-4 pt-1">
                                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                                        <Lock className="w-3 h-3" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">256-bit SSL</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                                        <ShieldCheck className="w-3 h-3" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Secure Checkout</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Processing ── */}
                        {state === 'processing' && (
                            <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-center py-10 space-y-4">
                                <div className="relative w-20 h-20 mx-auto">
                                    <div className="absolute inset-0 rounded-full bg-indigo-50 dark:bg-indigo-900/30" />
                                    <div className="absolute inset-1 rounded-full border-[3px] border-t-indigo-500 border-r-indigo-300 border-b-transparent border-l-transparent animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <GraduationCap className="w-7 h-7 text-indigo-500" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-white text-lg">Opening Checkout…</h3>
                                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Loading secure payment window…</p>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Error ── */}
                        {state === 'error' && (
                            <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-center py-6 space-y-5">
                                <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-900/30 border-2 border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto">
                                    <AlertCircle className="w-7 h-7 text-rose-500" />
                                </div>
                                <div>
                                    <h3 className="font-black text-rose-700 dark:text-rose-400 text-lg">Payment Failed</h3>
                                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">{errorMsg}</p>
                                </div>
                                <div className="space-y-2">
                                    <button onClick={() => { setState('select'); setSelectedGateway(null); }}
                                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-colors">
                                        Try Again
                                    </button>
                                    <button onClick={onClose}
                                        className="w-full text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 py-1 transition-colors">
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
