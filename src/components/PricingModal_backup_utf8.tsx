import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Loader2, Info, ChevronRight, Brain, X, Sparkles, Check, Zap } from 'lucide-react';
import { add } from 'date-fns';
import CheckoutModal from '@/components/CheckoutModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePricing } from '@/context/PricingContext';
import { PricingSkeleton } from '@/components/SkeletonLoader';

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-100 py-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full text-left group"
            >
                <span className="text-[10px] font-black text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{question}</span>
                <div className={cn("p-1 rounded-full bg-slate-50 transition-transform", isOpen && "rotate-45")}>
                    <Brain className="w-2.5 h-2.5 text-slate-400" />
                </div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <p className="pt-2 text-slate-500 font-medium leading-relaxed uppercase text-[8px] tracking-widest">{answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function PricingModal() {
    const {
        isPricingModalOpen,
        closePricingModal,
        isCheckoutOpen,
        openCheckout,
        closeCheckout,
        config,
        couponMessage,
        isLoading
    } = usePricing();

    // We don't use local state for this anymore
    // const [showCheckout, setShowCheckout] = useState(false);

    const { user, profile, refreshProfile } = useAuth() as any;
    const { formatPrice, currency, getRegionalPrice } = useCurrency();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<string>('');
    const [selectedCycleId, setSelectedCycleId] = useState<string>('');

    // Smooth entry: wait for modal to animate before heavy DOM render
    useEffect(() => {
        if (isPricingModalOpen) {
            setIsRendering(true);
            const timer = setTimeout(() => setIsRendering(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isPricingModalOpen]);

    // Update selectedPlan and selectedCycle when config loads or plans change
    useEffect(() => {
        if (!isLoading && config?.plans) {
            const visiblePlans = config.plans.filter(p => p.isVisible !== false);
            if (visiblePlans.length > 0) {
                if (!selectedPlan || !visiblePlans.find(p => p.id === selectedPlan)) {
                    const firstPlan = visiblePlans[0];
                    setSelectedPlan(firstPlan.id);
                    if (firstPlan.cycles && firstPlan.cycles.length > 0) {
                        setSelectedCycleId(firstPlan.cycles[0].id);
                    }
                }
            }
        }
    }, [config, isLoading, selectedPlan]);

    useEffect(() => {
        if (selectedPlan && config?.plans) {
            const plan = config.plans.find(p => p.id === selectedPlan);
            if (plan && plan.cycles && plan.cycles.length > 0) {
                // If current cycle doesn't belong to plan, pick first
                if (!plan.cycles.find((c: any) => c.id === selectedCycleId)) {
                    setSelectedCycleId(plan.cycles[0].id);
                }
            }
        }
    }, [selectedPlan, config]);

    const handlePlanSelect = async (planId: string) => {
        if (!user) {
            navigate('/auth');
            closePricingModal();
            return;
        }

        setIsUpdating(planId);
        try {
            const tierMap: any = { 'explorer': 'initiate', 'pro': 'pro', 'elite': 'global', 'global': 'global' };
            const cycle = getSelectedCycle();

            // Handle both camelCase and snake_case for robustness (cast to any to satisfy TS)
            const durationValue = cycle?.durationValue || (cycle as any)?.duration_value || (
                planId === 'explorer' ? null :
                    cycle?.name?.toLowerCase().includes('day') ? 1 :
                        cycle?.name?.toLowerCase().includes('daily') ? 1 :
                            cycle?.name?.toLowerCase().includes('week') ? 7 :
                                1
            );
            const durationUnit = (cycle?.durationUnit || (cycle as any)?.duration_unit || (
                (cycle?.name?.toLowerCase().includes('day') || cycle?.name?.toLowerCase().includes('daily') || cycle?.name?.toLowerCase().includes('week')) ? 'days' :
                    'months'
            )) as 'days' | 'months' | 'years';

            // IF plan is explorer (free), we usually want null expiry
            const isFree = planId === 'explorer' || (cycle?.price === 0);
            const newExpiry = isFree ? null : add(new Date(), {
                [durationUnit]: durationValue || 1
            }).toISOString();

            // If they are downgrading to explorer (free), we usually want null expiry
            const isDowngradingToFree = planId === 'explorer';
            
            if (isDowngradingToFree) {
                try {
                    await supabase.functions.invoke('cancel-subscription');
                } catch (e) {
                    console.error('Failed to cancel gateway subscription during downgrade:', e);
                }
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    selected_plan: planId,
                    subscription_tier: tierMap[planId] || 'pro',
                    subscription_expiry_date: newExpiry
                })
                .eq('id', user.id);

            if (error) throw error;

            // Record a $0 transaction for the audit log if free/beta upgrade
            if (isFree || config.mode === 'beta') {
                await supabase
                    .from('transactions')
                    .insert({
                        user_id: user.id,
                        amount: 0,
                        currency: 'EUR',
                        status: 'completed',
                        payment_method: 'beta',
                        plan_id: planId,
                        provider_transaction_id: `BETA_${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
                        metadata: {
                            type: 'beta_upgrade',
                            upgraded_at: new Date().toISOString(),
                            provider_status: 'succeeded',
                            duration_value: isFree ? null : durationValue,
                            duration_unit: isFree ? null : durationUnit
                        }
                    });
            }

            await refreshProfile();
            toast({
                title: "Plan Updated",
                description: `Success! Your access level has been updated to the ${planId.toUpperCase()} tier.`,
            });
            closePricingModal();

            // Notify if Downgrading to Explorer
            if (planId === 'explorer') {
                await supabase.functions.invoke('send-push', {
                    body: {
                        title: "We're sorry to see you go! ðŸ˜¢",
                        body: "You've switched to the Explorer plan. You will no longer receive seat alerts or be able to use the bot commands. Come back anytime!",
                        data: { target_user_id: user.id }
                    }
                });
            }
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsUpdating(null);
        }
    };

    const getSelectedCycle = () => {
        if (!selectedPlan || !config?.plans) return null;
        const plan = config.plans.find(p => p.id === selectedPlan);
        if (!plan || !plan.cycles) return null;
        return plan.cycles.find((c: any) => c.id === selectedCycleId) || plan.cycles[0];
    };

    // Keep active if either modal is open
    if (!isPricingModalOpen && !isCheckoutOpen) return null;

    // Handle initial open but data still loading
    // We render the shell but show a skeleton inside

    const plans = config?.plans?.filter(p => p.isVisible !== false) || [];
    const { comparison } = config || { comparison: [] };

    const planDetails = plans.reduce((acc, plan) => {
        acc[plan.id] = plan;
        return acc;
    }, {} as Record<string, any>);
    const t = planDetails[selectedPlan];
    const currentCycle = getSelectedCycle();

    return (
        <>
            <AnimatePresence>
                {isPricingModalOpen && (
                    <motion.div
                        key="pricing-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-slate-900/40 optimize-blur p-0 md:p-6"
                        onClick={closePricingModal}
                    >
                        <motion.div
                            key="pricing-modal-content"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{
                                duration: 0.2,
                                ease: "easeOut"
                            }}
                            className="bg-slate-50 dark:bg-slate-900 w-full max-w-5xl h-[95vh] md:h-auto md:max-h-[90vh] rounded-t-[2.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-900/10 flex flex-col relative gpu-accelerated border-t md:border border-slate-200/50 dark:border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 flex items-center justify-between px-5 md:px-8 h-16 shrink-0 z-20">
                                <div className="flex items-center gap-4">
                                    <img src="/logo.webp" alt="Logo" className="h-6 w-auto dark:hidden" />
                                    <img src="/logo-dark-full.webp" alt="Logo" className="h-6 w-auto hidden dark:block" />
                                    <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700" />
                                    <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Upgrade Hub</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={closePricingModal} className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors group">
                                        <X size={18} className="text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
                                    </button>
                                </div>
                            </div>


                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {isLoading || isRendering ? (
                                    <PricingSkeleton />
                                ) : (
                                    <div className="p-4 md:p-10 pb-20">
                                        <div className="text-center mb-10 relative">
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none" />
                                            <h2 className="relative text-2xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Unlock Your Full Potential</h2>
                                            <p className="relative text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 mt-4 max-w-xl mx-auto">Upgrade to a premium plan for complete access to our advanced features and dedicated support</p>
                                        </div>

                                    {typeof couponMessage === 'string' && couponMessage.trim() !== '' && (
                                        <div className="mb-8 flex justify-center">
                                            <motion.div 
                                                initial={{ y: 10, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                className="relative group cursor-default"
                                            >
                                                {/* Ultra-Subtle Glow */}
                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                                
                                                <div className="relative px-5 py-2.5 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-full flex items-center gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
                                                    {/* Slow Shimmer */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-400/5 to-transparent -translate-x-full animate-[shimmer_4s_infinite] pointer-events-none"></div>

                                                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0 group-hover:scale-105 transition-transform duration-500">
                                                        <Zap size={16} className="fill-white" />
                                                    </div>
                                                    
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] font-black text-indigo-500/70 uppercase tracking-[0.2em] leading-none mb-0.5">Special Offer</span>
                                                        <div className="flex items-center gap-2">
                                                            {couponMessage.split(' ').map((word, i) => (
                                                                <span 
                                                                    key={i} 
                                                                    className={/^[A-Z0-9]{4,}$/.test(word.replace(/[^A-Z0-9]/g, '')) 
                                                                        ? "px-2 py-0.5 bg-indigo-600 text-white rounded-lg font-black text-[9px] shadow-sm tracking-tight" 
                                                                        : "text-[10px] font-bold text-slate-700 tracking-tight"
                                                                    }
                                                                >
                                                                    {word}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}

                                    <div className="hidden md:grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
                                        {/* Feature Table */}
                                        <div className="lg:col-span-12">
                                            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto custom-scrollbar">
                                                <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
                                                    <thead>
                                                        <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                                                            <th className="py-5 px-8 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-1/3">Features</th>
                                                            {plans.map(plan => (
                                                                <th key={plan.id} className="py-5 px-6 text-center">
                                                                    <div className={cn("text-sm font-black uppercase tracking-tight transition-colors", selectedPlan === plan.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-300")}>
                                                                        {plan.name}
                                                                    </div>
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/80">
                                                        {comparison.map((feature, idx) => (
                                                            <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                                <td className="py-4 px-8">
                                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-tight">{feature.name}</span>
                                                                </td>
                                                                {plans.map(plan => {
                                                                    const value = (feature as any)[plan.id] ?? false;
                                                                    return (
                                                                        <td key={plan.id} className={cn("py-4 px-6 text-center transition-all", selectedPlan === plan.id && "bg-indigo-50/20 dark:bg-indigo-500/5")}>
                                                                            {typeof value === 'boolean' ? (
                                                                                value ? <BadgeCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mx-auto stroke-[2.5]" /> : <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto stroke-[2.5]" />
                                                                            ) : (
                                                                                <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">{value}</span>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Plan Cards */}
                                    <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 mb-8">
                                        {plans.map((plan) => (
                                            <div
                                                key={plan.id}
                                                onClick={() => setSelectedPlan(plan.id)}
                                                className={cn(
                                                    "relative cursor-pointer p-6 md:p-8 rounded-[2.5rem] border-2 transition-all duration-300 flex flex-col justify-between group",
                                                    selectedPlan === plan.id
                                                        ? "bg-white dark:bg-slate-800 border-indigo-600 shadow-2xl shadow-indigo-600/20 scale-[1.02]"
                                                        : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                )}
                                            >
                                                {selectedPlan === plan.id && (
                                                    <div className="absolute top-0 right-8 -translate-y-1/2 bg-indigo-600 text-white rounded-full p-1.5 shadow-lg shadow-indigo-600/30 z-10">
                                                        <BadgeCheck size={18} />
                                                    </div>
                                                )}
                                                {plan.badge && (
                                                    <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-[10px] font-black text-white rounded-lg uppercase tracking-widest shadow-lg shadow-indigo-600/20 animate-pulse z-10">
                                                        {plan.badge}
                                                    </div>
                                                )}
                                                <div className="space-y-6 relative z-10">
                                                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">{plan.name}</h3>

                                                    {/* Cycle Selection within Card if multiple, or just price if single */}
                                                    <div className="space-y-4">
                                                        {plan.cycles && plan.cycles.length > 1 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {plan.cycles.map((cycle: any) => (
                                                                    <button
                                                                        key={cycle.id}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedPlan(plan.id);
                                                                            setSelectedCycleId(cycle.id);
                                                                        }}
                                                                        className={cn(
                                                                            "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                                                                            selectedCycleId === cycle.id && selectedPlan === plan.id
                                                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                                                : "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                                                        )}
                                                                    >
                                                                        {cycle.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : null}

                                                        <div className="space-y-1">
                                                            <div className="flex items-baseline gap-2">
                                                                {config.mode === 'beta' ? (
                                                                    <>
                                                                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">FREE</span>
                                                                        {(() => {
                                                                            const cycle = selectedPlan === plan.id ? currentCycle : plan.cycles?.[0];
                                                                            const basePrice = cycle?.price || 0;
                                                                            const regionalPrices = cycle?.regionalPrices || plan.regionalPrices;

                                                                            if (basePrice > 0) {
                                                                                const info = getRegionalPrice(basePrice, regionalPrices);
                                                                                return (
                                                                                    <span className="text-sm font-bold text-slate-400 line-through decoration-2">
                                                                                        {formatPrice(info.amount, info.currency)}
                                                                                    </span>
                                                                                );
                                                                            }
                                                                            return null;
                                                                        })()}
                                                                    </>
                                                                ) : (
                                                                    <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                                                                        {(() => {
                                                                            const cycle = selectedPlan === plan.id ? currentCycle : plan.cycles?.[0];
                                                                            const basePrice = cycle?.price || 0;
                                                                            const regionalPrices = cycle?.regionalPrices || plan.regionalPrices;
                                                                            const info = getRegionalPrice(basePrice, regionalPrices);
                                                                            return basePrice === 0 ? 'FREE' : formatPrice(info.amount, info.currency);
                                                                        })()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                                                {config.mode === 'beta' ? 'Free Access' : `/ ${(selectedPlan === plan.id ? currentCycle : plan.cycles?.[0])?.name || 'cycle'}`}
                                                            </p>
                                                        </div>

                                                        {/* Mobile Features List */}
                                                        <div className="md:hidden space-y-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/50">
                                                            {comparison.map((feat, idx) => {
                                                                const value = (feat as any)[plan.id];
                                                                if (value === undefined || value === false) return null;
                                                                return (
                                                                    <div key={idx} className="flex items-start gap-3">
                                                                        <div className="mt-0.5 p-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-100 dark:border-indigo-800">
                                                                            <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                                                        </div>
                                                                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                                                                            {typeof value === 'boolean' ? feat.name : <span ><span className="font-black text-slate-900 dark:text-white uppercase">{value}</span> {feat.name.split(':')[0]}</span>}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer / Action */}
                            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/50 dark:border-white/5 p-5 md:p-8 shrink-0 flex flex-col items-center gap-5 relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                                {!user ? (
                                    <Button
                                        onClick={() => {
                                            closePricingModal();
                                            navigate('/auth');
                                        }}
                                        className="w-full max-w-md h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs md:text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-95 group relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                        Log in to Subscribe
                                        <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => {
                                            const planPrice = currentCycle?.price || 0;
                                            if (config.mode === 'live' && planPrice > 0) {
                                                closePricingModal();
                                                openCheckout();
                                            } else {
                                                handlePlanSelect(selectedPlan);
                                            }
                                        }}
                                        disabled={isUpdating !== null || (profile?.selected_plan === selectedPlan)}
                                        className="w-full max-w-md h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs md:text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-95 group relative overflow-hidden disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                        {(() => {
                                            const currentPlanIndex = plans.findIndex(p => p.id === profile?.selected_plan);
                                            const selectedPlanIndex = plans.findIndex(p => p.id === selectedPlan);
                                            const isDowngrade = currentPlanIndex !== -1 && selectedPlanIndex !== -1 && selectedPlanIndex < currentPlanIndex;
                                            const actionText = isDowngrade ? 'Downgrade' : 'Upgrade';

                                            if (isUpdating === selectedPlan) return <Loader2 className="w-5 h-5 animate-spin" />;
                                            if (profile?.selected_plan === selectedPlan) return "Current Plan";
                                            if (config.mode === 'live' && !isDowngrade) return `Subscribe to ${selectedPlan.toUpperCase()}`;
                                            return `${actionText} to ${selectedPlan.toUpperCase()}`;
                                        })()}
                                        {profile?.selected_plan !== selectedPlan && <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                                    </Button>
                                )}
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <BadgeCheck size={16} className="text-emerald-500" />
                                    {config.mode === 'beta' ? 'Secure Access â€¢ Cancel Anytime' : 'Secure Payment â€¢ Cancel Anytime'}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={closeCheckout}
                planId={selectedPlan}
                planName={t?.name || selectedPlan}
                amount={currentCycle?.price || 0}
                currency="EUR"
                regionalPrices={currentCycle?.regionalPrices || t?.regionalPrices}
                billingCycle={currentCycle?.name || 'Standard'}
                durationValue={currentCycle?.durationValue || (currentCycle as any)?.duration_value}
                durationUnit={currentCycle?.durationUnit || (currentCycle as any)?.duration_unit}
            />
        </>

    );
}
