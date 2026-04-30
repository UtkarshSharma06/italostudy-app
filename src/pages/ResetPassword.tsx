import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2, Sparkles } from 'lucide-react';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            toast({
                title: 'Invalid password',
                description: 'Password must be at least 6 characters.',
                variant: 'destructive',
            });
            return;
        }

        if (password !== confirmPassword) {
            toast({
                title: 'Passwords mismatch',
                description: 'Passwords do not match.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                toast({
                    title: 'Update failed',
                    description: error.message,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Password updated!',
                    description: 'Your password has been changed successfully. Please sign in.',
                });
                navigate('/auth');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-muted flex items-center justify-center p-6 selection:bg-indigo-100 selection:text-indigo-900">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="w-full max-w-md relative z-10">
                <div className="bg-white dark:bg-card rounded-[3rem] p-10 lg:p-12 border border-slate-100 dark:border-border shadow-2xl shadow-indigo-100/50">
                    <div className="text-center mb-10">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                <Sparkles className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2 tracking-tighter uppercase">Set New Password</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Secure your account with a new mission key</p>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-1">
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                <Input
                                    type="password"
                                    placeholder="NEW PASSWORD"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-12 h-12 bg-slate-50 dark:bg-muted border-none rounded-xl focus:ring-2 focus:ring-indigo-100 font-bold text-[11px] placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                <Input
                                    type="password"
                                    placeholder="CONFIRM NEW PASSWORD"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pl-12 h-12 bg-slate-50 dark:bg-muted border-none rounded-xl focus:ring-2 focus:ring-indigo-100 font-bold text-[11px] placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg active:scale-95 transition-all mt-6"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Mission Key'}
                        </Button>

                        <button
                            type="button"
                            onClick={() => navigate('/auth')}
                            className="w-full text-[9px] font-black text-slate-400 hover:text-indigo-600 transition-all uppercase tracking-widest pt-4"
                        >
                            Back to Sign In
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
