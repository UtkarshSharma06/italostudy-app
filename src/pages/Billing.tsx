import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    CreditCard,
    ChevronRight,
    Mail,
    Lock,
    Smartphone,
    Calendar,
    ArrowLeft,
    Zap,
    History,
    ExternalLink,
    AlertCircle,
    BadgeCheck,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { usePricing } from '@/context/PricingContext';
import { generateInvoice } from '@/utils/invoiceGenerator';
import { Download } from 'lucide-react';

export default function Billing() {
    const { user, profile } = useAuth() as any;
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const { config, isLoading: isConfigLoading, openPricingModal } = usePricing();
    const [isLoading, setIsLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);

    // Fetch Real Billing History from Database
    useEffect(() => {
        const fetchTransactions = async () => {
            if (!user) return;

            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'completed')
                    .gt('amount', 0)
                    .in('plan_id', ['global', 'elite', 'pro', 'explorer'])
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (error) throw error;
                setTransactions(data || []);
            } catch (err) {
                console.error('Failed to fetch transactions:', err);
                setTransactions([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactions();
    }, [user]);

    const handleCancelSubscription = async () => {
        if (!confirm("Are you sure you want to cancel your subscription? You will lose access at the end of your current billing cycle.")) {
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('cancel-subscription');
            if (error) throw error;
            if (data.error) throw new Error(data.error);

            toast.success(data.message || 'Subscription successfully cancelled.');
            
            // Reload to grab fresh profile auth data
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (err: any) {
            console.error("Cancel err:", err);
            toast.error(err.message || 'Failed to cancel subscription.');
        } finally {
            setIsLoading(false);
        }
    };

    const getPlanName = (tier: string) => {
        const tiers: Record<string, string> = {
            'explorer': 'Explorer Plan',
            'pro': 'Exam Prep Plan',
            'elite': 'Global Admission Plan',
            'global': 'Global Plan'
        };
        return tiers[tier] || 'Onboarding Plan';
    };

    return (
        <Layout isLoading={!profile || isLoading}>
            <div className="min-h-[calc(100vh-72px)] bg-white dark:bg-[#020617]">
                <div className="max-w-4xl mx-auto px-6 py-12">

                    {/* Breadcrumbs / Back */}
                    <button
                        onClick={() => navigate('/settings')}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-8 group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-widest">Back to Settings</span>
                    </button>

                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase mb-12">Account Billing</h1>

                    <div className="space-y-0 divide-y divide-slate-100 dark:divide-white/5 border-t border-slate-100 dark:border-white/5">

                        {/* Membership & Billing Section */}
                        <div className="grid md:grid-cols-3 gap-8 py-8">
                            <div>
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Membership & Billing</h2>
                            </div>
                            <div className="md:col-span-2 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="font-bold text-slate-900 dark:text-white">{user?.email}</p>
                                        <p className="text-xs text-slate-400 font-medium">Password: ••••••••••••</p>
                                        <p className="text-xs text-slate-400 font-medium">Phone: Not linked</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <button
                                            onClick={() => navigate('/settings', { state: { section: 'security' } })}
                                            className="text-xs font-bold text-blue-600 hover:underline block w-full text-right"
                                        >
                                            Change password
                                        </button>
                                    </div>
                                </div>


                            </div>
                        </div>

                        {/* Plan Details Section */}
                        <div className="grid md:grid-cols-3 gap-8 py-8">
                            <div>
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Plan Details</h2>
                            </div>
                            <div className="md:col-span-2 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                            {getPlanName(profile?.selected_plan)}
                                        </p>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            {config?.mode === 'beta' ? 'Beta Access: Full Feature Protocol' : 'Standard Learning Access'}
                                        </div>
                                        {profile?.selected_plan === 'explorer' ? (
                                            <div className="mt-1 text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                                                Next Billing: FREE PLAN (Lifetime)
                                            </div>
                                        ) : profile?.subscription_expiry_date && (
                                            <div className="mt-1 text-[9px] font-black uppercase tracking-widest leading-none">
                                                <span className="text-indigo-600">Access until: {new Date(profile.subscription_expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        )}

                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={openPricingModal}
                                        className="text-xs font-bold text-blue-600 hover:underline"
                                    >
                                        Change Plan
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Billing History Section */}
                        <div className="grid md:grid-cols-3 gap-8 py-8">
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4 text-slate-400" />
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Billing History</h2>
                            </div>
                            <div className="md:col-span-2 space-y-4">
                                <div className="bg-slate-50 dark:bg-white/5 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-white/10">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-white/5">
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {isLoading ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center">
                                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                                                    </td>
                                                </tr>
                                            ) : transactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center">
                                                        <p className="text-xs text-slate-400 font-medium">No transactions yet</p>
                                                    </td>
                                                </tr>
                                            ) : transactions.map((txn) => (
                                                <tr key={txn.id} className="hover:bg-white dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white">
                                                        {new Date(txn.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                                                        {txn.plan_id?.toUpperCase()} PLAN - {txn.payment_method?.toUpperCase()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {txn.status === 'completed' ? (
                                                            <button
                                                                onClick={() => generateInvoice(txn, profile)}
                                                                className="flex items-center gap-2 text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest group"
                                                            >
                                                                <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                                                                <span>Download</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-50">Locked</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-black text-right">
                                                        {txn.amount === 0 ? (
                                                            <span className="text-emerald-600">FREE</span>
                                                        ) : (
                                                            <span className="text-slate-900 dark:text-white">
                                                                {formatPrice(txn.amount, txn.currency)}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex items-center gap-2 px-6">
                                    <AlertCircle size={14} className="text-slate-300" />
                                    <p className="text-[10px] text-slate-300 font-medium italic">
                                        {config?.mode === 'beta'
                                            ? 'Payments are handled under secure Beta Authorization Protocol.'
                                            : 'Transactions are processed through encrypted, industry-standard secure nodes.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Support Section */}
                    <div className="mt-12 pt-12 border-t border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-3">
                            <BadgeCheck className="w-8 h-8 text-[#00a884]" />
                            <div>
                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Secure Billing Node</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Verified Protocol</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600">Privacy Policy</Button>
                            <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600">Terms of Use</Button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
