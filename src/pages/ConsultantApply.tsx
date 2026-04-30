import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, User, Mail, GraduationCap, Briefcase, Loader2, ArrowRight } from "lucide-react";

export default function ConsultantApply() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [qualifications, setQualifications] = useState("");
    const [experience, setExperience] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const { user, signUp } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Auto-fill email if logged in
    useState(() => {
        if (user?.email) setEmail(user.email);
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            let userId = user?.id;

            // Handle signup if not logged in
            if (!userId) {
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match");
                }

                if (password.length < 6) {
                    throw new Error("Password must be at least 6 characters");
                }

                const trimmedEmail = email.trim();
                const { data, error } = await signUp(trimmedEmail, password, fullName);
                if (error) throw error;

                userId = data?.user?.id;

                if (!userId) {
                    throw new Error("Registration failed. Please try signing up manually.");
                }
            }

            // Check if user already has a pending or approved application
            const { data: existing } = await supabase
                .from('consultant_applications')
                .select('status')
                .eq('user_id', userId)
                .single();

            if (existing) {
                if (existing.status === 'pending') {
                    throw new Error("You already have a pending application. Please wait for admin review.");
                } else if (existing.status === 'approved') {
                    throw new Error("You are already approved as a consultant!");
                }
            }

            // Submit application via RPC to bypass RLS issues during signup
            const { error } = await supabase.rpc('submit_consultant_application', {
                p_user_id: userId,
                full_name: fullName,
                email: email,
                specialization: qualifications,
                experience_years: parseInt(experience) || 0
            });

            if (error) throw error;

            toast({
                title: "Application Submitted",
                description: "Your consultant application has been submitted for review. You'll be notified once it's approved.",
            });

            // If user was just created, redirect to dashboard or login
            if (!user) {
                toast({
                    title: "Account Created",
                    description: "Please sign in with your new account to track your application status.",
                });
                navigate("/auth");
            } else {
                navigate("/dashboard");
            }
        } catch (error: any) {
            toast({
                title: "Application Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-muted flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-2xl">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full mb-4">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Consultant Application</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-2 tracking-tighter uppercase">
                        Join Our <span className="text-indigo-600">Expert Team</span>
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                        Apply to become a certified consultant and help students succeed
                    </p>
                </div>

                <div className="bg-white dark:bg-card rounded-[2.5rem] p-8 sm:p-10 border border-slate-100 dark:border-border shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                <Input
                                    type="text"
                                    placeholder="DR. JOHN SMITH"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="pl-12 h-12 bg-slate-50 dark:bg-muted border-slate-100 rounded-xl font-black text-[11px] uppercase tracking-widest placeholder:text-slate-300"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={!!user}
                                    className="pl-12 h-12 bg-slate-100 dark:bg-muted border-slate-100 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-400"
                                    required
                                />
                            </div>
                        </div>

                        {!user && (
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-12 bg-slate-50 dark:bg-muted border-slate-100 rounded-xl font-bold text-xs"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Password</label>
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="h-12 bg-slate-50 dark:bg-muted border-slate-100 rounded-xl font-bold text-xs"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Qualifications</label>
                            <div className="relative group">
                                <GraduationCap className="absolute left-4 top-4 w-4 h-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                <Textarea
                                    placeholder="Ph.D. in Mathematics, M.Sc. in Physics..."
                                    value={qualifications}
                                    onChange={(e) => setQualifications(e.target.value)}
                                    className="pl-12 min-h-24 bg-slate-50 dark:bg-muted border-slate-100 rounded-xl font-bold text-xs placeholder:text-slate-300"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Experience</label>
                            <div className="relative group">
                                <Briefcase className="absolute left-4 top-4 w-4 h-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                <Textarea
                                    placeholder="10+ years teaching experience, former university professor..."
                                    value={experience}
                                    onChange={(e) => setExperience(e.target.value)}
                                    className="pl-12 min-h-32 bg-slate-50 dark:bg-muted border-slate-100 rounded-xl font-bold text-xs placeholder:text-slate-300"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-lg active:scale-95 transition-all group"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {user ? "Submit Application" : "Sign Up & Apply"}
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
