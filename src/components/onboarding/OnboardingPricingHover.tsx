import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, BadgeCheck, Brain, Zap, Sparkles } from 'lucide-react';
import { usePricing } from '@/context/PricingContext';
import { cn } from '@/lib/utils';

interface OnboardingPricingHoverProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function OnboardingPricingHover({ isOpen, onClose }: OnboardingPricingHoverProps) {
    const { config, isLoading } = usePricing();

    if (!isOpen) return null;

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-white/80 backdrop-blur-md">
                <div className="w-8 h-8 border-4 border-[#E67E22] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const plans = config?.plans?.filter(p => p.isVisible !== false) || [];
    const comparison = config?.comparison || [];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#E67E22]/10 rounded-xl flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-[#E67E22]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Plan Highlights</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Detailed feature comparison</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all shadow-sm"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Comparison Table */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-slate-50/30">
                            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/50">
                                            <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest w-1/3">Features</th>
                                            {plans.map(plan => (
                                                <th key={plan.id} className="py-4 px-6 text-center">
                                                    <span className="text-sm font-black uppercase text-slate-900 tracking-tight">{plan.name}</span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100/50">
                                        {comparison.map((feature, idx) => (
                                            <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <span className="text-[13px] font-bold text-slate-700 tracking-tight">{feature.name}</span>
                                                </td>
                                                {plans.map(plan => {
                                                    const value = (feature as any)[plan.id] ?? false;
                                                    return (
                                                        <td key={plan.id} className="py-4 px-6 text-center">
                                                            {typeof value === 'boolean' ? (
                                                                value ? (
                                                                    <div className="w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                                                                        <Check className="w-3 h-3 text-emerald-600 stroke-[4]" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-5 h-5 bg-slate-50 rounded-full flex items-center justify-center mx-auto opacity-20">
                                                                        <X className="w-3 h-3 text-slate-400 stroke-[3]" />
                                                                    </div>
                                                                )
                                                            ) : (
                                                                <span className="text-xs font-black text-[#E67E22] uppercase tracking-tight">{value}</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Info Banner */}
                            <div className="mt-8 p-6 bg-gradient-to-r from-[#E67E22] to-[#D35400] rounded-3xl text-white shadow-lg shadow-[#E67E22]/20">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                        <BadgeCheck className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black uppercase tracking-tight">Simplified for Onboarding</h4>
                                        <p className="text-sm font-medium text-white/80 mt-1 leading-relaxed">
                                            Choose the plan that fits your study style. You can change your selection at any time after finishing the setup.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer (View-only indicator) */}
                        <div className="px-8 py-6 bg-white border-t border-slate-100 flex items-center justify-center shrink-0">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2">
                                <Brain className="w-3.5 h-3.5" />
                                ItaloStudy Premium Comparison
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
