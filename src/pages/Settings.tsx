import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
    User,
    Lock,
    Save,
    Loader2,
    CreditCard,
    GraduationCap,
    ShieldCheck,
    Key,
    Smartphone,
    Globe,
    X,
    ChevronRight,
    Camera,
    Check,
    Brain,
    Zap,
    Sparkles,
    MessageSquare,
    Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { ImageCropper } from '@/components/ui/ImageCropper';
import MFAGuide from '../components/MFAGuide';
import { format } from 'date-fns';
import { usePricing } from '@/context/PricingContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';

export default function Settings() {
    const { user, profile, refreshProfile } = useAuth() as any;
    const { openPricingModal } = usePricing();
    const isGoogleUser = user?.app_metadata?.provider === 'google';
    const navigate = useNavigate();
    const { toast } = useToast();
    const { formatPrice } = useCurrency();
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Form States
    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [accessCode, setAccessCode] = useState("");
    const [isActivating, setIsActivating] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [countryDial, setCountryDial] = useState("+39");
    const [countryCode, setCountryCode] = useState("it");
    const [phoneLimit, setPhoneLimit] = useState(10);
    const [openCountryPopup, setOpenCountryPopup] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Image Cropper State
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // UI View State
    const [activeSection, setActiveSection] = useState<'main' | 'profile' | 'security' | 'subscription' | 'consultant' | 'mfa' | 'language'>('main');

    // MFA States
    const { mfa } = useAuth();
    const [factors, setFactors] = useState<any[]>([]);
    const [isMFAEnabled, setIsMFAEnabled] = useState(false);
    const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
    const [enrollmentData, setEnrollmentData] = useState<any>(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [isVerifyingMFA, setIsVerifyingMFA] = useState(false);
    const [isMFAGuideOpen, setIsMFAGuideOpen] = useState(false);
    const [mfaPurpose, setMfaPurpose] = useState<'enroll' | 'unenroll'>('enroll');
    const [unenrollFactorId, setUnenrollFactorId] = useState<string | null>(null);
    const [isMembershipDialogOpen, setIsMembershipDialogOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        if (location.state?.section) {
            setActiveSection(location.state.section);
            // Clear state after reading
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    useEffect(() => {
        if (profile) {
            setDisplayName(profile.display_name || "");
            setUsername(profile.username || "");

            // Parse phone number
            const fullPhone = profile.phone_number || "";
            if (fullPhone) {
                // Find matching dial code (longest first to avoid overlapping like +1 and +123)
                const sortedCountries = [...countries].sort((a, b) => b.dial.length - a.dial.length);
                const matched = sortedCountries.find(c => fullPhone.startsWith(c.dial));
                if (matched) {
                    setCountryDial(matched.dial);
                    setCountryCode(matched.code.toLowerCase());
                    setPhoneLimit(matched.len || 10);
                    setPhoneNumber(fullPhone.slice(matched.dial.length).trim());
                } else {
                    setPhoneNumber(fullPhone);
                }
            } else {
                setPhoneNumber("");
            }

            setAvatarUrl(profile.avatar_url || null);
            fetchMFAFactors();
        }
    }, [profile]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setSelectedImage(reader.result as string);
                setIsCropperOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setIsCropperOpen(false);
        setIsUploading(true);
        try {
            const fileName = `${user.id}_avatar_${Date.now()}.jpg`;
            const file = new File([croppedBlob], fileName, { type: 'image/jpeg' });

            // Upload to Cloudinary instead of Supabase Storage
            const result = await uploadToCloudinary(file, 'avatars');
            const publicUrl = result.secure_url;

            setAvatarUrl(publicUrl);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            toast({ title: "Success", description: "Profile picture updated!" });
        } catch (error: any) {
            toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsUploading(false);
            setSelectedImage(null);
        }
    };

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            // 1. Update Username if changed (Secure RPC)
            if (username && username !== profile?.username) {
                const { error: usernameError } = await supabase.rpc('update_username', { new_username: username });
                if (usernameError) throw new Error(usernameError.message);
            }

            // 2. Update Display Name and Phone (Standard Update)
            const fullPhone = `${countryDial}${phoneNumber.trim()}`;
            if (displayName !== profile?.display_name || fullPhone !== profile?.phone_number) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        display_name: displayName,
                        phone_number: fullPhone,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);
                if (profileError) throw profileError;
            }

            // 3. Update Password if provided
            if (!isGoogleUser && password) {
                if (password !== confirmPassword) throw new Error("Passwords do not match");
                const { error: pwError } = await supabase.auth.updateUser({ password: password });
                if (pwError) throw pwError;
                setPassword("");
                setConfirmPassword("");
            }

            toast({ title: "Success", description: "Profile updated successfully." });
            refreshProfile(); // Refresh context to show new data
            setActiveSection('main');
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message.includes('already taken') ? 'Username is not available.' : error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePlan = async (planId: string) => {
        if (!user) return;
        setLoading(true);
        try {
            const tierMap: Record<string, string> = {
                'explorer': 'initiate',
                'pro': 'elite',
                'elite': 'global'
            };

            const { error } = await supabase
                .from('profiles')
                .update({
                    selected_plan: planId,
                    subscription_tier: tierMap[planId] || 'initiate'
                })
                .eq('id', user.id);

            if (error) throw error;

            toast({ title: "Plan Updated", description: `You have switched to the ${planId.toUpperCase()} plan.` });
            refreshProfile();
            setActiveSection('main');
        } catch (error: any) {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async () => {
        if (!user) return;
        if (!confirm(
            'Are you sure you want to cancel your subscription?\n\n' +
            '• Your access will end immediately.\n' +
            '• No future payments will be charged.\n\n' +
            'This action cannot be undone.'
        )) return;

        setLoading(true);
        try {
            // ⚠️ IMPORTANT: Call the edge function which cancels at Dodo FIRST
            // then updates our DB. Direct DB update is NOT enough — Dodo would
            // still charge and reactivate the subscription on next billing date.
            const { data, error } = await supabase.functions.invoke('cancel-subscription', {});

            if (error) throw new Error(error.message || 'Cancellation failed');

            if (!data?.success) {
                throw new Error(data?.error || 'Cancellation was not confirmed by the payment provider.');
            }

            toast({
                title: "✅ Subscription Cancelled",
                description: "No future payments will be charged. You are now on the Explorer plan.",
            });
            refreshProfile();
            setIsMembershipDialogOpen(false);
        } catch (error: any) {
            toast({
                title: "Cancellation Failed",
                description: error.message.includes('support')
                    ? error.message
                    : `${error.message} — Contact support@italostudy.com if you need help.`,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchMFAFactors = async () => {
        const { data, error } = await mfa.listFactors();
        if (error) {
            console.error("Error listing MFA factors:", error);
            return;
        }
        setFactors(data.all || []);
        setIsMFAEnabled(data.all?.some((f: any) => f.status === 'verified') || false);
    };

    const handleEnrollMFA = async () => {
        setMfaPurpose('enroll');
        setIsEnrollDialogOpen(true);
        const { data, error } = await mfa.enroll();
        // ... rest of enroll logic

        if (error) {
            if (error.message?.includes("A factor with the family name for user already sett up") || error.code === 'factor_type_not_supported') {
                // If it already exists, refresh the factors and close the dialog
                // The user probably needs to verify the existing one or delete it
                await fetchMFAFactors();
                setIsEnrollDialogOpen(false);
                toast({
                    title: "Action Required",
                    description: "An unverified security factor already exists. Please complete verification or remove it first.",
                    variant: "destructive"
                });
                return;
            }
            toast({ title: "Enrollment Failed", description: error.message, variant: "destructive" });
            setIsEnrollDialogOpen(false);
            return;
        }
        setEnrollmentData(data);
    };

    const handleVerifyExisting = (factor: any) => {
        setMfaPurpose('enroll');
        setEnrollmentData(factor);
        setIsEnrollDialogOpen(true);
    };

    const handleVerifyMFA = async () => {
        if (!enrollmentData || verificationCode.length !== 6) return;
        setIsVerifyingMFA(true);
        try {
            const { error } = await mfa.challengeAndVerify(enrollmentData.id, verificationCode);
            if (error) throw error;

            if (mfaPurpose === 'unenroll' && unenrollFactorId) {
                const { error: unenrollError } = await mfa.unenroll(unenrollFactorId);
                if (unenrollError) throw unenrollError;
                toast({ title: "MFA Disabled", description: "Security factor removed successfully." });
            } else {
                toast({ title: "MFA Activated", description: "Your account is now protected." });
            }

            setIsEnrollDialogOpen(false);
            setEnrollmentData(null);
            setUnenrollFactorId(null);
            setVerificationCode("");
            fetchMFAFactors();
        } catch (error: any) {
            toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsVerifyingMFA(false);
        }
    };

    const handleUnenrollMFA = async (factorId: string) => {
        const factor = factors.find(f => f.id === factorId);
        if (!factor) return;

        if (!confirm("Disable MFA? This reduces your account security.")) return;

        try {
            // Check current AAL
            const { data: aalData } = await mfa.getAAL();

            // If factor is verified and we are at AAL1, we MUST verify first
            if (factor.status === 'verified' && aalData?.currentLevel === 'aal1') {
                setMfaPurpose('unenroll');
                setUnenrollFactorId(factorId);
                setEnrollmentData(factor);
                setIsEnrollDialogOpen(true);
                toast({
                    title: "Action Required",
                    description: "Please verify your identity with your MFA code before disabling security."
                });
                return;
            }

            const { error } = await mfa.unenroll(factorId);
            if (error) throw error;

            toast({ title: "MFA Disabled", description: "Security downgraded." });
            fetchMFAFactors();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleActivateConsultant = async () => {
        if (!accessCode) return;
        setIsActivating(true);
        try {
            const { data: codeData, error: codeError } = await supabase
                .from('consultant_access_codes')
                .select('*')
                .eq('code', accessCode.toUpperCase().trim())
                .single();

            if (codeError || !codeData) throw new Error("Invalid access code.");
            if (codeData.is_used) throw new Error("This code has already been used.");

            const { error: profileError } = await supabase
                .from('profiles')
                .update({ is_consultant: true })
                .eq('id', user.id);

            if (profileError) throw profileError;

            const { error: updateCodeError } = await supabase
                .from('consultant_access_codes')
                .update({ is_used: true, used_by: user.id })
                .eq('id', codeData.id);

            if (updateCodeError) throw updateCodeError;

            toast({ title: "Protocol Activated", description: "You are now recognized as an Admission Consultant." });
            setTimeout(() => window.location.reload(), 1500);
        } catch (error: any) {
            toast({ title: "Activation Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsActivating(false);
        }
    };

    const SettingItem = ({ icon: Icon, title, subtitle, onClick, color = "indigo", danger = false }: any) => (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border-b border-slate-50 dark:border-white/5 last:border-0 rounded-[1rem]"
        >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' : `bg-${color}-50 text-${color}-600 dark:bg-${color}-500/10 dark:text-${color}-400`
                }`}>
                <Icon className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-left overflow-hidden">
                <h3 className={`font-bold text-[15px] mb-0.5 ${danger ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>{title}</h3>
                <p className="text-[13px] font-medium text-slate-500 truncate">{subtitle}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
        </button>
    );

    const SubPageHeader = ({ title, subtitle }: any) => (
        <div className="flex items-center gap-4 px-6 py-8 border-b border-slate-100 dark:border-white/5">
            <button onClick={() => setActiveSection('main')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X size={24} />
            </button>
            <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{title}</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{subtitle}</p>
            </div>
        </div>
    );

    return (
        <Layout isLoading={!profile}>
            <div className="min-h-[calc(100vh-72px)] bg-slate-50 dark:bg-[#020617] lg:p-10 p-4">
                <div className="mx-auto max-w-5xl">

                    {activeSection === 'main' ? (
                        <div className="space-y-8 animate-in fade-in duration-500 pt-4">
                            {/* Profile Header Card */}
                            <Card className="p-8 rounded-[2.5rem] border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-gradient-to-br from-[#f8f9fc] via-white to-[#f5f3ff] dark:from-slate-900 dark:to-slate-950 overflow-hidden relative group">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -translate-y-48 translate-x-48 blur-3xl" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full translate-y-32 -translate-x-32 blur-3xl" />
                                
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="relative group/avatar shrink-0">
                                            <div className={cn(
                                                "w-28 h-28 rounded-full overflow-hidden shadow-xl flex items-center justify-center transition-all duration-500 relative",
                                                profile?.selected_plan !== 'explorer' && profile?.selected_plan
                                                    ? "ring-4 ring-indigo-100 dark:ring-indigo-900 bg-indigo-50"
                                                    : "border-4 border-white dark:border-slate-800 bg-slate-100"
                                            )}>
                                                {avatarUrl && !hasError ? (
                                                    <img
                                                        src={getOptimizedImageUrl(avatarUrl, 128)}
                                                        alt="Avatar"
                                                        className="w-full h-full object-cover"
                                                        onError={() => setHasError(true)}
                                                    />
                                                ) : (
                                                    <User className="w-12 h-12 text-slate-300" />
                                                )}
                                                {isUploading && (
                                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900" title="Online" />
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="absolute bottom-1 right-1 w-8 h-8 bg-indigo-600 rounded-full border-[3px] border-white dark:border-slate-900 flex items-center justify-center text-white shadow-lg hover:scale-110 active:scale-95 transition-transform opacity-0 group-hover/avatar:opacity-100"
                                            >
                                                <Camera size={12} />
                                            </button>
                                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase leading-none mb-1 tracking-tight">
                                                {displayName || username || "Protocol Agent"}
                                            </h2>
                                            <p className="text-sm font-bold text-slate-400 mb-5">{username ? `@${username}` : 'Citizen'}</p>
                                            
                                            <div className="flex items-center gap-10">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Active Plan</span>
                                                    {profile?.selected_plan !== 'explorer' && profile?.selected_plan ? (
                                                        <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-500/30">
                                                            {profile?.selected_plan === 'global' ? 'Global' : 'Premium'}
                                                        </span>
                                                    ) : (
                                                        <span className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                                                            Explorer
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Next Billing</span>
                                                    <span className="text-[13px] font-black text-[#00a884] uppercase tracking-wide">
                                                        {profile?.selected_plan === 'explorer'
                                                            ? 'FREE PLAN'
                                                            : profile?.subscription_expiry_date
                                                                ? new Date(profile.subscription_expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                                                : 'LIFETIME'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        className="rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-indigo-100 dark:border-indigo-500/20 hover:bg-white hover:text-indigo-600 shadow-sm h-11 px-6 font-bold"
                                        onClick={() => setIsMembershipDialogOpen(true)}
                                    >
                                        <CreditCard className="w-4 h-4 mr-2 text-indigo-500" />
                                        View Plan Details
                                    </Button>
                                </div>
                            </Card>

                            {/* Main Two-Column Content */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column (Settings List) */}
                                <div className="lg:col-span-2 space-y-4">
                                    <div className="mb-4">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Account & Security</h3>
                                        <p className="text-sm font-medium text-slate-500">Manage your account settings and security preferences</p>
                                    </div>
                                    <Card className="rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_rgb(0,0,0,0.02)] bg-white dark:bg-slate-950 overflow-hidden p-2">
                                        <SettingItem
                                            icon={User}
                                            title="Personal Info"
                                            subtitle="Update your name, email and identity details"
                                            onClick={() => setActiveSection('profile')}
                                            color="blue"
                                        />
                                        <SettingItem
                                            icon={Key}
                                            title="Account Security"
                                            subtitle={isGoogleUser ? "Managed by Google" : "Change password & manage your credentials"}
                                            onClick={() => setActiveSection('security')}
                                            color="indigo"
                                        />
                                        <SettingItem
                                            icon={Smartphone}
                                            title="Two-Factor Authentication"
                                            subtitle={isMFAEnabled ? "Active Protection" : "Add an extra layer of security"}
                                            onClick={() => setActiveSection('mfa')}
                                            color="emerald"
                                        />
                                        <SettingItem
                                            icon={CreditCard}
                                            title="Membership Plan"
                                            subtitle="View & manage your subscription"
                                            onClick={() => setIsMembershipDialogOpen(true)}
                                            color="violet"
                                        />
                                        {profile?.role !== 'consultant' && !profile?.is_consultant && (
                                            <SettingItem
                                                icon={ShieldCheck}
                                                title="Consultant Protocol"
                                                subtitle="Expert activation & verification"
                                                onClick={() => setActiveSection('consultant')}
                                                color="rose"
                                            />
                                        )}
                                    </Card>
                                </div>

                                {/* Right Column (Need Assistance) */}
                                <div className="lg:col-span-1 space-y-4">
                                    <div className="mb-4 h-[44px] flex items-end">
                                        {/* Invisible placeholder to align headers */}
                                    </div>
                                    <Card className="rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_rgb(0,0,0,0.02)] bg-white dark:bg-slate-950 overflow-hidden p-6 relative">
                                        <div className="flex items-start gap-3 mb-4 relative z-10">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                                                <MessageSquare size={16} strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Need Assistance?</h3>
                                                <p className="text-[12px] font-medium text-slate-500">We're here to help you anytime.</p>
                                            </div>
                                        </div>
                                        
                                        {/* Illustration Box */}
                                        <div className="w-full h-40 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-[1.5rem] mb-6 flex items-center justify-center relative overflow-hidden">
                                            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
                                            <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-lg relative z-10 border border-indigo-100 dark:border-indigo-500/20">
                                                <div className="absolute -left-6 top-1/4 w-8 h-6 bg-white/60 dark:bg-slate-800/60 rounded-md shadow-sm backdrop-blur flex items-center justify-center"><div className="w-3 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-full"/></div>
                                                <div className="absolute -right-6 top-1/3 w-8 h-6 bg-white/60 dark:bg-slate-800/60 rounded-md shadow-sm backdrop-blur flex items-center justify-center"><div className="w-4 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-full"/></div>
                                                
                                                <Sparkles className="w-10 h-10 text-indigo-500" strokeWidth={1.5} />
                                            </div>
                                        </div>

                                        <div className="space-y-3 relative z-10">
                                            <div>
                                                <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider mb-0.5">Support Channel</h4>
                                                <p className="text-[11px] font-medium text-slate-500 mb-2">For protocol, support & inquiries</p>
                                            </div>
                                            
                                            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">contact@italostudy.com</span>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText("contact@italostudy.com");
                                                        toast({ title: "Copied!", description: "Email copied to clipboard." });
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                                </button>
                                            </div>
                                            
                                            <div className="flex items-center justify-center gap-1.5 py-1">
                                                <div className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-pulse" />
                                                <span className="text-[10px] font-bold text-[#00a884] uppercase tracking-widest">24x7 Protocol Support</span>
                                            </div>

                                        </div>
                                    </Card>
                                </div>
                            </div>
                            
                            {/* Bottom Features Bar */}
                            <Card className="rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_rgb(0,0,0,0.02)] bg-white dark:bg-slate-950 p-6 md:p-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                                            <ShieldCheck size={20} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-1">Secure & Private</h4>
                                            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">Your data is protected with industry-leading security.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
                                        </div>
                                        <div>
                                            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-1">Seamless Sync</h4>
                                            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">Your progress is synchronized across all devices.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                                            <Zap size={20} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-1">Smart & Fast</h4>
                                            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">Optimized experience for the best performance.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                                        </div>
                                        <div>
                                            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-1">Always Here</h4>
                                            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">Our support team is always ready to assist you.</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in duration-500 pt-4 max-w-6xl mx-auto">
                            {/* Premium Back Header */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <button 
                                        onClick={() => setActiveSection('main')}
                                        className="flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-4 group"
                                    >
                                        <svg className="w-4 h-4 mr-1 rotate-180 group-hover:-translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                                        Settings
                                    </button>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter capitalize">
                                        {activeSection === 'profile' ? 'Personal Information' : 
                                         activeSection === 'security' ? 'Account Security' : 
                                         activeSection === 'mfa' ? 'Two-Factor Authentication' : 
                                         activeSection === 'consultant' ? 'Consultant Protocol' : 'Settings'}
                                    </h2>
                                    <p className="text-sm font-medium text-slate-500">
                                        {activeSection === 'profile' ? 'Manage your identity and personal details' : 
                                         activeSection === 'security' ? 'Manage your password and credentials' : 
                                         activeSection === 'mfa' ? 'Add an extra layer of security to your account' : 
                                         activeSection === 'consultant' ? 'Activate your expert consultant status' : ''}
                                    </p>
                                </div>

                                {/* Premium 3D Header Illustration */}
                                <div className="hidden md:flex relative w-48 h-32">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-2xl -rotate-6 scale-95 opacity-50 blur-sm" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl shadow-xl flex items-center justify-center overflow-hidden">
                                        <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/40 dark:bg-black/20" />
                                        <div className="absolute bottom-2 right-2 w-12 h-2 rounded-full bg-white/40 dark:bg-black/20" />
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg flex items-center justify-center text-white rotate-3">
                                            {activeSection === 'profile' ? <User size={32} /> : 
                                             activeSection === 'security' ? <Key size={32} /> : 
                                             activeSection === 'mfa' ? <ShieldCheck size={32} /> : 
                                             <ShieldCheck size={32} />}
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-800">
                                        <ShieldCheck className="w-6 h-6 text-indigo-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col lg:flex-row gap-8 items-start">
                                {/* Left Sidebar (Quick Jump Tabs) */}
                                <div className="w-full lg:w-72 shrink-0">
                                    <Card className="rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden p-3 space-y-1">
                                        {[
                                            { id: 'profile', icon: User, title: 'Personal Info', desc: 'Your identity details', color: 'blue' },
                                            { id: 'security', icon: Key, title: 'Account Security', desc: 'Password & credentials', color: 'indigo' },
                                            { id: 'mfa', icon: ShieldCheck, title: 'Two-Factor Auth', desc: 'Extra security layer', color: 'emerald' },
                                            { id: 'membership', icon: CreditCard, title: 'Membership Plan', desc: 'Billing & subscription', color: 'violet', isModal: true }
                                        ].concat(
                                            profile?.role !== 'consultant' && !profile?.is_consultant ? 
                                            [{ id: 'consultant', icon: ShieldCheck, title: 'Consultant Protocol', desc: 'Expert activation', color: 'rose', isModal: false }] : []
                                        ).map(tab => (
                                            <button 
                                                key={tab.id}
                                                onClick={() => tab.isModal ? setIsMembershipDialogOpen(true) : setActiveSection(tab.id as any)}
                                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                                                    activeSection === tab.id 
                                                    ? 'bg-slate-50 dark:bg-slate-900/50 shadow-sm' 
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-900/30 text-slate-500'
                                                }`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                                    activeSection === tab.id 
                                                    ? `bg-${tab.color}-100 text-${tab.color}-600 dark:bg-${tab.color}-500/20 dark:text-${tab.color}-400` 
                                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                                }`}>
                                                    <tab.icon className="w-4 h-4" strokeWidth={2.5} />
                                                </div>
                                                <div className="text-left overflow-hidden">
                                                    <h4 className={`text-[13px] font-bold truncate ${
                                                        activeSection === tab.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                                                    }`}>{tab.title}</h4>
                                                    <p className="text-[10px] font-medium text-slate-400 truncate">{tab.desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </Card>
                                </div>

                                {/* Right Content Area */}
                                <div className="w-full flex-1 min-w-0">
                                    <Card className="rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_rgb(0,0,0,0.02)] bg-white dark:bg-slate-950 overflow-hidden relative">
                                        <div className="p-6 md:p-10">
                                            {/* Sub-header inside card */}
                                            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-50 dark:border-white/5">
                                                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                                                    {activeSection === 'profile' ? <User size={20} strokeWidth={2.5} /> : 
                                                     activeSection === 'security' ? <Key size={20} strokeWidth={2.5} /> : 
                                                     activeSection === 'mfa' ? <ShieldCheck size={20} strokeWidth={2.5} /> : 
                                                     <ShieldCheck size={20} strokeWidth={2.5} />}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                                        {activeSection === 'profile' ? 'Personal Info' : 
                                                         activeSection === 'security' ? 'Account Security' : 
                                                         activeSection === 'mfa' ? 'Two-Factor Auth' : 
                                                         activeSection === 'consultant' ? 'Consultant Protocol' : 'Settings'}
                                                    </h3>
                                                    <p className="text-[12px] font-medium text-slate-500">
                                                        {activeSection === 'profile' ? 'Update your personal details' : 
                                                         activeSection === 'security' ? 'Update your password and security settings' : 
                                                         activeSection === 'mfa' ? 'Manage authenticator apps' : 
                                                         activeSection === 'consultant' ? 'Enter activation code to enable expert features' : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Forms rendering */}
                                            {activeSection === 'profile' && (
                                                <div className="space-y-6 max-w-xl">
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Display Name</Label>
                                                            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-xl h-12 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Username</Label>
                                                            <Input value={username} onChange={(e) => setUsername(e.target.value)} className="rounded-xl h-12 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number Identity</Label>
                                                            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all px-1">
                                                                <Popover open={openCountryPopup} onOpenChange={setOpenCountryPopup}>
                                                                    <PopoverTrigger asChild>
                                                                        <Button variant="ghost" className="h-10 px-3 font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                                                            <img
                                                                                src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                                                                                alt="Flag"
                                                                                className="w-5 h-auto rounded-[2px]"
                                                                            />
                                                                            <span className="text-slate-400">|</span>
                                                                            <span className="text-sm">{countryDial}</span>
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="p-0 w-[240px] z-[9999] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl" align="start">
                                                                        <Command className="bg-transparent">
                                                                            <CommandInput placeholder="Search country..." className="focus:ring-0 focus-visible:ring-0 focus:outline-none" />
                                                                            <CommandList className="max-h-[300px]">
                                                                                <CommandEmpty>No country found.</CommandEmpty>
                                                                                <CommandGroup>
                                                                                    {countries.map((c) => (
                                                                                        <CommandItem
                                                                                            key={c.code}
                                                                                            onSelect={() => {
                                                                                                setCountryDial(c.dial);
                                                                                                setCountryCode(c.code.toLowerCase());
                                                                                                setPhoneLimit(c.len || 10);
                                                                                                setOpenCountryPopup(false);
                                                                                            }}
                                                                                            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
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
                                                                </Popover>
                                                                <Input
                                                                    value={phoneNumber}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value.replace(/\D/g, '');
                                                                        if (val.length <= phoneLimit) setPhoneNumber(val);
                                                                    }}
                                                                    className="bg-transparent border-0 focus-visible:ring-0 font-bold h-12"
                                                                    placeholder="e.g. 555 000 000"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button onClick={handleUpdateProfile} disabled={loading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">
                                                        {loading ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                        Save Profile
                                                    </Button>
                                                </div>
                                            )}

                                            {activeSection === 'security' && (
                                                <div className="space-y-6 max-w-xl">
                                                    {isGoogleUser ? (
                                                        <div className="space-y-6 text-center py-4">
                                                            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-slate-100 dark:border-white/5">
                                                                <svg className="w-8 h-8" viewBox="0 0 24 24">
                                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Google Managed</h3>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-[240px] mx-auto">
                                                                    Your security settings are handled via Google. Update your password in your Google account.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-6">
                                                            <div className="space-y-4">
                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">New Password</Label>
                                                                    <div className="relative">
                                                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 rounded-xl h-12 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500" />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Password</Label>
                                                                    <div className="relative">
                                                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 rounded-xl h-12 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Button onClick={handleUpdateProfile} disabled={loading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">
                                                                {loading ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                                Update Credentials
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {activeSection === 'mfa' && (
                                                <div className="space-y-6 max-w-xl">
                                                    <div className="text-center space-y-6 mb-8">
                                                        <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center ${isMFAEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'
                                                            }`}>
                                                            <Smartphone size={40} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                                                                {isMFAEnabled ? 'Status: Protected' : 'Status: High Risk'}
                                                            </h3>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mt-2 max-w-[280px] mx-auto">
                                                                Multi-Factor Authentication adds an extra layer of security to your protocol.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {factors.length > 0 ? (
                                                            factors.map((factor: any) => (
                                                                <div key={factor.id} className="flex items-center justify-between p-6 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/50">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${factor.status === 'verified' ? 'bg-emerald-100' : 'bg-amber-100'
                                                                            }`}>
                                                                            <Smartphone className={`w-5 h-5 ${factor.status === 'verified' ? 'text-emerald-600' : 'text-amber-600'
                                                                                }`} />
                                                                        </div>
                                                                        <div className="text-left">
                                                                            <p className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Authenticator</p>
                                                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${factor.status === 'verified' ? 'text-emerald-600' : 'text-amber-600'
                                                                                }`}>
                                                                                {factor.status === 'verified' ? 'Active' : 'Unverified'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {factor.status !== 'verified' && (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleVerifyExisting(factor)}
                                                                                className="h-8 text-[9px] font-black uppercase tracking-widest border-amber-200 text-amber-600 hover:bg-amber-50"
                                                                            >
                                                                                Complete Setup
                                                                            </Button>
                                                                        )}
                                                                        <Button variant="ghost" size="icon" onClick={() => handleUnenrollMFA(factor.id)} className="text-rose-500 hover:bg-rose-50 rounded-full">
                                                                            <X size={18} />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <Button onClick={handleEnrollMFA} className="w-full h-12 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">
                                                                Setup 2FA
                                                            </Button>
                                                        )}
                                                        <div className="flex justify-center mt-4">
                                                            <Button variant="ghost" onClick={() => setIsMFAGuideOpen(true)} className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                                                                How it works?
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeSection === 'consultant' && (
                                                <div className="space-y-6 max-w-xl">
                                                    <div className="p-6 bg-indigo-50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 text-center">
                                                        <ShieldCheck className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
                                                        <h3 className="font-bold text-slate-900 dark:text-white mb-1 uppercase tracking-tighter">Enter Activation Code</h3>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Provide your expert credentials</p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Access Code</Label>
                                                        <div className="relative">
                                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                            <Input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="XXXX-XXXX" className="pl-10 rounded-xl h-12 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500" />
                                                        </div>
                                                    </div>
                                                    <Button onClick={handleActivateConsultant} disabled={isActivating || !accessCode} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">
                                                        {isActivating ? <Loader2 className="animate-spin" /> : "Activate Status"}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* App Footer Info */}
                    <div className="text-center pb-12">
                        <p className="text-[9px] font-black text-slate-300 dark:text-white/10 uppercase tracking-[0.4em]">Protocol Version 2.0.4</p>
                    </div>
                </div>
            </div>

            {/* Membership Choice Dialog */}
            <Dialog open={isMembershipDialogOpen} onOpenChange={setIsMembershipDialogOpen}>
                <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] sm:max-w-md rounded-[2.5rem] border-0 shadow-2xl bg-white dark:bg-slate-950 p-8 z-[200]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase text-center mb-2">Membership Protocol</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                            Manage your authorization tier and billing nodes
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4 py-8">
                        <button
                            onClick={() => {
                                setIsMembershipDialogOpen(false);
                                navigate('/billing');
                            }}
                            className="flex flex-col items-center gap-4 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/10 hover:border-indigo-500/50 hover:bg-white dark:hover:bg-white/10 transition-all group"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 transition-transform group-hover:scale-110">
                                <CreditCard size={28} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Billing History</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Receipts & Info</p>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setIsMembershipDialogOpen(false);
                                openPricingModal();
                            }}
                            className="flex flex-col items-center gap-4 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/10 hover:border-emerald-500/50 hover:bg-white dark:hover:bg-white/10 transition-all group"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 transition-transform group-hover:scale-110">
                                <Zap size={28} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Change Plan</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Upgrade Tier</p>
                            </div>
                        </button>
                    </div>

                    {/* Cancel Subscription — only for paid users */}
                    {profile?.selected_plan && profile.selected_plan !== 'explorer' && (
                        <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                            <button
                                onClick={() => {
                                    setIsMembershipDialogOpen(false);
                                    handleCancelSubscription();
                                }}
                                disabled={loading}
                                className="w-full py-3 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-colors"
                            >
                                Cancel Subscription
                            </button>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setIsMembershipDialogOpen(false)}
                            className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* Cropper Integration */}
            {isCropperOpen && selectedImage && (
                <ImageCropper
                    image={selectedImage}
                    circular={true}
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setIsCropperOpen(false);
                        setSelectedImage(null);
                    }}
                />
            )}

            {/* MFA Enrollment Dialog */}
            <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
                <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] sm:max-w-md rounded-[2rem] border-0 shadow-2xl bg-white dark:bg-slate-950 p-8 z-[200]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase text-center">Security Protocol</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mt-2">
                            {enrollmentData?.totp?.qr_code
                                ? "Scan the code with your authenticator app"
                                : "Enter the code from your authenticator app"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center justify-center space-y-8 py-4">
                        {enrollmentData?.totp?.qr_code ? (
                            <div className="p-6 bg-white rounded-3xl shadow-xl border border-slate-100 flex items-center justify-center overflow-hidden">
                                <img
                                    src={enrollmentData.totp.qr_code}
                                    alt="MFA QR Code"
                                    className="w-48 h-48"
                                />
                            </div>
                        ) : enrollmentData && (
                            <div className="p-6 bg-amber-50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/20 text-center max-w-[280px]">
                                <Smartphone className="w-8 h-8 text-amber-600 mx-auto mb-3" />
                                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
                                    If you haven't scanned the QR code yet, please delete this factor and start over.
                                </p>
                            </div>
                        )}

                        <div className="space-y-4 w-full">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center block">Verification Code</Label>
                            <div className="flex justify-center">
                                <InputOTP
                                    maxLength={6}
                                    value={verificationCode}
                                    onChange={(value) => setVerificationCode(value)}
                                >
                                    <InputOTPGroup className="gap-2">
                                        <InputOTPSlot index={0} className="w-10 h-12 rounded-xl text-lg font-black bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10" />
                                        <InputOTPSlot index={1} className="w-10 h-12 rounded-xl text-lg font-black bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10" />
                                        <InputOTPSlot index={2} className="w-10 h-12 rounded-xl text-lg font-black bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10" />
                                        <InputOTPSlot index={3} className="w-10 h-12 rounded-xl text-lg font-black bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10" />
                                        <InputOTPSlot index={4} className="w-10 h-12 rounded-xl text-lg font-black bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10" />
                                        <InputOTPSlot index={5} className="w-10 h-12 rounded-xl text-lg font-black bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10" />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-center">
                        <Button
                            onClick={handleVerifyMFA}
                            disabled={verificationCode.length !== 6 || isVerifyingMFA}
                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs"
                        >
                            {isVerifyingMFA ? <Loader2 className="animate-spin" /> : "Verify Identity"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <MFAGuide open={isMFAGuideOpen} onOpenChange={setIsMFAGuideOpen} />
        </Layout>
    );
}
