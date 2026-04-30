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
    Download
} from 'lucide-react';
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
                <div className="bg-card p-8 rounded-[2.5rem] border border-border/40 space-y-6 shadow-xl shadow-primary/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <CreditCard size={24} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black uppercase tracking-tight">Active Membership</span>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                                {profile?.selected_plan === 'pro' || profile?.selected_plan === 'elite' ? 'Premium Access' : 'Free Beta Access'}
                            </span>
                            {profile?.selected_plan === 'explorer' ? (
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mt-1">
                                    Next Billing: FREE PLAN (Lifetime)
                                </span>
                            ) : profile?.subscription_expiry_date && (
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    Next Billing: {new Date(profile.subscription_expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            )}

                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/5">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-muted-foreground uppercase opacity-60">Account</span>
                            <span className="font-black text-foreground">{user?.email}</span>
                        </div>
                        <div
                            onClick={() => navigate('/mobile/settings', { state: { section: 'security' } })}
                            className="flex justify-between items-center text-xs active:opacity-50 transition-opacity cursor-pointer"
                        >
                            <span className="font-bold text-muted-foreground uppercase opacity-60">Password</span>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-foreground">••••••••</span>
                                <ChevronRight size={14} className="text-primary" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Current Plan Section */}
                <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:scale-110 transition-transform duration-700" />
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3">
                            <Zap size={20} fill="currentColor" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Current Plan</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">
                                {getPlanName(profile?.selected_plan)}
                            </h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-2">Premium Experience + All Features</p>
                        </div>
                        <Button
                            onClick={() => navigate('/mobile/settings', { state: { section: 'subscription' } })}
                            className="bg-white text-indigo-600 hover:bg-white/90 w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest"
                        >
                            Modify Plan
                        </Button>
                    </div>
                </div>

                {/* Billing History */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <History size={16} className="text-muted-foreground" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Recent History</h3>
                    </div>

                    <div className="bg-card rounded-[2.5rem] border border-border/20 divide-y divide-border/5 overflow-hidden shadow-xl shadow-primary/5 min-h-[100px]">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-40">No transactions recorded</p>
                            </div>
                        ) : (
                            transactions.map((bill) => (
                                <div key={bill.id} className="flex flex-col gap-4 p-7 active:bg-secondary/20 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-black tracking-tight text-foreground uppercase truncate max-w-[180px]">
                                                {bill.plan_id?.toUpperCase()} PLAN
                                            </span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
                                                {new Date(bill.created_at).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            {bill.amount === 0 ? (
                                                <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">FREE</span>
                                            ) : (
                                                <span className="text-xs font-black text-foreground uppercase tracking-widest">{formatPrice(bill.amount, bill.currency)}</span>
                                            )}
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight opacity-40 mt-1">
                                                {bill.status === 'completed' ? 'Status: OK' : 'Pending'}
                                            </p>
                                        </div>
                                    </div>

                                    {bill.status === 'completed' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => generateInvoice(bill, profile)}
                                            className="self-start h-8 rounded-lg text-[9px] font-black uppercase tracking-widest gap-2 bg-secondary/30 hover:bg-secondary border-border/20"
                                        >
                                            <Download size={12} />
                                            Download Invoice
                                        </Button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Support/Security Badge */}
                <div className="flex items-center gap-4 p-6 bg-slate-500/5 rounded-[2rem] border border-border/10 opacity-60">
                    <BadgeCheck className="text-[#00a884] shrink-0" size={24} />
                    <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">
                        Secure transaction node active. Beta Protocol phase allows unrestricted access.
                    </p>
                </div>

                <div className="text-center pt-4">
                    <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">System Version 2.0.4</p>
                </div>
            </div>
            </div>
        </MobileLayout>
    );
}
