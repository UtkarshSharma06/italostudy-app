import { X, Zap, Brain, Target, Sparkles, Trophy, ArrowRight } from 'lucide-react';
import { usePricing } from '@/context/PricingContext';

interface LimitHitModalProps {
    questionsUsed: number;
    dailyLimit: number;
    onClose: () => void;
}

export default function LimitHitModal({ questionsUsed, dailyLimit, onClose }: LimitHitModalProps) {
    const { openPricingModal } = usePricing();
    const handleUpgrade = () => { onClose(); openPricingModal(); };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(10,10,20,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="relative w-full max-w-md bg-white dark:bg-[#0f0f0f] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all z-10">
                    <X className="w-4 h-4" />
                </button>
                <div className="p-7 pt-6">
                    <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
                        <Trophy className="w-3.5 h-3.5" />
                        You used all {dailyLimit} free questions today!
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">
                        Daily limit reached 🔒
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                        Great work solving <strong className="text-slate-700 dark:text-slate-300">{questionsUsed} questions</strong> today.
                        Upgrade to unlock <strong className="text-slate-700 dark:text-slate-300">unlimited practice</strong>, AI explanations, and all mock exams — no daily limits.
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 mb-5 space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Premium unlocks</p>
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-indigo-500"><Zap className="w-3.5 h-3.5" /></div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Unlimited practice questions daily</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-violet-500"><Brain className="w-3.5 h-3.5" /></div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">AI-powered step-by-step explanations</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-emerald-500"><Target className="w-3.5 h-3.5" /></div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Unlimited mock exams and leaderboards</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-amber-500"><Sparkles className="w-3.5 h-3.5" /></div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Full study analytics and progress tracking</span>
                        </div>
                    </div>
                    <p className="text-[11px] text-center text-slate-400 mb-4 font-medium">
                        159 students have already upgraded this month
                    </p>
                    <button
                        onClick={handleUpgrade}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 text-sm uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900 active:scale-[0.98]"
                    >
                        <Zap className="w-4 h-4" />
                        Upgrade to Unlimited
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full text-center text-[10px] text-slate-400 hover:text-slate-500 mt-3 font-medium transition-colors"
                    >
                        Wait until tomorrow (5 free questions)
                    </button>
                </div>
            </div>
        </div>
    );
}
