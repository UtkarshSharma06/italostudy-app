import { motion } from 'framer-motion';
import { LayoutDashboard, Hammer, Construction, Sparkles, BookOpen, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface MaintenanceOverlayProps {
    message?: string;
    pageName?: string;
    showAdminBypass?: boolean;
    onBypass?: () => void;
}

export const MaintenanceOverlay = ({ 
    message = "We're currently refining this section of the protocol. Stay tuned for exciting updates!",
    pageName = "Protocol Section",
    showAdminBypass = false,
    onBypass
}: MaintenanceOverlayProps) => {
    const navigate = useNavigate();

    return (
        <div className="relative min-h-[calc(100vh-72px)] w-full flex items-center justify-center overflow-hidden bg-white dark:bg-[#020617] p-4 md:p-6">
            {/* Artistic Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] dark:opacity-30 mix-blend-overlay" />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 max-w-xl w-full"
            >
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/50 dark:border-white/5 p-8 md:p-12 lg:p-14 rounded-[2.5rem] shadow-[0_48px_96px_-12px_rgba(0,0,0,0.08)] dark:shadow-none text-center">
                    {/* Icon Container */}
                    <div className="relative w-20 h-20 mx-auto mb-8">
                        <motion.div
                            animate={{ 
                                scale: [1, 1.05, 1],
                                rotate: [0, 2, -2, 0]
                            }}
                            transition={{ 
                                duration: 5, 
                                repeat: Infinity, 
                                ease: "easeInOut" 
                            }}
                            className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 relative z-10"
                        >
                            <Hammer className="w-8 h-8" />
                        </motion.div>
                        <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full scale-125 animate-pulse" />
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-center gap-2">
                            <span className="h-[1px] w-4 bg-indigo-500/30" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 dark:text-indigo-400">
                                Engineering Phase
                            </span>
                            <span className="h-[1px] w-4 bg-indigo-500/30" />
                        </div>
                        
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                            Refining the <br /> 
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 italic">
                                {pageName}
                            </span>
                        </h2>

                        <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto uppercase tracking-wider opacity-80">
                            {message}
                        </p>

                        <div className="pt-4 flex flex-col sm:flex-row gap-3">
                            <Button 
                                onClick={() => navigate('/dashboard')}
                                className="h-12 flex-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold uppercase tracking-widest text-[9px] shadow-lg hover:-translate-y-0.5 transition-all active:scale-98 group"
                            >
                                <LayoutDashboard className="w-3.5 h-3.5 mr-2" />
                                Dashboard
                            </Button>
                            
                            <Button 
                                variant="outline"
                                onClick={() => navigate(-1)}
                                className="h-12 flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent font-bold uppercase tracking-widest text-[9px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-98"
                            >
                                Revert Connection
                            </Button>
                        </div>

                        {showAdminBypass && (
                            <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                <Button 
                                    variant="ghost"
                                    onClick={onBypass}
                                    className="h-10 w-full rounded-xl border border-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest text-[8px] hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all active:scale-98"
                                >
                                    <Shield className="w-3.5 h-3.5 mr-2" />
                                    Admin Preview: Bypass Protection
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center justify-center gap-6 mt-10 opacity-40">
                    <div className="flex items-center gap-2">
                        <Shield className="w-3 h-3" />
                        <span className="text-[7px] font-bold uppercase tracking-[0.2em]">Secure</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        <span className="text-[7px] font-bold uppercase tracking-[0.2em]">Premium Tier</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
