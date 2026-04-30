import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Zap, X } from "lucide-react";
import { usePricing } from "@/context/PricingContext";

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    feature?: string;
}

export function UpgradeModal({
    isOpen,
    onClose,
    title = "Premium Access Required",
    description = "You've reached the limit for your current plan. Upgrade to continue your preparation without boundaries.",
    feature
}: UpgradeModalProps) {
    const { openPricingModal } = usePricing();

    const handleUpgrade = () => {
        onClose();
        openPricingModal();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[420px] max-h-[85vh] overflow-y-auto p-0 border-none bg-white dark:bg-slate-950 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl z-[200]">
                <div className="relative">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 z-20 p-2 bg-black/20 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    {/* Visual Header */}
                    <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 sm:p-10 text-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20"
                            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                        <div className="relative z-10">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl border border-white/20">
                                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase leading-none mb-2">Membership Upgrade</h2>
                            <p className="text-indigo-100 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Italostudy Premium Experience</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 sm:p-10">
                        <DialogHeader className="mb-6 text-center sm:text-left">
                            <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 dark:text-slate-400 font-bold text-[12px] sm:text-sm leading-relaxed pt-2">
                                {description}
                            </DialogDescription>

                            {feature && (
                                <div className="mt-4 inline-flex items-center justify-center px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-full border border-indigo-100 dark:border-indigo-500/20">
                                    <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest text-center">
                                        🔒 {feature}
                                    </span>
                                </div>
                            )}
                        </DialogHeader>

                        <div className="space-y-3 sm:space-y-4 mb-8">
                            {[
                                "Unlimited practice questions",
                                "Deep Logic explanations",
                                "Official full-length simulations",
                                "Priority university support"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                                    <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                                        <Check className="w-3 h-3" strokeWidth={4} />
                                    </div>
                                    <span className="text-[12px] sm:text-xs font-bold">{item}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={handleUpgrade}
                                className="w-full h-14 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all group"
                            >
                                <Zap className="w-4 h-4 mr-2 fill-current group-hover:scale-110 transition-transform" />
                                Upgrade My Plan
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="w-full h-12 text-slate-400 hover:text-slate-600 dark:hover:text-white font-black text-[9px] uppercase tracking-widest"
                            >
                                Maybe Later
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
