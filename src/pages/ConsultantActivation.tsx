import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Key, User, Loader2, ArrowRight, Sparkles } from "lucide-react";

export default function ConsultantActivation() {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Verify, 2: Setup Profile

    const { signUp, signIn } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const normalizedEmail = email.trim().toLowerCase();

            // 1. First, check if the code exists in the database
            const { data, error } = await supabase
                .from('consultant_access_codes')
                .select('*')
                .eq('protocol_id', normalizedEmail)
                .eq('code', code.trim())
                .single();

            if (error || !data) {
                throw new Error("Invalid credentials. Please check your Protocol ID and Security Key.");
            }

            // 2. If the code is already used, try to sign in
            if (data.is_used) {
                const { error: signInError } = await signIn(normalizedEmail, code.trim());
                if (!signInError) {
                    toast({
                        title: "Access Granted",
                        description: "Authenticated via Expert Protocol.",
                    });
                    navigate("/consultant/dashboard");
                    return;
                } else {
                    throw new Error("Account exists but credentials are invalid. Please contact support.");
                }
            }

            // 3. If code is unused, proceed to step 2 (Set Display Name) for new activation
            setStep(2);
        } catch (error: any) {
            toast({
                title: "Gateway Protocol Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const normalizedEmail = email.trim().toLowerCase();

            // 1. Sign up the user using the security key as initial password
            const { data: signUpData, error: signUpError } = await signUp(normalizedEmail, code.trim(), displayName);

            if (signUpError) {
                if (signUpError.message.includes("already registered")) {
                    throw new Error("This email is already registered as a different profile. Please contact support to upgrade your existing account.");
                }
                throw signUpError;
            }

            // 2. Get the user from signup response
            const user = signUpData?.user;

            if (!user) {
                throw new Error("Signup succeeded but user data is missing. Please try logging in.");
            }

            // 3. Manually update the profile role to consultant
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ role: 'consultant' })
                .eq('id', user.id);

            if (profileError) {
                console.error("Profile update error:", profileError);
                toast({
                    title: "Warning: Profile Role Not Set",
                    description: `Could not set consultant role: ${profileError.message}`,
                    variant: "destructive"
                });
            }

            // 4. Mark the access code as used
            const { error: codeError } = await supabase
                .from('consultant_access_codes')
                .update({
                    is_used: true,
                    used_by: user.id
                })
                .eq('protocol_id', normalizedEmail)
                .eq('code', code.trim())
                .eq('is_used', false);

            if (codeError) {
                console.error("Code update error:", codeError);
                toast({
                    title: "Warning: Code Not Marked as Used",
                    description: `Could not update access code: ${codeError.message}`,
                    variant: "destructive"
                });
            }

            toast({
                title: "Security Protocol Initialized",
                description: "Expert profile created. Your credentials have been authenticated.",
            });

            // Redirect to dashboard
            navigate("/consultant/dashboard");
        } catch (error: any) {
            toast({
                title: "Activation Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background elements for "Premium" feel */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#312e81_0%,transparent_50%)]" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-900/20 rounded-full blur-[120px]" />

            <div className="relative z-10 w-full max-w-md">
                <div className="mb-12 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Restricted Access</span>
                    </div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">Expert <span className="text-indigo-500">Gateway</span></h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                        Verify your security credentials to access the <br />
                        high-tier consultant ecosystem.
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl">
                    {step === 1 ? (
                        <form onSubmit={handleVerifyCode} className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Protocol ID (Email)</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <Input
                                        type="email"
                                        placeholder="contact@italostudy.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl text-white font-black text-xs uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/50"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Security Key</label>
                                <div className="relative group">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <Input
                                        type="text"
                                        placeholder="XXXX-XXXX-XXXX"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl text-white font-black text-xs uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/50"
                                        required
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-900/20 active:scale-95 transition-all group"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        Verify Security Protocol
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleActivate} className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Identity Confirmed</h3>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Complete your professional profile</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Professional Display Name</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <Input
                                        type="text"
                                        placeholder="DR. SMITH / PROF. JANE"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl text-white font-black text-xs uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/50"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                                <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest leading-relaxed text-center">
                                    By activating, you agree to the Consultant Ethical Standards and Data Security Protocols.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-900/20 active:scale-95 transition-all group"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Finalize Activation</>}
                            </Button>
                        </form>
                    )}
                </div>

                <div className="mt-8 text-center">
                    <Link to="/auth" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors">
                        Return to Personal Access
                    </Link>
                </div>
            </div>
        </div>
    );
}
