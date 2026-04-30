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
    const [selectedPlan, setSelectedPlan] = useState<string>('');
    const [selectedCycleId, setSelectedCycleId] = useState<string>('');

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
                        title: "We're sorry to see you go! 😢",
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
                        className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 optimize-blur p-4 md:p-6"
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
                            className="bg-slate-50 w-full max-w-4xl max-h-[90vh] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col relative gpu-accelerated"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-white border-b border-slate-100 flex items-center justify-between px-6 h-14 shrink-0">
                                <div className="flex items-center gap-4">
                                    <img src="/logo.webp" alt="Logo" className="h-5 w-auto" />
                                    <div className="h-4 w-[1px] bg-slate-200" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upgrade Hub</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={closePricingModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors group">
                                        <X size={16} className="text-slate-400 group-hover:text-slate-900" />
                                    </button>
                                </div>
                            </div>


                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {isLoading ? (
                                    <PricingSkeleton />
                                ) : (
                                    <div className="p-6 md:p-8">
                                        <div className="text-center mb-8">
                                            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Unlock Your Full Potential</h2>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Upgrade to a premium plan for complete access</p>
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

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                        {/* Feature Table */}
                                        <div className="lg:col-span-12">
                                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 bg-slate-50/50">
                                                            <th className="py-3 px-6 text-[8px] font-black text-slate-400 uppercase tracking-widest w-1/3">Features</th>
                                                            {plans.map(plan => (
                                                                <th key={plan.id} className="py-3 px-6 text-center">
                                                                    <div className={cn("text-[10px] font-black uppercase tracking-tight transition-colors", selectedPlan === plan.id ? "text-indigo-600" : "text-slate-600")}>
                                                                        {plan.name}
                                                                    </div>
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100/50">
                                                        {comparison.map((feature, idx) => (
                                                            <tr key={idx} className="group hover:bg-slate-50/30 transition-colors">
                                                                <td className="py-2.5 px-6">
                                                                    <span className="text-[10px] font-bold text-slate-700 tracking-tight">{feature.name}</span>
                                                                </td>
                                                                {plans.map(plan => {
                                                                    const value = (feature as any)[plan.id] ?? false;
                                                                    return (
                                                                        <td key={plan.id} className={cn("py-2.5 px-6 text-center transition-all", selectedPlan === plan.id && "bg-indigo-50/10")}>
                                                                            {typeof value === 'boolean' ? (
                                                                                value ? <BadgeCheck className="w-3.5 h-3.5 text-indigo-600 mx-auto stroke-[3]" /> : <X className="w-3.5 h-3.5 text-slate-300 mx-auto stroke-[2]" />
                                                                            ) : (
                                                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-tight">{value}</span>
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
                                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {plans.map((plan) => (
                                            <div
                                                key={plan.id}
                                                onClick={() => setSelectedPlan(plan.id)}
                                                className={cn(
                                                    "relative cursor-pointer p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col justify-between",
                                                    selectedPlan === plan.id
                                                        ? "bg-white border-indigo-600 shadow-xl shadow-indigo-500/[0.05]"
                                                        : "bg-white border-slate-200 hover:border-slate-300"
                                                )}
                                            >
                                                {selectedPlan === plan.id && (
                                                    <div className="absolute top-0 right-5 -translate-y-1/2 bg-indigo-600 text-white rounded-full p-1 shadow-md shadow-indigo-500/20 z-10">
                                                        <BadgeCheck size={14} />
                                                    </div>
                                                )}
                                                {plan.badge && (
                                                    <div className="absolute -top-2 left-4 px-2 py-0.5 bg-indigo-600 text-[8px] font-black text-white rounded uppercase tracking-widest animate-pulse z-10">
                                                        {plan.badge}
                                                    </div>
                                                )}
                                                <div className="space-y-4">
                                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">{plan.name}</h3>

                                                    {/* Cycle Selection within Card if multiple, or just price if single */}
                                                    <div className="space-y-3">
                                                        {plan.cycles && plan.cycles.length > 1 ? (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {plan.cycles.map((cycle: any) => (
                                                                    <button
                                                                        key={cycle.id}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedPlan(plan.id);
                                                                            setSelectedCycleId(cycle.id);
                                                                        }}
                                                                        className={cn(
                                                                            "px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all border",
                                                                            selectedCycleId === cycle.id && selectedPlan === plan.id
                                                                                ? "bg-indigo-600 text-white border-indigo-600"
                                                                                : "bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200"
                                                                        )}
                                                                    >
                                                                        {cycle.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : null}

                                                        <div className="space-y-1">
                                                            <div className="flex items-baseline gap-1">
                                                                {config.mode === 'beta' ? (
                                                                    <>
                                                                        <span className="text-lg font-black text-slate-900 tracking-tight uppercase">FREE</span>
                                                                        {(() => {
                                                                            const cycle = selectedPlan === plan.id ? currentCycle : plan.cycles?.[0];
                                                                            const basePrice = cycle?.price || 0;
                                                                            const regionalPrices = cycle?.regionalPrices || plan.regionalPrices;

                                                                            if (basePrice > 0) {
                                                                                const info = getRegionalPrice(basePrice, regionalPrices);
                                                                                return (
                                                                                    <span className="text-[10px] font-bold text-slate-300 line-through">
                                                                                        {formatPrice(info.amount, info.currency)}
                                                                                    </span>
                                                                                );
                                                                            }
                                                                            return null;
                                                                        })()}
                                                                    </>
                                                                ) : (
                                                                    <span className="text-lg font-black text-slate-900 tracking-tight uppercase">
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
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                                                {config.mode === 'beta' ? 'Beta Access' : `/ ${(selectedPlan === plan.id ? currentCycle : plan.cycles?.[0])?.name || 'cycle'}`}
                                                            </p>
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
                            <div className="bg-white border-t border-slate-100 p-6 shrink-0 flex flex-col items-center gap-4">
                                {!user ? (
                                    <Button
                                        onClick={() => {
                                            closePricingModal();
                                            navigate('/auth');
                                        }}
                                        className="w-full max-w-sm h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/10 transition-all active:scale-95"
                                    >
                                        Log in to Subscribe
                                        <ChevronRight className="ml-1.5 w-3.5 h-3.5" />
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
                                        className="w-full max-w-sm h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/10 transition-all active:scale-95"
                                    >
                                        {(() => {
                                            const currentPlanIndex = plans.findIndex(p => p.id === profile?.selected_plan);
                                            const selectedPlanIndex = plans.findIndex(p => p.id === selectedPlan);
                                            const isDowngrade = currentPlanIndex !== -1 && selectedPlanIndex !== -1 && selectedPlanIndex < currentPlanIndex;
                                            const actionText = isDowngrade ? 'Downgrade' : 'Upgrade';

                                            if (isUpdating === selectedPlan) return <Loader2 className="w-4 h-4 animate-spin" />;
                                            if (profile?.selected_plan === selectedPlan) return "Current Plan";
                                            if (config.mode === 'live' && !isDowngrade) return `Subscribe to ${selectedPlan.toUpperCase()}`;
                                            return `${actionText} to ${selectedPlan.toUpperCase()}`;
                                        })()}
                                        <ChevronRight className="ml-1.5 w-3.5 h-3.5" />
                                    </Button>
                                )}
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <BadgeCheck size={12} className="text-emerald-500" />
                                    {config.mode === 'beta' ? 'Secure Beta Access • Cancel Anytime' : 'Secure Payment • Cancel Anytime'}
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
