import { motion, AnimatePresence } from 'framer-motion';
import { Download, ShieldCheck, Smartphone, Lock, ExternalLink, CheckCircle2, Globe, FileText, Sun, Moon, ArrowDown, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const lightScreenshots = [
    { id: 'dashboard', url: '/screenshot-dashboard.jpg', title: 'Dashboard' },
    { id: 'study', url: '/screenshot-study.jpg', title: 'Study Hub' },
    { id: 'quiz', url: '/screenshot-quiz.jpg', title: 'Practice Hub' },
    { id: 'analytics', url: '/screenshot-analytics.jpg', title: 'AI Analytics' },
];

const darkScreenshots = [
    { id: 'dashboard', url: '/screenshot-dashboard-dark.jpg', title: 'Dashboard' },
    { id: 'study', url: '/screenshot-study-dark.jpg', title: 'Study Hub' },
    { id: 'quiz', url: '/screenshot-quiz-dark.jpg', title: 'Practice Hub' },
    { id: 'analytics', url: '/screenshot-analytics-dark.jpg', title: 'AI Analytics' },
];

const PhoneFrame = ({ imgUrl, className }: { imgUrl: string, className?: string }) => (
    <div className={cn(
        "relative w-full aspect-[9/19] bg-orange-600 rounded-[2rem] p-[2px] shadow-[0_10px_30px_-5px_rgba(234,88,12,0.2)] transition-all overflow-hidden",
        className
    )}>
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 animate-hue-rotate opacity-50" />
        <div className="relative w-full h-full rounded-[1.8rem] overflow-hidden bg-black p-[2px]">
            <div className="absolute inset-0 z-10 pointer-events-none rounded-[1.6rem] border-[1px] border-orange-500/10 animate-pulse" />
            <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden">
                <img
                    src={imgUrl}
                    alt="App Screen"
                    className="w-full h-full object-cover"
                    key={imgUrl}
                    loading="lazy"
                />
            </div>
        </div>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full z-20 border border-white/5" />
    </div>
);

export default function DownloadApp() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isNative, setIsNative] = useState<boolean | null>(null);

    useEffect(() => {
        const checkPlatform = async () => {
            try {
                const { Device } = await import('@capacitor/device');
                const info = await Device.getInfo();
                const native = info.platform === 'android' || info.platform === 'ios';
                setIsNative(native);
                if (native) {
                    navigate('/dashboard');
                }
            } catch (e) {
                setIsNative(false);
            }
        };
        checkPlatform();
    }, [navigate]);

    if (isNative === true) return null;
    const APK_DOWNLOAD_URL = "https://jyjhpqtqbwtxxgijxetq.supabase.co/storage/v1/object/public/apk-files/italostudy-v1.0.0-release.apk";
    const VIRUSTOTAL_URL = "https://www.virustotal.com/gui/file/ef41264aa0fdf0a9ba3fab15213dcdc4d4715f1ccc58dbb371f686fea6a1c731?nocache=1";

    const currentScreenshots = theme === 'light' ? lightScreenshots : darkScreenshots;

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-orange-50">
            {/* Minimal Navigation */}
            <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-sm fixed top-0 w-full z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <img
                        src="/logo.webp"
                        alt="Logo"
                        className="h-12 w-auto object-contain"
                        width="180"
                        height="48"
                    />
                </div>
            </nav>

            {/* PAGE 1: HERO & MOCKUPS (Split View) */}
            <section className="min-h-screen lg:h-screen flex flex-col lg:flex-row relative">

                {/* Left Side: Actions */}
                <div className="w-full lg:w-[40%] flex flex-col justify-center px-8 md:px-16 pt-32 lg:pt-48 pb-12 space-y-10 lg:pl-20 border-r border-slate-50 relative z-10">
                    <div className="space-y-6">


                        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                            Download ItaloStudy <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-indigo-500 to-orange-600 bg-[length:200%_auto] animate-text-shimmer italic">
                                App for Android
                            </span>
                        </h1>

                        <p className="text-sm md:text-base text-slate-500 font-medium max-w-sm leading-relaxed">
                            Experience the full power of ItaloStudy on your mobile device. 14k+ questions, AI insights, and native performance.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <button
                            onClick={() => setIsDialogOpen(true)}
                            className="inline-flex items-center gap-4 px-8 py-5 bg-[#00a884] text-white rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-[#008f6f] hover:-translate-y-1 transition-all group w-full sm:w-auto"
                        >
                            <Download size={20} className="group-hover:animate-bounce" />
                            <div className="text-left">
                                <div className="text-sm font-bold leading-none mb-1">Download Official APK</div>
                                <div className="text-[8px] font-bold text-white/70 uppercase tracking-widest">Version 1.0.0 • 17.7 MB</div>
                            </div>
                        </button>

                        <div className="flex flex-wrap gap-6 pt-2">
                            <div className="flex items-center gap-2 text-emerald-600">
                                <ShieldCheck size={16} />
                                <span className="text-[9px] font-black uppercase tracking-widest">VirusTotal Verified</span>
                            </div>
                            <div className="flex items-center gap-2 text-indigo-600">
                                <Lock size={16} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Safe & Private</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-20 hidden lg:flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-300 animate-bounce cursor-default">
                        <ArrowDown size={14} /> Scroll for Security Audit
                    </div>
                </div>

                {/* Right Side: Mockups */}
                <div className="w-full lg:w-[60%] bg-slate-50 flex flex-col p-8 md:p-12 relative lg:justify-center">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative z-20">
                        <div className="space-y-1">
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Live Preview</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Adaptive Dark & Light UI</p>
                        </div>

                        <div className="flex bg-white/80 backdrop-blur-md p-1 rounded-full border border-slate-200 shadow-sm">
                            <button
                                onClick={() => setTheme('light')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                                    theme === 'light' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <Sun size={12} /> Light
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                                    theme === 'dark' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <Moon size={12} /> Dark
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8 items-center max-w-4xl mx-auto lg:mx-0">
                        {currentScreenshots.map((s, idx) => (
                            <motion.div
                                key={s.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="space-y-4"
                            >
                                <PhoneFrame imgUrl={s.url} />
                                <div className="text-center">
                                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{s.title}</h3>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PAGE 2: SECURITY - Reverted and Polished Card Style */}
            <section className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-24 border-t border-slate-100">
                <div className="max-w-6xl w-full space-y-16">
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-emerald-500 text-white mb-6 shadow-xl shadow-emerald-100">
                            <ShieldCheck size={40} />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">High Integrity Build</h2>
                        <p className="text-base text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">Verifiable security reports for the v1.0.0 Stable release.</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-10">
                        {/* Audit Card: VirusTotal Scan */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[4rem] p-10 border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-700 group"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-orange-50 rounded-2xl text-orange-600">
                                        <FileText size={22} />
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">VirusTotal Analysis</h3>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full">
                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">0/65 Detections</span>
                                </div>
                            </div>

                            <div className="aspect-[16/10] rounded-3xl overflow-hidden bg-slate-950 border border-slate-200 p-2 mb-8 group-hover:scale-[1.02] transition-transform duration-700">
                                <img
                                    src="/security-audit.png"
                                    alt="VirusTotal Scan"
                                    className="w-full h-full object-contain"
                                    loading="lazy"
                                />
                            </div>

                            <div className="space-y-6">
                                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                                    Binary comparison against global security engines including Kaspersky and CrowdStrike. Integrity verified.
                                </p>
                                <a
                                    href={VIRUSTOTAL_URL} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-lg"
                                >
                                    View Audit History <ExternalLink size={14} />
                                </a>
                            </div>
                        </motion.div>

                        {/* Audit Card: Play Protect Scan */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[4rem] p-10 border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-700 group"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600">
                                        <Smartphone size={22} />
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Google Play Protect</h3>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full">
                                    <ShieldCheck size={12} className="text-indigo-500" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Device Verified</span>
                                </div>
                            </div>

                            <div className="aspect-[16/10] rounded-3xl overflow-hidden bg-slate-50 border border-slate-100 p-8 mb-8 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-700">
                                <img
                                    src="/play-protect.png"
                                    alt="Google Play Protect"
                                    className="h-full w-auto object-contain rounded-xl"
                                    loading="lazy"
                                />
                            </div>

                            <div className="space-y-6">
                                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                                    Official on-device behavioral analysis confirmed zero threats. Native environment ready for installation.
                                </p>
                                <div className="flex gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Platform</span>
                                        <span className="text-[10px] font-bold text-slate-900 uppercase">Android 7.0+</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Build Status</span>
                                        <span className="text-[10px] font-bold text-emerald-500 uppercase">Production</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            <footer className="py-20 px-6 text-center border-t border-slate-100 bg-white">
                <div className="max-w-6xl mx-auto flex flex-col items-center gap-8">
                    <img
                        src="/logo.webp"
                        alt="Logo"
                        className="h-12 w-auto object-contain opacity-30 grayscale brightness-0"
                        width="180"
                        height="48"
                    />
                </div>
            </footer>

            <AnimatePresence>
                {isDialogOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsDialogOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-emerald-100"
                        >
                            <div className="bg-emerald-500 p-10 flex flex-col items-center text-white relative">
                                <div className="absolute top-6 right-6">
                                    <button
                                        onClick={() => setIsDialogOpen(false)}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/30 animate-pulse">
                                    <Clock size={40} className="text-white" />
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-center leading-tight">
                                    Build in <br />Progress
                                </h3>
                            </div>
                            <div className="p-10 text-center space-y-8">
                                <div className="space-y-3">
                                    <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">App development in progress</p>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                        We are currently optimizing the Google Sign-in flow and push notification protocol. The official APK will be available for download shortly.
                                    </p>
                                </div>

                                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100/50">
                                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-normal">
                                        "We will update you soon <br />via global protocol"
                                    </p>
                                </div>

                                <button
                                    onClick={() => setIsDialogOpen(false)}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-200 hover:bg-black transition-all"
                                >
                                    Understood
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes hue-rotate {
                    from { filter: hue-rotate(0deg); }
                    to { filter: hue-rotate(360deg); }
                }
                .animate-hue-rotate {
                    animation: hue-rotate 10s linear infinite;
                }
                @keyframes text-shimmer {
                    from { background-position: 0% center; }
                    to { background-position: 200% center; }
                }
                .animate-text-shimmer {
                    animation: text-shimmer 4s linear infinite;
                }
            `}</style>
        </div>
    );
}
