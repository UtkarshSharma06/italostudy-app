import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';

export const PWAPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Don't show if we are already in a native app
    const platform = Capacitor.getPlatform();
    if (platform !== 'web') return;

    // Check if user has already dismissed the prompt
    const isDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (isDismissed) return;

    // Check if it's already installed or if it's standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    if (isStandalone) return;

    // Check for early-captured prompt
    if ((window as any).deferredPWAData) {
      setDeferredPrompt((window as any).deferredPWAData);
      setIsVisible(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPWAData = e;
      
      // If the event fires, we can show it even sooner
      setTimeout(() => {
        setIsVisible(true);
      }, 1000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fallback: Show the prompt anyway after 3 seconds to "introduce" the feature
    // if it's not already visible.
    const fallbackTimer = setTimeout(() => {
      if (!isVisible) {
        setIsVisible(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(fallbackTimer);
    };
  }, [isVisible]);

  const { toast } = useToast();

  const handleInstall = async () => {
    if (!deferredPrompt) {
        toast({
            title: "Installation Pending",
            description: "Your browser is still preparing the App. Please try again in a few seconds, or use the 'Add to Home Screen' option in your browser menu.",
        });
        return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
      setIsVisible(false);
    }
    
    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 50, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 20, opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="fixed bottom-safe-4 right-0 left-0 z-[100] px-4 pb-4 md:left-auto md:w-[380px]"
                >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-2xl p-3 flex items-center gap-3 ring-1 ring-black/5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-inner">
                            <Smartphone className="w-5 h-5 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                                Install App
                            </h3>
                            {isIOS ? (
                                <p className="text-[11px] font-medium text-slate-500 leading-tight mt-0.5 truncate">
                                    Tap <span className="inline-block border border-slate-300 dark:border-slate-600 rounded px-1 mx-0.5 align-middle"><span className="text-xs">â†‘</span></span> then <b>Add to Home Screen</b>
                                </p>
                            ) : (
                                <p className="text-[11px] font-medium text-slate-500 leading-tight mt-0.5 truncate">
                                    Fast, offline access & alerts
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            {!isIOS && (
                                <Button 
                                    onClick={handleInstall}
                                    className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm"
                                >
                                    Get
                                </Button>
                            )}
                            <button 
                                onClick={handleDismiss}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
