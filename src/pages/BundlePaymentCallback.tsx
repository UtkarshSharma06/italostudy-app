import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, XCircle, Loader2, GraduationCap, Zap,
    Lock, ShieldCheck, ArrowRight, Clock, Copy, Check, Package
} from 'lucide-react';
import { toast } from 'sonner';
import { usePricing } from '@/context/PricingContext';
import CheckoutModal from '@/components/CheckoutModal';

type BundlePhase = 'course' | 'subscription' | 'done';
type StepStatus = 'idle' | 'processing' | 'done' | 'failed';

interface StepState {
    course: StepStatus;
    subscription: StepStatus;
}

type OverallStatus = 'loading' | 'partial_success' | 'full_success' | 'error' | 'timeout';

const PLAN_MAP: Record<string, string> = {
    pro: 'Exam Prep Plan',
    elite: 'Global Admission Plan',
    global: 'Global Plan',
    explorer: 'Explorer Plan',
};

export default function BundlePaymentCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth() as any;

    const [steps, setSteps] = useState<StepState>({ course: 'idle', subscription: 'idle' });
    const [overallStatus, setOverallStatus] = useState<OverallStatus>('loading');
    const [courseId, setCourseId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [copied, setCopied] = useState(false);
    const [verifyStarted, setVerifyStarted] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    const { config } = usePricing();

    const courseOrderId = searchParams.get('course_order_id');
    const planId = searchParams.get('plan_id') || 'pro';
    const paymentId = searchParams.get('payment_id');
    const dodoStatus = searchParams.get('payment_status') || searchParams.get('status') || searchParams.get('dodo_status');
    const gateway = searchParams.get('gateway') || 'dodo';
    const billingCycleQuery = searchParams.get('billing_cycle') || 'monthly';

    const planName = PLAN_MAP[planId] || 'Subscription Plan';

    const plan = config?.plans?.find(p => p.id === planId);
    let currentCycle = plan?.cycles?.[0];
    if (plan?.cycles) {
        currentCycle = plan.cycles.find(c => 
            c.name.toLowerCase().includes(billingCycleQuery.toLowerCase()) ||
            (billingCycleQuery === 'monthly' && c.durationUnit === 'months' && c.durationValue === 1) ||
            (billingCycleQuery === 'quarterly' && c.durationUnit === 'months' && c.durationValue === 3) ||
            (billingCycleQuery === 'quarterly' && c.name.toLowerCase().includes('quarter'))
        ) || plan.cycles[0];
    }

    const setStep = (key: keyof StepState, val: StepStatus) =>
        setSteps(prev => ({ ...prev, [key]: val }));

    const copyId = () => {
        if (!courseOrderId) return;
        navigator.clipboard.writeText(courseOrderId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        if (verifyStarted) return;
        if (!courseOrderId) {
            setErrorMsg('No order ID found. Please contact contact@italostudy.com');
            setOverallStatus('error');
            return;
        }

        let cancelled = false;

        const runBundle = async () => {
            if (cancelled || verifyStarted) return;
            setVerifyStarted(true);

            // ── Phase 1: Verify Course Payment ──────────────────────────────
            setStep('course', 'processing');

            let courseSuccess = false;
            try {
                let n = 0;
                const MAX = 20;

                const pollCourse = async (): Promise<void> => {
                    if (cancelled) return;
                    n++;

                    const res = await supabase.functions.invoke('verify-course-payment', {
                        body: {
                            transaction_id: courseOrderId,
                            payment_id: paymentId,
                            dodo_status: dodoStatus,
                            gateway,
                        }
                    });

                    if (cancelled) return;
                    const data = res.data as any;

                    if (data?.error === 'Unauthorized') {
                        if (n < 5) { await new Promise(r => setTimeout(r, 2000)); return pollCourse(); }
                        throw new Error('Session expired during verification.');
                    }

                    if (data?.success) {
                        setCourseId(data.course_id || null);
                        courseSuccess = true;
                        return;
                    }

                    // Fallback: check DB directly
                    const { data: txn } = await (supabase as any)
                        .from('course_transactions')
                        .select('status, course_id')
                        .eq('id', courseOrderId)
                        .single();

                    if (cancelled) return;

                    if (txn?.status === 'completed') {
                        setCourseId(txn.course_id || null);
                        courseSuccess = true;
                        return;
                    }

                    if (txn?.status === 'failed') throw new Error('Course payment was declined.');

                    if (n < MAX) {
                        await new Promise(r => setTimeout(r, 3000));
                        return pollCourse();
                    }
                };

                await new Promise(r => setTimeout(r, 1000)); // let overlay close
                await pollCourse();
            } catch (err: any) {
                if (!cancelled) {
                    setStep('course', 'failed');
                    setErrorMsg(err.message || 'Course payment verification failed.');
                    setOverallStatus('error');
                    return;
                }
            }

            if (!courseSuccess) {
                setStep('course', 'failed');
                setOverallStatus('error');
                setErrorMsg('Course payment not confirmed. Contact contact@italostudy.com with your Ref ID.');
                return;
            }

            setStep('course', 'done');
            toast.success('Course access granted! 🎉');

            // ── Phase 2: Activate Subscription ──────────────────────────────
            if (cancelled) return;
            setStep('subscription', 'processing');

            try {
                // For the subscription step, we use the existing pricing modal to open
                // the subscription checkout. We persist the intent and redirect.
                // The cleanest pattern: store the plan intent in sessionStorage and
                // redirect user to /pricing with a deferred-intent param.
                //
                // This keeps subscription checkout identical to the normal flow
                // (same edge functions, same webhook verification, same everything).
                //
                // After pricing modal completes → normal PaymentCallback fires.
                if (!cancelled) {
                    setStep('subscription', 'done');
                    setOverallStatus('partial_success');
                    // Store bundle context so pricing modal can auto-select the right plan
                    sessionStorage.setItem('bundle_plan_intent', planId);
                }
            } catch (err: any) {
                if (!cancelled) {
                    setStep('subscription', 'failed');
                    setOverallStatus('partial_success'); // course succeeded
                }
            }
        };

        if (!authLoading && user) {
            runBundle();
            return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (cancelled) return;
            if (event === 'SIGNED_IN' || (session && !verifyStarted)) {
                subscription.unsubscribe();
                runBundle();
            } else if (event === 'SIGNED_OUT') {
                subscription.unsubscribe();
                setErrorMsg('Session expired. Check your courses — if access was granted it will appear after logging in.');
                setOverallStatus('error');
            }
        });

        const fallbackTimer = setTimeout(() => {
            if (!cancelled && !verifyStarted) {
                subscription.unsubscribe();
                runBundle();
            }
        }, 4000);

        return () => {
            cancelled = true;
            subscription.unsubscribe();
            clearTimeout(fallbackTimer);
        };
    }, [courseOrderId, authLoading, user]);

    const isLoading = overallStatus === 'loading';
    const isPartial = overallStatus === 'partial_success';
    const isError = overallStatus === 'error';

    const accentClass =
        isError ? 'from-rose-400 to-red-400' :
        isPartial ? 'from-amber-400 to-orange-400' :
        'from-violet-500 via-purple-400 to-indigo-500';

    const handleSubscribeNow = () => {
        setIsCheckoutOpen(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 flex flex-col relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-violet-100/50 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-indigo-100/30 rounded-full blur-[80px] pointer-events-none" />

            {/* Top bar */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-violet-600" />
                    <span className="font-black text-slate-900 text-sm">Bundle Checkout</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                    <Lock className="w-3 h-3" />
                    <span className="text-[11px] font-semibold">Secure Checkout</span>
                </div>
            </div>

            {/* Main */}
            <div className="flex-1 flex items-center justify-center px-4 py-10 z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-[440px]"
                >
                    <div className="bg-white rounded-[1.75rem] border border-slate-200/80 shadow-xl shadow-slate-200/50 overflow-hidden">
                        {/* Accent stripe */}
                        <div className={`h-1.5 w-full bg-gradient-to-r transition-colors duration-700 ${accentClass}`}
                            style={isLoading ? { backgroundSize: '200% 100%', animation: 'shimmer 1.8s infinite linear' } : {}} />

                        <div className="p-6 space-y-5">

                            {/* Bundle Steps Visual */}
                            <div className="space-y-3">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Bundle Progress</p>

                                {/* Course Step */}
                                <div className={cn(
                                    "flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all duration-500",
                                    steps.course === 'done' ? 'border-emerald-200 bg-emerald-50' :
                                    steps.course === 'failed' ? 'border-rose-200 bg-rose-50' :
                                    steps.course === 'processing' ? 'border-indigo-200 bg-indigo-50' :
                                    'border-slate-100 bg-slate-50'
                                )}>
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                        steps.course === 'done' ? 'bg-emerald-100' :
                                        steps.course === 'failed' ? 'bg-rose-100' :
                                        steps.course === 'processing' ? 'bg-indigo-100' :
                                        'bg-slate-100'
                                    )}>
                                        {steps.course === 'processing' ? <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" /> :
                                         steps.course === 'done' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
                                         steps.course === 'failed' ? <XCircle className="w-5 h-5 text-rose-600" /> :
                                         <GraduationCap className="w-5 h-5 text-slate-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Step 1 · Course</p>
                                        <p className="text-sm font-bold text-slate-900">Course Access</p>
                                    </div>
                                    <div className={cn(
                                        "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                                        steps.course === 'done' ? 'text-emerald-700 bg-emerald-100' :
                                        steps.course === 'failed' ? 'text-rose-700 bg-rose-100' :
                                        steps.course === 'processing' ? 'text-indigo-700 bg-indigo-100 animate-pulse' :
                                        'text-slate-400 bg-slate-100'
                                    )}>
                                        {steps.course === 'done' ? 'Active' :
                                         steps.course === 'failed' ? 'Failed' :
                                         steps.course === 'processing' ? 'Verifying' : 'Pending'}
                                    </div>
                                </div>

                                {/* Subscription Step */}
                                <div className={cn(
                                    "flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all duration-500",
                                    steps.subscription === 'done' ? 'border-emerald-200 bg-emerald-50' :
                                    steps.subscription === 'failed' ? 'border-rose-200 bg-rose-50' :
                                    steps.subscription === 'processing' ? 'border-violet-200 bg-violet-50' :
                                    'border-slate-100 bg-slate-50 opacity-60'
                                )}>
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                        steps.subscription === 'done' ? 'bg-emerald-100' :
                                        steps.subscription === 'failed' ? 'bg-rose-100' :
                                        steps.subscription === 'processing' ? 'bg-violet-100' :
                                        'bg-slate-100'
                                    )}>
                                        {steps.subscription === 'processing' ? <Loader2 className="w-5 h-5 text-violet-600 animate-spin" /> :
                                         steps.subscription === 'done' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
                                         steps.subscription === 'failed' ? <XCircle className="w-5 h-5 text-rose-600" /> :
                                         <Zap className="w-5 h-5 text-slate-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Step 2 · Subscription</p>
                                        <p className="text-sm font-bold text-slate-900">{planName}</p>
                                    </div>
                                    <div className={cn(
                                        "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                                        steps.subscription === 'done' ? 'text-emerald-700 bg-emerald-100' :
                                        steps.subscription === 'failed' ? 'text-rose-700 bg-rose-100' :
                                        steps.subscription === 'processing' ? 'text-violet-700 bg-violet-100 animate-pulse' :
                                        'text-slate-400 bg-slate-100'
                                    )}>
                                        {steps.subscription === 'done' ? 'Next Step' :
                                         steps.subscription === 'failed' ? 'Failed' :
                                         steps.subscription === 'processing' ? 'Preparing' : 'Waiting'}
                                    </div>
                                </div>
                            </div>

                            {/* Main message */}
                            <AnimatePresence mode="wait">
                                {overallStatus === 'loading' && (
                                    <motion.div key="loading" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="text-center space-y-1">
                                        <h2 className="font-black text-slate-900 text-lg">Verifying your payment…</h2>
                                        <p className="text-xs text-slate-400">Please keep this page open</p>
                                    </motion.div>
                                )}

                                {overallStatus === 'partial_success' && (
                                    <motion.div key="partial" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="space-y-4">
                                        <div className="text-center">
                                            <div className="w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-3">
                                                <GraduationCap className="w-6 h-6 text-emerald-600" />
                                            </div>
                                            <h2 className="font-black text-slate-900 text-lg">Course Access Granted!</h2>
                                            <p className="text-xs text-slate-500 mt-1">Your course is now active. Complete your subscription to unlock everything.</p>
                                        </div>
                                        <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Zap className="w-4 h-4 text-violet-600" />
                                                <p className="text-sm font-bold text-violet-800">One more step — Activate {planName}</p>
                                            </div>
                                            <p className="text-xs text-violet-600">Click below to complete your subscription and get full platform access.</p>
                                        </div>
                                        <button
                                            onClick={handleSubscribeNow}
                                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 group shadow-lg shadow-violet-200 transition-all">
                                            <Zap className="w-4 h-4" />
                                            Activate {planName}
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                        <button
                                            onClick={() => navigate(courseId ? `/courses/${courseId}` : '/courses')}
                                            className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 py-1 transition-colors">
                                            Skip for now → Go to my course
                                        </button>
                                    </motion.div>
                                )}

                                {overallStatus === 'error' && (
                                    <motion.div key="error" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="text-center space-y-3">
                                        <div className="w-14 h-14 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center mx-auto">
                                            <XCircle className="w-7 h-7 text-rose-500" />
                                        </div>
                                        <div>
                                            <h2 className="font-black text-rose-700 text-lg">Verification Issue</h2>
                                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{errorMsg || 'Something went wrong. Contact support with your Ref ID below.'}</p>
                                        </div>
                                        <button onClick={() => navigate('/courses')}
                                            className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                                            <ArrowRight className="w-4 h-4" />
                                            Go to Courses
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Ref ID */}
                            {courseOrderId && (
                                <div className="bg-slate-50 rounded-xl border border-slate-200 px-3.5 py-2.5">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Course Ref ID</span>
                                        <button onClick={copyId} className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-violet-600 transition-colors font-semibold">
                                            {copied ? <><Check className="w-2.5 h-2.5 text-emerald-500" />Copied</> : <><Copy className="w-2.5 h-2.5" />Copy</>}
                                        </button>
                                    </div>
                                    <p className="text-[10px] font-mono text-slate-600 break-all leading-relaxed">{courseOrderId}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <ShieldCheck className="w-3 h-3" />
                                <span className="text-[9px] font-semibold uppercase tracking-wider">256-bit SSL</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Lock className="w-3 h-3" />
                                <span className="text-[9px] font-semibold uppercase tracking-wider">Secured</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-xs text-slate-400 mt-4">
                        Need help?{' '}
                        <a href="mailto:contact@italostudy.com" className="text-violet-500 hover:text-violet-700 font-semibold transition-colors">
                            contact@italostudy.com
                        </a>
                    </p>
                </motion.div>
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { background-position: 200% center; }
                    100% { background-position: -200% center; }
                }
            `}</style>
            
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                planId={planId}
                planName={PLAN_MAP[planId] || planId}
                amount={currentCycle?.price || 0}
                currency="EUR"
                regionalPrices={currentCycle?.regionalPrices || plan?.regionalPrices}
                billingCycle={currentCycle?.name || (billingCycleQuery === 'monthly' ? 'Monthly' : 'Quarterly')}
                durationValue={currentCycle?.durationValue}
                durationUnit={currentCycle?.durationUnit}
            />
        </div>
    );
}

// Inline cn utility to avoid imports
function cn(...classes: (string | boolean | undefined | null)[]) {
    return classes.filter(Boolean).join(' ');
}
