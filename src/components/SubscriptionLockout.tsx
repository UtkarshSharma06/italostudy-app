import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, LogOut, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

import { usePlanAccess } from '@/hooks/usePlanAccess';

export const SubscriptionLockout = () => {
    const navigate = useNavigate();
    const { user, refreshProfile, signOut } = useAuth();
    const { isSubscriptionExpired } = usePlanAccess();
    const { toast } = useToast();

    // Block background scroll when lockout is active
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    const handleSwitchToFree = async () => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    selected_plan: 'explorer',
                    subscription_tier: 'free'
                })
                .eq('id', user.id);

            if (error) throw error;

            await refreshProfile();
            toast({
                title: "Plan Updated",
                description: "You've successfully switched to the Explorer plan.",
            });
            navigate('/dashboard');
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-white/40 backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-6">
            {/* Very subtle professional grid pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.99, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-lg bg-white border border-slate-200 rounded-[2rem] p-6 sm:p-10 text-center relative shadow-2xl shadow-slate-200/40 flex flex-col max-h-[95vh] overflow-hidden"
            >
                {/* Scrollable container for the content if it overflows vertically */}
                <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col items-center">
                    {/* Branding Logo */}
                    <div className="mb-6 flex justify-center sticky top-0 bg-white py-2 w-full z-10">
                        <img
                            src="/logo.webp"
                            alt="ItaloStudy"
                            className="h-8 sm:h-10 w-auto object-contain"
                        />
                    </div>

                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-indigo-100/50 shadow-inner shrink-0">
                        <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-4 leading-tight shrink-0">
                        Ready to continue <br /> your journey?
                    </h1>

                    <p className="text-slate-500 font-bold mb-8 leading-relaxed px-2 sm:px-4 text-sm shrink-0">
                        {isSubscriptionExpired
                            ? "Your current plan has expired. Renew your premium access to keep your progress and unlimited primary features, or continue with our free version."
                            : "Upgrade to premium to unlock unlimited features, mock exams, and AI-powered learning tools."}
                    </p>

                    <div className="space-y-3 sm:space-y-4 w-full max-w-sm mx-auto mb-8 shrink-0">
                        <Button
                            onClick={() => navigate('/pricing')}
                            className="w-full h-12 sm:h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98]"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {isSubscriptionExpired ? 'Renew Premium Access' : 'Buy Premium Access'}
                        </Button>

                        <Button
                            variant="ghost"
                            onClick={handleSwitchToFree}
                            className="w-full h-12 sm:h-14 rounded-2xl bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 font-black uppercase text-[10px] tracking-widest transition-all"
                        >
                            Continue with Free Plan
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>

                    <div className="mt-auto w-full pt-6 border-t border-slate-100 shrink-0">
                        <button
                            onClick={() => signOut()}
                            className="flex items-center gap-2 mx-auto text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out of account
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
