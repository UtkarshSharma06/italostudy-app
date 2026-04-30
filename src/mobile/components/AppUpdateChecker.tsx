import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Rocket, Download, ShieldCheck, Zap, X } from 'lucide-react';
import { Device } from '@capacitor/device';

// current app version
export const CURRENT_APP_VERSION = "1.0.0";

export const AppUpdateChecker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [updateInfo, setUpdateInfo] = useState<{
        latest_version: string;
        update_url: string;
        is_mandatory: boolean;
        release_notes: string;
    } | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        checkUpdate();
    }, []);

    const checkUpdate = async () => {
        const info = await Device.getInfo();
        if (info.platform === 'web') return;

        try {
            // we use a generic config table or standard way to store version
            const { data, error } = await supabase
                .from('app_configs' as any)
                .select('*')
                .eq('key', 'latest_version')
                .maybeSingle();

            if (error || !data) {
                console.log("No update config found in Supabase.");
                return;
            }

            const latest = data.value; // expected "1.0.1"
            if (isVersionHigher(latest, CURRENT_APP_VERSION)) {
                setUpdateInfo({
                    latest_version: latest,
                    update_url: data.update_url || "https://github.com/UtkarshSharma06/personalproject/releases",
                    is_mandatory: data.is_mandatory || false,
                    release_notes: data.release_notes || "Performance optimizations and new features."
                });
                setIsVisible(true);
            }
        } catch (err) {
            console.error("Update check failed:", err);
        }
    };

    const isVersionHigher = (latest: string, current: string) => {
        const l = latest.split('.').map(Number);
        const c = current.split('.').map(Number);
        for (let i = 0; i < Math.max(l.length, c.length); i++) {
            if ((l[i] || 0) > (c[i] || 0)) return true;
            if ((l[i] || 0) < (c[i] || 0)) return false;
        }
        return false;
    };

    const handleUpdate = () => {
        if (updateInfo?.update_url) {
            window.open(updateInfo.update_url, '_system');
        }
    };

    return (
        <>
            {children}
            <AnimatePresence>
                {isVisible && updateInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xl flex items-end justify-center px-4 pb-10"
                    >
                        <motion.div
                            initial={{ y: 100, scale: 0.9 }}
                            animate={{ y: 0, scale: 1 }}
                            className="w-full max-w-sm bg-card border border-border/20 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden"
                        >
                            {/* Background Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />

                            <header className="flex flex-col items-center text-center space-y-6">
                                <div className="w-20 h-20 bg-primary rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-primary/20">
                                    <Rocket className="w-10 h-10 animate-bounce" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter italic">
                                        Mission <span className="text-primary italic">Update</span>
                                    </h2>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                                        Version {updateInfo.latest_version} Available
                                    </p>
                                </div>
                            </header>

                            <div className="mt-8 space-y-6">
                                <div className="bg-secondary/30 rounded-3xl p-5 border border-border/10">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Release Intel</h3>
                                    <p className="text-xs font-semibold leading-relaxed text-muted-foreground/80">
                                        {updateInfo.release_notes}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2 p-3 bg-secondary/20 rounded-2xl border border-border/10">
                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Verified APK</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-secondary/20 rounded-2xl border border-border/10">
                                        <Zap className="w-4 h-4 text-amber-500" />
                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">High Speed</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <Button
                                        onClick={handleUpdate}
                                        className="w-full h-16 bg-primary text-white text-lg font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
                                    >
                                        Initiate Download
                                    </Button>
                                    {!updateInfo.is_mandatory && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => setIsVisible(false)}
                                            className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100"
                                        >
                                            Postpone Mission
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
