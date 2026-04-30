import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, Zap, Sparkles, Brain, ChevronRight, Loader2, X, ShieldCheck, Minus, Plus, Layers, Layout, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency, SUPPORTED_CURRENCIES } from '@/hooks/useCurrency';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePricing, Plan, Feature } from '@/context/PricingContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import CheckoutModal from '@/components/CheckoutModal';
import { Globe } from 'lucide-react';
import MobileLayout from '../components/MobileLayout';



const MobileFAQItem = ({ question, answer }: { question: string; answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-100 py-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full text-left"
            >
                <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{question}</span>
                {isOpen ? <Minus className="w-4 h-4 text-slate-400" /> : <Plus className="w-4 h-4 text-slate-400" />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <p className="pt-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">{answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const IconMap: any = {
    Brain: Brain,
    Zap: Zap,
    Sparkles: Sparkles,
    Layers: Layers,
    Layout: Layout
};

export default function MobilePricing() {
    const { config, couponMessage, isLoading: isConfigLoading } = usePricing();
    const { user, profile, refreshProfile } = useAuth() as any;
    const { expiryDate, isExplorer } = usePlanAccess();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { formatPrice, getRegionalPrice } = useCurrency();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly'>('monthly');
    const [showCheckout, setShowCheckout] = useState(false);
    const [checkoutPlan, setCheckoutPlan] = useState<any>(null);

    const handleLiveCheckout = (planId: string) => {
        if (!config) return;
        const plan = config.plans.find(p => p.id === planId);
        if (plan) {
            setCheckoutPlan(plan);
            setShowCheckout(true);
        }
    };

    const handlePlanSelect = async (planId: string) => {
        if (!user) {
            navigate('/auth');
            return;
        }

        if (!profile?.selected_exam) {
            navigate('/onboarding');
            return;
        }

        setIsUpdating(planId);
        try {
            const tierMap: any = { 'explorer': 'initiate', 'pro': 'elite', 'elite': 'global' };
            const { error } = await supabase
                .from('profiles')
                .update({
                    selected_plan: planId,
                    subscription_tier: tierMap[planId] || 'initiate',
                    subscription_expiry_date: null
                })
                .eq('id', user.id);

            if (error) throw error;

            await refreshProfile();
            toast({
                title: "Plan Updated",
                description: `Success! Your access level has been updated to ${planId.toUpperCase()}.`,
            });
            navigate('/mobile/dashboard');
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

    const getPlanCycle = (plan: any) => {
        if (plan.cycles && plan.cycles.length > 0) {
            const index = billingCycle === 'monthly' ? 0 : 1;
            return plan.cycles[Math.min(index, plan.cycles.length - 1)];
        }
        return null;
    };

    const plans = config?.plans.filter(p => p.isVisible !== false) || [];
    const comparison = config?.comparison || [];

    const faqs = [
        {
            question: "Is ItaloStudy free during Beta?",
            answer: "Yes! Every single premium feature is completely free while we are in our beta testing phase."
        },
        {
            question: "How do I upgrade later?",
            answer: "You can change your plan at any time from your settings panel. During Beta, upgrades are instant."
        },
        {
            question: "What exams are supported?",
            answer: "We support IMAT, SAT, CEnT-S, and IELTS preparation globally."
        }
    ];

    return (
        <MobileLayout isLoading={isConfigLoading}>
            <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
            {/* Native-Feel Header */}
            <div className="bg-[#030014] px-6 pt-16 pb-12 border-b border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-600/10 blur-[60px] rounded-full" />

                <div className="flex items-center justify-between relative z-10 mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 -ml-2 text-white/50 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <Link to="/" className="flex items-center gap-2 group">
                        <img
                            src="/logo.webp"
                            alt="Italostudy Logo"
                            className="h-8 w-auto object-contain brightness-0 invert"
                            width="140"
                            height="32"
                            loading="eager"
                        />
                    </Link>
                </div>

                <div className="relative z-10 text-center">
                    {expiryDate && !isExplorer && (
                        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                            <Clock size={12} className="text-indigo-400" />
                            <span className="text-[8px] font-black text-white/80 uppercase tracking-widest leading-none">
                                renews: {new Date(expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                    )}
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">Upgrade Plan</h1>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mt-3 leading-none">Choose your path to success</p>

                    {typeof couponMessage === 'string' && couponMessage.trim() !== '' && (
                        <div className="mt-6 flex justify-center w-full px-4">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full relative group"
                            >
                                <div className="relative py-3 px-5 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full shadow-lg overflow-hidden">
                                    {/* Subtle Shimmer */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_4s_infinite] pointer-events-none"></div>

                                    <div className="relative flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
                                            <Zap size={14} className="text-white fill-white animate-pulse" />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-0.5">Special Promo</span>
                                            <div className="flex flex-wrap gap-1.5 items-center leading-tight">
                                                {couponMessage.split(' ').map((word, i) => (
                                                    <span 
                                                        key={i} 
                                                        className={/^[A-Z0-9]{4,}$/.test(word.replace(/[^A-Z0-9]/g, '')) 
                                                            ? "px-1.5 py-0.5 bg-white text-indigo-600 rounded-md font-black text-[9px] shadow-sm" 
                                                            : "text-[9px] font-bold text-white/80 uppercase tracking-tight"
                                                        }
                                                    >
                                                        {word}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>

            <main className="px-6 -mt-10 space-y-6 relative z-10">
                {/* Tier Cards (Mobile) */}
                <div className="space-y-4">
                    {plans.map((t) => (
                        <div
                            key={t.id}
                            className="h-full flex flex-col"
                        >
                            <Card className={cn(
                                "rounded-[2.5rem] border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all flex-1 flex flex-col",
                                t.isPopular && "border-2 border-indigo-600 shadow-indigo-500/5"
                            )}>
                                {t.isPopular && (
                                    <div className="bg-indigo-600 py-2 text-center shrink-0">
                                        <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center justify-center gap-2">
                                            Most popular <Zap className="w-2.5 h-2.5 fill-white" />
                                        </span>
                                    </div>
                                )}
                                <CardContent className="p-8 flex-1 flex flex-col relative">
                                    {t.badge && (
                                        <div className="absolute top-4 right-8 bg-indigo-600 text-white px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest animate-pulse">
                                            {t.badge}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white", t.color)}>
                                                {(() => {
                                                    const Icon = (IconMap as any)[t.icon] || Brain;
                                                    return <Icon size={24} />;
                                                })()}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-white leading-none">{t.name}</h3>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.description}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-6 ml-[3.75rem]">
                                        <div className="flex items-center gap-2">
                                            {config.mode === 'beta' ? (
                                                <>
                                                    <span className="text-xl font-black text-emerald-500 italic">FREE</span>
                                                    {(() => {
                                                        const cycle = getPlanCycle(t);
                                                        const basePrice = cycle ? cycle.price : (billingCycle === 'monthly' ? t.monthlyPrice : t.quarterlyPrice);
                                                        const regionalPrices = cycle ? cycle.regionalPrices : t.regionalPrices;

                                                        if (basePrice > 0) {
                                                            const info = getRegionalPrice(basePrice, regionalPrices);
                                                            return (
                                                                <span className="text-sm font-bold text-slate-300 line-through tracking-tight">
                                                                    {formatPrice(info.amount, info.currency)}
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </>
                                            ) : (
                                                <span className="text-xl font-black text-slate-900 dark:text-white italic">
                                                    {(() => {
                                                        const cycle = getPlanCycle(t);
                                                        const basePrice = cycle ? cycle.price : (billingCycle === 'monthly' ? t.monthlyPrice : t.quarterlyPrice);
                                                        const regionalPrices = cycle ? cycle.regionalPrices : t.regionalPrices;
                                                        const info = getRegionalPrice(basePrice, regionalPrices);
                                                        return formatPrice(info.amount, info.currency);
                                                    })()}
                                                </span>
                                            )}
                                            <span className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                                                / {getPlanCycle(t)?.name || (billingCycle === 'monthly' ? 'mo' : 'qt')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-8 ml-[3.75rem]">
                                        {comparison.map((feat, idx) => {
                                            const value = (feat as any)[t.id];
                                            if (value === undefined || value === false) return null;
                                            return (
                                                <div key={idx} className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                    <span className="text-[10px] font-black uppercase tracking-tight">
                                                        {typeof value === 'boolean' ? feat.name : `${feat.name}: ${value}`}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <Button
                                        onClick={() => config.mode === 'live' ? handleLiveCheckout(t.id) : handlePlanSelect(t.id)}
                                        disabled={isUpdating !== null || profile?.selected_plan === t.id}
                                        className={cn(
                                            "w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center transition-all active:scale-95",
                                            t.isPopular ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20" : "bg-slate-50 hover:bg-slate-100 text-indigo-600"
                                        )}
                                    >
                                        {isUpdating === t.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : profile?.selected_plan === t.id ? (
                                            "Current"
                                        ) : (
                                            <>
                                                {config.mode === 'live'
                                                    ? (t.monthlyPrice === 0 ? 'Start Free' : 'Subscribe Now')
                                                    : (t.monthlyPrice === 0 ? 'Start Free' : 'Try Beta Free')
                                                }
                                                <ChevronRight className={cn("ml-2 w-4 h-4", t.isPopular ? 'text-white' : 'text-indigo-600')} />
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>

                {/* FAQ Section (Mobile) */}
                <div className="py-12 px-2 bg-white rounded-[2.5rem] mt-8 shadow-inner border border-slate-50">
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-2">Questions?</h2>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Quick answers about our plans.</p>
                    </div>
                    <div className="space-y-1">
                        {faqs.map((faq, idx) => (
                            <MobileFAQItem key={idx} question={faq.question} answer={faq.answer} />
                        ))}
                    </div>
                </div>

                <div className="text-center py-6">
                    <p className="text-[8px] font-black text-slate-200 uppercase tracking-[0.5em] leading-relaxed">
                        Educational support • 2026
                    </p>
                </div>
            </main>

            {checkoutPlan && (
                <CheckoutModal
                    isOpen={showCheckout}
                    onClose={() => setShowCheckout(false)}
                    planId={checkoutPlan.id}
                    planName={checkoutPlan.name}
                    amount={billingCycle === 'monthly' ? checkoutPlan.monthlyPrice : checkoutPlan.quarterlyPrice}
                    currency="EUR"
                    regionalPrices={getPlanCycle(checkoutPlan)?.regionalPrices || checkoutPlan.regionalPrices}
                    billingCycle={billingCycle}
                    durationValue={getPlanCycle(checkoutPlan)?.durationValue}
                    durationUnit={getPlanCycle(checkoutPlan)?.durationUnit}
                />
            )}
        </div>
        </MobileLayout>
    );
}
