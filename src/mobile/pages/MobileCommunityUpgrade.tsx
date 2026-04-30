import { useNavigate } from 'react-router-dom';
import {
    Users, MessageSquare, Sparkles, Zap,
    Globe, Target, ArrowRight, Heart, Share2, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePricing } from '@/context/PricingContext';
import MobileLayout from '../components/MobileLayout';

export default function MobileCommunityUpgrade() {
    const navigate = useNavigate();
    const { openPricingModal } = usePricing();

    const perks = [
        { icon: Users, title: "Study Groups", desc: "Collaborate with subject peers.", color: "bg-blue-600" },
        { icon: MessageSquare, title: "Expert Q&A", desc: "Get real answers from pros.", color: "bg-indigo-600" },
        { icon: Share2, title: "Resource Hub", desc: "Share & access premium notes.", color: "bg-pink-600" },
        { icon: TrendingUp, title: "Benchmarking", desc: "Compare against the elite.", color: "bg-amber-600" }
    ];

    return (
        <MobileLayout>
            <div className="flex flex-col min-h-full bg-[#030014] pb-32 animate-in fade-in duration-500">
            {/* Native App Header */}
            <div className="bg-primary p-12 pt-20 rounded-b-[4rem] text-white text-center space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Users size={120} /></div>
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mb-4 backdrop-blur-md">
                        <Sparkles size={12} className="text-cyan-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Social Protocol</span>
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tight">Learn <br /><span className="text-primary-foreground/60">Together.</span></h1>
                </div>
            </div>

            <main className="px-6 -mt-8 space-y-8 relative z-10">
                {/* Intro Card */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl text-center">
                    <p className="text-sm font-bold text-white/60 leading-relaxed uppercase tracking-tight">Unlock the power of peer collaboration. Join specialized study communities and accelerate your mission.</p>
                </div>

                {/* Perk Stack */}
                <div className="space-y-4">
                    {perks.map((p, i) => (
                        <div key={i} className="flex items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-[2.5rem] active:bg-white/10 transition-colors">
                            <div className={`w-14 h-14 rounded-2xl ${p.color} flex items-center justify-center shrink-0 shadow-lg`}>
                                <p.icon className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-black text-white text-lg uppercase tracking-tight">{p.title}</h4>
                                <p className="text-[10px] font-bold text-white/40 uppercase mt-1">{p.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA Block */}
                <div className="space-y-4 pt-4">
                    <Button
                        onClick={openPricingModal}
                        className="w-full h-20 rounded-[2.5rem] bg-primary text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/20"
                    >
                        Upgrade Now <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <button
                        onClick={() => navigate('/mobile/dashboard')}
                        className="w-full text-[10px] font-black uppercase text-white/20 tracking-widest"
                    >
                        Maybe later
                    </button>
                </div>

                {/* Social Proof Pride */}
                <div className="pt-10 flex flex-col items-center">
                    <Heart size={32} className="text-rose-500 mb-4 animate-pulse" />
                    <p className="text-[9px] font-black uppercase text-white/30 tracking-[0.5em] mb-4">Elite Global Network</p>
                    <div className="flex -space-x-3">
                        {[1, 2, 3, 4, 5].map(j => <div key={j} className="w-10 h-10 rounded-full border-2 border-[#030014] bg-indigo-600 flex items-center justify-center text-[8px] font-black">Agent</div>)}
                    </div>
                </div>
            </main>
            </div>
        </MobileLayout>
    );
}
