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
    Book, Calculator, Apple, Layers, Info, Rocket, Shield, Star
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

    const [selectedPlan, setSelectedPlan] = useState<string | null>(profile?.selected_plan || null);
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
            else if (!profile.selected_plan) setStep(5);
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
            const tierMap: any = { 'explorer': 'initiate', 'pro': 'elite', 'elite': 'global', 'global': 'global' };
            const { error } = await supabase.from('profiles').update({
                selected_exam: selectedExam,
                selected_plan: selectedPlan,
                subscription_tier: tierMap[selectedPlan] || 'initiate',
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
    background: linear-gradient(white 10%, transparent 30%, transparent 70%, white 90%);
    z-index: 20;
}
.mob-loader-word {
    display: block;
    height: 100%;
    padding-left: 6px;
    color: #E67E22;
    animation: spin_4991 4s infinite;
}
`}</style>
                    <div style={{ color: '#64748B', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '22px', display: 'flex', height: '40px', alignItems: 'center', padding: '10px' }}>
                        <p style={{ marginRight: '8px' }}>Setting up your</p>
                        <div className="mob-loader-words">
                            <span className="mob-loader-word">plan...</span>
                            <span className="mob-loader-word">exams...</span>
                            <span className="mob-loader-word">schedule...</span>
                            <span className="mob-loader-word">profile...</span>
                            <span className="mob-loader-word">plan...</span>
                        </div>
                    </div>
                </div>
            )}
            <div
                ref={scrollContainerRef}
                className="flex flex-col min-h-[100dvh] w-full bg-[#F8FAFC] overflow-y-auto relative pb-10"
            >
                {!isMissingOnlyPhone && (
                    <div className="px-6 pt-6 mb-2">
                        <div className="h-1 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-[#E67E22]"
                                initial={{ width: 0 }}
                                animate={{ width: `${(step === 1 ? 1/3 : (step === 4 ? 2/3 : 1)) * 100}% ` }}
                            />
                        </div>
                    </div>
                )}

                <div className="w-full flex flex-col items-center justify-start p-4 pt-4 gap-2">
                    <OwlAnimation
                        message={
                            step === 1 ? "Choose your path!" :
                                step === 4 ? (isMissingOnlyPhone ? "Fill out the missing step to continue using ItaloStudy" : "Tell me about you!") :
                                    "Almost there!"
                        }
                    />
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="w-full bg-white rounded-[2rem] border border-[#F1F5F9] shadow-xl shadow-[#64748B]/5 p-5 flex flex-col min-h-0"
                        >
                            <h2 className={cn("text-xl font-black text-[#1E293B] uppercase tracking-tight text-center", (step === 2 || step === 3) ? "mb-4" : "mb-6")}>
                                {step === 1 ? "Which exam are you preparing for?" :
                                    step === 4 ? (isMissingOnlyPhone ? "Fill out the missing step" : "Can you tell me a bit about yourself?") :
                                        "Select Access Plan"}
                            </h2>


                            <div className="flex-1 pb-6">
                                {step === 1 && (
                                    <div className="grid grid-cols-1 gap-3">
                                        {availableExams.map((exam) => {
                                            const theme = LocalIconMap[exam.name] || LocalIconMap[exam.name.split(' ')[0]] || { icon: Brain, bg: 'bg-[#F1F5F9]', color: 'text-[#64748B]' };
                                            const Icon = theme.icon;
                                            return (
                                                <button
                                                    key={exam.id}
                                                    onClick={() => { setSelectedExam(exam.id); setStep(4); }}
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-xl border-2 transition-all active:scale-[0.98]",
                                                        selectedExam === exam.id ? "border-[#E67E22] bg-[#FFF3E0]" : cn("border-[#F1F5F9]", theme.bg)
                                                    )}
                                                >
                                                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-white border border-white/50 shadow-sm", theme.color)}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <span className="font-black text-[10px] uppercase text-[#1E293B] truncate">{exam.name}</span>
                                                    {selectedExam === exam.id && <Check className="ml-auto w-4 h-4 text-[#E67E22]" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                 {/* Steps 2 and 3 removed */}

                                {step === 4 && (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Input
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                                                placeholder="Username"
                                                className={cn(
                                                    "h-14 bg-[#F8FAFC] border-0 rounded-xl font-bold text-[#1E293B] pr-12",
                                                    usernameError ? "ring-1 ring-red-400" : (isUsernameAvailable ? "ring-1 ring-green-400" : "")
                                                )}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                {isCheckingUsername ? (
                                                    <Loader2 className="w-4 h-4 text-[#94A3B8] animate-spin" />
                                                ) : (
                                                    <>
                                                        {isUsernameAvailable === true && <Check className="w-4 h-4 text-green-500" />}
                                                        {isUsernameAvailable === false && <X className="w-4 h-4 text-red-500" />}
                                                    </>
                                                )}
                                            </div>
                                            {usernameError && <p className="text-[9px] font-bold text-red-500 mt-1 ml-2 uppercase">{usernameError}</p>}
                                        </div>

                                        <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" className="h-14 bg-[#F8FAFC] border-0 rounded-xl font-bold text-[#1E293B]" />
                                        <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" className="h-14 bg-[#F8FAFC] border-0 rounded-xl font-bold text-[#1E293B]" />
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center bg-[#F8FAFC] rounded-xl px-4 h-14 border border-transparent focus-within:border-[#E67E22] focus-within:ring-2 focus-within:ring-[#E67E22]/10 transition-all overflow-hidden">
                                                <Popover open={openCountryPopup} onOpenChange={setOpenCountryPopup}>
                                                    <PopoverTrigger asChild>
                                                        <button className="flex items-center gap-1.5 pr-2 border-r border-[#CBD5E1] shrink-0">
                                                            <img
                                                                src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                                                                alt="Flag"
                                                                className="w-4 h-auto rounded-[2px]"
                                                            />
                                                            <span className="font-bold text-[#1E293B] text-xs">{countryDial}</span>
                                                        </button >
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
                                                    placeholder="Phone Number"
                                                    className="flex-1 bg-transparent border-0 h-full font-bold text-[#1E293B] p-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none rounded-none ml-2 text-sm"
                                                />
                                            </div >
                                            <p className="text-[9px] font-bold text-[#94A3B8] italic ml-1 uppercase tracking-tighter">
                                                Don't worry, we are not gonna spam you! 😉
                                            </p>
                                        </div >
                                    </div >
                                )}

                                {
                                    step === 5 && (
                                        <div className="space-y-3">
                                            {/* View Details Button */}
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => setShowPricingHover(true)}
                                                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#E67E22] hover:text-[#D35400] transition-colors underline underline-offset-2"
                                                >
                                                    <Info className="w-3.5 h-3.5" />
                                                    View Plan Details
                                                </button>
                                            </div>

                                            {plans.map((p) => {
                                                const PlanIconMap: Record<string, any> = {
                                                    'explorer': Shield,
                                                    'pro': Rocket,
                                                    'elite': Star,
                                                    'global': Globe,
                                                };
                                                const PlanIcon = PlanIconMap[p.id] || Sparkles;
                                                return (
                                                    <button key={p.id} onClick={() => setSelectedPlan(p.id)} className={cn("w-full p-5 rounded-2xl border-2 flex items-center gap-4", selectedPlan === p.id ? "border-[#E67E22] bg-[#FFF3E0]" : "border-[#F1F5F9]")}>
                                                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm shrink-0", p.color || 'bg-[#E67E22]', !p.color?.includes('bg-') && 'bg-[#F8FAFC]')}>
                                                            <PlanIcon className={cn("w-6 h-6", (p.color === 'bg-[#E67E22]' || !p.color) ? "text-white" : "text-[#E67E22]")} />
                                                        </div>
                                                        <div className="text-left">
                                                            <h3 className="font-black text-[10px] uppercase text-[#1E293B]">{p.name}</h3>
                                                            <span className="text-[10px] font-black text-[#E67E22]">{config.mode === 'beta' ? 'FREE ACCESS' : formatPrice(p.monthlyPrice || 0)}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )
                                }
                            </div >

                            <div className="pt-4 border-t border-[#F1F5F9] flex justify-between items-center bg-white">
                                {!isMissingOnlyPhone && step > 1 && (
                                    <button onClick={() => setStep(step === 4 ? 1 : step - 1)} className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Back</button>
                                )}
                                {isMissingOnlyPhone && <div />}
                                <Button
                                    disabled={
                                        (step === 1 && !selectedExam) ||
                                        (step === 4 && (!firstName || !lastName || !username || !isUsernameAvailable || getDigits(phoneNumber).length !== phoneLimit || isSubmitting)) ||
                                        (step === 5 && (!selectedPlan || isSubmitting || getDigits(phoneNumber).length !== phoneLimit || !firstName || !lastName || !username || !isUsernameAvailable))
                                    }
                                    onClick={(step === 5 || (step === 4 && isMissingOnlyPhone)) ? handleConfirm : () => setStep(step === 1 ? 4 : step + 1)}
                                    className="h-12 px-8 rounded-full bg-[#E67E22] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#E67E22]/20"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : 
                                        (step === 5 || (step === 4 && isMissingOnlyPhone)) ? "Finish" : "Next"}
                                </Button>
                            </div>
                        </motion.div >
                    </AnimatePresence >
                </div >
                {/* Pricing Hover Details */}
                < OnboardingPricingHover
                    isOpen={showPricingHover}
                    onClose={() => setShowPricingHover(false)}
                />
            </div >
        </>
    );
}
