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
    Loader2,
    Receipt,
    ChevronDown,
    Shield,
    FileText,
    ChevronLeft
} from 'lucide-react';
import { countries } from '@/lib/countries';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { usePricing } from '@/context/PricingContext';
import { generateInvoice } from '@/utils/invoiceGenerator';
import { Download, GraduationCap } from 'lucide-react';

export default function Billing() {
    const { user, profile } = useAuth() as any;
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const { config, isLoading: isConfigLoading, openPricingModal } = usePricing();
    const [isLoading, setIsLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [courseTxns, setCourseTxns] = useState<any[]>([]);
    const [transactionPage, setTransactionPage] = useState(1);
    const [coursePage, setCoursePage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    let parsedPhone = "Not linked";
    let matchedCountry: any = null;
    if (profile?.phone_number) {
        const sortedCountries = [...countries].sort((a, b) => b.dial.length - a.dial.length);
        matchedCountry = sortedCountries.find(c => profile.phone_number.startsWith(c.dial));
        if (matchedCountry) {
            parsedPhone = `+${matchedCountry.dial} ${profile.phone_number.slice(matchedCountry.dial.length).trim()}`;
        } else {
            parsedPhone = profile.phone_number;
        }
    }

    // Fetch Real Billing History from Database
    useEffect(() => {
        const fetchTransactions = async () => {
            if (!user) return;

            setIsLoading(true);
            try {
                // Subscription transactions
                const { data, error } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'completed')
                    .gt('amount', 0)
                    .in('plan_id', ['global', 'elite', 'pro', 'explorer'])
                    .order('created_at', { ascending: false })
                    .limit(100);

                if (error) throw error;
                setTransactions(data || []);

                // Course transactions
                const { data: courseData } = await (supabase as any)
                    .from('course_transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'completed')
                    .order('created_at', { ascending: false })
                    .limit(100);
                setCourseTxns(courseData || []);
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
            <div className="min-h-[calc(100vh-72px)] bg-slate-50/30 dark:bg-[#020617]">
                <div className="max-w-[1000px] mx-auto px-6 py-12">

                    {/* Breadcrumbs / Back */}
                    <button
                        onClick={() => navigate('/settings')}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors mb-8 group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} />
                        <span className="text-sm font-bold tracking-tight">Back to Settings</span>
                    </button>

                    <div className="mb-10">
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Account Billing</h1>
                        <p className="text-[15px] font-medium text-slate-500">Manage your membership, payments and billing history</p>
                    </div>

                    <div className="space-y-6">
                        {/* 1. Membership & Billing / Your Plan Card */}
                        <Card className="rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-[0_2px_20px_rgb(0,0,0,0.02)] bg-white dark:bg-slate-950 p-8">
                            <div className="grid md:grid-cols-2 gap-12">
                                {/* Left Side */}
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight">Membership & Billing</h3>
                                        <p className="text-[13px] font-medium text-slate-500 mt-1">{user?.email}</p>
                                    </div>
                                    <div className="rounded-[1.5rem] border border-slate-100 dark:border-white/5 overflow-hidden">
                                        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 dark:bg-white/5">
                                                    <Lock className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Password</p>
                                                    <p className="text-[13px] font-black text-slate-900 dark:text-white tracking-widest mt-0.5">••••••••••••</p>
                                                </div>
                                            </div>
                                            <button onClick={() => navigate('/settings', { state: { section: 'security' } })} className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700">Change password</button>
                                        </div>
                                        <div className="flex items-center justify-between p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 dark:bg-white/5">
                                                    <Smartphone className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                                                    {matchedCountry ? (
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <img 
                                                                src={`https://flagcdn.com/w40/${matchedCountry.code.toLowerCase()}.png`} 
                                                                alt={matchedCountry.name} 
                                                                className="w-4 h-auto rounded-[2px]" 
                                                            />
                                                            <p className="text-[13px] font-medium text-slate-500">{parsedPhone}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[13px] font-medium text-slate-500 mt-0.5">{parsedPhone}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <button onClick={() => navigate('/settings', { state: { section: 'profile' } })} className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700">Link phone</button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side */}
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center h-[44px]">
                                        <h3 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight">Your Plan</h3>
                                        <Button 
                                            onClick={openPricingModal}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm px-6 h-10 font-bold"
                                        >
                                            Change Plan
                                        </Button>
                                    </div>
                                    <div className="rounded-[1.5rem] bg-gradient-to-br from-[#f8f9fc] to-[#f5f3ff] dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-50/50 dark:border-indigo-500/20 p-6 flex items-center gap-6 relative overflow-hidden">
                                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
                                        <div className="w-16 h-16 rounded-[1.25rem] bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                                            <Zap className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="currentColor" strokeWidth={1} />
                                        </div>
                                        <div className="relative z-10">
                                            <h4 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight uppercase">
                                                {getPlanName(profile?.selected_plan)}
                                            </h4>
                                            <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                                                {config?.mode === 'beta' ? 'Free access • Full feature protocol' : 'Standard Learning Access'}
                                            </p>
                                            <div className="mt-3">
                                                <span className="inline-block px-3 py-1.5 rounded-full bg-indigo-100/50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-black uppercase tracking-widest">
                                                    {profile?.selected_plan === 'explorer' ? 'FREE PLAN (Lifetime)' : profile?.subscription_expiry_date ? `Access until ${new Date(profile.subscription_expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ')}` : 'LIFETIME ACCESS'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* 2. Billing History */}
                        <Card className="rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-[0_2px_20px_rgb(0,0,0,0.02)] bg-white dark:bg-slate-950 p-8">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex gap-4 items-center">
                                    <div className="w-12 h-12 rounded-[1rem] bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                                        <Receipt className="w-5 h-5" strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight">Billing History</h3>
                                        <p className="text-[13px] font-medium text-slate-500 mt-0.5">View and download all your invoices and payment receipts.</p>
                                    </div>
                                </div>

                            </div>

                            <div className="overflow-x-auto rounded-[1rem] border border-slate-100 dark:border-white/5">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center">
                                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                                                </td>
                                            </tr>
                                        ) : transactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center">
                                                    <p className="text-[13px] text-slate-500 font-medium">No transactions found</p>
                                                </td>
                                            </tr>
                                        ) : transactions.slice((transactionPage - 1) * ITEMS_PER_PAGE, transactionPage * ITEMS_PER_PAGE).map((txn) => (
                                            <tr key={txn.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 text-[13px] font-bold text-slate-900 dark:text-white">
                                                    {new Date(txn.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4 text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                                                    {txn.plan_id?.toUpperCase()} PLAN - {txn.payment_method?.charAt(0).toUpperCase() + txn.payment_method?.slice(1)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {txn.status === 'completed' ? (
                                                        <button
                                                            onClick={() => generateInvoice(txn, profile)}
                                                            className="flex items-center gap-2 text-[12px] font-bold text-indigo-600 hover:text-indigo-700 group"
                                                        >
                                                            <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                                                            <span>Download</span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-[12px] text-slate-400 font-medium opacity-50">Locked</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-[13px] font-black text-slate-900 dark:text-white text-right">
                                                    {txn.amount === 0 ? (
                                                        <span className="text-slate-400">FREE</span>
                                                    ) : (
                                                        formatPrice(txn.amount, txn.currency)
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-[11px] font-black uppercase tracking-widest">
                                                        {txn.status === 'completed' ? 'Paid' : txn.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {transactions.length > ITEMS_PER_PAGE && (
                                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                            Showing {(transactionPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(transactionPage * ITEMS_PER_PAGE, transactions.length)} of {transactions.length}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 px-2"
                                                disabled={transactionPage === 1}
                                                onClick={() => setTransactionPage(p => p - 1)}
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 px-2 text-[10px] font-black uppercase tracking-widest"
                                                disabled={transactionPage * ITEMS_PER_PAGE >= transactions.length}
                                                onClick={() => setTransactionPage(p => p + 1)}
                                            >
                                                Next
                                                <ChevronRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-5 flex items-center gap-2 text-indigo-600/70">
                                <Shield className="w-3.5 h-3.5" />
                                <p className="text-[11px] font-medium text-slate-500">Payments are handled under secure authorization protocol.</p>
                            </div>
                        </Card>

                        {/* 3. Course Purchases */}
                        {courseTxns.length > 0 && (
                            <Card className="rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-[0_2px_20px_rgb(0,0,0,0.02)] bg-white dark:bg-slate-950 p-8">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-12 h-12 rounded-[1rem] bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                                            <GraduationCap className="w-5 h-5" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight">Course Purchases</h3>
                                            <p className="text-[13px] font-medium text-slate-500 mt-0.5">Receipts for your purchased courses and study materials.</p>
                                        </div>
                                    </div>

                                </div>

                                <div className="overflow-x-auto rounded-[1rem] border border-slate-100 dark:border-white/5">
                                    <table className="w-full text-left whitespace-nowrap">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Course</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {courseTxns.slice((coursePage - 1) * ITEMS_PER_PAGE, coursePage * ITEMS_PER_PAGE).map((txn) => (
                                                <tr key={txn.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-6 py-4 text-[13px] font-bold text-slate-900 dark:text-white">
                                                        {new Date(txn.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                                                        {txn.metadata?.course_title || 'Course'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => generateInvoice(null, profile, 'course', txn)}
                                                            className="flex items-center gap-2 text-[12px] font-bold text-violet-600 hover:text-violet-700 group"
                                                        >
                                                            <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                                                            <span>Download</span>
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 text-[13px] font-black text-slate-900 dark:text-white text-right">
                                                        €{Number(txn.amount_eur).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-[11px] font-black uppercase tracking-widest">
                                                            Paid
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {courseTxns.length > ITEMS_PER_PAGE && (
                                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                                Showing {(coursePage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(coursePage * ITEMS_PER_PAGE, courseTxns.length)} of {courseTxns.length}
                                            </p>
                                            <div className="flex gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-8 px-2"
                                                    disabled={coursePage === 1}
                                                    onClick={() => setCoursePage(p => p - 1)}
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-8 px-2 text-[10px] font-black uppercase tracking-widest"
                                                    disabled={coursePage * ITEMS_PER_PAGE >= courseTxns.length}
                                                    onClick={() => setCoursePage(p => p + 1)}
                                                >
                                                    Next
                                                    <ChevronRight className="w-4 h-4 ml-1" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}

                        {/* 4. Secure Billing Node Footer */}
                        <div className="pt-6 pb-4 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-[#00a884] text-[#00a884]">
                                    <BadgeCheck className="w-5 h-5" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-[15px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">Secure Billing Node</p>
                                    <p className="text-[12px] text-slate-500 font-medium">Verified Protocol</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <button className="text-[13px] font-medium text-slate-500 hover:text-indigo-600 transition-colors">Privacy Policy</button>
                                <div className="w-px h-3 bg-slate-300 dark:bg-white/10" />
                                <button className="text-[13px] font-medium text-slate-500 hover:text-indigo-600 transition-colors">Terms of Use</button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </Layout>
    );
}
