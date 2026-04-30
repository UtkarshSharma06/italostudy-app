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
    Rocket, Shield, Star, Layers, Layout
} from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { usePricing } from '@/context/PricingContext';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import OwlAnimation from '@/components/animations/OwlAnimation';
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
    'TIL-I': { icon: Calculator, bg: 'bg-[#F0FFF4]', color: 'text-[#38A169]' },
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

    const [selectedPlan, setSelectedPlan] = useState<string | null>(profile?.selected_plan || null);
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
            else if (!profile.selected_plan) setStep(5);
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
            if (isMissingOnlyPhone) {
                handleConfirm();
            } else {
                setStep(5);
            }
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
            const tierMap: any = { 'explorer': 'initiate', 'pro': 'elite', 'elite': 'global', 'global': 'global' };
            const targetTier = tierMap[selectedPlan] || 'initiate';

            const { error } = await supabase.from('profiles').update({
                selected_exam: selectedExam,
                selected_plan: selectedPlan,
                subscription_tier: targetTier,
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
        <>
            {/* Word-spin loading overlay */}
            {isRedirecting && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <style>{`
@keyframes spin_4991 {
    10% { transform: translateY(-102%); }
    25% { transform: translateY(-100%); }
    35% { transform: translateY(-202%); }
    50% { transform: translateY(-200%); }
    60% { transform: translateY(-302%); }
    75% { transform: translateY(-300%); }
    85% { transform: translateY(-402%); }
    100% { transform: translateY(-400%); }
}
.ob-loader-words {
    overflow: hidden;
    position: relative;
}
.ob-loader-words::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(white 10%, transparent 30%, transparent 70%, white 90%);
    z-index: 20;
}
.ob-loader-word {
    display: block;
    height: 100%;
    padding-left: 6px;
    color: #E67E22;
    animation: spin_4991 4s infinite;
}
`}</style>
                    <div style={{
                        color: '#64748B',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontWeight: 600,
                        fontSize: '26px',
                        display: 'flex',
                        height: '40px',
                        alignItems: 'center',
                        padding: '10px'
                    }}>
                        <p style={{ marginRight: '8px' }}>Setting up your</p>
                        <div className="ob-loader-words">
                            <span className="ob-loader-word">plan...</span>
                            <span className="ob-loader-word">exams...</span>
                            <span className="ob-loader-word">schedule...</span>
                            <span className="ob-loader-word">profile...</span>
                            <span className="ob-loader-word">plan...</span>
                        </div>
                    </div>
                </div>
            )}

            <div
                ref={scrollContainerRef}
                className="h-screen w-full bg-[#F8FAFC] flex flex-col items-center justify-center overflow-hidden relative"
            >
                <div className="w-full flex flex-col items-center gap-0 z-10 scale-90 md:scale-[0.82] origin-center px-4">
                    {!isMissingOnlyPhone && (
                        <div className="w-full max-w-4xl px-8 mb-3">
                            <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden shadow-sm">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-[#E67E22] to-[#D35400]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(step === 1 ? 1/3 : (step === 4 ? 2/3 : 1)) * 100}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </div>
                        </div>
                    )}

                    <OwlAnimation
                        message={
                            step === 1 ? "Choose your path to success!" :
                                step === 4 ? (isMissingOnlyPhone ? "Fill out the missing step to continue using ItaloStudy" : "Let's personalize your experience!") :
                                    "Almost there! Select your plan."
                        }
                    />
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className={cn(
                                "w-full bg-white rounded-[2.5rem] border border-[#F1F5F9] shadow-2xl shadow-[#64748B]/10 flex flex-col items-center relative transition-all duration-300",
                                step === 1 ? "max-w-4xl p-5 md:p-6" : "max-w-2xl p-5 md:p-6"
                            )}
                        >
                            {/* Header Content */}
                            <div className={cn("text-center", (step === 2 || step === 3) ? "mb-4" : "mb-6")}>
                                <h2 className="text-2xl font-black text-[#1E293B] uppercase tracking-tight">
                                    {step === 1 ? "Which exam are you preparing for?" :
                                        step === 4 ? (isMissingOnlyPhone ? "Fill out the missing step" : "Can you tell me a bit about yourself?") :
                                            "Select Access Plan"}
                                </h2>
                            </div>

                            {/* Step Body */}
                            <div className="w-full flex-1 max-h-[60vh] overflow-y-auto no-scrollbar scroll-smooth">
                                {step === 1 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {availableExams.map((exam) => {
                                            const theme = LocalIconMap[exam.name] || LocalIconMap[exam.name.split(' ')[0]] || { icon: Brain, bg: 'bg-[#F1F5F9]', color: 'text-[#64748B]' };
                                            const Icon = theme.icon;
                                            return (
                                                <button
                                                    key={exam.id}
                                                    onClick={() => setSelectedExam(exam.id)}
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-[0.98] group relative",
                                                        selectedExam === exam.id ? "border-[#E67E22] bg-[#FFF3E0]" : cn("border-[#F1F5F9]", theme.bg)
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-white/50 shadow-sm transition-transform group-hover:scale-105",
                                                        theme.color,
                                                        "bg-white"
                                                    )}>
                                                        <Icon className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <h3 className="font-black text-xs uppercase text-[#1E293B] tracking-tight truncate">{exam.name}</h3>
                                                    </div>
                                                    {selectedExam === exam.id && (
                                                        <div className="absolute top-2 right-2 w-5 h-5 bg-[#E67E22] rounded-full flex items-center justify-center shadow-md scale-110">
                                                            <Check className="text-white w-3 h-3 stroke-[4]" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                 {/* Steps 2 and 3 removed */}

                                {step === 4 && (
                                    <div className="space-y-6">
                                         <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Username <span className="text-[#E67E22]">*</span></label>
                                            <div className="relative">
                                                <Input
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                                                    placeholder="Choose a unique username"
                                                    className={cn(
                                                        "h-14 bg-white border-[#F1F5F9] rounded-2xl font-bold focus:ring-4 focus:ring-[#E67E22]/5 transition-all text-[#1E293B] shadow-sm pr-12",
                                                        usernameError ? "border-red-400 focus:border-red-400" : (isUsernameAvailable ? "border-green-400 focus:border-green-400" : "focus:border-[#E67E22]")
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
                                                <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">First Name <span className="text-[#E67E22]">*</span></label>
                                                <Input
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    placeholder="Enter first name"
                                                    className="h-14 bg-white border-[#F1F5F9] rounded-2xl font-bold focus:border-[#E67E22] focus:ring-4 focus:ring-[#E67E22]/5 transition-all text-[#1E293B] shadow-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Last Name <span className="text-[#E67E22]">*</span></label>
                                                <Input
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    placeholder="Enter last name"
                                                    className="h-14 bg-white border-[#F1F5F9] rounded-2xl font-bold focus:border-[#E67E22] focus:ring-4 focus:ring-[#E67E22]/5 transition-all text-[#1E293B] shadow-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Phone Number <span className="text-[#E67E22]">*</span></label>
                                            <div className="relative group flex flex-col gap-2">
                                                <div className="flex items-center bg-white border-2 border-[#F1F5F9] rounded-2xl focus-within:border-[#E67E22] focus-within:ring-4 focus-within:ring-[#E67E22]/5 transition-all px-1 shadow-sm">
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
                                                        <PopoverContent className="p-0 w-[240px] z-[9999] bg-white border border-[#F1F5F9] shadow-2xl" align="start">
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
                                                                                className="flex items-center gap-3 p-4 cursor-pointer text-[#1E293B] data-[selected=true]:bg-[#F1F5F9] data-[selected=true]:text-[#E67E22]"
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
                                    </div >
                                )
                                }

                                {
                                    step === 5 && (
                                        <div className="space-y-4">
                                            {/* View Details Button */}
                                            <button
                                                onClick={() => setShowPricingHover(true)}
                                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#E67E22] hover:text-[#D35400] transition-colors underline underline-offset-2"
                                            >
                                                <Info className="w-3.5 h-3.5" />
                                                View Plan Details
                                            </button>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {plans.map((p) => {
                                                    const PlanIconMap: Record<string, any> = {
                                                        'explorer': Shield,
                                                        'pro': Rocket,
                                                        'elite': Star,
                                                        'global': Globe,
                                                    };
                                                    const PlanIcon = PlanIconMap[p.id] || Sparkles;
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => setSelectedPlan(p.id)}
                                                            className={cn(
                                                                "p-5 rounded-[2rem] border-2 transition-all flex flex-col items-center text-center active:scale-[0.98]",
                                                                selectedPlan === p.id ? "border-[#E67E22] bg-[#FFF3E0]" : "border-[#F1F5F9] shadow-sm"
                                                            )}
                                                        >
                                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm", p.color || 'bg-[#E67E22]', !p.color?.includes('bg-') && 'bg-[#F8FAFC]')}>
                                                                <PlanIcon className={cn("w-6 h-6", (p.color === 'bg-[#E67E22]' || !p.color) ? "text-white" : "text-[#E67E22]")} />
                                                            </div>
                                                            <h3 className="font-black text-xs uppercase text-[#1E293B] mb-1">{p.name}</h3>
                                                            <p className="text-[10px] font-black text-[#E67E22] uppercase tracking-widest">
                                                                {config.mode === 'beta' ? 'FREE ACCESS' : (p.monthlyPrice === 0 ? 'FREE' : formatPrice(p.monthlyPrice || 0))}
                                                            </p>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )
                                }
                            </div >

                            {/* Footer Navigation */}
                            < div className="w-full mt-6 pt-6 border-t border-[#F1F5F9] flex justify-between items-center" >
                                {!isMissingOnlyPhone && step > 1 && (
                                    <button
                                        onClick={handleBack}
                                        className={cn(
                                            "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#94A3B8] hover:text-[#E67E22] transition-colors py-3 px-6 rounded-full",
                                            "hover:bg-[#F8FAFC]"
                                        )}
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Back
                                    </button>
                                )}
                                <Button
                                    disabled={
                                        (step === 1 && !selectedExam) ||
                                        (step === 4 && (!firstName || !lastName || !username || !isUsernameAvailable || getDigits(phoneNumber).length !== phoneLimit || isSubmitting)) ||
                                        (step === 5 && (!selectedPlan || isSubmitting || getDigits(phoneNumber).length !== phoneLimit || !firstName || !lastName || !username || !isUsernameAvailable))
                                    }
                                    onClick={step === 5 ? handleConfirm : handleNextStep}
                                    className="h-14 px-10 rounded-full bg-[#E67E22] hover:bg-[#D35400] text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-[#E67E22]/20 active:scale-95 transition-all"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> :
                                        (step === 5 || (step === 4 && isMissingOnlyPhone)) ? "Begin Preparation" : "Continue"}
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </div >
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Pricing Hover Details */}
                <OnboardingPricingHover
                    isOpen={showPricingHover}
                    onClose={() => setShowPricingHover(false)}
                />

                {/* Background elements */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E67E22]/5 blur-[120px] rounded-full -mr-64 -mt-64" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#3B82F6]/5 blur-[120px] rounded-full -ml-64 -mb-64" />
            </div>
        </>
    );
}
