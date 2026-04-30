import { useState, useEffect, memo } from 'react';
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Mail, Lock, User, Sparkles, Loader2, ShieldAlert, Shield, Ban, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
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

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
    const [searchParams] = useSearchParams();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [requiresMFA, setRequiresMFA] = useState(false);
    const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
    const [mfaCode, setMfaCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyingEmail, setVerifyingEmail] = useState('');
    const [otpCode, setOtpCode] = useState("");

    const { user, signIn, signUp, signOut, signInWithGoogle, resetPassword, mfa, aal, hasMFA } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [allowRegistrations, setAllowRegistrations] = useState(true);

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

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'allow_registrations')
                .maybeSingle();
            if (data) setAllowRegistrations(data.value as boolean);
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        if (searchParams.get('banned') === 'true') {
            toast.error("Access Denied", {
                description: "Security policy has restricted your access. Contact support.",
                duration: Infinity,
            });
        }
    }, [searchParams]);

    const checkIPStatus = async () => {
        try {
            const geoResponse = await fetch('https://ipapi.co/json/');
            const geoData = await geoResponse.json();
            const ip = geoData.ip;
            const country = geoData.country_name;

            const { data: isBanned } = await (supabase as any).rpc('check_ip_banned', { check_ip: ip });

            if (isBanned) {
                navigate('/auth?banned=true', { replace: true });
                return { isBanned: true, ip, country };
            }

            return { isBanned: false, ip, country };
        } catch (error) {
            console.error("IP Check Failed", error);
            return { isBanned: false, ip: null, country: null };
        }
    };

    useEffect(() => {
        const handleInitialRedirect = async () => {
            // Don't do anything while loading or if MFA dialog is already shown
            if (!user || isLoading || requiresMFA) return;

            // Check if user has MFA enabled and needs to verify
            if (hasMFA && aal !== 'aal2') {
                const { data } = await mfa.listFactors();
                const factor = data?.all?.find((f: any) => f.factor_type === 'totp' && f.status === 'verified');
                if (factor) {
                    setMfaFactorId(factor.id);
                    setRequiresMFA(true);
                    return; // Stop here, don't navigate
                }
            }

            // Only navigate if MFA is not required or already verified
            const storeRedirect = sessionStorage.getItem('post_login_redirect');
            const from = (location.state as any)?.from?.pathname || storeRedirect || '/dashboard';
            
            // If we are using the store redirect, clear it now
            if (storeRedirect && !(location.state as any)?.from?.pathname) {
                sessionStorage.removeItem('post_login_redirect');
            }

            console.log(`Auth check: redirecting to ${from}`);
            navigate(from);
        };

        handleInitialRedirect();
    }, [user, navigate, isLoading, requiresMFA, aal, hasMFA, location.state]);

    const validateForm = () => {
        const newErrors: { email?: string; password?: string } = {};

        try {
            emailSchema.parse(email);
        } catch (e) {
            if (e instanceof z.ZodError) newErrors.email = e.errors[0].message;
        }

        try {
            passwordSchema.parse(password);
        } catch (e) {
            if (e instanceof z.ZodError) newErrors.password = e.errors[0].message;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            emailSchema.parse(email);
        } catch (e) {
            if (e instanceof z.ZodError) {
                setErrors({ email: e.errors[0].message });
                return;
            }
        }

        setIsLoading(true);
        try {
            const { error } = await resetPassword(email);
            if (!error) {
                toast.success('Email sent!', { description: "Check your inbox, we've sent you a link to reset your password." });
                setIsForgotPassword(false);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const { isBanned, ip, country } = await checkIPStatus();
            if (isBanned) return;

            if (isLogin) {
                const { data, error } = await signIn(email, password);
                if (error) {
                    toast.error(error.message === 'Invalid login credentials' ? 'Invalid login credentials' : error.message);
                } else {
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
                    toast.success('Welcome back!', { description: "You're all signed in. Let's keep going!" });
                    const storeRedirect = sessionStorage.getItem('post_login_redirect');
                    const from = (location.state as any)?.from?.pathname || storeRedirect || '/dashboard';
                    
                    if (storeRedirect && !(location.state as any)?.from?.pathname) {
                        sessionStorage.removeItem('post_login_redirect');
                    }

                    navigate(from);
                }
            } else {
                if (!allowRegistrations) {
                    toast.error("Registration Paused", {
                        description: "New account creation is currently disabled by the administrator.",
                    });
                    setIsLoading(false);
                    return;
                }
                const { data, error } = await signUp(email, password, displayName);
                if (error) {
                    toast.error(error.message.includes('already registered') ? "It looks like you've already signed up with this email." : error.message);
                } else {
                    if (data.session?.user && ip) {
                        await (supabase as any)
                            .from('profiles')
                            .update({ last_ip: ip, country: country })
                            .eq('id', data.session.user.id);
                    }
                    const from = (location.state as any)?.from?.pathname;
                    if (from && from !== '/dashboard') sessionStorage.setItem('onboarding_redirect', from);

                    toast.success('Account created!', { description: "Welcome to the family! We're glad you're here." });
                    if (!data.session) {
                        setVerifyingEmail(email);
                        setIsVerifying(true);
                        toast.success('Verification needed', { description: "Go ahead and enter the 6-digit code we just sent to your inbox." });
                    } else {
                        navigate('/onboarding');
                    }
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
                toast.error(error.message);
            } else {
                toast.success('Success!', { description: "All set! Your email is verified. Welcome aboard!" });
                navigate('/onboarding');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            const storeRedirect = sessionStorage.getItem('post_login_redirect');
            const from = (location.state as any)?.from?.pathname || storeRedirect || '/dashboard';
            
            if (from && from !== '/dashboard') sessionStorage.setItem('onboarding_redirect', from);
            const redirectUrl = `${window.location.origin}${from}`;
            const { error } = await signInWithGoogle(redirectUrl);
            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message);
            setIsLoading(false);
        }
    };

    const handleMFAVerify = async () => {
        if (!mfaFactorId || mfaCode.length !== 6) return;
        setIsLoading(true);
        try {
            const { error } = await mfa.challengeAndVerify(mfaFactorId, mfaCode);
            if (error) {
                toast.error('Verification failed', { description: 'Invalid code.' });
            } else {
                toast.success('Welcome back!', { description: "Security check passed. You're good to go!" });
                setRequiresMFA(false);
                const storeRedirect = sessionStorage.getItem('post_login_redirect');
                const from = (location.state as any)?.from?.pathname || storeRedirect || '/dashboard';
                
                if (storeRedirect && !(location.state as any)?.from?.pathname) {
                    sessionStorage.removeItem('post_login_redirect');
                }

                navigate(from);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // --- Banned/Deleted View ---
    const isBanned = searchParams.get('banned') === 'true';
    const isDeleted = searchParams.get('deleted') === 'true';

    if (isBanned || isDeleted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-[#fbf8ff] font-sans">
                <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
                    <div className="p-8 rounded-3xl border border-slate-200 text-center relative overflow-hidden shadow-xl bg-white">
                        <div className={`w-20 h-20 ${isDeleted ? 'bg-error-container' : 'bg-red-50'} rounded-full flex items-center justify-center mb-6 mx-auto`}>
                            {isDeleted ? <ShieldAlert className="w-10 h-10 text-error" /> : <Ban className="w-10 h-10 text-red-600" />}
                        </div>
                        <h2 className="text-2xl font-bold text-on-surface mb-3">
                            {isDeleted ? 'Account Deleted' : 'Account Suspended'}
                        </h2>
                        <p className="text-sm text-on-surface-variant leading-relaxed mb-8">
                            {isDeleted
                                ? 'Your account has been permanently removed by an administrator. You no longer have access to this platform.'
                                : 'Your access to the platform has been restricted due to a violation of our terms or administrative action.'}
                        </p>
                        <div className={`${isDeleted ? 'bg-error/5 border-error/10' : 'bg-red-500/5 border-red-500/10'} px-6 py-4 rounded-xl mb-8 border w-full`}>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDeleted ? 'text-error' : 'text-red-500'} mb-1`}>Contact Support</p>
                            <p className="text-xs font-bold text-on-surface select-all">contact@italostudy.com</p>
                        </div>
                        <Button
                            onClick={() => { navigate('/'); window.location.reload(); }}
                            className="h-12 w-full bg-primary text-white hover:bg-primary/90 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/20"
                        >
                            Return Home
                        </Button>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-8">
                            {isDeleted ? 'ACTION: PERMANENT REMOVAL' : `Account ID: ${user?.id ? user.id.slice(0, 8) + '...' : 'Hidden'}`}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-[#fbf8ff] font-sans antialiased text-[#0f1841]">
            <style>
                {`
                .editorial-gradient {
                    background: linear-gradient(135deg, #3525cd 0%, #4f46e5 100%);
                }
                `}
            </style>
            
            {/* Left Side: Editorial Content */}
            <section className="editorial-gradient relative flex-1 hidden md:flex flex-col justify-between p-8 lg:p-12 text-white">
                {/* Decorative Element: Asymmetric Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-48 right-12 w-64 h-64 bg-secondary-fixed rounded-full blur-[80px]"></div>
                </div>

                {/* Brand Header */}
                <div className="relative z-10 flex items-center gap-3">
                    <img src="/logo.webp" alt="Italostudy" className="h-10 w-auto brightness-0 invert" />
                </div>

                {/* Encouraging Content */}
                <div className="relative z-10 max-w-xl">
                    <span className="text-xs uppercase tracking-widest text-[#e2dfff] mb-2 block font-medium">Student Portal</span>
                    <h1 className="text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight mb-4 pr-12">
                        Everything you need to ace the CENT-S & IMAT.
                    </h1>
                    <p className="text-base text-[#dad7ff]/90 leading-relaxed mb-6 max-w-md">
                        Get the right study materials, realistic mock exams, and the exact steps you need to follow. Join over 5000+ students who started their medical journey to Italy with us.
                    </p>

                    {/* Proof/Trust Element */}
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                        <div className="flex -space-x-3">
                            <img alt="Student Profile" className="w-10 h-10 rounded-full border-2 border-[#3525cd]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-7mh72DsvA83Qbah9puq3MtKKfDu4Cb_qlcF9KDDpAsDxjX7icGT0ibPhsZhBWvr4MkQiIxWg_fpP4LpsVkdyX39EOvFHHTPEQezEPCh4bOQQgHBE7pSV5vlqwQaspixf6Krqg-5tbylOpuK5D_KtzB1v2V6P1DAVBB6hO2l864ynhbw1PdvM0YIxH4dGu5ltepg2nBahU_r4Z70A31h9_T_dldOU4GAVaBVT8Y51c4RNYXfSVjpIMnp6A3jeAi-bwLqLgwn0A-S_"/>
                            <img alt="Student Profile" className="w-10 h-10 rounded-full border-2 border-[#3525cd]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYVPjl2-0_ET6iyxC8GWjhLiJYsTsp5_oQiyUjC3OtRnQjP031an3P57ifJVFDPC0rsoq2g1l0hh7z9I4AASIKbU_tCzClL4Pb4ahVZEQ1PHgnXjfvQVsK4Rascq4mBADGiXvhTqadXcNHi0Ph2R7jtL86mVCW8uCFl75V_ALCG13TD2lCGyHLWxiGABFp2mh0ZS9ewGrOmYjRmkTxJxP0ETj-Wyu7e2pdzuFD4--w6lu9Baezxvf_xtPek1RWuOKy3bcJVAP4OxQP"/>
                            <img alt="Student Profile" className="w-10 h-10 rounded-full border-2 border-[#3525cd]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNRVir-eRO9aR6_SIhrtgGlN55VyeLmX78U_MBa04Z9TyTSkK4eKpC2DXEr2Rxrdt4exasyLGTsQgeRYl_SjLe3K6BhGLK_ZPWLstNLedzqkNOH3vqGvd54kAL8xM-MqsBTywsIHKa3pEH1AwvbfSvRqJTljG37rE8TLJr5fnR6E9HUerGHcIr9aKTJe5xTti0PGy_sntTfpRoR8mrA-jnSfdBWDEm1H7LW9F_AswhB0TFcrmkJdw43aa_xaHFAHnUpL7E1ZWFjyzN"/>
                        </div>
                        <div className="text-sm">
                            <span className="block font-bold">Over 5000+ students</span>
                            <span className="text-[#e2dfff]/80">using the platform every single day.</span>
                        </div>
                    </div>
                </div>

                {/* Footer Meta */}
                <div className="relative z-10 text-sm text-[#e2dfff]/60 font-medium">
                    © 2026 ItaloStudy | Free CENT-S, IMAT Practice, lectures & Unlimited Free Mocks
                </div>
            </section>

            {/* Right Side: Login Form */}
            <section className="flex-1 bg-[#ffffff] flex items-center justify-center p-6 lg:p-10">
                <div className="w-full max-w-md">
                    {/* Mobile Branding */}
                    <div className="md:hidden flex items-center gap-2 mb-8">
                        <img src="/logo.webp" alt="Italostudy" className="h-8 w-auto" />
                    </div>

                    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <h2 className="text-2xl font-bold text-[#0f1841] mb-1 tracking-tight">
                            {requiresMFA ? 'Security check' : (isVerifying ? 'Check your inbox' : (isForgotPassword ? 'Recover password' : (isLogin ? 'Welcome back' : 'Start your journey')))}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {requiresMFA 
                                ? 'Just one last step to keep your account safe. Enter the code from your app below.' 
                                : isVerifying 
                                ? `We’ve sent a 6-digit code to ${verifyingEmail || email}. Enter it here to verify your account.` 
                                : isForgotPassword 
                                ? 'No worries! Just enter your email and we\'ll send you a link to get back in.' 
                                : (isLogin ? 'Good to see you again! Sign in to keep going with your prep.' : 'Join a community of students who are making their med school dreams a reality.')}
                        </p>
                    </div>

                    {requiresMFA && (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                            <div className="flex justify-center mb-2">
                                <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode}>
                                    <InputOTPGroup className="gap-2">
                                        {[0, 1, 2, 3, 4, 5].map((index) => (
                                            <InputOTPSlot
                                                key={index}
                                                index={index}
                                                className="w-10 h-12 bg-slate-50 border-slate-200 rounded-xl text-xl font-bold text-primary"
                                            />
                                        ))}
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                            <Button
                                onClick={handleMFAVerify}
                                disabled={isLoading}
                                className="w-full h-12 editorial-gradient text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-95"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Verify access
                            </Button>
                            <button onClick={() => setRequiresMFA(false)} className="w-full text-sm text-slate-500 hover:text-primary transition-colors">
                                Try another way
                            </button>
                        </div>
                    )}

                    {isVerifying && !requiresMFA && (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                            <div className="flex justify-center mb-2">
                                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                                    <InputOTPGroup className="gap-2">
                                        {[0, 1, 2, 3, 4, 5].map((index) => (
                                            <InputOTPSlot
                                                key={index}
                                                index={index}
                                                className="w-10 h-12 bg-slate-50 border-slate-200 rounded-xl text-xl font-bold text-primary"
                                            />
                                        ))}
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                            <Button
                                onClick={handleVerifyOtp}
                                disabled={isLoading || otpCode.length < 6}
                                className="w-full h-12 editorial-gradient text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-95"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Finish sign up
                            </Button>
                            <button onClick={() => setIsVerifying(false)} className="w-full text-sm text-slate-500 hover:text-primary transition-colors">
                                Wait, that's the wrong email
                            </button>
                        </div>
                    )}

                    {!requiresMFA && !isVerifying && !isForgotPassword && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                                className="w-full h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-3 font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-200 group"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                                </svg>
                                Continue with Google
                            </button>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white text-slate-500 font-medium uppercase tracking-widest text-[9px]">or use your email</span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {!isLogin && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700" htmlFor="displayName">Name</label>
                                        <Input
                                            id="displayName"
                                            placeholder="What should we call you?"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className="w-full h-12 px-4 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary focus:bg-white transition-all duration-200"
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700" htmlFor="email">Email address</label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                                        className={`w-full h-12 px-4 rounded-xl bg-slate-50 border-none ring-1 ${errors.email ? 'ring-error' : 'ring-slate-200'} focus:ring-2 focus:ring-primary focus:bg-white transition-all duration-200`}
                                    />
                                    {errors.email && <p className="text-xs text-error mt-1">{errors.email}</p>}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-sm font-medium text-slate-700" htmlFor="password">Password</label>
                                        {isLogin && (
                                            <button 
                                                type="button"
                                                onClick={() => setIsForgotPassword(true)}
                                                className="text-sm font-medium text-primary hover:text-[#4f46e5] transition-colors"
                                            >
                                                Forgot it?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                                            className={`w-full h-12 px-4 rounded-xl bg-slate-50 border-none ring-1 ${errors.password ? 'ring-error' : 'ring-slate-200'} focus:ring-2 focus:ring-primary focus:bg-white transition-all duration-200 pr-12`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-xs text-error mt-1">{errors.password}</p>}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 editorial-gradient text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-95"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    {isLogin ? 'Sign in' : 'Create my account'}
                                </Button>
                            </form>

                            <p className="mt-6 text-center text-slate-500 text-sm">
                                {isLogin ? "New to Italostudy? " : "Already have an account? "}
                                <button
                                    onClick={() => { setIsLogin(!isLogin); setErrors({}); }}
                                    className="text-primary font-bold hover:underline decoration-2 underline-offset-4"
                                >
                                    {isLogin ? 'Join us' : 'Sign in'}
                                </button>
                            </p>
                        </div>
                    )}

                    {isForgotPassword && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <form onSubmit={handleResetPassword} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700" htmlFor="reset-email">Email address</label>
                                    <Input
                                        id="reset-email"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                                        className={`w-full h-12 px-4 rounded-xl bg-slate-50 border-none ring-1 ${errors.email ? 'ring-error' : 'ring-slate-200'} focus:ring-2 focus:ring-primary focus:bg-white transition-all duration-200`}
                                    />
                                    {errors.email && <p className="text-xs text-error mt-1">{errors.email}</p>}
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 editorial-gradient text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-95"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Send reset link
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => setIsForgotPassword(false)}
                                    className="w-full text-center text-sm text-slate-500 hover:text-primary transition-colors mt-4"
                                >
                                    Go back to sign in
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
