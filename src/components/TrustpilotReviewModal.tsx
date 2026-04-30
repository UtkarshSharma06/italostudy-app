import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { 
    X, 
    Upload, 
    Loader2, 
    CheckCircle2, 
    Star, 
    AlertCircle, 
    ExternalLink,
    ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Tesseract is now dynamically imported only when needed

interface TrustpilotReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function TrustpilotReviewModal({ isOpen, onClose, onSuccess }: TrustpilotReviewModalProps) {
    const { user } = useAuth() as any;
    const { toast } = useToast();
    const [step, setStep] = useState<'request' | 'processing' | 'uploading' | 'success'>('request');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const verifyImage = async (file: File) => {
        setStep('processing');
        setProgress(10);
        setError(null);

        try {
            if (file.size < 20000) {
                throw new Error("This image is too small to be a clear screenshot. Please upload a full-sized image.");
            }

            // DYNAMIC IMPORT: Only load the heavy OCR engine when the user actually uploads a file
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('eng');
            setProgress(30);
            
            const { data: { text } } = await worker.recognize(file);
            setProgress(70);
            await worker.terminate();

            const keywords = [
                "Trustpilot", "Excellent", "Review", "Italostudy", "Verified",
                "Summary", "About", "Reviews", "All reviews", "Write a review",
                "italostudy.com", "Useful", "Share", "cent-s", "imat", "sat"
            ];
            const foundKeywords = keywords.filter(k => text.toLowerCase().includes(k.toLowerCase()));

            if (foundKeywords.length < 3) {
                throw new Error("We couldn't detect enough details in this image to verify it as a Trustpilot review for ItaloStudy. Please upload a clear screenshot of your submitted review.");
            }

            setStep('uploading');
            setProgress(80);
            const uploadRes = await uploadToCloudinary(file, `reviews/${user?.id || 'anonymous'}`);
            setProgress(90);

            const { error: dbError } = await supabase
                .from('review_submissions' as any)
                .insert({
                    user_id: user?.id,
                    image_url: uploadRes.secure_url,
                    extracted_text: text.substring(0, 500)
                });

            if (dbError) throw dbError;

            const { error: profileError } = await (supabase
                .from('profiles')
                .update({ has_submitted_review: true } as any) as any)
                .eq('id', user?.id);

            if (profileError) throw profileError;

            setStep('success');
            setProgress(100);
            setTimeout(() => {
                onSuccess();
            }, 1500);

        } catch (err: any) {
            console.error("Verification failed:", err);
            setError(err.message || "Something went wrong during verification.");
            setStep('request');
            setProgress(0);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) verifyImage(file);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 max-h-[calc(100vh-40px)] flex flex-col"
                >
                    <div className="h-32 bg-amber-500 relative flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-20 pointer-events-none">
                            <div className="grid grid-cols-6 gap-2 rotate-12 scale-150">
                                {[...Array(24)].map((_, i) => (
                                    <Star key={i} className="w-8 h-8 text-white" />
                                ))}
                            </div>
                        </div>
                        <ShieldCheck className="w-16 h-16 text-white relative z-10" />
                        <button 
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-8 sm:p-10 -mt-6 bg-white dark:bg-slate-900 rounded-t-[2.5rem] relative z-20 overflow-y-auto custom-scrollbar">
                        {step === 'request' && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="text-center space-y-3">
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Support Italostudy!</h2>
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 italic">
                                            "Italostudy is free, at least we deserve a review" 🧡
                                        </p>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium text-pretty px-4">
                                        Leave a quick review on Trustpilot to unlock your mock exams instantly.
                                    </p>
                                </div>

                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center shadow-sm shrink-0 border border-slate-100 dark:border-slate-800 font-black text-amber-500 text-xs text-pretty">1</div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Leave a Review</p>
                                            <a 
                                                href="https://www.trustpilot.com/review/italostudy.com" 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700 underline underline-offset-4"
                                            >
                                                it'll take 30s! <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center shadow-sm shrink-0 border border-slate-100 dark:border-slate-800 font-black text-amber-500 text-xs text-pretty">2</div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Step Two</p>
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full h-12 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center gap-3 text-slate-400 hover:border-amber-500 hover:text-amber-500 transition-all group"
                                            >
                                                <Upload className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Upload Screenshot</span>
                                            </button>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                onChange={handleFileSelect} 
                                                accept="image/*" 
                                                className="hidden" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl flex items-start gap-3">
                                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-tight leading-relaxed">{error}</p>
                                    </div>
                                )}

                                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                                    One-time request only
                                </p>
                            </div>
                        )}

                        {(step === 'processing' || step === 'uploading') && (
                            <div className="py-12 flex flex-col items-center justify-center space-y-6">
                                <div className="w-24 h-24 relative flex items-center justify-center">
                                    <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                                    <div className="absolute inset-0 border-4 border-amber-100 dark:border-slate-800 rounded-full" />
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {step === 'processing' ? 'Analyzing Screenshot...' : 'Unlocking...'}
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                        Hybrid OCR Active
                                    </p>
                                </div>
                            </div>
                        )}

                        {step === 'success' && (
                            <div className="py-12 flex flex-col items-center justify-center space-y-6">
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center"
                                >
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                </motion.div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-black text-emerald-600 tracking-tight">Verified!</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Good luck with your Mock Exam!</p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
