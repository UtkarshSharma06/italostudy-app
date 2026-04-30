import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Loader2, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { motion, AnimatePresence } from 'framer-motion';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

interface ResourceAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    resourceTitle?: string;
}

export function ResourceAuthModal({ isOpen, onClose, onSuccess, resourceTitle }: ResourceAuthModalProps) {
    const [isLogin, setIsLogin] = useState(false); // Default to signup for lead capture
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyingEmail, setVerifyingEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string; otp?: string }>({});

    const { signIn, signUp, signInWithGoogle } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setIsVerifying(false);
            setVerifyingEmail('');
            setEmail('');
            setPassword('');
            setDisplayName('');
            setErrors({});
            setIsSuccess(false);
        }
    }, [isOpen]);

    const validateForm = () => {
        const newErrors: { email?: string; password?: string } = {};
        try { emailSchema.parse(email); } catch (e: any) { newErrors.email = e.errors[0].message; }
        try { passwordSchema.parse(password); } catch (e: any) { newErrors.password = e.errors[0].message; }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAuthSuccess = (isNewUser: boolean = false) => {
        setIsSuccess(true);
        setTimeout(() => {
            if (isNewUser) {
                navigate('/onboarding');
            } else {
                onSuccess();
            }
            onClose();
        }, 1500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsLoading(true);

        try {
            if (isLogin) {
                const { error } = await signIn(email, password);
                if (error) {
                    toast({
                        title: 'Sign in failed',
                        description: error.message,
                        variant: 'destructive',
                    });
                } else {
                    handleAuthSuccess();
                }
            } else {
                const { data, error } = await signUp(email, password, displayName);
                if (error) {
                    toast({
                        title: 'Sign up failed',
                        description: error.message,
                        variant: 'destructive',
                    });
                } else if (!data.session) {
                    // Verification required (OTP sent)
                    setVerifyingEmail(email);
                    setIsVerifying(true);
                } else {
                    handleAuthSuccess(true);
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otpCode.length !== 6) return;
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.verifyOtp({
                email: verifyingEmail || email,
                token: otpCode,
                type: 'signup'
            });

            if (error) {
                toast({
                    title: 'Verification failed',
                    description: error.message,
                    variant: 'destructive',
                });
            } else {
                handleAuthSuccess(true);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            const { error } = await signInWithGoogle(window.location.href);
            if (error) {
                toast({
                    title: 'Google sign in failed',
                    description: error.message,
                    variant: 'destructive',
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-[400px] p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="relative bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100"
                >
                    <AnimatePresence mode="wait">
                        {isSuccess ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]"
                            >
                                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 border-2 border-indigo-100">
                                    <CheckCircle2 className="w-10 h-10 text-indigo-600" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Access Granted</h2>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Starting your download...</p>
                                <div className="mt-8 w-32 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '100%' }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-full h-full bg-indigo-600"
                                    />
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col">
                                {/* Hero Header */}
                                <div className="bg-indigo-600 p-6 md:px-8 md:py-6 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                                    <div className="relative z-10">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-widest mb-4 border border-white/20 backdrop-blur-sm">
                                            <Sparkles className="w-3 h-3 text-amber-300" />
                                            Special Access
                                        </div>
                                        <h3 className="text-2xl font-black tracking-tight mb-2 leading-tight">
                                            Unlock This Resource
                                        </h3>
                                        <p className="text-indigo-100 text-xs font-bold leading-relaxed opacity-90">
                                            Join 10,000+ students getting official study materials, practice guides, and exam tips.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6 md:px-8 md:py-6">
                                    <DialogHeader className="mb-6 sr-only">
                                        <DialogTitle>{isLogin ? 'Sign In' : 'Create Account'}</DialogTitle>
                                        <DialogDescription>Authentication required for resource access</DialogDescription>
                                    </DialogHeader>

                                    {isVerifying ? (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="text-center space-y-2">
                                                <h4 className="text-lg font-black uppercase tracking-tight">Enter Code</h4>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                    We sent a 6-digit code to <br />
                                                    <span className="text-indigo-600">{verifyingEmail || email}</span>
                                                </p>
                                            </div>

                                            <div className="flex justify-center">
                                                <InputOTP
                                                    maxLength={6}
                                                    value={otpCode}
                                                    onChange={setOtpCode}
                                                >
                                                    <InputOTPGroup className="gap-2">
                                                        {[0, 1, 2, 3, 4, 5].map((index) => (
                                                            <InputOTPSlot
                                                                key={index}
                                                                index={index}
                                                                className="w-10 h-12 bg-slate-50 border-slate-100 rounded-xl text-lg font-black text-indigo-600 focus:ring-2 focus:ring-indigo-100"
                                                            />
                                                        ))}
                                                    </InputOTPGroup>
                                                </InputOTP>
                                            </div>

                                            <Button
                                                onClick={handleVerifyOtp}
                                                disabled={isLoading || otpCode.length < 6}
                                                className="w-full h-12 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                                    <>
                                                        Verify & Download
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </>
                                                )}
                                            </Button>

                                            <button
                                                onClick={() => setIsVerifying(false)}
                                                className="w-full text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-all"
                                            >
                                                Wrong email? Go back
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            {!isLogin && (
                                                <div className="relative group">
                                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <Input
                                                        placeholder="FULL NAME"
                                                        value={displayName}
                                                        onChange={(e) => setDisplayName(e.target.value)}
                                                        className="pl-12 h-12 rounded-xl bg-slate-50 border-none font-black text-[10px] tracking-widest uppercase placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-100"
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-1">
                                                <div className="relative group">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <Input
                                                        type="email"
                                                        placeholder="EMAIL ADDRESS"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        className="pl-12 h-12 rounded-xl bg-slate-50 border-none font-black text-[10px] tracking-widest uppercase placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-100"
                                                    />
                                                </div>
                                                {errors.email && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-1">{errors.email}</p>}
                                            </div>

                                            <div className="space-y-1">
                                                <div className="relative group">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <Input
                                                        type="password"
                                                        placeholder="PASSWORD"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="pl-12 h-12 rounded-xl bg-slate-50 border-none font-bold text-base md:text-[11px] placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-100"
                                                    />
                                                </div>
                                                {errors.password && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-1">{errors.password}</p>}
                                            </div>

                                            <Button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                                    <>
                                                        {isLogin ? 'Grant Access' : 'Create & Download'}
                                                        <ArrowRight className="w-4 h-4" />
                                                    </>
                                                )}
                                            </Button>

                                            <div className="relative my-6">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t border-slate-100" />
                                                </div>
                                                <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.3em]">
                                                    <span className="bg-white px-4 text-slate-300">Fast Access</span>
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                onClick={handleGoogleSignIn}
                                                variant="outline"
                                                className="w-full h-12 border-slate-100 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                                            >
                                                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" className="text-[#4285F4]" />
                                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" className="text-[#34A853]" />
                                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" className="text-[#FBBC05]" />
                                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" className="text-[#EA4335]" />
                                                </svg>
                                                Continue with Google
                                            </Button>
                                        </form>
                                    )}

                                    <div className="mt-6 pt-4 border-t border-slate-50 text-center">
                                        <button
                                            onClick={() => setIsLogin(!isLogin)}
                                            className="text-[10px] font-black text-slate-400 hover:text-indigo-600 transition-all uppercase tracking-[0.2em]"
                                        >
                                            {isLogin ? "DON'T HAVE AN ACCOUNT?" : "ALREADY HAVE AN ACCOUNT?"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
}
