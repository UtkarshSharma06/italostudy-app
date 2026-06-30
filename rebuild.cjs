const fs = require('fs');

const desktopUI = `                        {/* 
                          ----------------------------------------------------------------------
                          DESKTOP UI (COMPACT EXACT LAYOUT)
                          ----------------------------------------------------------------------
                        */}
                        <motion.div
                            key="pricing-modal-desktop"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="hidden md:flex flex-col w-[1050px] max-w-[95vw] h-[800px] max-h-[90vh] rounded-[2rem] bg-[#15151E] overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.4)] border border-white/5 font-sans"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button onClick={closePricingModal} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full z-50 transition-colors">
                                <X className="w-4 h-4 text-slate-400" />
                            </button>

                            <div className="flex flex-1 gap-6 min-h-0 p-6">
                                {/* Left Column */}
                                <div className="w-[340px] flex flex-col gap-6 h-full">
                                    <div className="flex flex-col pt-2 pl-2">
                                        <div className="flex items-center gap-3 mb-6">
                                            <img src="/logo-dark-full.webp" alt="Logo" className="h-5 w-auto" />
                                            <div className="h-4 w-[1px] bg-slate-700" />
                                            <span className="text-[9px] font-bold text-slate-400 tracking-[0.2em] uppercase">Upgrade Hub</span>
                                        </div>
                                        
                                        <h1 className="text-[32px] font-black leading-[1.15] mb-3 text-white tracking-tight">
                                            Unlock your<br/>
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">full potential</span> <Zap className="inline w-5 h-5 text-fuchsia-400 fill-fuchsia-400 mb-1"/>
                                        </h1>
                                        
                                        <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                                            Go premium and access everything you need to ace every exam.
                                        </p>

                                        <div className="bg-[#1C1C28] border border-white/5 rounded-[1.25rem] p-4 flex items-center justify-between shadow-lg">
                                            <div className="flex -space-x-2">
                                                <img src="https://i.pravatar.cc/100?img=1" className="w-7 h-7 rounded-full border-2 border-[#1C1C28]" />
                                                <img src="https://i.pravatar.cc/100?img=2" className="w-7 h-7 rounded-full border-2 border-[#1C1C28]" />
                                                <img src="https://i.pravatar.cc/100?img=3" className="w-7 h-7 rounded-full border-2 border-[#1C1C28]" />
                                                <img src="https://i.pravatar.cc/100?img=4" className="w-7 h-7 rounded-full border-2 border-[#1C1C28]" />
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-[13px] font-bold text-white">50,000+ students</span>
                                                <span className="text-[#888899] text-[9px] font-medium">are already learning better</span>
                                            </div>
                                            <TrendingUp className="w-4 h-4 text-fuchsia-400 shrink-0 ml-2" />
                                        </div>
                                    </div>

                                    <div className="bg-[#1C1C28] border border-white/5 rounded-[1.5rem] p-6 flex-1 flex flex-col min-h-0 shadow-lg">
                                        <h3 className="text-sm font-bold text-indigo-400 mb-6">What you'll get</h3>
                                        <div className="flex-1 overflow-y-auto space-y-5 custom-scrollbar pr-2">
                                            {[
                                                { title: "Daily Practice", sub: "Unlimited practice questions", icon: FileText, textClass: "text-amber-400", bgClass: "bg-amber-400/10" },
                                                { title: "Learning Modules", sub: "Structured video lessons", icon: PlaySquare, textClass: "text-rose-400", bgClass: "bg-rose-400/10" },
                                                { title: "Exam Analytics", sub: "Advanced performance insights", icon: BarChart2, textClass: "text-fuchsia-400", bgClass: "bg-fuchsia-400/10" },
                                                { title: "Mock Simulations", sub: "Full-length test experience", icon: Target, textClass: "text-blue-400", bgClass: "bg-blue-400/10" },
                                                { title: "Smart Analytics", sub: "AI-powered progress tracker", icon: TrendingUp, textClass: "text-emerald-400", bgClass: "bg-emerald-400/10" },
                                                { title: "Priority Support", sub: "Faster response & dedicated help", icon: MessageSquare, textClass: "text-indigo-400", bgClass: "bg-indigo-400/10" }
                                            ].map((f, i) => (
                                                <div key={i} className="flex gap-4 items-center">
                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner", f.bgClass, f.textClass)}>
                                                        <f.icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <span className="text-[13px] font-bold text-white leading-tight">{f.title}</span>
                                                        <span className="text-[#888899] text-[11px] truncate mt-0.5">{f.sub}</span>
                                                    </div>
                                                    <div className="w-5 h-5 rounded-full border border-indigo-500/30 flex items-center justify-center shrink-0 ml-1">
                                                        <Check className="w-3 h-3 text-indigo-400" strokeWidth={3} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="flex-1 flex flex-col gap-6 min-w-0 h-full">
                                    
                                    {/* Tabs */}
                                    <div className="flex gap-4 justify-center pr-8 mt-2">
                                        {plans.map(p => (
                                            <button 
                                                key={p.id}
                                                onClick={() => { setSelectedPlan(p.id); if (p.cycles && p.cycles.length > 0) setSelectedCycleId(p.cycles[0].id); }}
                                                className={cn(
                                                    "flex flex-col items-center justify-center py-3 w-[220px] rounded-2xl border transition-all relative overflow-hidden",
                                                    selectedPlan === p.id 
                                                        ? "bg-[#1C1C28]/80 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]" 
                                                        : "bg-[#1C1C28] border-white/5 hover:border-white/10"
                                                )}
                                            >
                                                {selectedPlan === p.id && <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />}
                                                <div className="flex items-center gap-2 mb-1">
                                                    {p.id === 'global' ? <Globe className="w-[18px] h-[18px] text-slate-300" /> : <Gem className="w-[18px] h-[18px] text-fuchsia-400 fill-fuchsia-400/20" />}
                                                    <span className="text-white font-bold text-[13px] tracking-wide capitalize">{p.name}</span>
                                                </div>
                                                <span className="text-[#888899] text-[10px] font-medium tracking-wide">{p.badge || (p.id==='explorer'?'Most Popular':'All Access')}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Pricing Table */}
                                    <div className="bg-[#1C1C28] border border-white/5 rounded-[1.5rem] p-6 flex-1 flex min-h-0 shadow-lg">
                                        {/* Left Row Headers */}
                                        <div className="w-[180px] shrink-0 pt-6 pr-4 flex flex-col">
                                            <h4 className="text-[13px] font-bold text-fuchsia-400 mb-2">Choose your plan</h4>
                                            <p className="text-[11px] text-[#888899] leading-relaxed mb-6">All plans include<br/>7-day money-back guarantee.</p>

                                            <div className="space-y-5 flex-1 pr-2">
                                                {[
                                                    { title: "Daily Questions", sub: "Practice unlimited", icon: FileText, textClass: "text-amber-400", bgClass: "bg-amber-400/10" },
                                                    { title: "Learning Modules", sub: "Structured video lessons", icon: PlaySquare, textClass: "text-rose-400", bgClass: "bg-rose-400/10" },
                                                    { title: "Exam Analytics", sub: "Advanced insights", icon: BarChart2, textClass: "text-fuchsia-400", bgClass: "bg-fuchsia-400/10" },
                                                    { title: "Mock Simulations", sub: "Full-length mock tests", icon: Target, textClass: "text-blue-400", bgClass: "bg-blue-400/10" },
                                                    { title: "Smart Analytics", sub: "AI-powered tracker", icon: TrendingUp, textClass: "text-emerald-400", bgClass: "bg-emerald-400/10" },
                                                    { title: "Priority Support", sub: "Faster & dedicated", icon: MessageSquare, textClass: "text-indigo-400", bgClass: "bg-indigo-400/10" }
                                                ].map((f, i) => (
                                                    <div key={i} className="flex gap-3 items-center h-10">
                                                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", f.bgClass, f.textClass)}>
                                                            <f.icon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[12px] font-bold text-white">{f.title}</span>
                                                            <span className="text-[10px] text-[#888899]">{f.sub}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Columns */}
                                        <div className="flex-1 flex gap-2 pt-2 pr-2">
                                            {t?.cycles?.map((cycle: any, idx: number) => {
                                                const isSelected = selectedCycleId === cycle.id;
                                                const isPopular = cycle.name.toLowerCase().includes('year') || cycle.name.toLowerCase().includes('12 month');
                                                const planPrice = cycle.price;
                                                const info = getRegionalPrice(planPrice, cycle.regionalPrices || t.regionalPrices);
                                                
                                                return (
                                                    <div 
                                                        key={cycle.id}
                                                        onClick={() => setSelectedCycleId(cycle.id)}
                                                        className={cn(
                                                            "flex-1 min-w-[180px] rounded-2xl border p-5 flex flex-col cursor-pointer transition-all relative group", 
                                                            isSelected 
                                                                ? "border-fuchsia-500 bg-gradient-to-b from-[#1C1C28] to-fuchsia-500/5 shadow-[0_0_30px_rgba(217,70,239,0.1)]" 
                                                                : "border-transparent bg-[#15151E] hover:border-white/10"
                                                        )}
                                                    >
                                                        {isPopular && (
                                                            <div className="absolute -top-3 right-6 bg-[#A7F3D0] text-emerald-950 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                                                                Save 60%
                                                            </div>
                                                        )}
                                                        
                                                        <div className="border-b border-white/5 pb-4 mb-4 flex flex-col h-[100px] justify-center relative">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">{t.name}</span>
                                                            <span className="text-[11px] text-[#888899] mb-2 font-medium">{cycle.name}</span>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-[28px] font-black tracking-tight text-white">
                                                                    {config.mode === 'beta' ? 'FREE' : formatPrice(info.amount, info.currency)}
                                                                </span>
                                                                {config.mode !== 'beta' && (
                                                                    <span className="text-[#888899] font-medium text-[11px]">
                                                                        / {cycle.name.toLowerCase().includes('month') ? 'month' : cycle.name.toLowerCase().includes('year') ? 'year' : 'cycle'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {isPopular && config.mode !== 'beta' && (
                                                                <span className="text-[9px] text-[#888899] absolute bottom-1 left-0 font-medium tracking-wide">
                                                                    <span className="line-through decoration-fuchsia-400/50 mr-1">{formatPrice(info.amount * 2.5, info.currency)}</span> 
                                                                    <span className="text-emerald-400 font-bold">60% OFF</span>
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="space-y-5 flex-1">
                                                            {/* Render checkmarks for the 6 features */}
                                                            {[1,2,3,4,5,6].map((_, i) => (
                                                                <div key={i} className="h-10 flex items-center justify-center">
                                                                    <div className="w-[22px] h-[22px] rounded-full bg-indigo-500/10 flex items-center justify-center">
                                                                        <Check className="w-3.5 h-3.5 text-indigo-400" strokeWidth={3} />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {isSelected && (
                                                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-fuchsia-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-full shadow-lg shadow-fuchsia-500/30 whitespace-nowrap">
                                                                Best Value
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="bg-[#1C1C28] border border-white/5 rounded-[1.5rem] py-4 px-6 flex items-center justify-between shrink-0 shadow-lg">
                                        <div className="flex gap-8 items-center">
                                            <div className="flex gap-3 items-center">
                                                <Shield className="w-9 h-9 text-indigo-400 fill-indigo-400/10 stroke-1" />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-white">Secure Payment</span>
                                                    <span className="text-[10px] text-[#888899]">100% safe & encrypted</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 items-center">
                                                <Disc className="w-9 h-9 text-amber-500 fill-amber-500/10 stroke-1" />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-white">Cancel Anytime</span>
                                                    <span className="text-[10px] text-[#888899]">No questions asked</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 items-center">
                                                <Award className="w-9 h-9 text-rose-400 fill-rose-400/10 stroke-1" />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-white">7-Day Guarantee</span>
                                                    <span className="text-[10px] text-[#888899]">Full refund if not satisfied</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center justify-center">
                                            <button 
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
                                                className="h-12 w-52 rounded-full bg-gradient-to-r from-indigo-500 to-rose-400 hover:from-indigo-400 hover:to-rose-300 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                                            >
                                                {isUpdating === selectedPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                                                 (profile?.selected_plan === selectedPlan ? "Current Plan" : "Upgrade Now")}
                                                {profile?.selected_plan !== selectedPlan && isUpdating !== selectedPlan && <ArrowRight className="w-4 h-4" />}
                                            </button>
                                            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[#888899] font-medium">
                                                <Lock className="w-3 h-3" /> Secure checkout
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>`;

// Fetch mobile code previously extracted
const mobileCode = fs.readFileSync('d:\\\\italostudy\\\\italostudy-app\\\\mobile_temp.txt', 'utf8');

const prefix = `import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Loader2, Info, ChevronRight, Brain, X, Sparkles, Check, Zap, CheckCircle2, Minus, ShieldCheck, RefreshCcw, CircleCheck, ArrowRight, Shield, Disc, Award, Lock, FileText, PlaySquare, BarChart2, Target, TrendingUp, MessageSquare, Gem, Globe } from 'lucide-react';
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
            const timer = setTimeout(() => setIsRendering(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isPricingModalOpen]);

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

            const isFree = planId === 'explorer' || (cycle?.price === 0);
            const newExpiry = isFree ? null : add(new Date(), {
                [durationUnit]: durationValue || 1
            }).toISOString();

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
                        provider_transaction_id: \`BETA_\${Math.random().toString(36).substring(2, 11).toUpperCase()}\`,
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
                description: \`Success! Your access level has been updated to the \${planId.toUpperCase()} tier.\`,
            });
            closePricingModal();

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

    if (!isPricingModalOpen && !isCheckoutOpen) return null;

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
                        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xl p-0 md:p-4"
                        onClick={closePricingModal}
                    >
`;

const suffix = `
                    </motion.div>
                )}
            </AnimatePresence>

            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={closeCheckout}
                planId={selectedPlan}
                cycleId={selectedCycleId}
            />
        </>
    );
}
`;

const finalFile = prefix + mobileCode + desktopUI + suffix;
fs.writeFileSync('d:\\\\italostudy\\\\italostudy-app\\\\src\\\\components\\\\PricingModal.tsx', finalFile, 'utf8');
console.log('Successfully wrote the new exact UI PricingModal');
