import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { 
    Mail, 
    Lock, 
    User, 
    ChevronLeft, 
    Loader2, 
    ArrowRight,
    Eye,
    EyeOff,
    ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

export default function MobileAuth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // MFA State
    const [requiresMFA, setRequiresMFA] = useState(false);
    const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
    const [mfaCode, setMfaCode] = useState("");
    const [mfaError, setMfaError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [verifyingEmail, setVerifyingEmail] = useState('');
    const { user, signIn, signUp, signInWithGoogle, mfa, signOut, aal, hasMFA } = useAuth() as any;
    const navigate = useNavigate();

    // Force Light Mode for Auth Page
    useEffect(() => {
        const root = document.documentElement;
        const wasDark = root.classList.contains('dark');
        
        if (wasDark) {
            root.classList.remove('dark');
            root.style.colorScheme = 'light';
        }

        return () => {
            if (wasDark) {
                root.classList.add('dark');
                root.style.colorScheme = 'dark';
            }
        };
    }, []);

    // Auto-redirect if user gets logged in (e.g. by native Google Auth)
    useEffect(() => {
        const checkAndRedirect = async () => {
            if (!user || requiresMFA) return;

            if (hasMFA && aal !== 'aal2') {
                const { data } = await mfa.listFactors();
                const factor = data?.all?.find((f: any) => f.factor_type === 'totp' && f.status === 'verified');
                if (factor) {
                    setMfaFactorId(factor.id);
                    setRequiresMFA(true);
                    return;
                }
            }
            navigate('/mobile/dashboard');
        };

        checkAndRedirect();
    }, [user, navigate, requiresMFA, aal, hasMFA]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (isLogin) {
                const { data, error } = await signIn(email, password);
                if (error) throw error;

                const session = data?.session;
                if (session) {
                    const currentAAL = session.authenticator_assurance_level;
                    const { data: factorsData } = await mfa.listFactors();
                    const totpFactor = factorsData?.all?.find((f: any) => f.factor_type === 'totp' && f.status === 'verified');

                    if (totpFactor && currentAAL !== 'aal2') {
                        setMfaFactorId(totpFactor.id);
                        setRequiresMFA(true);
                        setIsLoading(false);
                        return;
                    }
                }

                toast.success('Welcome back to Italostudy!');
                navigate('/mobile/dashboard');
            } else {
                const { data, error } = await signUp(email, password, displayName);
                if (error) throw error;
                
                if (!data.session) {
                    setVerifyingEmail(email);
                    setIsVerifying(true);
                    toast.success('Verification required. Please check your email.');
                } else {
                    toast.success('Account created! Welcome to Italostudy.');
                    navigate('/mobile/onboarding');
                }
            }
        } catch (error: any) {
            toast.error(error.message === 'Invalid login credentials' ? 'Invalid login credentials' : error.message);
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
                toast.error(error.message);
            } else {
                toast.success('Email verified successfully!');
                navigate('/mobile/onboarding');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogle = async () => {
        setIsLoading(true);
        try {
            const { error } = await signInWithGoogle();
            if (error) {
                toast.error(error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleMFAVerify = async () => {
        if (!mfaFactorId) return;
        if (mfaCode.length !== 6) {
            setMfaError("ENTER 6-DIGIT CODE");
            return;
        }

        setIsLoading(true);
        setMfaError("");
        try {
            const { error } = await mfa.challengeAndVerify(mfaFactorId, mfaCode);
            if (error) {
                setMfaError("INVALID CODE");
                toast.error("Code is incorrect");
            } else {
                toast.success("MFA Verified");
                setRequiresMFA(false);
                navigate('/mobile/dashboard');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleMFACancel = () => {
        signOut();
        setRequiresMFA(false);
        setMfaCode("");
        setMfaError("");
    };

    return (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 relative z-20 min-h-screen overflow-y-auto font-sans">
            {/* Mobile Header */}
            <div className="p-6 flex items-center justify-between shrink-0">
                <img src="/logo.webp" alt="Italostudy" className="h-7" />
                <button 
                    onClick={() => window.location.href = 'https://italostudy.com'}
                    className="p-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-6 pb-12">
                <div className="w-full max-w-[420px] space-y-6 md:space-y-8">
                    <div className="space-y-2">
                        <motion.div
                            key={isLogin ? 'login-head' : 'signup-head'}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                {requiresMFA ? 'Security Check' : (isVerifying ? 'Verify Email' : (isLogin ? 'Welcome Back' : 'Create Account'))}
                            </h2>
                            <p className="text-slate-500 font-medium">
                                {requiresMFA 
                                    ? 'Enter the code from your authenticator app.' 
                                    : (isVerifying 
                                        ? `Enter the code we sent to ${verifyingEmail || email}` 
                                        : (isLogin ? 'Please sign in to continue with your prep.' : 'Join the premium educational community.'))}
                            </p>
                        </motion.div>
                    </div>

                    {isVerifying ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex justify-center">
                                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                                    <InputOTPGroup className="gap-2">
                                        {[0, 1, 2, 3, 4, 5].map((idx) => (
                                            <InputOTPSlot
                                                key={idx}
                                                index={idx}
                                                className="w-11 h-16 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl text-xl font-black text-indigo-600"
                                            />
                                        ))}
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>

                            <button 
                                onClick={handleVerifyOtp}
                                disabled={isLoading || otpCode.length < 6}
                                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-indigo-200 transition-all active:scale-[0.98]"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Start'}
                            </button>

                            <button
                                onClick={() => setIsVerifying(false)}
                                className="w-full text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors text-center"
                            >
                                Wrong email? Go back
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Social Auth */}
                            <div className="grid grid-cols-1 gap-3">
                                <button 
                                    onClick={handleGoogle}
                                    className="flex items-center justify-center gap-3 w-full h-12 rounded-2xl border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all font-bold text-sm text-slate-700"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" />
                                    </svg>
                                    <span>Continue with Google</span>
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black"><span className="bg-white dark:bg-slate-950 px-4 text-slate-400">Or continue with</span></div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {!isLogin && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Display Name</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <input 
                                                type="text"
                                                required
                                                value={displayName}
                                                onChange={e => setDisplayName(e.target.value)}
                                                placeholder="Your Name"
                                                className="w-full h-12 pl-12 pr-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white focus:outline-none transition-all font-medium text-sm"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <input 
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="email@example.com"
                                            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white focus:outline-none transition-all font-medium text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</label>
                                        {isLogin && (
                                            <button type="button" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700">
                                                Forgot?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full h-12 pl-12 pr-12 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white focus:outline-none transition-all font-medium text-sm"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-indigo-200 transition-all active:scale-[0.98]"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <span>{isLogin ? 'Login Now' : 'Create Account'}</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="text-center">
                                <button 
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                                >
                                    {isLogin ? (
                                        <>Don't have an account? <span className="text-indigo-600">Join now</span></>
                                    ) : (
                                        <>Already have an account? <span className="text-indigo-600">Login</span></>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Bottom Links */}
            <div className="p-6 flex items-center justify-center gap-6 shrink-0">
                <button 
                    onClick={() => window.location.href = 'https://italostudy.com'}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5"
                >
                    <ChevronLeft className="w-3 h-3" />
                    Back to Italostudy
                </button>
                <div className="w-px h-3 bg-slate-200" />
                <a href="https://italostudy.com/terms" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
                    Terms
                </a>
                <a href="https://italostudy.com/privacy" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
                    Privacy
                </a>
            </div>

            {/* MFA SECURITY OVERLAY */}
            <Dialog open={requiresMFA} onOpenChange={(open) => !open && handleMFACancel()}>
                <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-[340px] bg-white dark:bg-slate-900 border-slate-200 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden z-[200]">
                    <DialogHeader className="items-center text-center space-y-3">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                            <ShieldCheck className="w-7 h-7 text-indigo-600" />
                        </div>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Security Check</DialogTitle>
                        <DialogDescription className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-relaxed px-2">
                            Enter the 6-digit code from your authenticator app to authorize this device.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 flex flex-col items-center space-y-6">
                        <InputOTP
                            maxLength={6}
                            value={mfaCode}
                            onChange={(val) => {
                                setMfaCode(val);
                                setMfaError("");
                            }}
                        >
                            <InputOTPGroup className="gap-1.5">
                                {[0, 1, 2, 3, 4, 5].map((idx) => (
                                    <InputOTPSlot
                                        key={idx}
                                        index={idx}
                                        className="w-9 h-12 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl text-lg font-black text-indigo-600"
                                    />
                                ))}
                            </InputOTPGroup>
                        </InputOTP>

                        {mfaError && (
                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest animate-pulse">
                                {mfaError}
                            </span>
                        )}

                        <button
                            onClick={handleMFAVerify}
                            disabled={isLoading || mfaCode.length < 6}
                            className="w-full h-14 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg shadow-indigo-100"
                        >
                            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Authorize Link'}
                        </button>

                        <button
                            onClick={handleMFACancel}
                            className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                        >
                            Cancel Authentication
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
