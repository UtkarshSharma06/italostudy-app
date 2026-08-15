import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, XCircle, Loader2, GraduationCap,
    Lock, ShieldCheck, ArrowRight, Clock, Copy, Check
} from 'lucide-react';
import { toast } from 'sonner';
import CrossSellBanner from '@/components/CrossSellBanner';

type PollStatus = 'waiting' | 'found' | 'completed' | 'failed' | 'cancelled' | 'timeout';

const STEPS = ['Payment Received', 'Verifying Payment', 'Course Access Granted'];

export default function CoursePaymentCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth() as any;
    const [pollStatus, setPollStatus] = useState<PollStatus>('waiting');
    const [courseId, setCourseId] = useState<string | null>(null);
    const [attempts, setAttempts] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const [copied, setCopied] = useState(false);
    // Track whether verification has been started — avoid double-firing
    const [verifyStarted, setVerifyStarted] = useState(false);

    const orderId = searchParams.get('order_id');
    const paymentId = searchParams.get('payment_id');
    const dodoStatus = searchParams.get('payment_status') || searchParams.get('status') || searchParams.get('dodo_status');
    const gateway = searchParams.get('gateway') || 'dodo';

    const uiStatus: 'loading' | 'success' | 'error' | 'pending' =
        pollStatus === 'completed' ? 'success' :
        pollStatus === 'failed' || pollStatus === 'cancelled' ? 'error' :
        pollStatus === 'timeout' ? 'pending' : 'loading';

    const stepDone = [
        pollStatus !== 'waiting',
        ['completed', 'failed', 'cancelled'].includes(pollStatus),
        pollStatus === 'completed',
    ];

    /**
     * KEY FIX: Wait for auth to be fully resolved BEFORE calling verify.
     *
     * When Dodo/Razorpay/PayPal redirect via window.location.href, the Supabase
     * session stored in localStorage needs to be re-hydrated on the new page load.
     * This takes ~100-500ms. Calling supabase.functions.invoke() before this
     * completes sends an empty/expired Authorization header → Edge Function
     * returns { error: 'Unauthorized' } → callback shows "Payment Failed".
     *
     * Solution: Listen to onAuthStateChange to wait for the SIGNED_IN event
     * before calling verify. We also fall back to a 2s timer in case the user
     * is already loaded synchronously.
     */
    useEffect(() => {
        if (verifyStarted) return;
        if (!orderId) {
            setPollStatus('failed');
            setErrorMsg('No order ID found. Please contact contact@italostudy.com');
            return;
        }

        let cancelled = false;

        const runVerify = async () => {
            if (cancelled || verifyStarted) return;
            setVerifyStarted(true);

            try {
                let n = 0;
                const MAX = 20;

                const poll = async (): Promise<void> => {
                    if (cancelled) return;
                    n++;
                    setAttempts(n);

                    // Call verify edge function — session token is now valid
                    const res = await supabase.functions.invoke('verify-course-payment', {
                        body: {
                            transaction_id: orderId,
                            payment_id: paymentId,
                            dodo_status: dodoStatus,
                            gateway: gateway,
                        }
                    });

                    if (cancelled) return;
                    const data = res.data as any;

                    // Edge function returned an auth error — session might have expired mid-session
                    // Keep retrying (auth state may still be initialising)
                    if (data?.error === 'Unauthorized') {
                        if (n < 5) {
                            await new Promise(r => setTimeout(r, 2000));
                            return poll();
                        }
                        setPollStatus('failed');
                        setErrorMsg('Session expired during payment. Please log in and check your courses — access may have been granted.');
                        return;
                    }

                    if (res.error || data?.error) {
                        // Non-auth transient error — keep polling
                        if (n < MAX) {
                            await new Promise(r => setTimeout(r, 3000));
                            return poll();
                        }
                        setPollStatus('timeout');
                        return;
                    }

                    if (data?.success) {
                        setCourseId(data.course_id || null);
                        setPollStatus('completed');
                        toast.success('Course access granted! 🎉');
                        return;
                    }

                    // Fallback: check DB directly
                    const { data: txn } = await (supabase as any)
                        .from('course_transactions')
                        .select('status, course_id')
                        .eq('id', orderId)
                        .single();

                    if (cancelled) return;

                    if (!txn) {
                        if (n < MAX) { await new Promise(r => setTimeout(r, 3000)); return poll(); }
                        setPollStatus('timeout');
                        return;
                    }

                    if (pollStatus === 'waiting') setPollStatus('found');
                    setCourseId(txn.course_id || null);

                    if (txn.status === 'completed') { setPollStatus('completed'); toast.success('Course access granted! 🎉'); return; }
                    if (txn.status === 'failed') { setPollStatus('failed'); setErrorMsg('Payment was declined. You have not been charged.'); return; }

                    // Still pending — keep polling
                    if (n < MAX) {
                        setPollStatus('found');
                        await new Promise(r => setTimeout(r, 3000));
                        return poll();
                    }
                    setPollStatus('timeout');
                };

                // Small delay to allow any Dodo overlay to close cleanly
                await new Promise(r => setTimeout(r, 1000));
                if (!cancelled) await poll();
            } catch (err: any) {
                if (!cancelled) {
                    setPollStatus('failed');
                    setErrorMsg(err.message || 'Verification failed. Contact support.');
                }
            }
        };

        // If auth is already resolved and user is logged in — start immediately
        if (!authLoading && user) {
            runVerify();
            return;
        }

        // If auth is still loading — wait for onAuthStateChange
        // This handles the post-Dodo hard-navigation session rehydration delay
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (cancelled) return;
            if (event === 'SIGNED_IN' || (session && !verifyStarted)) {
                subscription.unsubscribe();
                runVerify();
            } else if (event === 'SIGNED_OUT') {
                subscription.unsubscribe();
                setPollStatus('failed');
                setErrorMsg('You were signed out during payment. Please check your courses — if access was granted, it will appear after logging in.');
            }
        });

        // Safety fallback: if onAuthStateChange doesn't fire in 4s, try anyway
        const fallbackTimer = setTimeout(() => {
            if (!cancelled && !verifyStarted) {
                subscription.unsubscribe();
                runVerify();
            }
        }, 4000);

        return () => {
            cancelled = true;
            subscription.unsubscribe();
            clearTimeout(fallbackTimer);
        };
    }, [orderId, authLoading, user]);

    const copyId = () => {
        if (!orderId) return;
        navigator.clipboard.writeText(orderId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 flex flex-col relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-100/50 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-100/30 rounded-full blur-[80px] pointer-events-none" />

            {/* Top bar */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-indigo-600" />
                    <span className="font-black text-slate-900 text-sm">Course Enrollment</span>
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
                    className="w-full max-w-[420px]"
                >
                    <div className="bg-white rounded-[1.75rem] border border-slate-200/80 shadow-xl shadow-slate-200/50 overflow-hidden">
                        {/* Accent stripe */}
                        <div className={`h-1.5 w-full transition-colors duration-700 ${
                            uiStatus === 'success' ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                            : uiStatus === 'error' ? 'bg-gradient-to-r from-rose-400 to-red-400'
                            : uiStatus === 'pending' ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                            : 'bg-gradient-to-r from-indigo-500 via-purple-400 to-indigo-500'
                        }`}
                        style={uiStatus === 'loading' ? { backgroundSize: '200% 100%', animation: 'shimmer 1.8s infinite linear' } : {}}
                        />

                        <div className="p-6 space-y-5">
                            {/* Icon + headline */}
                            <div className="text-center space-y-3">
                                <AnimatePresence mode="wait">
                                    {uiStatus === 'loading' && (
                                        <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center">
                                            <div className="relative w-16 h-16">
                                                <div className="absolute inset-0 rounded-full bg-indigo-50 border-2 border-indigo-100" />
                                                <div className="absolute inset-1 rounded-full border-[3px] border-t-indigo-500 border-r-indigo-300 border-b-transparent border-l-transparent animate-spin" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <GraduationCap className="w-6 h-6 text-indigo-500" />
                                                </div>
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[8px] font-black">{attempts}</div>
                                            </div>
                                        </motion.div>
                                    )}
                                    {uiStatus === 'success' && (
                                        <motion.div key="s" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="flex justify-center">
                                            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                            </div>
                                        </motion.div>
                                    )}
                                    {uiStatus === 'pending' && (
                                        <motion.div key="p" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="flex justify-center">
                                            <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                                                <Clock className="w-8 h-8 text-amber-500" />
                                            </div>
                                        </motion.div>
                                    )}
                                    {uiStatus === 'error' && (
                                        <motion.div key="e" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="flex justify-center">
                                            <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center">
                                                <XCircle className="w-8 h-8 text-rose-500" />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence mode="wait">
                                    <motion.div key={uiStatus} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                                        <h1 className={`text-xl font-black tracking-tight ${
                                            uiStatus === 'success' ? 'text-emerald-700'
                                            : uiStatus === 'error' ? 'text-rose-700'
                                            : uiStatus === 'pending' ? 'text-amber-700'
                                            : 'text-slate-900'
                                        }`}>
                                            {uiStatus === 'loading' && 'Verifying Payment…'}
                                            {uiStatus === 'success' && 'Course Access Granted!'}
                                            {uiStatus === 'pending' && 'Payment Processing'}
                                            {uiStatus === 'error' && (pollStatus === 'cancelled' ? 'Payment Cancelled' : 'Verification Issue')}
                                        </h1>
                                        <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                            {uiStatus === 'loading' && 'Verifying your payment. Please wait…'}
                                            {uiStatus === 'success' && 'You now have full access to your course.'}
                                            {uiStatus === 'pending' && 'Your payment is being processed. Access will activate shortly.'}
                                            {uiStatus === 'error' && (errorMsg || 'Something went wrong. Please try again or contact support.')}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Step tracker */}
                            {(uiStatus === 'loading' || uiStatus === 'pending') && (
                                <div className="space-y-2">
                                    {STEPS.map((step, i) => (
                                        <div key={step} className="flex items-center gap-2.5">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black transition-all duration-500 ${
                                                stepDone[i] ? 'bg-emerald-500 text-white'
                                                : (i === 0 || stepDone[i - 1]) ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 text-slate-300'
                                            }`}>
                                                {stepDone[i] ? <Check className="w-2.5 h-2.5" />
                                                    : (i === 0 || stepDone[i - 1]) ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                    : i + 1}
                                            </div>
                                            <span className={`text-xs font-semibold flex-1 ${
                                                stepDone[i] ? 'text-emerald-600'
                                                : (i === 0 || stepDone[i - 1]) ? 'text-slate-800'
                                                : 'text-slate-300'
                                            }`}>{step}</span>
                                            {stepDone[i] && <span className="text-[9px] text-emerald-500 font-bold uppercase">Done</span>}
                                            {!stepDone[i] && (i === 0 || stepDone[i - 1]) && <span className="text-[9px] text-indigo-500 font-bold uppercase animate-pulse">Active</span>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Success unlocked box */}
                            {uiStatus === 'success' && (
                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                                    className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 text-center space-y-2">
                                    <GraduationCap className="w-8 h-8 text-indigo-500 mx-auto" />
                                    <p className="text-sm font-bold text-indigo-700">Your course is ready!</p>
                                    <p className="text-xs text-indigo-500 font-medium">Access all lectures, PDFs, and materials from the Courses page.</p>
                                </motion.div>
                            )}

                            {/* 🎯 Cross-sell: upgrade to subscription */}
                            {uiStatus === 'success' && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                                    <CrossSellBanner variant="card" onUpgradeClick={() => navigate('/pricing')} />
                                </motion.div>
                            )}

                            {/* Pending info */}
                            {uiStatus === 'pending' && (
                                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-center">
                                    <p className="text-xs text-amber-700 font-semibold">
                                        Check Courses page in a few minutes. If access isn't granted, email{' '}
                                        <a href="mailto:contact@italostudy.com" className="underline">contact@italostudy.com</a>{' '}
                                        with your Ref ID below.
                                    </p>
                                </div>
                            )}

                            {/* Ref ID */}
                            {orderId && (
                                <div className="bg-slate-50 rounded-xl border border-slate-200 px-3.5 py-2.5">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ref ID</span>
                                        <button onClick={copyId} className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-indigo-600 transition-colors font-semibold">
                                            {copied ? <><Check className="w-2.5 h-2.5 text-emerald-500" />Copied</> : <><Copy className="w-2.5 h-2.5" />Copy</>}
                                        </button>
                                    </div>
                                    <p className="text-[10px] font-mono text-slate-600 break-all leading-relaxed">{orderId}</p>
                                </div>
                            )}

                            {/* CTA */}
                            {uiStatus !== 'loading' && (
                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                                    <button
                                        onClick={() => {
                                            if (uiStatus === 'success') navigate(courseId ? `/courses/${courseId}` : '/courses');
                                            else if (uiStatus === 'pending') navigate('/courses');
                                            else navigate('/courses');
                                        }}
                                        className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 group transition-all ${
                                            uiStatus === 'success' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100'
                                            : uiStatus === 'pending' ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                            : 'bg-slate-600 hover:bg-slate-700 text-white'
                                        }`}
                                    >
                                        {uiStatus === 'success' ? <><GraduationCap className="w-4 h-4" />Go to My Course</>
                                            : <><Clock className="w-4 h-4" />View Courses</>}
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                    {uiStatus === 'error' && (
                                        <button onClick={() => navigate('/courses')} className="w-full text-xs text-slate-400 hover:text-slate-600 font-semibold py-1 transition-colors">
                                            ← Back to Courses
                                        </button>
                                    )}
                                </motion.div>
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
                                <span className="text-[9px] font-semibold uppercase tracking-wider">Secured Checkout</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-xs text-slate-400 mt-4">
                        Need help?{' '}
                        <a href="mailto:contact@italostudy.com" className="text-indigo-500 hover:text-indigo-700 font-semibold transition-colors">
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
        </div>
    );
}
