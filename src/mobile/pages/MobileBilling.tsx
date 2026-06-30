import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import {
    ArrowLeft,
    CreditCard,
    Zap,
    ChevronRight,
    History,
    AlertCircle,
    BadgeCheck,
    Loader2,
    Download,
    ChevronLeft,
    Smartphone,
    Lock,
    Shield,
    Receipt
} from 'lucide-react';
import { countries } from '@/lib/countries';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/useCurrency';
import { generateInvoice } from '@/utils/invoiceGenerator';
import MobileLayout from '../components/MobileLayout';

export default function MobileBilling() {
    const { user, profile } = useAuth() as any;
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [transactionPage, setTransactionPage] = useState(1);
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
                    .limit(100);

                if (error) throw error;
                setTransactions(data || []);
            } catch (err) {
                console.error('Failed to fetch transactions:', err);
            } finally {
                setIsLoading(false);
            }
        };

        if (user) fetchTransactions();
    }, [user]);

    const getPlanName = (tier: string) => {
        const tiers: Record<string, string> = {
            'explorer': 'Explorer Plan',
            'pro': 'Exam Prep Plan',
            'elite': 'Global Admission Plan'
        };
        return tiers[tier] || 'Onboarding Plan';
    };

    return (
        <MobileLayout isLoading={!profile || isLoading}>
            <div className="flex flex-col min-h-full bg-background pb-10 animate-in fade-in duration-500">
            {/* Mobile Header */}
            <header className="px-6 py-8 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border/10">
                <button
                    onClick={() => navigate('/mobile/settings')}
                    className="p-2 -ml-2 text-primary transition-transform active:scale-90"
                >
                    <ArrowLeft />
                </button>
                <h1 className="text-xl font-black uppercase tracking-tight">Billing Info</h1>
            </header>

            <div className="px-6 py-8 space-y-8">

                {/* Membership Card */}
                <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 space-y-6 shadow-sm">
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
                            <button onClick={() => navigate('/mobile/settings', { state: { section: 'security' } })} className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700">Change</button>
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
                            <button onClick={() => navigate('/mobile/settings', { state: { section: 'profile' } })} className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700">Link</button>
                        </div>
                    </div>
                </div>

                {/* Current Plan Section */}
                <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 space-y-6 shadow-sm">
                    <div className="flex justify-between items-center h-[44px]">
                        <h3 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight">Your Plan</h3>
                        <Button 
                            onClick={() => navigate('/mobile/settings', { state: { section: 'subscription' } })}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm px-4 h-9 font-bold text-[12px]"
                        >
                            Change
                        </Button>
                    </div>
                    <div className="rounded-[1.5rem] bg-gradient-to-br from-[#f8f9fc] to-[#f5f3ff] dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-50/50 dark:border-indigo-500/20 p-5 flex items-center gap-5 relative overflow-hidden">
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
                        <div className="w-14 h-14 rounded-[1.25rem] bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                            <Zap className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="currentColor" strokeWidth={1} />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-[16px] font-black text-slate-900 dark:text-white tracking-tight uppercase">
                                {getPlanName(profile?.selected_plan)}
                            </h4>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                Standard Learning Access
                            </p>
                            <div className="mt-2">
                                <span className="inline-block px-2.5 py-1 rounded-full bg-indigo-100/50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                                    {profile?.selected_plan === 'explorer' ? 'FREE PLAN (Lifetime)' : profile?.subscription_expiry_date ? `Access until ${new Date(profile.subscription_expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ')}` : 'LIFETIME ACCESS'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Billing History */}
                {/* Billing History */}
                <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 space-y-6 shadow-sm">
                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-[1rem] bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                            <Receipt className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight">Billing History</h3>
                            <p className="text-[13px] font-medium text-slate-500 mt-0.5">Your invoices and receipts.</p>
                        </div>
                    </div>

                    <div className="rounded-[1rem] border border-slate-100 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50/50 dark:bg-white/[0.02]">
                                <p className="text-[13px] font-medium text-slate-500">No transactions recorded</p>
                            </div>
                        ) : (
                            transactions.slice((transactionPage - 1) * ITEMS_PER_PAGE, transactionPage * ITEMS_PER_PAGE).map((bill) => (
                                <div key={bill.id} className="flex flex-col gap-3 p-5 bg-slate-50/50 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-slate-900 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[13px] font-black tracking-tight text-slate-900 dark:text-white uppercase">
                                                {bill.plan_id?.toUpperCase()} PLAN
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                {new Date(bill.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            {bill.amount === 0 ? (
                                                <span className="text-[13px] font-black text-slate-400 uppercase tracking-widest">FREE</span>
                                            ) : (
                                                <span className="text-[13px] font-black text-slate-900 dark:text-white">{formatPrice(bill.amount, bill.currency)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                            {bill.status === 'completed' ? 'Paid' : 'Pending'}
                                        </span>
                                        {bill.status === 'completed' && (
                                            <button
                                                onClick={() => generateInvoice(bill, profile)}
                                                className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
                                            >
                                                <Download size={14} />
                                                <span>Download</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        {transactions.length > ITEMS_PER_PAGE && (
                            <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-950">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {(transactionPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(transactionPage * ITEMS_PER_PAGE, transactions.length)} of {transactions.length}
                                </p>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 px-2"
                                        disabled={transactionPage === 1}
                                        onClick={() => setTransactionPage(p => p - 1)}
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 px-2 text-[9px] font-black uppercase tracking-widest"
                                        disabled={transactionPage * ITEMS_PER_PAGE >= transactions.length}
                                        onClick={() => setTransactionPage(p => p + 1)}
                                    >
                                        Next
                                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-5 flex items-center gap-2 text-indigo-600/70">
                        <Shield className="w-3.5 h-3.5" />
                        <p className="text-[11px] font-medium text-slate-500">Payments are handled under secure authorization protocol.</p>
                    </div>
                </div>

                <div className="text-center pt-4">
                    <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">System Version 2.0.4</p>
                </div>
            </div>
            </div>
        </MobileLayout>
    );
}
