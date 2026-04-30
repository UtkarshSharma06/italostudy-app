import { useNavigate } from 'react-router-dom';
import {
    GraduationCap, MessageSquare, Sparkles, Zap,
    Globe, Target, ArrowRight, Heart, Award, FileText, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePricing } from '@/context/PricingContext';

export default function MobileConciergeUpgrade() {
    const navigate = useNavigate();
    const { openPricingModal } = usePricing();

    const perks = [
        {
            icon: Target,
            title: "Expert Matching",
            desc: "Get paired with consultants for your target universities.",
            color: "bg-indigo-600"
        },
        {
            icon: FileText,
            title: "Document Review",
            desc: "Expert feedback on your essays and statements.",
            color: "bg-purple-600"
        },
        {
            icon: Globe,
            title: "Global Network",
            desc: "Access to 500+ universities worldwide.",
            color: "bg-blue-600"
        },
        {
            icon: Award,
            title: "Admission Success",
            desc: "95% success rate for our premium candidates.",
            color: "bg-rose-600"
        }
    ];

    const stats = [
        { label: "Success Rate", val: "95%" },
        { label: "Partner Uni", val: "500+" },
        { label: "Support", val: "24/7" }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-[#030014] pb-32 animate-in fade-in duration-500 overflow-x-hidden">
            {/* Native App Header - Concise & Premium */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-12 pt-16 rounded-b-[4rem] text-white text-center space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><GraduationCap size={120} /></div>
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mb-4 backdrop-blur-md">
                        <Sparkles size={12} className="text-yellow-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Premium service</span>
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tight leading-none">Global <br /><span className="text-white/60">Admission.</span></h1>
                </div>
            </div>

            <main className="px-6 -mt-8 space-y-8 relative z-10">
                {/* Intro Card */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl text-center">
                    <p className="text-sm font-bold text-white/60 leading-relaxed uppercase tracking-tight">
                        Reach your dream university with personalized support and proven strategies from expert consultants.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                    {stats.map((s, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center">
                            <div className="text-xl font-black text-indigo-400">{s.val}</div>
                            <div className="text-[7px] font-bold text-white/40 uppercase tracking-widest mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Perk Stack */}
                <div className="space-y-4">
                    <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Membership Benefits</h3>
                    {perks.map((p, i) => (
                        <div key={i} className="flex items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-[2.5rem] active:bg-white/10 transition-colors group">
                            <div className={`w-14 h-14 rounded-2xl ${p.color} flex items-center justify-center shrink-0 shadow-lg group-active:scale-95 transition-transform`}>
                                <p.icon className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-black text-white text-lg uppercase tracking-tight">{p.title}</h4>
                                <p className="text-[10px] font-bold text-white/40 uppercase mt-1 leading-relaxed">{p.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA Block */}
                <div className="space-y-4 pt-4">
                    <Button
                        onClick={openPricingModal}
                        className="w-full h-20 rounded-[2.5rem] bg-indigo-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/20 active:scale-95 transition-all"
                    >
                        Upgrade Now <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <button
                        onClick={() => navigate('/mobile/dashboard')}
                        className="w-full text-[10px] font-black uppercase text-white/20 tracking-widest text-center py-4"
                    >
                        Return to Dashboard
                    </button>

                    <p className="text-[9px] font-bold text-indigo-400/40 text-center uppercase tracking-widest">
                        🎉 Beta Special: Premium access included
                    </p>
                </div>
            </main>
        </div>
    );
}
