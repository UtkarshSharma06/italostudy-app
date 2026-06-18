import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useCurrency } from '@/hooks/useCurrency';
import { DodoPayments } from 'dodopayments-checkout';
import {
    ArrowLeft, Loader2, CheckCircle, AlertCircle, Tag, Heart, ShieldCheck, Lock, CreditCard, X
} from 'lucide-react';
import { toast } from 'sonner';

declare global {
    interface Window { Razorpay: any; paypal: any; }
}

interface Course {
    id: string; title: string;
    price_eur: number; discount_price_eur?: number | null;
    thumbnail_url?: string;
    regional_prices?: Record<string, number>;
}

export default function CourseCheckout() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth() as any;
    const { formatPrice, getRegionalPrice } = useCurrency();

    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [gateways, setGateways] = useState<any>({});
    
    // We auto-select the best gateway when they click "PROCEED TO BUY"
    // Or we could let them select. For simplicity and to match PW, we just use the default.
    const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
    const paypalContainerRef = useRef<HTMLDivElement>(null);
    const paypalRendered = useRef(false);

    // Coupon states
    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

    const isINR = typeof navigator !== 'undefined' && (
        Intl.DateTimeFormat().resolvedOptions().timeZone?.includes('Calcutta') ||
        Intl.DateTimeFormat().resolvedOptions().timeZone?.includes('Kolkata')
    );

    useEffect(() => {
        if (!courseId) { navigate('/courses'); return; }
        fetchData();
    }, [courseId]);

    const fetchData = async () => {
        setIsLoading(true);
        // 1. Fetch course
        const { data: courseData, error } = await (supabase as any).from('courses').select('id, title, price_eur, discount_price_eur, thumbnail_url, regional_prices').eq('id', courseId).single();
        if (error || !courseData) { navigate('/courses'); return; }
        setCourse(courseData);

        // 2. Fetch gateways
        const { data: gatewayData } = await (supabase as any).rpc('get_payment_config');
        if (gatewayData) {
            setGateways(gatewayData);
            
            // Auto-select gateway logic
            if (isINR && gatewayData.razorpay?.enabled) setSelectedGateway('razorpay');
            else if (gatewayData.dodo?.enabled) setSelectedGateway('dodo');
            else if (gatewayData.paypal?.enabled) setSelectedGateway('paypal');

            if (!document.querySelector('script[src*="razorpay"]')) {
                const s = document.createElement('script');
                s.src = 'https://checkout.razorpay.com/v1/checkout.js';
                s.async = true;
                document.body.appendChild(s);
            }
            if (gatewayData.paypal?.enabled && gatewayData.paypal?.client_id && !document.querySelector('script[src*="paypal.com/sdk/js"]')) {
                const s = document.createElement('script');
                s.src = `https://www.paypal.com/sdk/js?client-id=${gatewayData.paypal.client_id}&currency=EUR&intent=capture`;
                s.async = true;
                document.body.appendChild(s);
            }
        }
        setIsLoading(false);
    };

    // ── Payment Handlers ───────────────────────────────────────────────────────
    const handleDodo = async () => {
        if (!course) return;
        setIsProcessing(true);
        try {
            const res = await supabase.functions.invoke('create-course-order', { body: { course_id: course.id, coupon_code: appliedCoupon?.code } });
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
                            window.location.href = `/course-payment/callback?order_id=${transaction_id}`;
                            break;
                        case 'checkout.closed':
                            setIsProcessing(false);
                            toast.info('Payment window closed.');
                            break;
                        case 'checkout.error':
                            setIsProcessing(false);
                            toast.error(event.data?.message || 'Checkout error.');
                            break;
                    }
                },
            });
            await DodoPayments.Checkout.open({ checkoutUrl: checkout_url });
        } catch (err: any) {
            setIsProcessing(false);
            toast.error(err.message || 'Failed to open payment.');
        }
    };

    const handleRazorpay = async () => {
        if (!course) return;
        setIsProcessing(true);
        try {
            const initRes = await supabase.functions.invoke('create-course-order', { body: { course_id: course.id, gateway: 'razorpay', coupon_code: appliedCoupon?.code } });
            const initData = initRes.data as any;
            if (initRes.error || initData?.error) throw new Error(initData?.error || initRes.error?.message);
            const txnId = initData.transaction_id;

            const rzpRes = await supabase.functions.invoke('create-course-razorpay', { body: { course_transaction_id: txnId } });
            const rzpData = rzpRes.data as any;
            if (rzpRes.error || rzpData?.error) throw new Error(rzpData?.error || rzpRes.error?.message);

            if (!window.Razorpay) throw new Error('Razorpay not loaded. Please refresh.');

            const rzp = new window.Razorpay({
                key: rzpData.key_id, order_id: rzpData.order_id, amount: rzpData.amount, currency: rzpData.currency,
                name: rzpData.name, description: rzpData.description,
                prefill: { email: user?.email || '' },
                handler: async (response: any) => {
                    window.location.href = `/course-payment/callback?order_id=${txnId}&payment_id=${response.razorpay_payment_id}&dodo_status=succeeded&gateway=razorpay`;
                },
                modal: { ondismiss: () => { setIsProcessing(false); toast.info('Payment cancelled.'); } },
                theme: { color: '#5a4bda' },
            });
            rzp.open();
        } catch (err: any) {
            setIsProcessing(false);
            toast.error(err.message || 'Razorpay failed.');
        }
    };

    const handlePayPal = async () => {
        if (!course) return;
        setIsProcessing(true);
        try {
            const initRes = await supabase.functions.invoke('create-course-order', { body: { course_id: course.id, gateway: 'paypal', coupon_code: appliedCoupon?.code } });
            const initData = initRes.data as any;
            if (initRes.error || initData?.error) throw new Error(initData?.error || initRes.error?.message);
            const txnId = initData.transaction_id;

            if (!window.paypal) throw new Error('PayPal not loaded.');
            toast.info('Please complete PayPal payment.');
            
            // In a real flow, PayPal renders buttons. For a simple "Proceed to Buy" click:
            // We'll just render it into a hidden div and auto-click it, OR just render it in the summary block.
            // Since PW has a simple "Proceed to buy" button, mixing PayPal buttons is tricky. 
            // We'll just use Dodo for international by default if possible, or render PayPal in place.
        } catch (err: any) {
            setIsProcessing(false);
            toast.error(err.message || 'PayPal failed.');
        }
    };

    // Render PayPal buttons if selected
    useEffect(() => {
        if (selectedGateway === 'paypal' && gateways.paypal?.enabled && !isProcessing && course) {
            if (paypalContainerRef.current) paypalContainerRef.current.innerHTML = '';
            paypalRendered.current = true;
            window.paypal?.Buttons({
                fundingSource: window.paypal?.FUNDING?.PAYPAL,
                style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' },
                createOrder: (_data: any, actions: any) => {
                    // Quick init
                    return supabase.functions.invoke('create-course-order', { body: { course_id: course.id, gateway: 'paypal', coupon_code: appliedCoupon?.code } })
                        .then(res => {
                            const initData = res.data as any;
                            return actions.order.create({
                                intent: 'CAPTURE',
                                purchase_units: [{ amount: { value: course.price_eur.toString(), currency_code: 'EUR' }, custom_id: initData.transaction_id }]
                            });
                        });
                },
                onApprove: async (_data: any, actions: any) => {
                    const order = await actions.order.capture();
                    if (order.status === 'COMPLETED') {
                        const customId = order.purchase_units[0].custom_id;
                        window.location.href = `/course-payment/callback?order_id=${customId}&payment_id=${order.id}&dodo_status=succeeded&gateway=paypal`;
                    }
                }
            }).render('#paypal-checkout-container');
        }
    }, [selectedGateway, gateways, course]);

    const handleProceed = () => {
        if (!selectedGateway) { toast.error('No payment method available'); return; }
        if (selectedGateway === 'razorpay') handleRazorpay();
        else if (selectedGateway === 'dodo') handleDodo();
    };

    const handleApplyCoupon = async () => {
        if (!couponInput) return;
        setIsApplyingCoupon(true);
        try {
            const { data: coupon, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', couponInput.toUpperCase())
                .eq('is_active', true)
                .single();

            if (error || !coupon) {
                toast.error('Invalid or expired coupon code');
                setIsApplyingCoupon(false);
                return;
            }

            if (coupon.course_id && coupon.course_id !== course?.id) {
                toast.error('This coupon is not valid for this course');
                setIsApplyingCoupon(false);
                return;
            }

            if (coupon.max_uses && (coupon.used_count || 0) >= coupon.max_uses) {
                toast.error('Coupon usage limit reached');
                setIsApplyingCoupon(false);
                return;
            }

            if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
                toast.error('Coupon has expired');
                setIsApplyingCoupon(false);
                return;
            }

            setAppliedCoupon(coupon);
            toast.success('Coupon applied successfully!');
            setCouponInput('');
        } catch (err: any) {
            toast.error('Failed to apply coupon');
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    if (isLoading || !course) {
        return (
            <Layout showFooter={false}>
                <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#5a4bda]" />
                </div>
            </Layout>
        );
    }

    const originalLocal = getRegionalPrice(course.price_eur, course.regional_prices);
    const hasDiscount = !!course.discount_price_eur || !!course.regional_prices?.INR_discount;
    let baseLocal = hasDiscount
        ? getRegionalPrice(course.discount_price_eur || course.price_eur, course.regional_prices?.INR_discount ? { INR: course.regional_prices.INR_discount } : undefined)
        : originalLocal;
        
    // Calculate locally applied coupon
    let finalLocal = { ...baseLocal };
    if (appliedCoupon) {
        if (appliedCoupon.discount_type === 'percent') {
            finalLocal.amount = Math.max(0, finalLocal.amount * (1 - appliedCoupon.discount_value / 100));
        } else if (appliedCoupon.discount_type === 'fixed') {
            // Estimate fixed discount correctly using regional conversion approx
            const originalEur = course.discount_price_eur && course.discount_price_eur > 0 ? course.discount_price_eur : course.price_eur;
            const ratio = originalEur > 0 ? (appliedCoupon.discount_value / originalEur) : 0;
            finalLocal.amount = Math.max(0, finalLocal.amount * (1 - ratio));
        }
    }

    const displayOriginalAmount = hasDiscount ? originalLocal.amount : (originalLocal.amount > 0 ? Math.round(originalLocal.amount * 1.8) : 0);
    const discountAmount = displayOriginalAmount - finalLocal.amount;

    return (
        <Layout showFooter={false}>
            <div className="bg-[#f8f9fa] min-h-screen pb-20">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
                    <div className="max-w-[1200px] mx-auto px-4 py-4 flex items-center justify-between">
                        <button onClick={() => navigate(`/courses/${course.id}`)} className="flex items-center gap-2 text-slate-600 font-bold hover:text-indigo-600 transition-colors group">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors shrink-0">
                                <ArrowLeft className="w-4 h-4 text-slate-600 group-hover:text-indigo-600" />
                            </div>
                            <span className="hidden sm:inline">Back to Course</span>
                        </button>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-700 bg-emerald-50 px-2.5 sm:px-3 py-1.5 rounded-full border border-emerald-100 shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide">Secure Checkout</span>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1200px] mx-auto px-4 py-8 relative">
                    {/* Background blob for aesthetics */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

                    <div className="relative z-10 flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Checkout</h1>
                            <p className="text-slate-500 mt-1 font-medium text-sm">Review your items and complete the payment safely.</p>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Left Column */}
                        <div className="flex-1 space-y-6">
                            
                            {/* Items in Cart */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-lg font-black text-slate-800">Items in Cart</h2>
                                </div>
                                <div className="p-4 sm:p-5 flex gap-3 sm:gap-4 items-center">
                                    <div className="w-24 sm:w-32 aspect-video bg-slate-100 rounded-lg overflow-hidden shrink-0">
                                        {course.thumbnail_url ? (
                                            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-[#6b46c1]" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-2">{course.title}</h3>
                                        <div className="mt-1 sm:mt-2 flex items-center gap-2">
                                            <span className="text-base sm:text-lg font-black text-slate-900">{formatPrice(finalLocal.amount, finalLocal.currency)}</span>
                                            <span className="text-xs sm:text-sm text-slate-400 line-through">{formatPrice(displayOriginalAmount, finalLocal.currency)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method Selection */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                                    <CreditCard className="w-5 h-5 text-indigo-500" />
                                    <h2 className="text-lg font-black text-slate-800">Select Payment Method</h2>
                                </div>
                                <div className="p-5 space-y-3">
                                    {isINR && gateways.razorpay?.enabled && (
                                        <button onClick={() => setSelectedGateway('razorpay')}
                                            className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all group ${selectedGateway === 'razorpay' ? 'border-indigo-600 bg-indigo-50/50 shadow-[0_0_0_4px_rgba(79,70,229,0.1)]' : 'border-slate-100 hover:border-slate-300 bg-white'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 sm:gap-4">
                                                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${selectedGateway === 'razorpay' ? 'border-indigo-600' : 'border-slate-300 group-hover:border-slate-400'}`}>
                                                        {selectedGateway === 'razorpay' && <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-600" />}
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="block font-bold text-slate-900 text-xs sm:text-sm">UPI, Cards & NetBanking</span>
                                                        <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">Recommended for India</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <img src="/payments/razorpay.webp" alt="Razorpay" className="h-4 sm:h-6 w-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity hidden sm:block" />
                                                    <img src="/payments/upi.webp" alt="UPI" className="h-3 sm:h-4 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                            <div className="mt-3 pl-7 sm:pl-9 flex gap-2 sm:hidden opacity-70">
                                                <img src="/payments/razorpay.webp" alt="Razorpay" className="h-4 w-auto object-contain" />
                                            </div>
                                        </button>
                                    )}

                                    {!isINR && gateways.dodo?.enabled && (
                                        <button onClick={() => setSelectedGateway('dodo')}
                                            className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all group ${selectedGateway === 'dodo' ? 'border-indigo-600 bg-indigo-50/50 shadow-[0_0_0_4px_rgba(79,70,229,0.1)]' : 'border-slate-100 hover:border-slate-300 bg-white'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 sm:gap-4">
                                                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${selectedGateway === 'dodo' ? 'border-indigo-600' : 'border-slate-300 group-hover:border-slate-400'}`}>
                                                        {selectedGateway === 'dodo' && <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-600" />}
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="block font-bold text-slate-900 text-xs sm:text-sm">Cards & Apple Pay</span>
                                                        <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">For International Users</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 sm:gap-2">
                                                    <img src="/payments/dodopayments.webp" alt="Dodo" className="h-4 sm:h-5 w-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity hidden sm:block" />
                                                </div>
                                            </div>
                                            <div className="mt-3 pl-7 sm:pl-9 flex flex-wrap gap-1.5 sm:gap-2 opacity-50 group-hover:opacity-70 transition-opacity items-center">
                                                <img src="/payments/stripe.webp" alt="Stripe" className="h-2.5 sm:h-3 w-auto object-contain" />
                                                <img src="/payments/applepay.webp" alt="Apple Pay" className="h-2.5 sm:h-3 w-auto object-contain" />
                                                <img src="/payments/googlepay.webp" alt="GPay" className="h-2.5 sm:h-3 w-auto object-contain" />
                                                <img src="/payments/cashapp.webp" alt="CashApp" className="h-2.5 sm:h-3 w-auto object-contain hidden sm:block" />
                                            </div>
                                        </button>
                                    )}

                                    {gateways.paypal?.enabled && (
                                        <button onClick={() => setSelectedGateway('paypal')}
                                            className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${selectedGateway === 'paypal' ? 'border-indigo-600 bg-indigo-50/50 shadow-[0_0_0_4px_rgba(79,70,229,0.1)]' : 'border-slate-100 hover:border-slate-300 bg-white'}`}>
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${selectedGateway === 'paypal' ? 'border-indigo-600' : 'border-slate-300 group-hover:border-slate-400'}`}>
                                                    {selectedGateway === 'paypal' && <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-600" />}
                                                </div>
                                                <div className="text-left">
                                                    <span className="block font-bold text-slate-900 text-xs sm:text-sm">PayPal</span>
                                                    <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">Pay with your PayPal account</span>
                                                </div>
                                            </div>
                                            <img src="/payments/paypal.webp" alt="PayPal" className="h-5 sm:h-6 w-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Right Column */}
                        <div className="lg:w-[380px] space-y-4">
                            
                            {/* Apply Coupon UI */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                                <div className="flex items-center justify-between text-[#5a4bda] font-bold text-sm mb-3">
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4" /> Apply Code/Coupon
                                    </div>
                                </div>
                                {appliedCoupon ? (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex justify-between items-center animate-in fade-in zoom-in duration-300">
                                        <div>
                                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{appliedCoupon.code}</p>
                                            <p className="text-[10px] text-emerald-600 font-medium">
                                                {appliedCoupon.discount_type === 'percent' ? `${appliedCoupon.discount_value}% OFF` : `Special Discount Applied`}
                                            </p>
                                        </div>
                                        <button onClick={() => setAppliedCoupon(null)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-full transition-colors">
                                            <X className="w-4 h-4" />
                                            <span className="sr-only">Remove</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponInput}
                                            onChange={e => setCouponInput(e.target.value.toUpperCase())}
                                            placeholder="Enter coupon code"
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm font-mono uppercase focus:outline-none focus:border-indigo-500 transition-colors"
                                            disabled={isApplyingCoupon}
                                        />
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={!couponInput || isApplyingCoupon}
                                            className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center justify-center min-w-[70px]"
                                        >
                                            {isApplyingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : 'APPLY'}
                                        </button>
                                    </div>
                                )}
                            </div>



                            {/* Payment Summary */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-lg font-black text-slate-800">Payment Summary</h2>
                                </div>
                                <div className="p-5 space-y-3">
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>Price (1 items)</span>
                                        <span>{formatPrice(displayOriginalAmount, finalLocal.currency)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-emerald-600">
                                        <span>Discount</span>
                                        <span>- {formatPrice(discountAmount, finalLocal.currency)}</span>
                                    </div>
                                    
                                    <div className="border-t border-dashed border-slate-200 pt-3 mt-3 flex justify-between font-bold text-slate-900 text-base">
                                        <span>Total Amount</span>
                                        <span>{formatPrice(finalLocal.amount, finalLocal.currency)}</span>
                                    </div>

                                    <div className="pt-4">
                                        {selectedGateway === 'paypal' ? (
                                            <div id="paypal-checkout-container" className="min-h-[45px]" />
                                        ) : (
                                            <button 
                                                onClick={handleProceed}
                                                disabled={isProcessing}
                                                className="w-full relative group overflow-hidden bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-70 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_8px_20px_-8px_rgba(79,70,229,0.5)] hover:shadow-[0_8px_25px_-5px_rgba(79,70,229,0.6)] flex justify-center items-center gap-2 transform active:scale-[0.98]"
                                            >
                                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                    <>
                                                        <Lock className="w-4 h-4 mr-1 opacity-80" />
                                                        PAY {formatPrice(finalLocal.amount, finalLocal.currency)}
                                                    </>
                                                )}
                                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                                            </button>
                                        )}
                                        
                                        {/* Trust Note */}
                                        <div className="mt-5 flex flex-col items-center gap-2">
                                            <div className="flex items-center gap-4 text-slate-400">
                                                <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase tracking-widest">256-bit SSL</span></div>
                                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase tracking-widest">Secure Checkout</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mini items list */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hidden lg:block">
                                <p className="text-sm text-slate-600 font-semibold mb-3">You are buying (1) items</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-14 aspect-video rounded bg-slate-100 overflow-hidden">
                                        {course.thumbnail_url && <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-slate-800 truncate">{course.title}</p>
                                        <p className="text-[10px] text-slate-500">{formatPrice(finalLocal.amount, finalLocal.currency)}</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
