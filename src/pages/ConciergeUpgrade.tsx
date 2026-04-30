import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Users, FileText, MessageSquare, Award, Sparkles, Globe, Target, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ConciergeUpgrade() {
    const navigate = useNavigate();

    const steps = [
        {
            icon: FileText,
            title: "Submit Application",
            description: "Complete your profile with academic records, test scores, and personal statement",
            color: "from-blue-500 to-indigo-600"
        },
        {
            icon: Users,
            title: "Expert Matching",
            description: "Get paired with a dedicated consultant specialized in your target universities",
            color: "from-indigo-600 to-purple-600"
        },
        {
            icon: MessageSquare,
            title: "Real-Time Guidance",
            description: "Chat directly with your consultant for personalized advice and document reviews",
            color: "from-purple-600 to-pink-600"
        },
        {
            icon: Award,
            title: "Admission Success",
            description: "Receive offers from top universities with our proven application strategy",
            color: "from-pink-600 to-rose-600"
        }
    ];

    const features = [
        { icon: Target, label: "University Matching", desc: "Data-driven recommendations" },
        { icon: Shield, label: "Document Review", desc: "Expert feedback on essays" },
        { icon: Globe, label: "Global Network", desc: "Access to 500+ universities" },
        { icon: Zap, label: "Fast Track", desc: "Priority application processing" }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 overflow-hidden relative">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl animate-spin-slow" />
            </div>

            {/* Floating Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />

            <div className="relative z-10 container mx-auto px-6 py-16">
                {/* Hero Section */}
                <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 mb-6">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-bold text-white/90 uppercase tracking-wider">Apply University Service</span>
                    </div>

                    <h1 className="text-6xl md:text-7xl font-black text-white mb-6 tracking-tight leading-tight">
                        Your Journey to
                        <br />
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Dream University
                        </span>
                    </h1>

                    <p className="text-xl text-white/70 max-w-2xl mx-auto font-medium leading-relaxed">
                        Expert admission consultants guide you through every step of your application journey with personalized support and proven strategies.
                    </p>
                </div>

                {/* How It Works - 3D Cards */}
                <div className="mb-20">
                    <h2 className="text-4xl font-black text-white text-center mb-12 uppercase tracking-tight">
                        How It <span className="text-indigo-400">Works</span>
                    </h2>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {steps.map((step, i) => (
                            <div
                                key={i}
                                className="group relative"
                                style={{
                                    animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
                                    animationDelay: `${i * 0.2}s`
                                }}
                            >
                                {/* 3D Card Effect */}
                                <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-white/30 transition-all duration-500 hover:scale-105 hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-indigo-500/50">
                                    {/* Step Number */}
                                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg rotate-12 group-hover:rotate-0 transition-transform">
                                        {i + 1}
                                    </div>

                                    {/* Icon */}
                                    <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                                        <step.icon className="w-8 h-8 text-white" />
                                    </div>

                                    {/* Content */}
                                    <h3 className="text-xl font-black text-white mb-3 uppercase tracking-tight">
                                        {step.title}
                                    </h3>
                                    <p className="text-white/60 text-sm leading-relaxed">
                                        {step.description}
                                    </p>

                                    {/* Glow Effect */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity blur-xl`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Features Grid */}
                <div className="mb-20">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, i) => (
                            <div
                                key={i}
                                className="relative group bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-indigo-400/50 transition-all duration-300 hover:scale-105"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-transform">
                                        <feature.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white text-sm mb-1 uppercase tracking-wide">
                                            {feature.label}
                                        </h4>
                                        <p className="text-white/50 text-xs">
                                            {feature.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats Section */}
                <div className="mb-20 bg-white/5 backdrop-blur-xl rounded-3xl p-12 border border-white/10">
                    <div className="grid md:grid-cols-3 gap-12 text-center">
                        <div className="group">
                            <div className="text-6xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform">
                                95%
                            </div>
                            <div className="text-white/60 font-bold uppercase tracking-wide text-sm">
                                Success Rate
                            </div>
                        </div>
                        <div className="group">
                            <div className="text-6xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform">
                                500+
                            </div>
                            <div className="text-white/60 font-bold uppercase tracking-wide text-sm">
                                Partner Universities
                            </div>
                        </div>
                        <div className="group">
                            <div className="text-6xl font-black bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform">
                                24/7
                            </div>
                            <div className="text-white/60 font-bold uppercase tracking-wide text-sm">
                                Expert Support
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="text-center bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-12 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />

                    <div className="relative z-10">
                        <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tight">
                            Ready to Start?
                        </h2>
                        <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
                            Join thousands of students who achieved their dream university admission with our expert guidance.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                onClick={() => navigate('/apply-university')}
                                className="h-16 px-8 bg-white text-indigo-600 hover:bg-white/90 font-black text-sm uppercase tracking-wide rounded-2xl shadow-2xl hover:scale-105 transition-all"
                            >
                                Start Application
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                            <Button
                                onClick={() => navigate('/dashboard')}
                                variant="outline"
                                className="h-16 px-8 border-2 border-white text-white hover:bg-white/10 font-bold rounded-2xl"
                            >
                                Back to Dashboard
                            </Button>
                        </div>

                        <p className="text-white/60 text-xs mt-6 font-medium">
                            🎉 <strong>Beta Special:</strong> All premium features are currently FREE
                        </p>
                    </div>
                </div>
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 20s linear infinite;
                }
            `}</style>
        </div>
    );
}
