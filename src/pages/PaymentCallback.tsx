import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, XCircle, ArrowRight, ShieldCheck,
    Loader2, Copy, Check, Lock, Zap,
    LayoutDashboard, Package, BookOpen, Trophy, Globe, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Steps are tied to actual polling state — NOT a timer
type PollStatus = 'waiting' | 'found' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export default function PaymentCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [pollStatus, setPollStatus]       = useState<PollStatus>('waiting');
    const [isStoreOrder, setIsStoreOrder]   = useState(false);
    const [planId, setPlanId]               = useState<string | null>(null);
    const [copied, setCopied]               = useState(false);
    const [attempts, setAttempts]           = useState(0);
    const [errorMsg, setErrorMsg]           = useState('');
    const orderId = searchParams.get('order_id');

    // Derive visual state from pollStatus
    const uiStatus: 'loading' | 'success' | 'error' | 'pending' =
        pollStatus === 'completed' ? 'success' :
        pollStatus === 'failed' || pollStatus === 'cancelled' ? 'error' :
        pollStatus === 'timeout' ? 'pending' :
        'loading';

    // Step completion is tied to actual poll milestones
    // Step 0: transaction found in DB (waiting → found)
    // Step 1: status confirmed by payment processor (found → completed/failed)
    // Step 2: access activated (only on completed)
    const stepDone = [
        pollStatus !== 'waiting',                              // step 0: transaction found
        pollStatus === 'completed' || pollStatus === 'failed' || pollStatus === 'cancelled', // step 1: status known
        pollStatus === 'completed',                            // step 2: access granted
    ];

    useEffect(() => {
        const verify = async () => {
            if (!orderId) {
                setPollStatus('failed');
                setErrorMsg('No order ID found. Contact contact@italostudy.com');
                return;
            }
            try {
                let n = 0;
                const MAX = 20; // ~60 seconds total

                const poll = async (): Promise<void> => {
                    n++;
                    setAttempts(n);

                    const { data: txn, error } = await (supabase as any)
                        .from('transactions')
                        .select('status, plan_id, payment_method')
                        .eq('id', orderId)
                        .single();

                    if (error || !txn) {
                        // Transaction not yet in DB — keep waiting
                        if (n < MAX) {
                            await new Promise(r => setTimeout(r, 3000));
                            return poll();
                        }
                        setPollStatus('timeout');
                        return;
                    }

                    // Transaction found → advance step 0
                    if (pollStatus === 'waiting') setPollStatus('found');

                    if (txn.status === 'completed') {
                        const store = txn.payment_method === 'store' ||
                            !['global', 'elite', 'pro', 'explorer'].includes(txn.plan_id || '');
                        setIsStoreOrder(store);
                        setPlanId(txn.plan_id);
                        setPollStatus('completed');
                        toast.success('Payment verified!');
                        return;
                    }

                    if (txn.status === 'failed') {
                        setPollStatus('failed');
                        setErrorMsg('Your payment was declined. Please try a different method.');
                        return;
                    }

                    if (txn.status === 'cancelled') {
                        setPollStatus('cancelled');
                        setErrorMsg('Payment was cancelled. You have not been charged.');
                        return;
                    }

                    // Still pending — retry
                    if (n < MAX) {
                        setPollStatus('found'); // keep step 0 done
                        await new Promise(r => setTimeout(r, 3000));
                        return poll();
                    }

                    // Timed out with pending status — NOT a success
                    setPlanId(txn.plan_id);
                    setPollStatus('timeout');
                };

                // Give a small head start before first poll
                await new Promise(r => setTimeout(r, 1500));
                await poll();
            } catch (err: any) {
                setPollStatus('failed');
                setErrorMsg(err.message || 'Verification failed. Please contact support.');
            }
        };
        verify();
    }, [orderId]);

    const copyId = () => {
        if (!orderId) return;
        navigator.clipboard.writeText(orderId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const planLabel: Record<string, string> = {
        pro: 'Exam Prep Plan', global: 'Global Admission Plan',
        elite: 'Elite Plan', explorer: 'Explorer Plan',
    };

    const STEPS = ['Payment Received', 'Verifying with Provider', 'Access Activated'];

    return (
        <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 flex flex-col relative">
            {/* Soft blobs */}
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-100/50 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-violet-100/30 rounded-full blur-[80px] pointer-events-none" />

            {/* Top bar */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm z-10">
                <img
                    src="/italostudy-logo.webp"
                    alt="ItaloStudy"
                    className="h-8 w-auto object-contain"
                    onError={e => { (e.target as HTMLImageElement).src = '/logo.webp'; }}
                />
                <div className="flex items-center gap-1.5 text-slate-400">
                    <Lock className="w-3 h-3" />
                    <span className="text-[11px] font-semibold">Secure Checkout</span>
                </div>
            </div>

            {/* Main */}
            <div className="flex-1 flex items-center justify-center px-4 z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-[420px]"
                >
                    <div className="bg-white rounded-[1.75rem] border border-slate-200/80 shadow-xl shadow-slate-200/50 overflow-hidden">

                        {/* Accent stripe */}
                        <div className={`h-1 w-full transition-colors duration-700 ${
                            uiStatus === 'success' ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                            : uiStatus === 'error'  ? 'bg-gradient-to-r from-rose-400 to-red-400'
                            : uiStatus === 'pending' ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                            : 'bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400'
                        }`}
                            style={uiStatus === 'loading' ? {
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 1.8s infinite linear',
                            } : {}}
                        />

                        <div className="p-6 space-y-5">

                            {/* Icon + headline */}
                            <div className="text-center space-y-3">
                                <AnimatePresence mode="wait">
                                    {uiStatus === 'loading' && (
                                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center">
                                            <div className="relative w-16 h-16">
                                                <div className="absolute inset-0 rounded-full bg-indigo-50 border-2 border-indigo-100" />
                                                <div className="absolute inset-1 rounded-full border-[3px] border-t-indigo-500 border-r-indigo-300 border-b-transparent border-l-transparent animate-spin" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Zap className="w-5 h-5 text-indigo-500" />
                                                </div>
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[8px] font-black">{attempts}</div>
                                            </div>
                                        </motion.div>
                                    )}
                                    {uiStatus === 'success' && (
                                        <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="flex justify-center">
                                            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                            </div>
                                        </motion.div>
                                    )}
                                    {uiStatus === 'pending' && (
                                        <motion.div key="pending" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="flex justify-center">
                                            <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                                                <Clock className="w-8 h-8 text-amber-500" />
                                            </div>
                                        </motion.div>
                                    )}
                                    {uiStatus === 'error' && (
                                        <motion.div key="error" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="flex justify-center">
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
                                            : uiStatus === 'error'  ? 'text-rose-700'
                                            : uiStatus === 'pending' ? 'text-amber-700'
                                            : 'text-slate-900'
                                        }`}>
                                            {uiStatus === 'loading'  && 'Verifying Payment…'}
                                            {uiStatus === 'success'  && (isStoreOrder ? 'Order Confirmed!' : 'Access Activated!')}
                                            {uiStatus === 'pending'  && 'Payment Processing'}
                                            {uiStatus === 'error'    && (pollStatus === 'cancelled' ? 'Payment Cancelled' : 'Payment Failed')}
                                        </h1>
                                        <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                            {uiStatus === 'loading'  && 'Confirming with payment processor. Please wait…'}
                                            {uiStatus === 'success'  && !isStoreOrder && `Your ${planLabel[planId!] || 'plan'} is now active.`}
                                            {uiStatus === 'success'  && isStoreOrder && 'Downloads ready in My Orders (valid 1 hr).'}
                                            {uiStatus === 'pending'  && 'Your payment was received but confirmation is delayed. Your account will activate within a few minutes — no action needed.'}
                                            {uiStatus === 'error'    && (errorMsg || 'Something went wrong. Please try again.')}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Step tracker — reflects REAL state */}
                            {(uiStatus === 'loading' || uiStatus === 'pending') && (
                                <div className="space-y-2">
                                    {STEPS.map((step, i) => (
                                        <div key={step} className="flex items-center gap-2.5">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black transition-all duration-500 ${
                                                stepDone[i] && i < 2
                                                    ? 'bg-emerald-500 text-white'
                                                    : stepDone[i] && i === 2
                                                        ? 'bg-emerald-500 text-white'
                                                        : !stepDone[i] && stepDone[i - 1] !== false && (i === 0 || stepDone[i - 1])
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-slate-100 text-slate-300'
                                            }`}>
                                                {stepDone[i]
                                                    ? <Check className="w-2.5 h-2.5" />
                                                    : (i === 0 || stepDone[i - 1])
                                                        ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
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

                            {/* Success: unlocked features */}
                            {uiStatus === 'success' && !isStoreOrder && (
                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                                    className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Unlocked</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { icon: BookOpen, label: 'Full Exams', cls: 'bg-indigo-100 text-indigo-600' },
                                            { icon: Trophy,   label: 'Mock Tests', cls: 'bg-amber-100 text-amber-600' },
                                            { icon: Globe,    label: 'All Access', cls: 'bg-emerald-100 text-emerald-600' },
                                        ].map(({ icon: Icon, label, cls }) => (
                                            <div key={label} className="bg-white rounded-lg p-2 text-center border border-white shadow-sm">
                                                <div className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-1 ${cls}`}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-[9px] text-slate-600 font-bold">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Pending info box */}
                            {uiStatus === 'pending' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-center">
                                    <p className="text-xs text-amber-700 font-semibold">
                                        Check <strong>Billing</strong> in a few minutes. If access isn't granted, email{' '}
                                        <a href="mailto:contact@italostudy.com" className="underline">contact@italostudy.com</a>{' '}
                                        with your Ref ID below.
                                    </p>
                                </motion.div>
                            )}

                            {/* Transaction ID */}
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
                                            if (uiStatus === 'success') {
                                                if (isStoreOrder) {
                                                    window.location.replace('https://store.italostudy.com/orders');
                                                } else {
                                                    navigate('/dashboard');
                                                }
                                            } else if (uiStatus === 'pending') {
                                                navigate('/billing');
                                            } else {
                                                navigate('/pricing');
                                            }
                                        }}
                                        className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 group transition-all active:scale-[0.99] ${
                                            uiStatus === 'success' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100'
                                            : uiStatus === 'pending' ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                            : 'bg-rose-500 hover:bg-rose-600 text-white'
                                        }`}
                                    >
                                        {uiStatus === 'success'
                                            ? isStoreOrder ? <><Package className="w-4 h-4" />View My Orders</> : <><LayoutDashboard className="w-4 h-4" />Go to Dashboard</>
                                            : uiStatus === 'pending' ? <><Clock className="w-4 h-4" />Check Billing Status</>
                                            : 'Try Again'}
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                    {uiStatus === 'error' && (
                                        <button onClick={() => navigate('/pricing')} className="w-full text-xs text-slate-400 hover:text-slate-600 font-semibold py-1 transition-colors">
                                            ← Back to Pricing
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
                                <span className="text-[9px] font-semibold uppercase tracking-wider">Dodo Payments</span>
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
                    0%   { background-position: 200% center; }
                    100% { background-position: -200% center; }
                }
            `}</style>
        </div>
    );
}
