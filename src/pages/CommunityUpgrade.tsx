import { useNavigate } from 'react-router-dom';
import { Users, MessageSquare, Sparkles, Zap, Shield, Globe, Target, ArrowRight, Heart, Share2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePricing } from '@/context/PricingContext';

export default function CommunityUpgrade() {
    const navigate = useNavigate();
    const { openPricingModal } = usePricing();

    const perks = [
        {
            icon: Users,
            title: "Study Groups",
            description: "Join or create subject-specific groups to collaborate with peers.",
            color: "from-blue-500 to-cyan-500"
        },
        {
            icon: MessageSquare,
            title: "Expert Community Chat",
            description: "Participate in real-time discussions and get answers from top students.",
            color: "from-indigo-500 to-purple-500"
        },
        {
            icon: Share2,
            title: "Resource Sharing",
            description: "Access and share curated study materials, notes, and tips.",
            color: "from-pink-500 to-rose-500"
        },
        {
            icon: TrendingUp,
            title: "Peer Benchmarking",
            description: "Compare your progress and stay motivated with international peers.",
            color: "from-amber-500 to-orange-500"
        }
    ];

    const highlights = [
        { icon: Globe, label: "Global Network", desc: "Connect with students worldwide" },
        { icon: Shield, label: "Safe Environment", desc: "Moderated & focused communities" },
        { icon: Zap, label: "Instant Chat", desc: "Real-time collaboration tools" },
        { icon: Target, label: "Goal Focused", desc: "Exam-specific discussion rooms" }
    ];

    return (
        <div className="min-h-screen bg-slate-950 overflow-hidden relative font-sans">
            {/* Dynamic Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            {/* Mesh Grid */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoOTksIDEwMiwgMjQxLCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />

            <div className="relative z-10 container mx-auto px-6 py-20">
                {/* Hero */}
                <div className="max-w-4xl mx-auto text-center mb-24">
                    <div className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/20 mb-8 animate-bounce-slow">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        <span className="text-sm font-black text-indigo-300 uppercase tracking-widest">Connect & Conquer</span>
                    </div>

                    <h1 className="text-7xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-none italic">
                        LEARN <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-gradient-x">
                            TOGETHER.
                        </span>
                    </h1>

                    <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed mb-12">
                        Unlock the power of peer collaboration. Join specialized study communities and accelerate your learning journey with ITALOSTUDY.
                    </p>

                    <div className="flex flex-wrap justify-center gap-6">
                        <Button
                            onClick={openPricingModal}
                            className="h-16 px-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg uppercase rounded-2xl shadow-[0_0_40px_rgba(79,70,229,0.4)] transition-all hover:scale-105 active:scale-95 group"
                        >
                            UPGRADE NOW
                            <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
                        </Button>
                        <Button
                            onClick={() => navigate('/dashboard')}
                            variant="outline"
                            className="h-16 px-10 border-slate-800 text-slate-300 hover:bg-slate-900 font-black text-lg uppercase rounded-2xl"
                        >
                            DASHBOARD
                        </Button>
                    </div>
                </div>

                {/* 3D Perk Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-32">
                    {perks.map((perk, i) => (
                        <div
                            key={i}
                            className="group relative bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] p-10 border border-slate-800 transition-all duration-500 hover:border-indigo-500/50 hover:-translate-y-4 hover:shadow-2xl hover:shadow-indigo-500/20"
                        >
                            <div className={`w-16 h-16 bg-gradient-to-br ${perk.color} rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:rotate-12 transition-transform`}>
                                <perk.icon className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-4 tracking-tight uppercase italic">{perk.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                {perk.description}
                            </p>

                            {/* Decorative Corner Glow */}
                            <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br ${perk.color} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity`} />
                        </div>
                    ))}
                </div>

                {/* Highlight Stats Strip */}
                <div className="grid lg:grid-cols-4 gap-8 mb-32">
                    {highlights.map((h, i) => (
                        <div key={i} className="flex items-center gap-6 p-8 bg-slate-900/30 rounded-3xl border border-slate-800/50">
                            <div className="p-4 bg-indigo-500/10 rounded-2xl">
                                <h.icon className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div>
                                <h4 className="text-white font-black uppercase tracking-tighter text-lg">{h.label}</h4>
                                <p className="text-slate-500 text-sm font-bold uppercase">{h.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Social Proof Section */}
                <div className="relative rounded-[4rem] overflow-hidden bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-white/5 p-16 md:p-24 text-center">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80')] opacity-5 mix-blend-overlay scale-125 group-hover:scale-100 transition-transform duration-1000" />

                    <Heart className="w-16 h-16 text-pink-500 mx-auto mb-8 animate-pulse" />
                    <h2 className="text-5xl md:text-6xl font-black text-white mb-8 tracking-tighter uppercase italic">
                        Built for <span className="text-indigo-400">Collaborators</span>
                    </h2>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-12">
                        Education is better when shared. Don't study in isolation. Gain access to the collective intelligence of thousands of students pursuing the same goals as you.
                    </p>

                    <div className="flex flex-col items-center gap-4">
                        <div className="flex -space-x-4 mb-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="w-12 h-12 rounded-full border-4 border-slate-900 overflow-hidden bg-slate-800">
                                    <img src={`https://i.pravatar.cc/150?u=${i + 10}`} alt="User" />
                                </div>
                            ))}
                            <div className="w-12 h-12 rounded-full border-4 border-slate-900 bg-indigo-600 flex items-center justify-center text-white text-xs font-black">
                                +2k
                            </div>
                        </div>
                        <p className="text-indigo-300 font-black uppercase tracking-widest text-sm">Join the Elite & Global Community</p>
                    </div>
                </div>

                <div className="mt-24 text-center">
                    <p className="text-slate-600 text-xs font-black uppercase tracking-[0.5em] mb-4">Beta Special Access</p>
                    <p className="text-indigo-400/60 text-[10px] font-black uppercase tracking-widest">Upgrade now to secure early-bird benefits</p>
                </div>
            </div>

            <style>{`
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient-x {
                    background-size: 200% auto;
                    animation: gradient-x 3s linear infinite;
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 4s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
