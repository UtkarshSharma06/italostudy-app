import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    Check, X, ArrowRight, Brain, Globe, GraduationCap, Target,
    Zap, Sparkles, Loader2, Trophy, Clock, Coffee, BookOpen, Flame,
    ChevronLeft, User, Phone, Mail, Search, Stethoscope, Book, Calculator, Apple, Info,
    Rocket, Shield, Star, Layers, Layout, Headphones, Compass, ShieldCheck
} from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { usePricing } from '@/context/PricingContext';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import OnboardingPricingHover from '@/components/onboarding/OnboardingPricingHover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { countries } from '@/lib/countries';
import { formatPhoneNumber, getDigits } from '@/lib/phone-utils';

const studyHoursOptions = [
    { id: '5-10', title: 'Just essentials', range: '5-10 hours', color: 'bg-[#FFF8F1] border-[#FFD9B3] text-[#854D0E]', iconColor: 'text-[#E67E22]', icon: Coffee },
    { id: '10-15', title: 'Balanced approach', range: '10-15 hours', color: 'bg-[#F0F7FF] border-[#C2E0FF] text-[#075985]', iconColor: 'text-[#3498DB]', icon: BookOpen },
    { id: '15-20', title: 'Serious commitment', range: '15-20 hours', color: 'bg-[#FDF4FF] border-[#F5D0FE] text-[#86198F]', iconColor: 'text-[#9B59B6]', icon: Zap },
    { id: '20-30', title: 'Maximum effort', range: '20-30 hours', color: 'bg-[#FFF1F2] border-[#FECDD3] text-[#9F1239]', iconColor: 'text-[#E74C3C]', icon: Flame },
];

const LocalIconMap: any = {
    'SAT': { icon: Book, bg: 'bg-[#EBF5FF]', color: 'text-[#3182CE]' },
    'CEnT-S Entrance Exam': { icon: GraduationCap, bg: 'bg-[#FFF5F5]', color: 'text-[#E53E3E]' },
    'CENT-S': { icon: GraduationCap, bg: 'bg-[#FFF5F5]', color: 'text-[#E53E3E]' },
    'TIL-I': { icon: Calculator, bg: 'bg-[#FFFBEB]', color: 'text-[#D97706]' },
    'TOLC-I': { icon: Calculator, bg: 'bg-[#F0FFF4]', color: 'text-[#38A169]' },
    'TOLC-E': { icon: BookOpen, bg: 'bg-[#FAF5FF]', color: 'text-[#805AD5]' },
    'IMAT (INTERNATIONAL MEDICAL ADMISSIONS TEST)': { icon: Stethoscope, bg: 'bg-[#FFF5F5]', color: 'text-[#E53E3E]' },
    'IMAT': { icon: Stethoscope, bg: 'bg-[#FFF5F5]', color: 'text-[#E53E3E]' },
    'BOCCONI': { icon: GraduationCap, bg: 'bg-[#FFFAF0]', color: 'text-[#DD6B20]' },
    'TEST ARCHED': { icon: Layers, bg: 'bg-[#EBF5FF]', color: 'text-[#3182CE]' },
    'AP': { icon: Book, bg: 'bg-[#E6FFFA]', color: 'text-[#319795]' },
    'TOLC-PSI': { icon: Brain, bg: 'bg-[#FFF5F5]', color: 'text-[#E53E3E]' },
    'TOLC-F': { icon: Sparkles, bg: 'bg-[#E6FFFA]', color: 'text-[#319795]' },
    'TIL-A': { icon: Calculator, bg: 'bg-[#F0FFF4]', color: 'text-[#38A169]' },
    'TR-YÖS': { icon: GraduationCap, bg: 'bg-[#FFFAF0]', color: 'text-[#DD6B20]' },
};

export default function Onboarding() {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { user, profile, loading, refreshProfile } = useAuth() as any;
    const { setActiveExam, allExams } = useExam();
    const { config, isLoading: isConfigLoading, openPricingModal } = usePricing();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { formatPrice } = useCurrency();

    // Steps: 1: Exam, 4: Personal, 5: Plan
    const [step, setStep] = useState(1);
    const [selectedExam, setSelectedExam] = useState<string | null>(profile?.selected_exam || null);
    const [targetScore, setTargetScore] = useState<number>(profile?.target_score || 80);
    const [selectedHours, setSelectedHours] = useState<string | null>(profile?.study_hours || '10-15');

    // Step 4 fields
    const [firstName, setFirstName] = useState(profile?.first_name || '');
    const [lastName, setLastName] = useState(profile?.last_name || '');
    const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
    const [countryDial, setCountryDial] = useState("+90");
    const [countryCode, setCountryCode] = useState("tr");
    const [phoneLimit, setPhoneLimit] = useState(10);
    const [openCountryPopup, setOpenCountryPopup] = useState(false);

    // Username fields
    const [username, setUsername] = useState(profile?.username || '');
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

    const [selectedPlan, setSelectedPlan] = useState<string | null>(profile?.selected_plan || 'explorer');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPricingHover, setShowPricingHover] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(true);

    const isMissingOnlyPhone = profile?.selected_exam && profile?.selected_plan && profile?.study_hours && !profile?.phone_number;

    useEffect(() => {
        if (profile && isSyncing) {
            // Sync values
            if (!selectedExam && profile.selected_exam) setSelectedExam(profile.selected_exam);
            if (!selectedPlan && profile.selected_plan) setSelectedPlan(profile.selected_plan);
            if (!selectedHours && profile.study_hours) setSelectedHours(profile.study_hours);
            if (!firstName && profile.first_name) setFirstName(profile.first_name);
            if (!lastName && profile.last_name) setLastName(profile.last_name);

            // Smart Jump Logic: Jump to the FIRST missing piece of information
            if (!profile.selected_exam) setStep(1);
            else if (!profile.phone_number || !profile.username) setStep(4);
            else {
                // If everything is present, we shouldn't be here
                navigate('/dashboard');
            }

            // Small delay to ensure state updates have settled before hiding loader
            setTimeout(() => setIsSyncing(false), 500);
        } else if (!profile && !loading && isSyncing) {
            // If no profile yet and not loading, it's a new user
            setIsSyncing(false);
        }
    }, [profile, loading]);

    // IP-Based Country Detection
    useEffect(() => {
        const detectCountry = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                if (data.country_code) {
                    const country = countries.find(c => c.code.toLowerCase() === data.country_code.toLowerCase());
                    if (country) {
                        setCountryCode(country.code.toLowerCase());
                        setCountryDial(country.dial);
                        setPhoneLimit(country.len || 10);
                    }
                }
            } catch (error) {
                console.error("IP Detection failed:", error);
            }
        };
        detectCountry();
    }, []);

    // Name Auto-Fill from Auth Metadata
    useEffect(() => {
        if (user?.user_metadata && !firstName && !lastName) {
            const fullName = user.user_metadata.full_name || user.user_metadata.display_name;
            if (fullName) {
                const parts = fullName.split(' ');
                if (parts.length > 0) setFirstName(parts[0]);
                if (parts.length > 1) setLastName(parts.slice(parts.length - 1).join(' '));
            }
        }
    }, [user, firstName, lastName]);

    // Username Uniqueness Check
    useEffect(() => {
        if (!username) {
            setIsUsernameAvailable(null);
            setUsernameError(null);
            return;
        }

        // Basic format check
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            setUsernameError("3-20 characters (letters, numbers, underscores)");
            setIsUsernameAvailable(false);
            return;
        }

        setUsernameError(null);
        const timer = setTimeout(async () => {
            if (username === profile?.username) {
                setIsUsernameAvailable(true);
                return;
            }

            setIsCheckingUsername(true);
            try {
                const { data, error } = await (supabase
                    .from('profiles') as any)
                    .select('id')
                    .eq('username', username.toLowerCase())
                    .maybeSingle();

                if (data) {
                    setIsUsernameAvailable(false);
                    setUsernameError("Username is already taken");
                } else {
                    setIsUsernameAvailable(true);
                }
            } catch (err) {
                console.error("Error checking username:", err);
            } finally {
                setIsCheckingUsername(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username, profile?.username]);

    // This useEffect was causing the animation to be skipped by redirecting 
    // as soon as the profile was updated in the database.
    /*
    useEffect(() => {
        if (profile?.selected_exam && profile?.selected_plan) {
            navigate('/dashboard');
        }
    }, [profile, navigate]);
    */

    const handleNextStep = () => {
        if (step === 1 && selectedExam) setStep(4);
        else if (step === 4 && firstName && lastName && username && isUsernameAvailable && getDigits(phoneNumber).length === phoneLimit) {
            handleConfirm();
        }
        else if (step === 4) {
            let desc = "Please fill in all details.";
            if (getDigits(phoneNumber).length !== phoneLimit) desc = `Phone number must be ${phoneLimit} digits.`;
            if (!username) desc = "Please choose a username.";
            if (usernameError) desc = usernameError;
            if (isUsernameAvailable === false) desc = "Username is taken or invalid.";
            
            toast({ title: "Incomplete Info", description: desc, variant: "destructive" });
        }
    };

    const handleBack = () => {
        if (step === 4) setStep(1);
        else if (step > 1) setStep(step - 1);
    };

    const handleConfirm = async () => {
        if (!selectedExam) return toast({ title: "Error", description: "Please select an exam.", variant: "destructive" });
        if (!selectedPlan) return toast({ title: "Error", description: "Please select a plan.", variant: "destructive" });
        if (!selectedHours) return toast({ title: "Error", description: "Please select study hours.", variant: "destructive" });
        if (!user) return toast({ title: "Error", description: "User not found.", variant: "destructive" });
        if (getDigits(phoneNumber).length !== phoneLimit) {
            return toast({ title: "Invalid Phone", description: `Phone number must be ${phoneLimit} digits.`, variant: "destructive" });
        }

        setIsSubmitting(true);

        try {
            const rawDigits = getDigits(phoneNumber);
            const fullPhone = `${countryDial}${rawDigits.startsWith('+') ? rawDigits.slice(countryDial.length) : rawDigits}`.trim();
            
            const isPremium = selectedPlan && selectedPlan !== 'explorer';

            const { error } = await supabase.from('profiles').update({
                selected_exam: selectedExam,
                selected_plan: 'explorer',
                subscription_tier: 'initiate',
                target_score: targetScore,
                study_hours: selectedHours,
                first_name: firstName,
                last_name: lastName,
                username: username.toLowerCase(),
                display_name: `${firstName} ${lastName}`.trim(),
                phone_number: fullPhone
            }).eq('id', user.id);

            if (error) throw error;
            await refreshProfile();
            await setActiveExam(selectedExam);

            toast({ title: "Setup Complete", description: "Welcome to ITALO STUDY." });
            setIsRedirecting(true);
            
            // Check for smart redirect (if user came from store)
            const storeRedirect = sessionStorage.getItem('post_login_redirect');
            const pendingDownload = sessionStorage.getItem('pending_resource_download');
            
            let targetPath = '/dashboard';
            if (storeRedirect) {
                targetPath = storeRedirect;
                sessionStorage.removeItem('post_login_redirect');
            } else if (pendingDownload) {
                targetPath = `/resources/${pendingDownload}`;
            }

            if (isPremium) {
                openPricingModal();
            }

            console.log(`Profile refresh successful, navigating to ${targetPath} in 2.5s...`);
            setTimeout(() => {
                navigate(targetPath);
            }, 1500);
        } catch (error: any) {
            toast({ title: "Setup Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [step]);

    if (isConfigLoading || !config) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-[#E67E22]" />
            </div>
        );
    }

    const availableExams = Object.values(allExams).filter(e => e.isLive);
    const plans = config.plans.filter(p => p.isVisible !== false);

    if (isSyncing || loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-violet-600 animate-pulse" />
                    </div>
                </div>
                <h2 className="mt-6 text-lg font-black text-[#1E293B] uppercase tracking-tighter">Personalizing Your Journey...</h2>
                <p className="mt-2 text-sm font-bold text-[#94A3B8]">Finding where you left off</p>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] w-full bg-[#FAFAFA] flex flex-col relative overflow-x-hidden overflow-y-auto font-sans">
            {/* Header */}
            <div className="w-full h-20 px-8 flex justify-between items-center bg-transparent z-50">
                <img src="/logo.webp" alt="ItaloStudy" className="h-8 md:h-10" />
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-500 hidden sm:inline-block">Need help?</span>
                    <Popover>
    <PopoverTrigger asChild>
        <button className="flex items-center gap-2 border border-slate-200 text-[#5A32FA] rounded-full px-4 sm:px-5 py-2 sm:py-2.5 hover:bg-slate-50 transition-colors font-bold text-xs sm:text-sm bg-white shadow-sm">
            <Headphones className="w-4 h-4" />
            <span className="hidden sm:inline-block">Contact Support</span>
        </button>
    </PopoverTrigger>
    <PopoverContent className="w-56 p-2 rounded-xl border-slate-200 shadow-xl" align="end">
        <div className="flex flex-col gap-1">
                                    <button onClick={() => {
                                        navigator.clipboard.writeText('contact@italostudy.com');
                                        toast({ title: "Email copied", description: "contact@italostudy.com copied to clipboard." });
                                    }} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-slate-700 font-medium text-sm text-left">
                                        <Mail className="w-4 h-4 text-[#5A32FA]" />
                                        Email Us
                                    </button>
            <a href="https://chat.whatsapp.com/CfVh7u9L6vT7ZFpZwwVa4A" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 hover:bg-[#25D366]/10 rounded-lg transition-colors text-slate-700 font-medium text-sm">
                <Phone className="w-4 h-4 text-[#25D366]" />
                WhatsApp
            </a>
        </div>
    </PopoverContent>
</Popover>
                </div>
            </div>

            {/* Progress Bar Header */}
            {!isMissingOnlyPhone && (
                <div className="w-full flex justify-center mt-4 z-20 px-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Step 1 */}
                        <div className="flex items-center gap-2">
                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", step === 1 ? "bg-[#5A32FA] text-white" : (step > 1 ? "bg-[#5A32FA] text-white" : "bg-white border border-slate-200 text-slate-400"))}>
                                {step > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : "1"}
                            </div>
                            <span className={cn("text-xs sm:text-sm font-bold hidden sm:inline-block", step === 1 ? "text-[#5A32FA]" : (step > 1 ? "text-[#5A32FA]" : "text-slate-400"))}>Getting Started</span>
                        </div>
                        <div className={cn("w-12 sm:w-24 h-px", step > 1 ? "bg-[#5A32FA]" : "bg-slate-200")}></div>
                        {/* Step 2 (Actually step 4 in our logic) */}
                        <div className="flex items-center gap-2">
                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", step === 4 ? "bg-white border-2 border-[#5A32FA] text-[#5A32FA]" : (step > 4 ? "bg-[#5A32FA] text-white" : "bg-white border border-slate-200 text-slate-400"))}>
                                {step > 4 ? <Check className="w-4 h-4 stroke-[3]" /> : "2"}
                            </div>
                            <span className={cn("text-xs sm:text-sm font-medium hidden sm:inline-block", step === 4 ? "text-slate-900 font-bold" : (step > 4 ? "text-[#5A32FA]" : "text-slate-400"))}>Personalize</span>
                        </div>
                        <div className={cn("w-12 sm:w-24 h-px", step > 4 ? "bg-[#5A32FA]" : "bg-slate-200")}></div>
                        {/* Step 3 (Actually step 5 in our logic) */}
                        <div className="flex items-center gap-2">
                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", step === 5 ? "bg-white border-2 border-[#5A32FA] text-[#5A32FA]" : "bg-white border border-slate-200 text-slate-400")}>
                                3
                            </div>
                            <span className={cn("text-xs sm:text-sm font-medium hidden sm:inline-block", step === 5 ? "text-slate-900 font-bold" : "text-slate-400")}>All Set</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 w-full flex flex-col items-center justify-start pt-4 z-20">
                <div className="w-full flex flex-col items-center scale-[0.80] sm:scale-[0.85] md:scale-90 xl:scale-100 origin-top px-4 pb-12">
                {/* Welcome Text */}
                <h1 className="text-3xl md:text-[2.75rem] font-black text-slate-900 tracking-tight text-center mb-2">
                    Welcome to ItaloStudy! 👋
                </h1>
                <p className="text-slate-500 text-center text-xs md:text-sm max-w-lg mb-3 leading-relaxed">
                    Let's personalize your experience so we can help you <br/>
                    <span className="text-[#5A32FA] font-bold">learn better and achieve more.</span>
                </p>

                {/* Owl Image */}
                <img src="/onboarding.webp" alt="Owl" className="h-40 md:h-52 object-contain -mb-10 relative z-30" />

                {/* The Card */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-3xl md:rounded-[2rem] shadow-xl shadow-indigo-900/5 border border-slate-100 p-6 md:p-10 w-full max-w-3xl relative z-20"
                    >
                        {step === 1 && (
                            <>
                                <div className="flex gap-4 items-start mb-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5A32FA] flex items-center justify-center shrink-0">
                                        <Compass className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-1">Which exam are you preparing for?</h2>
                                        <p className="text-slate-500 text-sm">This helps us tailor the platform to your exam journey.</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    {availableExams.map((exam) => {
                                        const theme = LocalIconMap[exam.name] || LocalIconMap[exam.name.split(' ')[0]] || { icon: Brain, bg: 'bg-[#F8FAFC]', color: 'text-slate-400' };
                                        const Icon = theme.icon;
                                        const isSelected = selectedExam === exam.id;
                                        
                                        return (
                                            <button
                                                key={exam.id}
                                                onClick={() => setSelectedExam(exam.id)}
                                                className={cn(
                                                    "flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group",
                                                    isSelected ? "border-[#5A32FA] bg-[#F4F1FF]/50 ring-1 ring-[#5A32FA]" : "border-slate-200 hover:border-[#5A32FA]/30 bg-white hover:bg-slate-50"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
                                                    isSelected ? "bg-[#F4F1FF] text-[#5A32FA]" : cn(theme.bg, theme.color)
                                                )}>
                                                    <Icon className="w-7 h-7" />
                                                </div>
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <h3 className={cn("font-bold text-sm mb-1 truncate", isSelected ? "text-[#5A32FA]" : "text-slate-900")}>
                                                        {exam.name}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 leading-snug line-clamp-2">
                                                        Prepare for the {exam.name} exam for universities in Italy.
                                                    </p>
                                                </div>
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ml-1 transition-colors",
                                                    isSelected ? "border-[#5A32FA]" : "border-slate-300 bg-white"
                                                )}>
                                                    {isSelected && <div className="w-3 h-3 rounded-full bg-[#5A32FA]" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {step === 4 && (
                            <>
                                <div className="flex gap-4 items-start mb-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5A32FA] flex items-center justify-center shrink-0">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-1">
                                            {isMissingOnlyPhone ? "Fill out the missing step" : "Can you tell me a bit about yourself?"}
                                        </h2>
                                        <p className="text-slate-500 text-sm">We use this to set up your profile and account.</p>
                                    </div>
                                </div>
                                <div className="space-y-6 mb-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Username <span className="text-[#5A32FA]">*</span></label>
                                        <div className="relative">
                                            <Input
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                                                placeholder="Choose a unique username"
                                                className={cn(
                                                    "h-14 bg-white border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-[#5A32FA]/10 transition-all text-[#1E293B] shadow-sm pr-12",
                                                    usernameError ? "border-red-400 focus:border-red-400" : (isUsernameAvailable ? "border-green-400 focus:border-green-400" : "focus:border-[#5A32FA]")
                                                )}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                {isCheckingUsername ? (
                                                    <Loader2 className="w-4 h-4 text-[#94A3B8] animate-spin" />
                                                ) : (
                                                    <>
                                                        {isUsernameAvailable === true && <Check className="w-4 h-4 text-green-500 stroke-[3]" />}
                                                        {isUsernameAvailable === false && <X className="w-4 h-4 text-red-500 stroke-[3]" />}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {usernameError && <p className="text-[9px] font-bold text-red-500 ml-2 uppercase tracking-tight">{usernameError}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">First Name <span className="text-[#5A32FA]">*</span></label>
                                            <Input
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="Enter first name"
                                                className="h-14 bg-white border-slate-200 rounded-2xl font-bold focus:border-[#5A32FA] focus:ring-4 focus:ring-[#5A32FA]/10 transition-all text-[#1E293B] shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Last Name <span className="text-[#5A32FA]">*</span></label>
                                            <Input
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="Enter last name"
                                                className="h-14 bg-white border-slate-200 rounded-2xl font-bold focus:border-[#5A32FA] focus:ring-4 focus:ring-[#5A32FA]/10 transition-all text-[#1E293B] shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Phone Number <span className="text-[#5A32FA]">*</span></label>
                                        <div className="relative group flex flex-col gap-2">
                                            <div className="flex items-center bg-white border border-slate-200 rounded-2xl focus-within:border-[#5A32FA] focus-within:ring-4 focus-within:ring-[#5A32FA]/10 transition-all px-1 shadow-sm">
                                                <Popover open={openCountryPopup} onOpenChange={setOpenCountryPopup}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" className="h-12 px-3 font-bold flex items-center gap-2 hover:bg-[#F8FAFC]">
                                                            <img
                                                                src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                                                                alt="Flag"
                                                                className="w-5 h-auto rounded-[2px]"
                                                            />
                                                            <span className="text-[#1E293B] opacity-40">|</span>
                                                            <span className="text-sm text-[#1E293B]">{countryDial}</span>
                                                        </Button >
                                                    </PopoverTrigger >
                                                    <PopoverContent className="p-0 w-[240px] z-[9999] bg-white border border-slate-200 shadow-2xl" align="start">
                                                        <Command className="bg-white">
                                                            <CommandInput placeholder="Search country..." className="text-[#1E293B] focus:ring-0 focus-visible:ring-0 focus:outline-none" />
                                                            <CommandList className="max-h-[300px] bg-white">
                                                                <CommandEmpty className="text-[#94A3B8]">No country found.</CommandEmpty>
                                                                <CommandGroup className="bg-white">
                                                                    {countries.map((c) => (
                                                                        <CommandItem
                                                                            key={c.code}
                                                                            onSelect={() => {
                                                                                setCountryDial(c.dial);
                                                                                setCountryCode(c.code.toLowerCase());
                                                                                setPhoneLimit(c.len || 10);
                                                                                setOpenCountryPopup(false);
                                                                            }}
                                                                            className="flex items-center gap-3 p-4 cursor-pointer text-[#1E293B] data-[selected=true]:bg-indigo-50 data-[selected=true]:text-[#5A32FA]"
                                                                        >
                                                                            <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} className="w-5 h-auto rounded-[1px]" />
                                                                            <span className="font-bold text-sm">{c.name}</span>
                                                                            <span className="ml-auto text-[10px] opacity-40">{c.dial}</span>
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover >
                                                <Input
                                                    value={phoneNumber}
                                                    onChange={(e) => {
                                                        const formatted = formatPhoneNumber(e.target.value, countryCode.toUpperCase());
                                                        const digits = getDigits(formatted);
                                                        if (digits.length <= phoneLimit) setPhoneNumber(formatted);
                                                    }}
                                                    placeholder="e.g. 555 000 000"
                                                    className="h-12 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 font-bold text-[#1E293B] shadow-none rounded-none"
                                                />
                                            </div >
                                            <p className="text-[10px] font-bold text-[#94A3B8] italic ml-2">
                                                Don't worry, we are not gonna spam you! 😉
                                            </p>
                                        </div >
                                    </div >
                                </div>
                            </>
                        )}


                        <div className="flex gap-4 justify-center w-full">
                            {step > 1 && (
                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-2 text-[12px] font-bold text-slate-400 hover:text-slate-600 transition-colors px-6 h-12 rounded-xl hover:bg-slate-50"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                            )}
                            <Button
                                disabled={
                                    (step === 1 && !selectedExam) ||
                                    (step === 4 && (!firstName || !lastName || !username || !isUsernameAvailable || getDigits(phoneNumber).length !== phoneLimit || isSubmitting))
                                }
                                onClick={step === 4 ? handleConfirm : handleNextStep}
                                className="w-full md:w-auto md:min-w-[200px] h-12 rounded-xl bg-[#5A32FA] hover:bg-[#4a26d8] text-white font-bold text-sm transition-all shadow-lg shadow-[#5A32FA]/20"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> :
                                    (step === 4) ? "Begin Preparation" : "Continue"}
                                {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4" />}
                            </Button>
                        </div>

                    </motion.div>
                </AnimatePresence>
                
                <div className="flex items-center justify-center gap-2 mt-4 text-slate-500 text-xs font-medium w-fit mx-auto px-4 py-2 relative z-30">
                    <ShieldCheck className="w-4 h-4 text-[#5A32FA]" /> Trusted by 12,000+ students worldwide
                </div>
            </div>
        </div>

            {/* Background elements */}
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-[#5A32FA]/5 blur-[120px] rounded-full pointer-events-none z-0" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#5A32FA]/5 blur-[120px] rounded-full pointer-events-none z-0" />
        </div>
    );
}










