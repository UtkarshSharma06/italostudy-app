import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Loader2, Info, ChevronRight, Brain, X, Sparkles, Check, Zap, Target, Gem, Globe, Shield, Disc, Award, FileText, PlaySquare, BarChart2, MessageSquare, ArrowRight, ShieldCheck, RotateCcw } from 'lucide-react';
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

    useEffect(() => {
        if (isPricingModalOpen) {
            setIsRendering(true);
            // Reduced from 300ms → 50ms: just enough for the animation frame to start
            const timer = setTimeout(() => setIsRendering(false), 50);
            return () => clearTimeout(timer);
        }
    }, [isPricingModalOpen]);

    // Update selectedPlan and selectedCycle when config loads or plans change
    useEffect(() => {
        if (!isLoading && config?.plans) {
            const visiblePlans = config.plans.filter(p => p.isVisible !== false);
            if (visiblePlans.length > 0) {
                if (!selectedPlan || !visiblePlans.find(p => p.id === selectedPlan)) {
                    const globalPlan = visiblePlans.find(p => p.id === 'global');
                    const defaultPlan = globalPlan || visiblePlans[0];
                    setSelectedPlan(defaultPlan.id);
                    if (defaultPlan.cycles && defaultPlan.cycles.length > 0) {
                        setSelectedCycleId(defaultPlan.cycles[0].id);
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
                        className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-slate-900/40 optimize-blur p-0"
                        onClick={closePricingModal}
                    >
                                <motion.div
                                key="pricing-modal-mobile"
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 30, opacity: 0 }}
                                transition={{
                                    duration: 0.18,
                                    ease: [0.22, 1, 0.36, 1]
                                }}
                                style={{ willChange: 'transform, opacity' }}
                                className="flex md:hidden bg-white dark:bg-slate-900 w-full h-[100dvh] overflow-hidden flex-col relative gpu-accelerated font-sans rounded-t-[2.5rem]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-5 shrink-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                                    <div className="flex items-center gap-3">
                                        <img src="/logo-dark-full.webp" alt="Logo" className="h-6 w-auto hidden dark:block" />
                                        <img src="/logo.webp" alt="Logo" className="h-6 w-auto block dark:hidden" />
                                        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700" />
                                        <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">Upgrade Hub</span>
                                    </div>
                                    <button onClick={closePricingModal} className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">
                                        <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-12">
                                    {isLoading || isRendering ? (
                                        <PricingSkeleton />
                                    ) : (
                                        <>
                                            {/* Title Section */}
                                            <div className="mb-5">
                                                <h2 className="text-[28px] font-black text-slate-900 dark:text-white leading-[1.1] mb-2 tracking-tight">
                                                    Go Premium,<br/>
                                                    <span className="text-[#5A32FA] dark:text-indigo-400">Ace Every Exam</span> <Zap className="inline w-6 h-6 text-[#5A32FA] dark:text-indigo-400 fill-[#5A32FA] dark:fill-indigo-400 mb-1"/>
                                                </h2>
                                                <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed pr-6">
                                                    Unlock premium features and take your preparation to the next level.
                                                </p>
                                                {/* Social Proof Strip */}
                                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                                    <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg px-2.5 py-1.5">
                                                        <span className="text-[13px]">🔥</span>
                                                        <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300">1,200+ students enrolled</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-2.5 py-1.5">
                                                        <span className="text-[12px]">⭐</span>
                                                        <span className="text-[11px] font-black text-amber-700 dark:text-amber-300">4.8 / 5 Trustpilot</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Top Toggle Area for Global Cycles */}
                                            {(() => {
                                                const globalPlan = config?.plans?.find(p => p.id === 'global');
                                                const globalCycles = globalPlan?.cycles || [];
                                                let globalCycle = globalPlan?.cycles?.find((c: any) => c.id === selectedCycleId);
                                                if (!globalCycle) globalCycle = globalPlan?.cycles?.[0];
                                                const isGlobalSelected = selectedPlan === 'global';

                                                return (
                                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6 shrink-0 w-full">
                                                        {globalCycles.map((cycle: any) => {
                                                            const isCycleActive = isGlobalSelected && globalCycle?.id === cycle.id;
                                                            let shortName = cycle.name.replace(' Plan', '');
                                                            
                                                            return (
                                                                <button 
                                                                    key={cycle.id}
                                                                    onClick={() => {
                                                                        setSelectedPlan('global');
                                                                        setSelectedCycleId(cycle.id);
                                                                    }}
                                                                    className={cn(
                                                                        "flex-1 py-2.5 px-3 rounded-lg flex flex-col items-center justify-center transition-all", 
                                                                        isCycleActive ? "bg-white dark:bg-slate-700 shadow-sm text-[#5A32FA] dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                                                    )}
                                                                >
                                                                    <span className="font-bold text-[13px]">{shortName}</span>
                                                                    {cycle.name.toLowerCase().includes('year') || cycle.name.toLowerCase().includes('annual') ? (
                                                                        <span className="text-[9px] font-bold text-emerald-500 mt-0.5">Best Value</span>
                                                                    ) : null}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}

                                            {/* Plan Cards Display (Toggled based on selection to fit the 390px screen elegantly, or side-by-side if you want. Wait, side-by-side is requested, but it's too cramped for the features text. The mock up is a conceptual layout. Let's make it EXACTLY a horizontal scroll snap to allow both cards to exist side-by-side but be swipeable, which matches the mock-up visually but keeps it functional on a real phone.) */}
                                            {/* Wait, the user said "exactly like this". I will put them side-by-side using grid grid-cols-2. */}
                                            <div className="grid grid-cols-2 gap-3 mb-8 items-stretch">
                                                {/* Explorer Card */}
                                                <div 
                                                    onClick={() => setSelectedPlan('explorer')}
                                                    className={cn("rounded-[1.5rem] p-4 flex flex-col items-center text-center relative border transition-all cursor-pointer", selectedPlan === 'explorer' ? "border-indigo-200 dark:border-indigo-500/30 bg-[#F8F7FF] dark:bg-slate-800/80 shadow-md" : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/40 opacity-70 scale-[0.98]")}>
                                                    <div className="absolute top-4 left-4 w-1 h-1 bg-indigo-400 rounded-full opacity-40"></div>
                                                    <div className="absolute top-8 right-6 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-40 flex items-center justify-center"><Sparkles className="w-2 h-2 text-purple-400" /></div>
                                                    <div className="absolute bottom-1/2 left-2 w-1 h-1 bg-blue-400 rounded-full opacity-40"></div>
                                                    
                                                    <div className="w-12 h-12 bg-[#EBE7FF] dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-3 mt-2 shadow-sm">
                                                        <Gem className="w-6 h-6 text-[#5A32FA] dark:text-indigo-400 fill-[#5A32FA] dark:fill-indigo-400" />
                                                    </div>
                                                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-0.5 tracking-tight">Explore Plan</h3>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4 font-medium leading-tight px-2">Start your journey for free</p>
                                                    
                                                    <div className="text-[32px] font-black text-slate-900 dark:text-white mb-0 tracking-tighter leading-none">Free</div>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-4 mt-1.5">Forever Free</p>

                                                    <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-700/50 mb-4"></div>

                                                    <div className="w-full flex flex-col gap-2.5 mb-6 flex-1">
                                                        <div className="flex items-start gap-2 text-left">
                                                            <div className="w-3.5 h-3.5 rounded-full bg-[#5A32FA] flex items-center justify-center shrink-0 mt-[1px]"><Check className="w-2 h-2 text-white" strokeWidth={3}/></div>
                                                            <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Limited Daily Practice</span>
                                                        </div>
                                                        <div className="flex items-start gap-2 text-left">
                                                            <div className="w-3.5 h-3.5 rounded-full bg-[#5A32FA] flex items-center justify-center shrink-0 mt-[1px]"><Check className="w-2 h-2 text-white" strokeWidth={3}/></div>
                                                            <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200 leading-tight">1 Mock Simulation</span>
                                                        </div>
                                                        <div className="flex items-start gap-2 text-left">
                                                            <div className="w-3.5 h-3.5 rounded-full bg-[#5A32FA] flex items-center justify-center shrink-0 mt-[1px]"><Check className="w-2 h-2 text-white" strokeWidth={3}/></div>
                                                            <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Multi-Device</span>
                                                        </div>
                                                        <div className="flex items-start gap-2 text-left opacity-40">
                                                            <div className="w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center shrink-0 mt-[1px]"><X className="w-2 h-2 text-white" strokeWidth={3}/></div>
                                                            <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-tight">Basic Learning Modules</span>
                                                        </div>
                                                        <div className="flex items-start gap-2 text-left opacity-40">
                                                            <div className="w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center shrink-0 mt-[1px]"><X className="w-2 h-2 text-white" strokeWidth={3}/></div>
                                                            <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-tight">Detailed Explanations</span>
                                                        </div>
                                                        <div className="flex items-start gap-2 text-left opacity-40">
                                                            <div className="w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center shrink-0 mt-[1px]"><X className="w-2 h-2 text-white" strokeWidth={3}/></div>
                                                            <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-tight">Performance Insights</span>
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={() => handlePlanSelect('explorer')}
                                                        disabled={profile?.selected_plan === 'explorer' || isUpdating !== null}
                                                        className="w-full h-10 rounded-[10px] border-[1.5px] border-[#5A32FA]/30 text-[#5A32FA] dark:border-indigo-400/50 dark:text-indigo-400 font-bold bg-white dark:bg-slate-800 hover:bg-indigo-50 transition-colors text-[11px]"
                                                    >
                                                        {isUpdating === 'explorer' ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : (profile?.selected_plan === 'explorer' ? 'Current Plan' : 'Select Free')}
                                                    </button>
                                                </div>

                                                {/* Premium Card */}
                                                <div 
                                                    onClick={() => setSelectedPlan('global')}
                                                    className={cn("rounded-[1.5rem] border-[1px] border-rose-200 dark:border-rose-500/30 bg-white dark:bg-slate-800 p-4 flex flex-col items-center text-center relative shadow-[0_12px_40px_-10px_rgba(249,79,60,0.15)] dark:shadow-none overflow-visible transition-all cursor-pointer", selectedPlan === 'global' ? "scale-100 ring-2 ring-rose-100 dark:ring-rose-900/30 ring-offset-2 dark:ring-offset-slate-900" : "scale-[0.98] opacity-70")}>
                                                    <div className="absolute -top-2.5 right-2 bg-gradient-to-r from-[#D81865] to-[#F94F3C] text-white text-[9px] font-black px-2.5 py-0.5 rounded-md tracking-widest uppercase shadow-md z-10">
                                                        POPULAR
                                                    </div>

                                                    <div className="w-12 h-12 bg-[#FFF3E5] dark:bg-orange-500/10 rounded-full flex items-center justify-center mb-3 mt-2">
                                                        <Award className="w-6 h-6 text-[#F9823C] fill-[#F9823C]" />
                                                    </div>
                                                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-0.5 tracking-tight">Global Plan</h3>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4 font-medium leading-tight px-1">Unlock everything, ace every exam</p>

                                                    <div className="flex flex-col items-center mb-4">
                                                        {(() => {
                                                            const globalPlan = config?.plans?.find(p => p.id === 'global');
                                                            let globalCycle = globalPlan?.cycles?.find((c: any) => c.id === selectedCycleId);
                                                            if (!globalCycle) globalCycle = globalPlan?.cycles?.[0];
                                                            const planPrice = globalCycle?.price || 0;
                                                            const regionalInfo = getRegionalPrice(planPrice, globalCycle?.regionalPrices || globalPlan?.regionalPrices);
                                                            
                                                            return (
                                                                <>
                                                                    <div className="text-[32px] font-black text-slate-900 dark:text-white mb-0 flex items-baseline gap-0.5 tracking-tighter leading-none">
                                                                        {config.mode === 'beta' ? 'FREE' : formatPrice(regionalInfo.amount, regionalInfo.currency)}
                                                                    </div>
                                                                    {config.mode !== 'beta' && regionalInfo.amount > 0 && (
                                                                        <div className="flex items-center gap-1.5 text-[9px] font-bold mt-1.5">
                                                                            <span className="bg-[#E5F7ED] text-[#00A15D] px-1.5 py-0.5 rounded">Save 60%</span>
                                                                            <span className="text-slate-400 line-through decoration-1">{formatPrice(regionalInfo.amount * 2.5, regionalInfo.currency)}</span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>

                                                    <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-700 mb-4"></div>

                                                    <div className="w-full flex flex-col gap-2 mb-6 flex-1">
                                                        {(config?.plans?.find(p => p.id === 'global')?.features?.length > 0 ? config.plans.find(p => p.id === 'global')!.features : [
                                                            "Everything in Explore Plan",
                                                            "Unlimited Practice",
                                                            "All Learning Modules",
                                                            "Mock Simulations",
                                                            "Detailed Explanations",
                                                            "Advanced Analytics",
                                                            "24/7 cent-s slot tracker",
                                                            "Multi-Device",
                                                            "Priority Support"
                                                        ]).map((text: string, i: number) => (
                                                            <div key={i} className="flex items-start gap-1.5 text-left">
                                                                <div className="w-3.5 h-3.5 rounded-full bg-[#5A32FA] flex items-center justify-center shrink-0 mt-[1px]">
                                                                    <Check className="w-2 h-2 text-white" strokeWidth={3}/>
                                                                </div>
                                                                <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 leading-tight tracking-tight">{text}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <button 
                                                        onClick={() => {
                                                            if (!user) {
                                                                closePricingModal();
                                                                navigate('/auth');
                                                                return;
                                                            }
                                                            const globalPlan = config?.plans?.find(p => p.id === 'global');
                                                            let globalCycle = globalPlan?.cycles?.find((c: any) => c.id === selectedCycleId);
                                                            if (!globalCycle) globalCycle = globalPlan?.cycles?.[0];
                                                            const planPrice = globalCycle?.price || 0;

                                                            if (config.mode === 'live' && planPrice > 0) {
                                                                closePricingModal();
                                                                openCheckout();
                                                            } else {
                                                                handlePlanSelect('global');
                                                            }
                                                        }}
                                                        disabled={profile?.selected_plan === 'global' || isUpdating !== null}
                                                        className="w-full h-10 rounded-[10px] bg-gradient-to-r from-[#5A32FA] to-[#F94F3C] text-white font-bold flex items-center justify-center gap-1.5 shadow-[0_4px_15px_rgba(249,79,60,0.3)] transition-all disabled:opacity-50 text-[12px] px-2"
                                                    >
                                                        <span className="flex-1 text-center">{isUpdating !== null ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : (!user ? 'Log in' : (profile?.selected_plan === 'global' ? 'Current Plan' : 'Upgrade Now'))}</span>
                                                        {profile?.selected_plan !== 'global' && isUpdating === null && (
                                                            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                                                <ArrowRight className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Footer / Trust Badges */}
                                            <div className="grid grid-cols-4 gap-1 mb-10 mt-6">
                                                <div className="flex flex-col items-center text-center">
                                                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-2 shadow-sm">
                                                        <ShieldCheck className="w-4 h-4 text-[#5A32FA] dark:text-indigo-400" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight mb-0.5">Secure Payment</span>
                                                    <span className="text-[8px] text-slate-500 dark:text-slate-400 leading-tight">100% safe & encrypted</span>
                                                </div>
                                                <div className="flex flex-col items-center text-center">
                                                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-2 shadow-sm">
                                                        <Zap className="w-4 h-4 text-[#00A15D] fill-[#00A15D] dark:text-emerald-400 dark:fill-emerald-400" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight mb-0.5">Instant Access</span>
                                                    <span className="text-[8px] text-slate-500 dark:text-slate-400 leading-tight">Get started immediately</span>
                                                </div>
                                                <div className="flex flex-col items-center text-center">
                                                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-2 shadow-sm">
                                                        <RotateCcw className="w-4 h-4 text-[#5A32FA] dark:text-indigo-400" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight mb-0.5">Cancel Anytime</span>
                                                    <span className="text-[8px] text-slate-500 dark:text-slate-400 leading-tight">No questions asked</span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center text-center gap-1.5 border-l border-slate-100 dark:border-slate-800/50 pl-1">
                                                    <a href="https://italostudy.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[8px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">Privacy</a>
                                                    <a href="https://italostudy.com/terms" target="_blank" rel="noopener noreferrer" className="text-[8px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">Terms</a>
                                                    <a href="https://italostudy.com/refund" target="_blank" rel="noopener noreferrer" className="text-[8px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">Refunds</a>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center pt-2">
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-3">We Accept</span>
                                                <div className="flex gap-2 items-center flex-wrap justify-center max-w-[280px] opacity-80 mix-blend-multiply dark:mix-blend-normal">
                                                    <img src="/payments/visa.webp" alt="Visa" className="h-3 w-auto object-contain dark:invert dark:opacity-80" />
                                                    <img src="/payments/mastercard.webp" alt="Mastercard" className="h-3 w-auto object-contain" />
                                                    <img src="/payments/amex.webp" alt="Amex" className="h-3 w-auto object-contain" />
                                                    <img src="/payments/upi.webp" alt="UPI" className="h-3.5 w-auto object-contain dark:invert dark:opacity-80" />
                                                    <img src="/payments/paypal.webp" alt="PayPal" className="h-3 w-auto object-contain" />
                                                    <img src="/payments/applepay.webp" alt="Apple Pay" className="h-3 w-auto object-contain dark:invert dark:opacity-80" />
                                                    <img src="/payments/googlepay.webp" alt="Google Pay" className="h-3 w-auto object-contain dark:invert dark:opacity-80" />
                                                    <img src="/payments/cashapp.webp" alt="Cash App" className="h-3 w-auto object-contain" />
                                                    <img src="/payments/ideal.webp" alt="iDEAL" className="h-3 w-auto object-contain" />
                                                    <img src="/payments/pix.webp" alt="Pix" className="h-3 w-auto object-contain" />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>
{/* 
                          ----------------------------------------------------------------------
                          DESKTOP UI (WHITE THEME V2 - 80% SCALE & 3-WAY TOGGLE)
                          ----------------------------------------------------------------------
                        */}
                        <motion.div
                            key="pricing-modal-desktop"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            style={{ willChange: 'transform, opacity' }}
                            className="hidden md:flex flex-col w-[1000px] max-w-full h-[100dvh] max-h-[100dvh] rounded-none bg-white dark:bg-slate-900 overflow-hidden relative shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] font-sans"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {(() => {
                                const explorerPlan = config?.plans?.find(p => p.id === 'explorer');
                                const globalPlan = config?.plans?.find(p => p.id === 'global');
                                
                                // Default to first global cycle if none selected, or if selected doesn't belong to global
                                let globalCycle = globalPlan?.cycles?.find((c: any) => c.id === selectedCycleId);
                                if (!globalCycle) globalCycle = globalPlan?.cycles?.[0];

                                const planPrice = globalCycle?.price || 0;
                                const regionalInfo = getRegionalPrice(planPrice, globalCycle?.regionalPrices || globalPlan?.regionalPrices);

                                const leftFeatures = [
                                    { title: "Unlimited Practice", sub: "Access unlimited practice questions", icon: FileText, color: "bg-indigo-600", iconColor: "text-white" },
                                    { title: "Mock Simulations", sub: "Full-length mocks with analysis", icon: Target, color: "bg-blue-500", iconColor: "text-white" },
                                    { title: "Detailed Explanations", sub: "Step-by-step solutions", icon: FileText, color: "bg-teal-500", iconColor: "text-white" },
                                    { title: "Premium Learning", sub: "Watch all concept videos", icon: PlaySquare, color: "bg-rose-500", iconColor: "text-white" },
                                    { title: "Advanced Analytics", sub: "Track performance in detail", icon: BarChart2, color: "bg-amber-500", iconColor: "text-white" },
                                    { title: "24/7 Cent-s Slot Tracker", sub: "Never miss a test slot", icon: Zap, color: "bg-purple-500", iconColor: "text-white" },
                                    { title: "Multi-Device", sub: "Learn on any screen", icon: Globe, color: "bg-cyan-500", iconColor: "text-white" },
                                    { title: "Priority Support", sub: "Get faster & dedicated support", icon: MessageSquare, color: "bg-emerald-500", iconColor: "text-white" }
                                ];

                                const isGlobalSelected = selectedPlan === 'global';

                                // Cycle Toggle Options
                                const globalCycles = globalPlan?.cycles || [];

                                return (
                                    <div className="flex flex-col w-full h-full relative">
                                        {/* Fixed Header */}
                                        <div className="h-[72px] shrink-0 border-b border-slate-100 dark:border-slate-800 px-6 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                                            <div className="flex items-center gap-2.5">
                                                <img src="/logo-dark-full.webp" alt="Logo" className="h-5 w-auto hidden dark:block" />
                                                <img src="/logo.webp" alt="Logo" className="h-5 w-auto block dark:hidden" />
                                                <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700" />
                                                <span className="text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase">Upgrade Hub</span>
                                            </div>
                                            <button onClick={closePricingModal} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors">
                                                <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                            </button>
                                        </div>

                                        {/* Main Content (Split) - Scrollable */}
                                        <div className="flex flex-1 p-6 pb-4 overflow-y-auto">
                                            
                                            {/* Left Column */}
                                            <div className="w-[340px] shrink-0 pr-6 flex flex-col border-r border-slate-100 dark:border-slate-800">


                                                <h1 className="text-2xl font-black leading-[1.2] mb-1.5 text-slate-900 dark:text-white tracking-tight mt-1">
                                                    Go Premium,<br/>
                                                    <span className="text-indigo-600 dark:text-indigo-400">Ace Every Exam</span> <Zap className="inline w-4 h-4 text-indigo-600 dark:text-indigo-400 fill-indigo-600 dark:fill-indigo-400 mb-1"/>
                                                </h1>
                                                <p className="text-slate-500 dark:text-slate-400 text-[13px] leading-relaxed mb-3 font-medium pr-2">
                                                    Unlock premium features and take your preparation to the next level.
                                                </p>
                                                {/* Social Proof Strip — Desktop */}
                                                <div className="flex items-center gap-2 mb-4 flex-wrap">
                                                    <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-lg px-2.5 py-1.5">
                                                        <span className="text-[13px]">🔥</span>
                                                        <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300">1,200+ students enrolled</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-lg px-2.5 py-1.5">
                                                        <span className="text-[12px]">⭐</span>
                                                        <span className="text-[11px] font-black text-amber-700 dark:text-amber-300">4.8 / 5 Trustpilot</span>
                                                    </div>
                                                </div>

                                                <div className="flex-1 flex flex-col justify-center gap-3.5">
                                                    {leftFeatures.map((f, i) => (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", f.color)}>
                                                                <f.icon className={cn("w-3.5 h-3.5", f.iconColor)} />
                                                            </div>
                                                            <div className="flex flex-col flex-1">
                                                                <span className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight mb-0.5">{f.title}</span>
                                                                <span className="text-[11px] text-slate-500 dark:text-slate-400">{f.sub}</span>
                                                            </div>
                                                            <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                                                                <Check className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" strokeWidth={3} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Right Column (Cards) */}
                                            <div className="flex-1 flex flex-col pl-6">
                                                
                                                {/* Top Toggle Area for Global Cycles */}
                                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 shrink-0">
                                                    {globalCycles.map((cycle: any) => {
                                                        const isCycleActive = isGlobalSelected && globalCycle?.id === cycle.id;
                                                        // Simplify names like "Monthly" or "Quarterly" from standard cycle names
                                                        let shortName = cycle.name.replace(' Plan', '');
                                                        
                                                        return (
                                                            <button 
                                                                key={cycle.id}
                                                                onClick={() => {
                                                                    setSelectedPlan('global');
                                                                    setSelectedCycleId(cycle.id);
                                                                }}
                                                                className={cn(
                                                                    "flex-1 py-2 px-3 rounded-lg flex flex-col items-center justify-center transition-all", 
                                                                    isCycleActive ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                                                )}
                                                            >
                                                                <span className="font-bold text-[13px]">{shortName}</span>
                                                                {cycle.name.toLowerCase().includes('year') || cycle.name.toLowerCase().includes('annual') ? (
                                                                    <span className="text-[9px] font-bold text-emerald-500 mt-0.5">Best Value</span>
                                                                ) : null}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Cards Area */}
                                                <div className="flex-1 flex gap-4">
                                                    {/* Free Card */}
                                                    <div className={cn("flex-1 rounded-2xl border-[1.5px] p-4 flex flex-col transition-all", 
                                                        !isGlobalSelected ? "border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5 shadow-sm" : "border-slate-100 dark:border-slate-800"
                                                    )}>
                                                        <div className="flex flex-col items-center text-center mb-4 pt-1">
                                                            <div className="w-10 h-10 bg-[#F0EEFF] dark:bg-indigo-500/20 rounded-full flex items-center justify-center mb-3">
                                                                <Gem className="w-5 h-5 text-[#5A32FA] dark:text-indigo-400" />
                                                            </div>
                                                            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-0.5">Explore Plan</h3>
                                                            <div className="text-3xl font-black text-slate-900 dark:text-white mb-0.5">Free</div>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Forever Free</p>
                                                        </div>

                                                        <div className="flex-1 flex flex-col gap-2.5 justify-center px-2">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-3.5 h-3.5 rounded-full bg-[#5A32FA] flex items-center justify-center shrink-0"><Check className="w-2 h-2 text-white" strokeWidth={3}/></div>
                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Limited Daily Practice</span>
                                                            </div>
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-3.5 h-3.5 rounded-full bg-[#5A32FA] flex items-center justify-center shrink-0"><Check className="w-2 h-2 text-white" strokeWidth={3}/></div>
                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">1 Mock Simulation</span>
                                                            </div>
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-3.5 h-3.5 rounded-full bg-[#5A32FA] flex items-center justify-center shrink-0"><Check className="w-2 h-2 text-white" strokeWidth={3}/></div>
                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Multi-Device</span>
                                                            </div>
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0"><X className="w-2 h-2 text-slate-400" strokeWidth={3}/></div>
                                                                <span className="text-[11px] font-medium text-slate-400">Basic Learning Modules</span>
                                                            </div>
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0"><X className="w-2 h-2 text-slate-400" strokeWidth={3}/></div>
                                                                <span className="text-[11px] font-medium text-slate-400">Detailed Explanations</span>
                                                            </div>
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0"><X className="w-2 h-2 text-slate-400" strokeWidth={3}/></div>
                                                                <span className="text-[11px] font-medium text-slate-400">Performance Insights</span>
                                                            </div>
                                                        </div>

                                                        {(() => {
                                                            const isPaidPlan = profile?.selected_plan && profile.selected_plan !== 'explorer';
                                                            const isDisabled = profile?.selected_plan === 'explorer' || isUpdating !== null || isPaidPlan;
                                                            return (
                                                                <button 
                                                                    onClick={() => handlePlanSelect('explorer')}
                                                                    disabled={isDisabled}
                                                                    className={cn("h-10 mt-3 flex items-center justify-center gap-1.5 rounded-lg border-2 border-indigo-200 dark:border-indigo-500/30 text-[#5A32FA] dark:text-indigo-400 font-bold transition-colors text-[12px]", isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-50 dark:hover:bg-indigo-500/10")}
                                                                >
                                                                    {isUpdating === 'explorer' ? <Loader2 className="w-4 h-4 animate-spin" /> : (profile?.selected_plan === 'explorer' ? 'Current Plan' : (isPaidPlan ? 'Downgrade Unavailable' : 'Select Free'))}
                                                                </button>
                                                            )
                                                        })()}
                                                    </div>

                                                    {/* Premium Card */}
                                                    <div className={cn("flex-1 rounded-2xl border-[1.5px] p-4 flex flex-col relative transition-all", 
                                                        isGlobalSelected ? "border-rose-100 dark:border-rose-500/20 bg-white dark:bg-slate-800 shadow-xl" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 opacity-90 scale-[0.98]"
                                                    )}>
                                                        <div className="absolute -top-2.5 right-4 bg-[#F94F3C] text-white text-[9px] font-black px-2 py-0.5 rounded-sm tracking-wider uppercase shadow-md">
                                                            Popular
                                                        </div>

                                                        <div className="flex flex-col items-center text-center mb-3 pt-1">
                                                            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center mb-3">
                                                                <Award className="w-5 h-5 text-[#F59E0B]" />
                                                            </div>
                                                            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-0.5">Global Plan</h3>
                                                            
                                                            <div className="flex items-baseline gap-1 mb-0.5">
                                                                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                                    {config.mode === 'beta' ? 'FREE' : formatPrice(regionalInfo.amount, regionalInfo.currency)}
                                                                </span>
                                                            </div>
                                                            <div className="h-[18px]">
                                                                {config.mode !== 'beta' && regionalInfo.amount > 0 && (
                                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold">
                                                                        <span className="text-emerald-500">Save 60%</span>
                                                                        <span className="text-slate-400 line-through">{formatPrice(regionalInfo.amount * 2.5, regionalInfo.currency)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 flex flex-col gap-2 justify-center pl-1">
                                                            {(globalPlan?.features?.length > 0 ? globalPlan.features : [
                                                                "Everything in Explore Plan",
                                                                "Unlimited Practice",
                                                                "All Learning Modules",
                                                                "Mock Simulations",
                                                                "Detailed Explanations",
                                                                "Advanced Analytics",
                                                                "24/7 cent-s slot tracker",
                                                                "Multi-Device",
                                                                "Priority Support"
                                                            ]).map((text: string, i: number) => (
                                                                <div key={i} className="flex items-center gap-2.5">
                                                                    <div className="w-[14px] h-[14px] rounded-full bg-[#5A32FA] flex items-center justify-center shrink-0">
                                                                        <Check className="w-2 h-2 text-white" strokeWidth={3}/>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{text}</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <button 
                                                            onClick={() => {
                                                                if (config.mode === 'live' && planPrice > 0) {
                                                                    closePricingModal();
                                                                    openCheckout();
                                                                } else {
                                                                    handlePlanSelect('global');
                                                                }
                                                            }}
                                                            disabled={profile?.selected_plan === 'global' || isUpdating !== null}
                                                            className="h-10 mt-3 rounded-lg bg-gradient-to-r from-[#5A32FA] to-[#F94F3C] hover:opacity-90 text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 text-[12px]"
                                                        >
                                                            {isUpdating !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : (profile?.selected_plan === 'global' ? 'Current Plan' : 'Upgrade Now')}
                                                            {profile?.selected_plan !== 'global' && isUpdating === null && <ArrowRight className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>

                                        {/* Bottom Footer Trust Badges */}
                                        <div className="h-[55px] bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 px-6 flex items-center justify-between shrink-0">
                                            <div className="flex gap-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                                        <Shield className="w-3 h-3 text-[#5A32FA] dark:text-indigo-400" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-slate-900 dark:text-white leading-tight">Secure Payment</span>
                                                        <span className="text-[8px] text-slate-500 dark:text-slate-400">100% safe & encrypted</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                                        <Zap className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-slate-900 dark:text-white leading-tight">Instant Access</span>
                                                        <span className="text-[8px] text-slate-500 dark:text-slate-400">Get started immediately</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                        <Disc className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-slate-900 dark:text-white leading-tight">Cancel Anytime</span>
                                                        <span className="text-[8px] text-slate-500 dark:text-slate-400">No questions asked</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 ml-2 pl-5 border-l border-slate-200 dark:border-slate-700/50">
                                                    <a href="https://italostudy.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</a>
                                                    <a href="https://italostudy.com/terms" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Terms</a>
                                                    <a href="https://italostudy.com/refund" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Refunds</a>
                                                </div>
                                            </div>
                                            
                                            {/* Payment Methods */}
                                            <div className="flex gap-2 items-center flex-wrap justify-end max-w-[280px] opacity-80 mix-blend-multiply dark:mix-blend-normal">
                                                <img src="/payments/visa.webp" alt="Visa" className="h-3 w-auto object-contain dark:invert dark:opacity-80" />
                                                <img src="/payments/mastercard.webp" alt="Mastercard" className="h-3 w-auto object-contain" />
                                                <img src="/payments/amex.webp" alt="Amex" className="h-3 w-auto object-contain" />
                                                <img src="/payments/upi.webp" alt="UPI" className="h-3.5 w-auto object-contain dark:invert dark:opacity-80" />
                                                <img src="/payments/paypal.webp" alt="PayPal" className="h-3 w-auto object-contain" />
                                                <img src="/payments/applepay.webp" alt="Apple Pay" className="h-3 w-auto object-contain dark:invert dark:opacity-80" />
                                                <img src="/payments/googlepay.webp" alt="Google Pay" className="h-3 w-auto object-contain dark:invert dark:opacity-80" />
                                                <img src="/payments/cashapp.webp" alt="Cash App" className="h-3 w-auto object-contain" />
                                                <img src="/payments/ideal.webp" alt="iDEAL" className="h-3 w-auto object-contain" />
                                                <img src="/payments/pix.webp" alt="Pix" className="h-3 w-auto object-contain" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
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
