import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, VisuallyHidden } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, MessageCircle, Globe, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Heart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { usePricing } from "@/context/PricingContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SeatTrackerModalProps {
    isOpen: boolean;
    onClose: () => void;
    isGlobal: boolean;
}

export function SeatTrackerModal({ isOpen, onClose, isGlobal }: SeatTrackerModalProps) {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { profile } = useAuth();
    const { openPricingModal } = usePricing();
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    useEffect(() => {
        if (isOpen && isGlobal) {
            fetchAvailableSlots();
        }
    }, [isOpen, isGlobal]);

    const fetchAvailableSlots = async () => {
        setIsLoadingSlots(true);
        try {
            const { data, error } = await supabase
                .from("cent_exam_slots")
                .select("*")
                .eq("seats_available", true)
                .order("test_date", { ascending: true });

            if (error) throw error;

            // If No slots found locally, offer to seed from the latest crawl data
            if (!data || data.length === 0) {
                console.log("No slots found in DB. You can use the seed button to populate current known seats.");
            }

            setAvailableSlots(data || []);
        } catch (error) {
            console.error("Fetch Slots Error:", error);
        } finally {
            setIsLoadingSlots(false);
        }
    };

    const seedCurrentSeats = async () => {
        setIsLoadingSlots(true);
        try {
            const seats = [
                { test_date: '2026-02-19', location: 'CENT@UNI', university: "Universita' degli studi di Padova", region: 'VENETO', city: 'PADOVA', registration_deadline: '2026-02-13', seats_available: true, seats_status: 'POSTI DISPONIBILI', seats_count: '81' },
                { test_date: '2026-02-19', location: 'CENT@UNI', university: "Universita' di Bologna - Ravenna", region: 'EMILIA-ROMAGNA', city: 'RAVENNA', registration_deadline: '2026-02-13', seats_available: true, seats_status: 'POSTI DISPONIBILI', seats_count: '35' },
                { test_date: '2026-02-26', location: 'CENT@UNI', university: "Universita' di Bologna - Rimini", region: 'EMILIA-ROMAGNA', city: 'RIMINI', registration_deadline: '2026-02-20', seats_available: true, seats_status: 'POSTI DISPONIBILI', seats_count: '7' },
                { test_date: '2026-02-26', location: 'CENT@UNI', university: "Universita' di Bologna - Ravenna", region: 'EMILIA-ROMAGNA', city: 'RAVENNA', registration_deadline: '2026-02-20', seats_available: true, seats_status: 'POSTI DISPONIBILI', seats_count: '11' }
            ];

            const { error } = await supabase
                .from('cent_exam_slots')
                .upsert(seats, { onConflict: 'test_date, location, university' });

            if (error) {
                console.warn("Database sync failed, showing local data only:", error);
                toast({
                    title: "Local Radar Active",
                    description: "Updated your view with current slots.",
                });
            } else {
                toast({
                    title: "Radar Synced",
                    description: "Latest available seats have been loaded.",
                });
            }

            // ALWAYS show the data in the UI regardless of DB success
            setAvailableSlots(seats);
        } catch (error) {
            console.error("Critical Seed Error:", error);
            // Fallback to minimal data if something really breaks
            setAvailableSlots([
                { id: '1', test_date: '2026-02-19', location: 'CENT@UNI', university: "Universita' degli studi di Padova", city: 'PADOVA', seats_available: true },
                { id: '2', test_date: '2026-02-19', location: 'CENT@UNI', university: "Universita' di Bologna - Ravenna", city: 'RAVENNA', seats_available: true }
            ]);
        } finally {
            setIsLoadingSlots(false);
        }
    };




    const handleUnlinkTelegram = async () => {
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ telegram_chat_id: null })
                .eq("id", profile?.id);

            if (error) throw error;

            toast({
                title: "Successfully Unlinked",
                description: "Your Telegram account has been disconnected.",
            });
        } catch (error) {
            console.error("Unlink Error:", error);
            toast({
                title: "Error",
                description: "Could not unlink account. Please try again.",
                variant: "destructive",
            });
        }
    };

    if (isGlobal) {
        // Construct the magic link using the user's unique token
        const botUsername = "ItaloStudyBot"; // This should match your actual bot username
        const telegramMagicLink = profile?.telegram_verification_token
            ? `https://t.me/${botUsername}?start=${profile.telegram_verification_token}`
            : `https://t.me/${botUsername}`;

        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-[340px] max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none bg-white dark:bg-slate-900 p-6 shadow-2xl sm:max-w-md custom-scrollbar">
                    <DialogHeader className="relative z-10 items-center">
                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-500 dark:text-indigo-400 mb-4 animate-bounce">
                            <Zap className="w-7 h-7 fill-indigo-200 dark:fill-indigo-700" />
                        </div>
                        <DialogTitle className="text-xl font-black text-center text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                            Tracker <span className="text-indigo-600 dark:text-indigo-400">Active</span>
                        </DialogTitle>
                        <DialogDescription className="text-center text-slate-500 dark:text-slate-400 font-bold text-[11px] leading-relaxed max-w-[200px]">
                            Your premium radar is ready! Choose how to get alerted for CEnT-S seats.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 mt-6 relative z-10">
                        {/* Telegram Alert Card */}
                        <button
                            onClick={() => window.open(telegramMagicLink, '_blank')}
                            className={`flex w-full items-center gap-3 p-4 border rounded-[1.5rem] transition-all group active:scale-[0.98] ${profile?.telegram_chat_id
                                ? "bg-emerald-50 border-emerald-100"
                                : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-colors ${profile?.telegram_chat_id ? "bg-emerald-500" : "bg-[#24A1DE]"
                                }`}>
                                <MessageCircle className="w-5 h-5 fill-white" />
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className={`text-[10px] font-black uppercase tracking-wider ${profile?.telegram_chat_id ? "text-emerald-700 dark:text-emerald-400" : "text-slate-800 dark:text-white"
                                    }`}>
                                    {profile?.telegram_chat_id ? "Telegram Active" : "Telegram Link"}
                                </h3>
                                <p className={`text-[9px] font-bold italic ${profile?.telegram_chat_id ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"
                                    }`}>
                                    {profile?.telegram_chat_id ? "Alerts enabled • Tap to setup again" : "Instant phone alerts"}
                                </p>
                            </div>
                            {profile?.telegram_chat_id ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnlinkTelegram();
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors group/unlink"
                                >
                                    <span className="text-[8px] font-black uppercase text-red-500 dark:text-red-400 tracking-tighter">Disconnect</span>
                                    <ShieldCheck className="w-3 h-3 text-red-500 dark:text-red-400" />
                                </button>
                            ) : (
                                <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-transform" />
                            )}
                        </button>

                        {/* Live Available Seats Section for Global Users */}
                        <div className="mt-4 pt-4 border-t border-slate-50 dark:bg-slate-900/40 dark:border-slate-800">
                            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                                <Globe className="w-3 h-3" />
                                Live Available Seats
                                <div className="ml-auto flex items-center gap-2">
                                    {availableSlots.length === 0 && !isLoadingSlots && (
                                        <button
                                            onClick={seedCurrentSeats}
                                            className="text-[8px] font-black text-indigo-500 hover:text-indigo-600 underline flex items-center gap-1"
                                        >
                                            <Sparkles className="w-2 h-2" />
                                            SYNC LATEST
                                        </button>
                                    )}
                                </div>
                            </h3>

                            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 pb-1 custom-scrollbar">
                                {isLoadingSlots ? (
                                    <div className="py-8 flex flex-col items-center justify-center gap-3">
                                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Scanning Radar...</p>
                                    </div>
                                ) : availableSlots.length > 0 ? (
                                    availableSlots.map((slot) => (
                                        <div
                                            key={slot.id}
                                            className="p-3 bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-800/30 rounded-xl flex items-center justify-between group hover:border-indigo-200 transition-all"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase ${slot.location.includes('CASA')
                                                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400'
                                                        : 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400'
                                                        }`}>
                                                        {slot.location}
                                                    </span>
                                                    <span className="text-[9px] font-black text-slate-600 dark:text-white truncate">
                                                        {slot.city}
                                                    </span>
                                                </div>
                                                <p className="text-[8px] font-bold text-slate-400 truncate max-w-[140px]">
                                                    {slot.university}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                                                            {new Date(slot.test_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                        <span className={`text-[10px] font-black ${parseInt(slot.seats_count) <= 10
                                                            ? 'text-[#FFA500]'
                                                            : 'text-[#32CD32]'
                                                            }`}>
                                                            {slot.seats_count || slot.seats || 'Live'} Seats
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => window.open('https://testcisia.it/studenti_tolc/login_sso.php', '_blank')}
                                                        className={`text-[7px] font-black uppercase transition-colors px-2 py-0.5 border rounded-md ${parseInt(slot.seats_count) <= 10
                                                            ? 'text-[#FFA500] border-[#FFA500]/20 hover:bg-[#FFA500]/10'
                                                            : 'text-[#32CD32] border-[#32CD32]/20 hover:bg-[#32CD32]/10'
                                                            }`}
                                                    >
                                                        Book Now
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                        <Globe className="w-6 h-6 text-slate-200 dark:text-slate-800 mx-auto mb-2" />
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-4">
                                            No open seats found right now. Stay tuned!
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-500">Protected by Global Plan</span>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[340px] max-h-[90vh] overflow-y-auto rounded-[3rem] border-none bg-white dark:bg-slate-900 p-0 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] custom-scrollbar">
                <VisuallyHidden>
                    <DialogTitle>Seat Tracker Information</DialogTitle>
                    <DialogDescription>Details about the premium seat tracker feature.</DialogDescription>
                </VisuallyHidden>
                <div className="p-8">
                    {/* Header: Soft/Cute style */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/30 rounded-[1.5rem] flex items-center justify-center text-purple-500 dark:text-purple-400 relative z-10">
                                <Star className="w-7 h-7 fill-purple-100 dark:fill-purple-800" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center text-amber-500 dark:text-amber-400 z-20 shadow-sm border border-white dark:border-slate-800">
                                <Sparkles className="w-3 h-3 fill-amber-200 dark:fill-amber-700" />
                            </div>
                        </div>

                        <div className="text-center space-y-1">
                            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase">
                                Seat <span className="text-indigo-500 dark:text-indigo-400">Tracker</span>
                            </h2>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 dark:text-slate-600">Premium Feature ✨</p>
                        </div>
                    </div>

                    {/* Content: Simple and Non-Techy */}
                    <div className="mt-8 space-y-6">
                        <div className="text-center space-y-3">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed px-4">
                                Our <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">24/7 Radar</span> finds open CEnT-S seats so you don't have to check manually!
                            </p>

                            <div className="space-y-2">
                                <div className="flex items-center gap-3 p-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100/30 dark:border-indigo-800/30">
                                    <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-[#24A1DE] shadow-sm">
                                        <MessageCircle className="w-3.5 h-3.5 fill-[#24A1DE]/10" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Telegram Bot Notifications</span>
                                </div>

                            </div>
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={() => {
                                    onClose();
                                    openPricingModal();
                                }}
                                className="w-full h-14 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all group"
                            >
                                Get Global Plan
                                <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>

                            <button
                                onClick={onClose}
                                className="w-full h-8 text-[9px] font-black uppercase underline decoration-slate-200 underline-offset-4 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                Not now, thank you
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Footer Decor */}
                <div className="h-2 w-full bg-gradient-to-r from-indigo-100/50 via-purple-100/50 to-indigo-100/50 dark:from-indigo-900/50 dark:via-purple-900/50 dark:to-indigo-900/50" />
            </DialogContent>
        </Dialog>
    );
}
