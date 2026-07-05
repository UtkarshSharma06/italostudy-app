import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import OnboardingPricingHover from '@/components/onboarding/OnboardingPricingHover';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    Check, X, ArrowRight, Brain, Globe,
    GraduationCap, Target, Sparkles, Zap, ChevronLeft, Loader2,
    Trophy, Clock, Coffee, BookOpen, Flame, User, Phone, Search, Stethoscope,
    Book, Calculator, Apple, Layers, Info, Rocket, Shield, Star,
    Headphones, Mail, Compass, ShieldCheck
} from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { usePricing } from '@/context/PricingContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import OwlAnimation from '@/components/animations/OwlAnimation';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
    { id: '5-10', title: 'Just essentials', range: '5-10h', color: 'bg-[#FFF8F1] border-[#FFD9B3] text-[#854D0E]', iconColor: 'text-[#E67E22]', icon: Coffee },
    { id: '10-15', title: 'Balanced', range: '10-15h', color: 'bg-[#F0F7FF] border-[#C2E0FF] text-[#075985]', iconColor: 'text-[#3498DB]', icon: BookOpen },
    { id: '15-20', title: 'Serious', range: '15-20h', color: 'bg-[#FDF4FF] border-[#F5D0FE] text-[#86198F]', iconColor: 'text-[#9B59B6]', icon: Zap },
    { id: '20-30', title: 'Maximum', range: '20-30h', color: 'bg-[#FFF1F2] border-[#FECDD3] text-[#9F1239]', iconColor: 'text-[#E74C3C]', icon: Flame },
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

export default function MobileOnboarding() {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { user, profile, loading, refreshProfile } = useAuth() as any;
    const { setActiveExam, allExams } = useExam();
    const { config, isLoading: isConfigLoading, openPricingModal } = usePricing();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { formatPrice } = useCurrency();

    const [step, setStep] = useState(1);
    const [selectedExam, setSelectedExam] = useState<string | null>(profile?.selected_exam || null);
    const [targetScore, setTargetScore] = useState<number>(profile?.target_score || 80);
    const [selectedHours, setSelectedHours] = useState<string | null>(profile?.study_hours || '10-15');

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
            // Sync values from existing profile
            if (!selectedExam && profile.selected_exam) setSelectedExam(profile.selected_exam);
            if (!selectedPlan && profile.selected_plan) setSelectedPlan(profile.selected_plan);
            if (!selectedHours && profile.study_hours) setSelectedHours(profile.study_hours);
            if (!firstName && profile.first_name) setFirstName(profile.first_name);
            if (!lastName && profile.last_name) setLastName(profile.last_name);

            // Smart Jump Logic: Jump to the FIRST missing field
            if (!profile.selected_exam) setStep(1);
            else if (!profile.username || !profile.phone_number) setStep(4);
            else {
                // If everything is present, we shouldn't be here, but let's redirect to be safe
                navigate('/mobile/dashboard');
            }

            // Hide loader after a small delay
            setTimeout(() => setIsSyncing(false), 500);
        } else if (!profile && !loading && isSyncing) {
            // New user case
            setIsSyncing(false);
        }
    }, [profile, loading]);

    useEffect(() => {
        const detectCountry = async () => {
            try {
                const response = await fetch('https://api.country.is/');
                const data = await response.json();
                const countryCode = data.country;
                if (countryCode) {
                    const country = countries.find(c => c.code.toLowerCase() === countryCode.toLowerCase());
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

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            setUsernameError("3-20 chars (A-Z, 0-9, _)");
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
                const { data } = await (supabase
                    .from('profiles') as any)
                    .select('id')
                    .eq('username', username.toLowerCase())
                    .maybeSingle();

                if (data) {
                    setIsUsernameAvailable(false);
                    setUsernameError("Taken");
                } else {
                    setIsUsernameAvailable(true);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsCheckingUsername(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username, profile?.username]);

    // Temporarily disabled to prevent skipping the loading animation
    /*
    useEffect(() => {
        if (profile?.selected_exam && profile?.selected_plan) {
            navigate('/mobile/dashboard');
        }
    }, [profile, navigate]);
    */

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
            toast({ title: "Setup Complete", description: "Welcome." });
            setIsRedirecting(true);
            
            const pendingDownload = sessionStorage.getItem('pending_resource_download');
            const targetPath = pendingDownload ? `/resources/${pendingDownload}` : '/mobile/dashboard';
            
            if (isPremium) {
                openPricingModal();
            }
            
            console.log("Mobile Profile refresh successful, navigating to mobile dashboard in 2.5s...");
            setTimeout(() => {
                navigate(targetPath);
            }, 1500);
        } catch (e: any) {
            toast({ title: "Setup Failed", description: e.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [step]);

    if (isSyncing || loading || isConfigLoading || !config) {
        return (
            <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F8FAFC] px-6 text-center">
                <div className="relative mb-8">
                    <div className="w-16 h-16 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-violet-600 animate-pulse" />
                    </div>
                </div>
                <h2 className="text-xl font-black text-[#1E293B] uppercase tracking-tighter leading-tight">Personalizing Your Journey...</h2>
                <p className="mt-2 text-sm font-bold text-[#94A3B8]">Finding where you left off</p>
            </div>
        );
    }

    const availableExams = Object.values(allExams).filter(e => e.isLive);
    const plans = config.plans.filter(p => p.isVisible !== false);

    return (
        <>
            {isRedirecting && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
.mob-loader-words {
    overflow: hidden;
    position: relative;
}
.mob-loader-words::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(var(--bg-color) 10%, transparent 30%, transparent 70%, var(--bg-color) 90%);
    z-index: 20;
}
.mob-loader-words-group {
    animation: spin_4991 4s infinite cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
.mob-loader-word {
    display: block;
    height: 100%;
    padding-bottom: 2%;
    color: #5A32FA;
}
`}</style>
                    <div className="flex flex-col items-center justify-center gap-6" style={{ '--bg-color': 'white' } as any}>
                        <div className="relative">
                            <div className="w-20 h-20 border-[6px] border-indigo-50 border-t-[#5A32FA] rounded-full animate-spin shadow-lg" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-[#5A32FA] animate-pulse" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-2xl font-black text-slate-900 uppercase tracking-tighter">
                            <span>Preparing</span>
                            <div className="mob-loader-words h-[1.2em]">
                                <span className="mob-loader-words-group">
                                    <span className="mob-loader-word">Dashboard</span>
                                    <span className="mob-loader-word">Journey</span>
                                    <span className="mob-loader-word">Profile</span>
                                    <span className="mob-loader-word">Workspace</span>
                                    <span className="mob-loader-word">Dashboard</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="h-[100dvh] w-full bg-[#FAFAFA] flex flex-col relative overflow-x-hidden overflow-y-auto font-sans">
                {/* Header */}
                <div className="w-full h-16 sm:h-20 px-4 sm:px-8 flex justify-between items-center bg-transparent z-50 shrink-0">
                    <img src="/logo.webp" alt="ItaloStudy" className="h-6 sm:h-8" />
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-slate-500 hidden sm:inline-block">Need help?</span>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="flex items-center gap-2 border border-slate-200 text-[#5A32FA] rounded-full px-4 sm:px-5 py-2 sm:py-2.5 hover:bg-slate-50 transition-colors font-bold text-xs sm:text-sm bg-white shadow-sm">
                                    <Headphones className="w-4 h-4" />
                                    <span className="hidden sm:inline-block">Support</span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2 rounded-xl border-slate-200 shadow-xl" align="end">
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => { navigator.clipboard.writeText('contact@italostudy.com'); toast({ title: "Email copied", description: "contact@italostudy.com has been copied to your clipboard." }); }} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-slate-700 font-medium text-sm text-left"><Mail className="w-4 h-4 text-[#5A32FA]" />Email Us</button>
                                    <a href="https://chat.whatsapp.com/CfVh7u9L6vT7ZFpZwwVa4A" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 hover:bg-[#25D366]/10 rounded-lg transition-colors text-slate-700 font-medium text-sm">
                                        <Phone className="w-4 h-4 text-[#25D366]" />
                                        WhatsApp
                                    </a>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 w-full flex flex-col items-center justify-start pt-2 sm:pt-4 z-20 pb-12">
                    <div className="w-full flex flex-col items-center origin-top px-4">
                        
                        {/* Progress Bar Header */}
                        {!isMissingOnlyPhone && (
                            <div className="w-full flex justify-center mb-4 sm:mb-6">
                                <div className="flex items-center gap-2">
                                    {/* Step 1 */}
                                    <div className="flex items-center gap-1.5">
                                        <div className={cn("w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold", step === 1 ? "bg-[#5A32FA] text-white" : (step > 1 ? "bg-[#5A32FA] text-white" : "bg-white border border-slate-200 text-slate-400"))}>
                                            {step > 1 ? <Check className="w-3 h-3 stroke-[3]" /> : "1"}
                                        </div>
                                        <span className={cn("text-[10px] sm:text-xs font-bold", step === 1 ? "text-[#5A32FA]" : (step > 1 ? "text-[#5A32FA]" : "text-slate-400"))}>Start</span>
                                    </div>
                                    <div className={cn("w-8 sm:w-16 h-[2px] rounded-full", step > 1 ? "bg-[#5A32FA]" : "bg-slate-200")}></div>
                                    {/* Step 4 */}
                                    <div className="flex items-center gap-1.5">
                                        <div className={cn("w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold", step === 4 ? "bg-white border-2 border-[#5A32FA] text-[#5A32FA]" : (step > 4 ? "bg-[#5A32FA] text-white" : "bg-white border border-slate-200 text-slate-400"))}>
                                            {step > 4 ? <Check className="w-3 h-3 stroke-[3]" /> : "2"}
                                        </div>
                                        <span className={cn("text-[10px] sm:text-xs font-bold", step === 4 ? "text-slate-900" : (step > 4 ? "text-[#5A32FA]" : "text-slate-400"))}>Profile</span>
                                    </div>
                                    <div className={cn("w-8 sm:w-16 h-[2px] rounded-full", step > 4 ? "bg-[#5A32FA]" : "bg-slate-200")}></div>
                                    {/* Step 5 */}
                                    <div className="flex items-center gap-1.5">
                                        <div className={cn("w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold", step === 5 ? "bg-white border-2 border-[#5A32FA] text-[#5A32FA]" : "bg-white border border-slate-200 text-slate-400")}>
                                            3
                                        </div>
                                        <span className={cn("text-[10px] sm:text-xs font-bold", step === 5 ? "text-slate-900" : "text-slate-400")}>Plan</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Welcome Text */}
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight text-center mb-1">
                            Welcome! 👋
                        </h1>
                        <p className="text-slate-500 text-center text-xs sm:text-sm max-w-[280px] sm:max-w-lg mb-3 leading-relaxed">
                            Let's personalize your experience to <br/>
                            <span className="text-[#5A32FA] font-bold">learn better & achieve more.</span>
                        </p>

                        {/* Owl Image */}
                        <img src="/onboarding.webp" alt="Owl" className="h-[12vh] min-h-[90px] max-h-[140px] object-contain -mb-6 relative z-30 drop-shadow-md" />

                        {/* The Card */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.25 }}
                                className="bg-white rounded-[1.5rem] shadow-xl shadow-indigo-900/5 border border-slate-100 p-5 sm:p-6 w-full max-w-lg relative z-20"
                            >
                                {step === 1 && (
                                    <>
                                        <div className="flex gap-3 items-start mb-5">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-[#5A32FA] flex items-center justify-center shrink-0">
                                                <Compass className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-black text-slate-900 mb-0.5">Which exam are you preparing for?</h2>
                                                <p className="text-slate-500 text-[11px] sm:text-xs">This helps us tailor the platform to your exam journey.</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 gap-3 mb-2">
                                            {availableExams.map((exam) => {
                                                const theme = LocalIconMap[exam.name] || LocalIconMap[exam.name.split(' ')[0]] || { icon: Brain, bg: 'bg-[#F8FAFC]', color: 'text-slate-400' };
                                                const Icon = theme.icon;
                                                const isSelected = selectedExam === exam.id;
                                                
                                                return (
                                                    <button
                                                        key={exam.id}
                                                        onClick={() => setSelectedExam(exam.id)}
                                                        className={cn(
                                                            "flex items-center gap-3 p-3.5 rounded-[1.25rem] border transition-all text-left",
                                                            isSelected ? "border-[#5A32FA] bg-[#F4F1FF]/50 ring-1 ring-[#5A32FA]" : "border-slate-200 bg-white active:bg-slate-50"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                                            isSelected ? "bg-[#F4F1FF] text-[#5A32FA]" : cn(theme.bg, theme.color)
                                                        )}>
                                                            <Icon className="w-6 h-6" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 pr-1">
                                                            <h3 className={cn("font-bold text-sm mb-0.5 truncate", isSelected ? "text-[#5A32FA]" : "text-slate-900")}>
                                                                {exam.name}
                                                            </h3>
                                                            <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">
                                                                Prepare for the {exam.name} exam for universities in Italy.
                                                            </p>
                                                        </div>
                                                        <div className={cn(
                                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-1 transition-colors",
                                                            isSelected ? "border-[#5A32FA]" : "border-slate-300 bg-white"
                                                        )}>
                                                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#5A32FA]" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}

                                {step === 4 && (
                                    <>
                                        <div className="flex gap-3 items-start mb-5">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-[#5A32FA] flex items-center justify-center shrink-0">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-black text-slate-900 mb-0.5">
                                                    {isMissingOnlyPhone ? "Fill out the missing step" : "Can you tell me a bit about yourself?"}
                                                </h2>
                                                <p className="text-slate-500 text-[11px] sm:text-xs">We use this to set up your profile and account.</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4 mb-2">
                                            <div className="space-y-1">
                                                <label className="text-[9px] sm:text-[10px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Username <span className="text-[#5A32FA]">*</span></label>
                                                <div className="relative">
                                                    <Input
                                                        value={username}
                                                        onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                                                        placeholder="Choose a unique username"
                                                        className={cn(
                                                            "h-12 bg-white border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-[#5A32FA]/10 transition-all text-[#1E293B] shadow-sm pr-10 text-sm",
                                                            usernameError ? "border-red-400 focus:border-red-400" : (isUsernameAvailable ? "border-green-400 focus:border-green-400" : "focus:border-[#5A32FA]")
                                                        )}
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
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

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] sm:text-[10px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">First Name <span className="text-[#5A32FA]">*</span></label>
                                                    <Input
                                                        value={firstName}
                                                        onChange={(e) => setFirstName(e.target.value)}
                                                        placeholder="First Name"
                                                        className="h-12 bg-white border-slate-200 rounded-2xl font-bold focus:border-[#5A32FA] focus:ring-4 focus:ring-[#5A32FA]/10 transition-all text-[#1E293B] shadow-sm text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] sm:text-[10px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Last Name <span className="text-[#5A32FA]">*</span></label>
                                                    <Input
                                                        value={lastName}
                                                        onChange={(e) => setLastName(e.target.value)}
                                                        placeholder="Last Name"
                                                        className="h-12 bg-white border-slate-200 rounded-2xl font-bold focus:border-[#5A32FA] focus:ring-4 focus:ring-[#5A32FA]/10 transition-all text-[#1E293B] shadow-sm text-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[9px] sm:text-[10px] font-black text-[#94A3B8] uppercase tracking-widest ml-1">Phone Number <span className="text-[#5A32FA]">*</span></label>
                                                <div className="relative group flex flex-col gap-1">
                                                    <div className="flex items-center bg-white border border-slate-200 rounded-2xl focus-within:border-[#5A32FA] focus-within:ring-4 focus-within:ring-[#5A32FA]/10 transition-all px-1 shadow-sm">
                                                        <Popover open={openCountryPopup} onOpenChange={setOpenCountryPopup}>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="ghost" className="h-10 px-2 font-bold flex items-center gap-1 hover:bg-[#F8FAFC]">
                                                                    <img
                                                                        src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                                                                        alt="Flag"
                                                                        className="w-4 h-auto rounded-[2px]"
                                                                    />
                                                                    <span className="text-[#1E293B] opacity-40 mx-1">|</span>
                                                                    <span className="text-xs text-[#1E293B]">{countryDial}</span>
                                                                </Button >
                                                            </PopoverTrigger >
                                                            <PopoverContent className="p-0 w-[240px] z-[9999] bg-white border border-slate-200 shadow-2xl" align="start">
                                                                <Command className="bg-white">
                                                                    <CommandInput placeholder="Search country..." className="text-[#1E293B] focus:ring-0 focus-visible:ring-0 focus:outline-none" />
                                                                    <CommandList className="max-h-[250px] bg-white">
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
                                                                                    className="flex items-center gap-2 p-3 cursor-pointer text-[#1E293B] data-[selected=true]:bg-indigo-50 data-[selected=true]:text-[#5A32FA]"
                                                                                >
                                                                                    <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} className="w-4 h-auto rounded-[1px]" />
                                                                                    <span className="font-bold text-xs">{c.name}</span>
                                                                                    <span className="ml-auto text-[9px] opacity-40">{c.dial}</span>
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
                                                            className="h-10 text-xs sm:text-sm bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 font-bold text-[#1E293B] shadow-none rounded-none px-1"
                                                            type="tel"
                                                        />
                                                    </div >
                                                    <p className="text-[9px] font-bold text-[#94A3B8] italic ml-2">
                                                        Don't worry, we are not gonna spam you! 😉
                                                    </p>
                                                </div >
                                            </div >
                                        </div>
                                    </>
                                )}

                                <div className="flex gap-3 justify-center w-full mt-6">
                                    {step > 1 && (
                                        <button
                                            onClick={() => setStep(step === 4 ? 1 : step - 1)}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 active:text-slate-600 transition-colors px-3 h-12 rounded-xl active:bg-slate-50 shrink-0"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Back
                                        </button>
                                    )}
                                    <Button
                                        disabled={
                                            (step === 1 && !selectedExam) ||
                                            (step === 4 && (!firstName || !lastName || !username || !isUsernameAvailable || getDigits(phoneNumber).length !== phoneLimit || isSubmitting))
                                        }
                                        onClick={step === 4 ? handleConfirm : () => setStep(step === 1 ? 4 : step + 1)}
                                        className="flex-1 h-12 rounded-xl bg-[#5A32FA] text-white font-bold text-sm transition-all shadow-lg shadow-[#5A32FA]/20 active:scale-[0.98]"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> :
                                            (step === 4) ? "Begin Preparation" : "Continue"}
                                        {!isSubmitting && <ArrowRight className="ml-1.5 w-4 h-4" />}
                                    </Button>
                                </div>

                            </motion.div>
                        </AnimatePresence>
                        
                        <div className="flex items-center justify-center gap-2 mt-4 text-slate-500 text-[9px] font-medium w-fit mx-auto px-4 py-2 relative z-30">
                            <ShieldCheck className="w-3 h-3 text-[#5A32FA]" /> Trusted by 12,000+ students worldwide
                        </div>
                    </div>
                </div>

                {/* Pricing Hover Details */}
                <OnboardingPricingHover
                    isOpen={showPricingHover}
                    onClose={() => setShowPricingHover(false)}
                />

                {/* Background elements */}
                <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] bg-[#5A32FA]/10 blur-[100px] rounded-full pointer-events-none z-0" />
                <div className="absolute bottom-[-10%] right-[-20%] w-[300px] h-[300px] bg-[#5A32FA]/10 blur-[100px] rounded-full pointer-events-none z-0" />
            </div>
        </>
    );
}

