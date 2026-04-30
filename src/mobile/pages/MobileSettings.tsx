import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
    User, Lock, Bell, CreditCard, HelpCircle,
    LogOut, ChevronRight, Moon, Globe, Zap,
    Share2, ShieldCheck, Key, MessageSquare,
    Camera, Check, X, ArrowLeft, Smartphone, Info, Clock, Loader2, Save
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import MobileLayout from '../components/MobileLayout';
import { useToast } from '@/hooks/use-toast';
import { Share } from '@capacitor/share';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { usePricing } from '@/context/PricingContext';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { ImageCropper } from '@/components/ui/ImageCropper';
import { useTheme } from 'next-themes';
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


type SettingsView = 'main' | 'account' | 'security';

export default function MobileSettings() {
    const { user, profile, signOut, mfa, refreshProfile } = useAuth() as any;
    const { theme, setTheme } = useTheme();
    const isGoogleUser = user?.app_metadata?.provider === 'google';
    const navigate = useNavigate();
    const { toast } = useToast();
    const { t, i18n } = useTranslation();
    const { openPricingModal } = usePricing();
    const [activeView, setActiveView] = useState<SettingsView>('main');
    const [isSharing, setIsSharing] = useState(false);

    // Profile States
    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [countryDial, setCountryDial] = useState("+39");
    const [countryCode, setCountryCode] = useState("it");
    const [phoneLimit, setPhoneLimit] = useState(10);
    const [openCountryPopup, setOpenCountryPopup] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);

    // Security States
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // MFA States
    const [factors, setFactors] = useState<any[]>([]);
    const [isMFAEnabled, setIsMFAEnabled] = useState(false);
    const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
    const [enrollmentData, setEnrollmentData] = useState<any>(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [isVerifyingMFA, setIsVerifyingMFA] = useState(false);
    const [mfaPurpose, setMfaPurpose] = useState<'enroll' | 'unenroll'>('enroll');
    const [unenrollFactorId, setUnenrollFactorId] = useState<string | null>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [isMembershipDialogOpen, setIsMembershipDialogOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        if (location.state?.section) {
            if (location.state.section === 'security') {
                setActiveView('security');
            } else if (location.state.section === 'subscription') {
                openPricingModal();
            } else if (location.state.section === 'payment') {
                setIsPaymentModalOpen(true);
            }
            // Clear state
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
        }
    }, [profile]);

    useEffect(() => {
        if (mfa) {
            fetchMFAFactors();
        }
        checkNotificationStatus();
    }, [mfa]);

    const checkNotificationStatus = async () => {
        // OneSignal Removed
        setNotificationsEnabled(false);
    };

    const fetchMFAFactors = async () => {
        const { data, error } = await mfa.listFactors();
        if (error) return;
        setFactors(data.all || []);
        setIsMFAEnabled(data.all?.some((f: any) => f.status === 'verified') || false);
    };

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

            toast({ title: "Success", description: t('settings.avatar_updated') });
            refreshProfile();
        } catch (error: any) {
            toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsUploading(false);
            setSelectedImage(null);
        }
    };

    const handleUpdateProfile = async () => {
        setIsSavingProfile(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    display_name: displayName,
                    username: username,
                    phone_number: `${countryDial}${phoneNumber.trim()}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            toast({ title: "Success", description: t('settings.profile_updated') });
            refreshProfile();
            setActiveView('main');
        } catch (error: any) {
            if (error.message?.includes('profile_username_key') || error.message?.includes('duplicate key')) {
                toast({ title: "Username Taken", description: "This username is already in use. Please choose another.", variant: "destructive" });
            } else {
                toast({ title: "Update Failed", description: "Could not save profile changes. Please try again.", variant: "destructive" });
            }
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleEnrollMFA = async () => {
        setMfaPurpose('enroll');
        setIsEnrollDialogOpen(true);
        const { data, error } = await mfa.enroll();
        if (error) {
            if (error.message?.includes("already set up")) {
                await fetchMFAFactors();
                setIsEnrollDialogOpen(false);
                toast({ title: "Action Required", description: "An unverified security factor already exists.", variant: "destructive" });
                return;
            }
            toast({ title: "Enrollment Failed", description: error.message, variant: "destructive" });
            setIsEnrollDialogOpen(false);
            return;
        }
        setEnrollmentData(data);
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
            const { data: aalData } = await mfa.getAAL();
            if (factor.status === 'verified' && aalData?.currentLevel === 'aal1') {
                setMfaPurpose('unenroll');
                setUnenrollFactorId(factorId);
                setEnrollmentData(factor);
                setIsEnrollDialogOpen(true);
                toast({ title: "Action Required", description: "Please verify your identity with your MFA code first." });
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

    const handleUpdatePassword = async () => {
        if (!password || password !== confirmPassword) {
            toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            toast({ title: "Success", description: "Password updated successfully!" });
            setPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async () => {
        setIsSharing(true);
        try {
            await Share.share({
                title: 'Join me on ItaloStudy!',
                text: 'Master the IMAT, SAT, and IELTS with the best adaptive prep app.',
                url: 'https://italostudy.com/download',
                dialogTitle: 'Share ItaloStudy',
            });
        } catch (error) {
            navigator.clipboard.writeText('Join me on ItaloStudy! https://italostudy.com/download');
            toast({ title: "Link Copied", description: "Invite link copied to clipboard!" });
        } finally {
            setIsSharing(false);
        }
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        toast({
            title: lng === 'it' ? "Lingua Cambiata" : "Language Switched",
            description: lng === 'it' ? "L'app è ora in Italiano" : "App is now in English"
        });
    };

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    };

    const handleToggleNotifications = async () => {
        toast({ title: "Notifications", description: "Push notifications are currently disabled." });
    };

    const settingsGroups = [
        {
            items: [
                {
                    icon: Key,
                    label: t('settings.account'),
                    sub: t('settings.account_sub'),
                    onClick: () => setActiveView('account'),
                    iconClass: "bg-emerald-500"
                },
                {
                    icon: ShieldCheck,
                    label: "Security",
                    sub: isMFAEnabled ? "Protected Status" : "Enhance Security",
                    onClick: () => setActiveView('security'),
                    iconClass: "bg-indigo-600"
                },
                {
                    icon: CreditCard,
                    label: t('settings.subscription'),
                    sub: profile?.selected_plan === 'global' ? 'Global Admission Plan' :
                        profile?.selected_plan === 'pro' ? 'Exam Prep Plan' :
                            profile?.selected_plan === 'elite' ? 'Global Admission Plan' :
                                profile?.selected_plan === 'explorer' ? 'Explorer Plan' : "Free Tier",
                    onClick: () => setIsMembershipDialogOpen(true),
                    iconClass: "bg-amber-500"
                },
            ]
        },
        {
            items: [
                {
                    icon: Bell,
                    label: t('settings.notifications'),
                    sub: t('settings.notifications_sub'),
                    toggle: true,
                    checked: notificationsEnabled,
                    onClick: handleToggleNotifications,
                    iconClass: "bg-rose-500"
                },

                {
                    icon: Moon,
                    label: t('settings.appearance'),
                    sub: theme === 'dark' ? "Dark Mode" : "Light Mode",
                    toggle: true,
                    checked: theme === 'dark',
                    onClick: toggleTheme,
                    iconClass: "bg-slate-700"
                },
            ]
        },
        {
            items: [
                {
                    icon: HelpCircle,
                    label: t('settings.help'),
                    sub: t('settings.help_sub'),
                    onClick: () => navigate('/contact'),
                    iconClass: "bg-teal-600"
                },
                {
                    icon: Share2,
                    label: t('settings.invite'),
                    onClick: handleInvite,
                    iconClass: "bg-orange-500"
                },
            ]
        }
    ];

    if (activeView === 'account') {
        return (
            <MobileLayout isLoading={!profile} hideHeader={true}>
                <div className="flex flex-col min-h-full bg-background animate-in slide-in-from-right duration-300">
                <header className="px-6 py-8 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border/10">
                    <button onClick={() => setActiveView('main')} className="p-2 -ml-2 text-primary transition-transform active:scale-90"><ArrowLeft /></button>
                    <h1 className="text-xl font-black uppercase tracking-tight">{t('settings.account_edit')}</h1>
                </header>
                <div className="px-6 py-8 space-y-8 overflow-y-auto">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-4 mb-4">
                        <div className="relative group/avatar">
                            <Avatar className={cn(
                                "h-32 w-32 shadow-2xl border-4",
                                profile?.selected_plan === 'global'
                                    ? "border-amber-400 ring-4 ring-amber-400/30 shadow-amber-500/40"
                                    : "border-background ring-4 ring-primary/10"
                            )}>
                                <AvatarImage src={getOptimizedImageUrl(avatarUrl || profile?.avatar_url, 128)} />
                                <AvatarFallback className={cn(
                                    "text-white font-black text-4xl uppercase",
                                    profile?.selected_plan === 'global' ? "bg-amber-500" : "bg-primary"
                                )}>
                                    {(displayName || user?.email)?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            {isUploading && (
                                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center rounded-full z-10">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                </div>
                            )}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-1 right-1 w-10 h-10 bg-emerald-500 rounded-full border-4 border-background flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-90 transition-all z-20"
                            >
                                <Camera size={18} />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                        </div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Tap camera to update photo</p>
                    </div>

                    <div className="bg-card p-8 rounded-[2.5rem] border border-border/40 space-y-6 shadow-xl shadow-primary/5">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">{t('settings.display_name')}</Label>
                            <Input
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="h-14 rounded-2xl bg-secondary/20 border-border/10 focus:border-primary focus:ring-0 text-lg font-bold"
                                placeholder="Your full name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">{t('settings.username')}</Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black opacity-30 text-lg">@</span>
                                <Input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="h-14 rounded-2xl bg-secondary/20 border-border/10 focus:border-primary focus:ring-0 pl-10 text-lg font-bold"
                                    placeholder="username"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Phone Number Identity</Label>
                            <div className="flex items-center bg-secondary/20 border border-border/10 rounded-2xl focus-within:border-primary transition-all px-2 h-14">
                                <Popover open={openCountryPopup} onOpenChange={setOpenCountryPopup}>
                                    <PopoverTrigger asChild>
                                        <button className="h-10 px-2 font-bold flex items-center gap-2 hover:bg-secondary/30 rounded-lg">
                                            <img
                                                src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                                                alt="Flag"
                                                className="w-5 h-auto rounded-[2px]"
                                            />
                                            <span className="text-muted-foreground opacity-40">|</span>
                                            <span className="text-sm font-bold">{countryDial}</span>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 w-[240px] z-[9999] bg-background border border-border shadow-2xl" align="start">
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
                                                            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/20"
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
                                    className="bg-transparent border-0 focus-visible:ring-0 font-bold h-full text-lg pl-2"
                                    placeholder="e.g. 555 000 000"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Email Identity</Label>
                            <Input value={user?.email} disabled className="h-14 rounded-2xl bg-secondary/10 border-border/5 opacity-50 text-sm font-bold" />
                        </div>

                        <Button
                            onClick={handleUpdateProfile}
                            disabled={isSavingProfile}
                            className="w-full h-16 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 transition-all active:scale-95 mt-4"
                        >
                            {isSavingProfile ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Save className="mr-2 w-4 h-4" />
                                    {t('settings.save_profile')}
                                </>
                            )}
                        </Button>
                    </div>
                </div>

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
            </div>
        </MobileLayout>
    );
}

    if (activeView === 'security') {
        return (
            <MobileLayout isLoading={!profile} hideHeader={true}>
                <div className="flex flex-col min-h-full bg-background animate-in slide-in-from-right duration-300 pb-20 overflow-y-auto">
                <header className="px-6 py-8 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border/10">
                    <button onClick={() => setActiveView('main')} className="p-2 -ml-2 text-primary transition-transform active:scale-90"><ArrowLeft /></button>
                    <h1 className="text-xl font-black uppercase tracking-tight">Security</h1>
                </header>
                <div className="px-6 py-8 space-y-8">
                    {/* MFA Section */}
                    <div className="bg-emerald-500/5 p-8 rounded-[2.5rem] border border-emerald-500/20 space-y-6 shadow-xl shadow-emerald-500/5">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner">
                                <Smartphone size={28} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base font-black uppercase tracking-tight">Multi-Factor Auth</span>
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", isMFAEnabled ? "text-emerald-600" : "text-amber-500")}>
                                    {isMFAEnabled ? "Active Protection" : "High Risk Exposure"}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {factors.length > 0 ? (
                                factors.map((factor) => (
                                    <div key={factor.id} className="flex items-center justify-between p-5 bg-background shadow-sm rounded-3xl border border-border/5 group">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black uppercase tracking-tight">Authenticator App</span>
                                            <span className={cn("text-[9px] font-bold uppercase", factor.status === 'verified' ? "text-emerald-600" : "text-amber-500")}>
                                                {factor.status === 'verified' ? 'Verified Node' : 'Verification Required'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {factor.status !== 'verified' && (
                                                <Button size="sm" onClick={() => { setEnrollmentData(factor); setIsEnrollDialogOpen(true); }} className="h-9 px-4 text-[10px] font-black uppercase bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20">Verify</Button>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => handleUnenrollMFA(factor.id)} className="text-rose-500 h-10 w-10 hover:bg-rose-500/10 rounded-full transition-colors"><X size={20} /></Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <Button onClick={handleEnrollMFA} className="w-full h-16 rounded-[1.5rem] bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                                    Activate 2FA Protocol
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Password Section */}
                    {!isGoogleUser ? (
                        <div className="bg-indigo-500/5 p-8 rounded-[2.5rem] border border-indigo-500/20 space-y-6 shadow-xl shadow-indigo-500/5">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                                    <Key size={24} />
                                </div>
                                <span className="text-base font-black uppercase tracking-tight">Credentials Update</span>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">New Protocol Password</Label>
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-14 rounded-2xl bg-secondary/20 border-border/10 focus:border-indigo-500 text-lg font-bold"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Confirm Identity</Label>
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="h-14 rounded-2xl bg-secondary/20 border-border/10 focus:border-indigo-500 text-lg font-bold"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <Button
                                    onClick={handleUpdatePassword}
                                    disabled={loading}
                                    className="w-full h-16 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sync New Credentials"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-500/5 p-10 rounded-[3rem] border border-slate-500/10 text-center space-y-4">
                            <div className="w-16 h-16 bg-background rounded-3xl flex items-center justify-center mx-auto shadow-md border border-border/5">
                                <Globe className="text-blue-500" size={32} />
                            </div>
                            <h3 className="text-lg font-black uppercase tracking-tight">SSO Managed Protocol</h3>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-relaxed px-4 opacity-60">
                                Managed by Google. All credentials and security layers are synchronized via your primary provider.
                            </p>
                        </div>
                    )}
                </div>

                <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
                    <DialogContent className="sm:max-w-md rounded-[2.5rem] border-0 shadow-2xl bg-background/95 backdrop-blur-xl p-10 mx-4">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-center">Security Core</DialogTitle>
                            <DialogDescription className="text-[11px] font-black uppercase tracking-[0.2em] text-center mt-3 opacity-60">
                                {enrollmentData?.totp?.qr_code
                                    ? "Scan this matrix with your authenticator"
                                    : "Enter the verification node from your app"}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col items-center justify-center space-y-10 py-6">
                            {enrollmentData?.totp?.qr_code && (
                                <div className="p-6 bg-white rounded-[2.5rem] shadow-2xl border-4 border-primary/5 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={enrollmentData.totp.qr_code}
                                        alt="MFA QR Code"
                                        className="w-48 h-48"
                                    />
                                </div>
                            )}

                            <div className="space-y-5 w-full">
                                <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60 text-center block">Access Node Key</Label>
                                <div className="flex justify-center">
                                    <InputOTP
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(value) => setVerificationCode(value)}
                                    >
                                        <InputOTPGroup className="gap-3">
                                            {[...Array(6)].map((_, i) => (
                                                <InputOTPSlot key={i} index={i} className="w-12 h-14 rounded-2xl text-xl font-black bg-secondary/40 border-border/10 focus:border-primary focus:ring-4 focus:ring-primary/10" />
                                            ))}
                                        </InputOTPGroup>
                                    </InputOTP>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="sm:justify-center">
                            <Button
                                onClick={handleVerifyMFA}
                                disabled={verificationCode.length !== 6 || isVerifyingMFA}
                                className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 active:scale-95 transition-all"
                            >
                                {isVerifyingMFA ? "Validating Key..." : "Authorize Identity"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </MobileLayout>
    );
}



    return (
        <MobileLayout isLoading={!profile}>
            <div className="flex flex-col min-h-full bg-background pb-4 animate-in fade-in duration-500 overflow-y-auto">
            {/* Header / Profile Row */}
            <div className="px-4 py-10 mt-2">
                <button
                    onClick={() => setActiveView('account')}
                    className="w-full flex items-center gap-6 p-6 rounded-[2.5rem] bg-card hover:bg-secondary/10 active:bg-secondary/20 transition-all text-left shadow-2xl shadow-primary/5 border border-border/5 group"
                >
                    <div className="relative">
                        <Avatar className={cn(
                            "h-24 w-24 shadow-2xl border-4 transition-transform group-hover:scale-105 group-active:scale-95",
                            profile?.selected_plan === 'global'
                                ? "border-amber-400 ring-4 ring-amber-400/30 shadow-amber-500/40"
                                : "border-background ring-4 ring-primary/5"
                        )}>
                            <AvatarImage src={avatarUrl || profile?.avatar_url} />
                            <AvatarFallback className={cn(
                                "text-white font-black text-3xl uppercase",
                                profile?.selected_plan === 'global' ? "bg-amber-500" : "bg-primary"
                            )}>
                                {(displayName || user?.email)?.charAt(0) || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center border-4 border-background shadow-lg group-hover:bg-emerald-600 transition-colors">
                            <Camera size={14} />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-black tracking-tighter text-foreground truncate uppercase leading-none mb-1">
                            {displayName || profile?.display_name || "Protocol Agent"}
                        </h2>
                        <p className="text-xs font-black text-muted-foreground truncate opacity-40 uppercase tracking-[0.2em]">
                            {username ? `@${username}` : t('settings.status')}
                        </p>
                        <div className="mt-2 inline-flex flex-col">
                            <span className="text-[7px] font-black text-muted-foreground uppercase tracking-[0.1em] leading-none mb-1">Next Billing</span>
                            <span className={cn("text-[9px] font-black uppercase tracking-tighter leading-none opacity-60", profile?.selected_plan === 'explorer' && "text-emerald-500 opacity-100")}>
                                {profile?.selected_plan === 'explorer'
                                    ? 'FREE PLAN'
                                    : profile?.subscription_expiry_date
                                        ? new Date(profile.subscription_expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                        : 'LIFETIME'}
                            </span>
                        </div>

                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-secondary/30 flex items-center justify-center text-primary/30 group-hover:text-primary transition-colors">
                        <ChevronRight size={24} />
                    </div>
                </button>
            </div>

            {/* Content List */}
            <div className="space-y-8">
                {settingsGroups.map((group, i) => (
                    <div key={i} className="px-4">
                        <div className="bg-card rounded-[2.5rem] border border-border/20 overflow-hidden shadow-2xl shadow-primary/5">
                            {group.items.map((item, j) => (
                                item.toggle ? (
                                    <div
                                        key={j}
                                        className="w-full h-24 flex items-center justify-between p-6 hover:bg-secondary/10 transition-colors text-left border-b border-border/5 last:border-0 group"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all group-hover:rotate-3",
                                                item.iconClass
                                            )}>
                                                <item.icon size={24} className="stroke-[2.5px]" />
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-[15px] font-black tracking-tight text-foreground uppercase">{item.label}</p>
                                                {item.sub && <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40 leading-tight mt-1">{item.sub}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch className="scale-110" checked={item.checked} onCheckedChange={item.onClick} />
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        key={j}
                                        onClick={item.onClick}
                                        className="w-full h-24 flex items-center justify-between p-6 hover:bg-secondary/10 active:bg-secondary/20 transition-colors text-left border-b border-border/5 last:border-0 group"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all group-active:scale-90 group-hover:rotate-3",
                                                item.iconClass
                                            )}>
                                                <item.icon size={24} className="stroke-[2.5px]" />
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-[15px] font-black tracking-tight text-foreground uppercase">{item.label}</p>
                                                {item.sub && <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40 leading-tight mt-1">{item.sub}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ChevronRight size={20} className="text-muted-foreground/20 group-hover:text-primary transition-colors" />
                                        </div>
                                    </button>
                                )
                            ))}
                        </div>
                    </div>
                ))}

                {/* Log Out Button */}
                <div className="px-4 pt-6">
                    <button
                        onClick={() => signOut()}
                        className="w-full p-7 rounded-[2rem] bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 active:scale-[0.98] transition-all shadow-xl shadow-rose-500/20 border border-rose-400/20"
                    >
                        <LogOut size={20} className="stroke-[4px]" />
                        {t('settings.logout')}
                    </button>
                </div>
            </div>

            {/* Branding Footer */}
            <div className="mt-8 mb-4 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-primary/20">ItaloStudy System</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-2 text-muted-foreground opacity-30">Ver 2.0.4</p>
            </div>
            {/* Membership Choice Dialog (Mobile) */}
            <Dialog open={isMembershipDialogOpen} onOpenChange={setIsMembershipDialogOpen}>
                <DialogContent className="w-[90%] max-w-sm rounded-[2.5rem] border-0 shadow-2xl bg-background/95 backdrop-blur-xl p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight text-center">Membership</DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-center mt-3 opacity-60">
                            Protocol & Billing Management
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 py-8">
                        <button
                            onClick={() => {
                                setIsMembershipDialogOpen(false);
                                navigate('/mobile/billing');
                            }}
                            className="flex items-center gap-6 p-6 bg-secondary/20 rounded-[2rem] border border-border/10 active:scale-95 transition-all text-left"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                                <CreditCard size={24} />
                            </div>
                            <div>
                                <p className="text-base font-black uppercase tracking-tight">Billing History</p>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">View Receipts</p>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setIsMembershipDialogOpen(false);
                                openPricingModal();
                            }}
                            className="flex items-center gap-6 p-6 bg-secondary/20 rounded-[2rem] border border-border/10 active:scale-95 transition-all text-left"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg">
                                <Zap size={24} />
                            </div>
                            <div>
                                <p className="text-base font-black uppercase tracking-tight">Change Plan</p>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Upgrade Status</p>
                            </div>
                        </button>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={() => setIsMembershipDialogOpen(false)}
                        className="w-full text-[11px] font-black uppercase tracking-widest text-muted-foreground"
                    >
                        Close
                    </Button>
                </DialogContent>
            </Dialog>

            {/* Manage Payment Modal (Mobile) */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] border-0 shadow-2xl bg-background/95 backdrop-blur-xl p-10 mx-4">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight text-center">Manage Payment</DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-center mt-3 opacity-60">
                            Secure Billing Gateway
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-12 flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                            <CreditCard size={40} />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-sm font-black uppercase tracking-tight">Beta Access Protocol</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed px-4">
                                You are currently on an authorized Beta Plan. No payment method is required at this stage.
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={() => setIsPaymentModalOpen(false)}
                        className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-primary text-primary-foreground"
                    >
                        Success
                    </Button>
                </DialogContent>
            </Dialog>
            </div>
        </MobileLayout>
    );
}
