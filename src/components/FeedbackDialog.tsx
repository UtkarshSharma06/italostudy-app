import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
    Star, Send, MessageSquare, Lightbulb,
    HelpCircle, X, ShieldCheck, Layout,
    Video, BookOpen, Bug, ArrowLeft,
    ArrowRight, CheckCircle2, Monitor,
    AlertCircle, Sparkles
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface FeedbackDialogProps {
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function FeedbackDialog({ trigger, open, onOpenChange }: FeedbackDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [internalOpen, setInternalOpen] = useState(false);
    const [step, setStep] = useState(1);
    const totalSteps = 4;

    const isOpen = open !== undefined ? open : internalOpen;
    const setIsOpen = (val: boolean) => {
        if (onOpenChange) onOpenChange(val);
        else setInternalOpen(val);
        if (!val) setTimeout(() => setStep(1), 300); // Reset stay on close
    };

    // --- State Management ---
    const [rating, setRating] = useState(0);
    const [category, setCategory] = useState('general');
    const [review, setReview] = useState('');

    const [questionQuality, setQuestionQuality] = useState(0);
    const [mocktestQuality, setMocktestQuality] = useState(0);
    const [videoLectures, setVideoLectures] = useState(0);

    const [uiUxRating, setUiUxRating] = useState(0);
    const [securityRating, setSecurityRating] = useState(0);
    const [bugsExperienced, setBugsExperienced] = useState(false);
    const [bugDetails, setBugDetails] = useState('');

    const [npsScore, setNpsScore] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const wordCount = review.trim().split(/\s+/).filter(Boolean).length;
    const maxWords = 100;

    const handleSubmit = async () => {
        if (!user) {
            toast({ title: 'Error', description: 'Please sign in to submit feedback', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await supabase
                .from('feedback')
                .insert([{
                    user_id: user.id,
                    rating,
                    category,
                    review: review.trim() || null,
                    question_quality_rating: questionQuality || null,
                    mocktest_quality_rating: mocktestQuality || null,
                    video_lectures_rating: videoLectures || null,
                    ui_ux_rating: uiUxRating || null,
                    security_rating: securityRating || null,
                    bugs_experienced: bugsExperienced,
                    bug_details: bugDetails.trim() || null,
                    nps_score: npsScore,
                    suggestions: suggestions.trim() || null
                }]);

            if (error) throw error;

            // Send Thank You Email
            try {
                await supabase.functions.invoke('send-feedback-email', {
                    body: {
                        email: user.email,
                        userName: user.user_metadata?.display_name || user.email?.split('@')[0],
                        rating: rating
                    }
                });
            } catch (emailErr) {
                console.error("Failed to send feedback email:", emailErr);
                // Don't toast error here, as feedback was saved successfully
            }

            toast({
                title: 'Feedback Submitted!',
                description: 'Thank you for your detailed feedback!',
            });

            setIsOpen(false);
        } catch (error: any) {
            toast({ title: 'Submission Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const StarRating = ({ value, onChange, label, icon: Icon }: any) => (
        <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
                {Icon && <Icon className="w-4 h-4 text-indigo-600" />}
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
            </div>
            <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => onChange(s)}
                        className={cn(
                            "w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center group",
                            value >= s
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                : "border-slate-100 dark:border-slate-800 text-slate-300 hover:border-indigo-200"
                        )}
                    >
                        <Star className={cn("w-5 h-5", value >= s ? "fill-white" : "group-hover:text-indigo-400")} />
                    </button>
                ))}
            </div>
        </div>
    );

    const categories = [
        { value: 'general', label: 'General', icon: MessageSquare },
        { value: 'feature', label: 'Feature Request', icon: Lightbulb },
        { value: 'bug', label: 'Bug Report', icon: AlertCircle },
        { value: 'content', label: 'Course Content', icon: BookOpen },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="h-10 px-4 rounded-xl border-2 font-bold text-sm transition-all group">
                        <MessageSquare className="w-4 h-4 mr-2 group-hover:text-indigo-600 transition-colors" />
                        Detailed Feedback
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="max-w-xl max-h-[95vh] overflow-hidden rounded-3xl md:rounded-[2.5rem] p-0 border-none shadow-2xl bg-white dark:bg-slate-950 flex flex-col">
                {/* Custom Header with Progress */}
                <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-900 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-indigo-950/20 dark:via-slate-950 dark:to-purple-950/20 relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 dark:bg-slate-900">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500 rounded-r-full"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <div className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                            Step {step} of {totalSteps}
                        </div>
                        {step > 1 && (
                            <button onClick={() => setStep(s => s - 1)} className="text-slate-400 hover:text-indigo-600 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors">
                                <ArrowLeft className="w-3 h-3" /> Back
                            </button>
                        )}
                    </div>

                    <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        {step === 1 && "Start Your Review *"}
                        {step === 2 && "Quality Deep Dive *"}
                        {step === 3 && "Technical & Layout *"}
                        {step === 4 && "Final Recommendation *"}
                    </DialogTitle>
                </div>

                <div className="p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto flex-1">
                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Category Select */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">Primary Interest</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {categories.map((c) => (
                                        <button
                                            key={c.value}
                                            onClick={() => setCategory(c.value)}
                                            className={cn(
                                                "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all font-bold text-[11px] text-left",
                                                category === c.value
                                                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 shadow-sm"
                                                    : "border-slate-100 dark:border-slate-900 hover:border-slate-200 text-slate-600 dark:text-slate-400"
                                            )}
                                        >
                                            <c.icon className="w-4 h-4" />
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <StarRating value={rating} onChange={setRating} label="Overall Platform Experience" />

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex justify-between items-center">
                                    <span>Detailed Review *</span>
                                    <span className={cn(wordCount > maxWords ? "text-red-500" : "opacity-40")}>{wordCount}/{maxWords}</span>
                                </label>
                                <Textarea
                                    value={review}
                                    onChange={(e) => setReview(e.target.value)}
                                    placeholder="Tell us what you like or specify major issues..."
                                    className="min-h-[120px] rounded-2xl border-2 focus:ring-0 focus:border-indigo-600 font-medium text-sm leading-relaxed"
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <StarRating value={questionQuality} onChange={setQuestionQuality} label="Question & Accuracy Quality *" icon={BookOpen} />
                            <StarRating value={mocktestQuality} onChange={setMocktestQuality} label="Mock Test Experience *" icon={ArrowRight} />
                            <StarRating value={videoLectures} onChange={setVideoLectures} label="Video Lecture Content *" icon={Video} />

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed italic">
                                    "We use your content ratings to prioritize updates for specific subjects and tests."
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <StarRating value={uiUxRating} onChange={setUiUxRating} label="Interface & UI/UX Design *" icon={Monitor} />
                            <StarRating value={securityRating} onChange={setSecurityRating} label="Account Security & Trust *" icon={ShieldCheck} />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm", bugsExperienced ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600")}>
                                            <Bug className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black uppercase tracking-tight text-slate-900 dark:text-white">Experienced any bugs?</h4>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{bugsExperienced ? "Yes, I found issues *" : "No, smooth sailing"}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setBugsExperienced(!bugsExperienced)}
                                        className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", bugsExperienced ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400")}
                                    >
                                        {bugsExperienced ? "Reported" : "Report"}
                                    </button>
                                </div>

                                {bugsExperienced && (
                                    <Textarea
                                        value={bugDetails}
                                        onChange={(e) => setBugDetails(e.target.value)}
                                        placeholder="Please describe the bug and which page it occurred on... *"
                                        className="rounded-2xl border-2 border-rose-100 dark:border-rose-900/20 focus:border-rose-600 font-medium text-sm animate-in zoom-in-95 duration-200"
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] block text-center">Likelihood to Recommend</label>
                                <div className="flex flex-wrap justify-center items-center gap-2">
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                        <button
                                            key={n}
                                            onClick={() => setNpsScore(n)}
                                            className={cn(
                                                "min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border-2 font-black text-sm transition-all flex items-center justify-center touch-manipulation",
                                                npsScore === n
                                                    ? "bg-indigo-600 border-indigo-600 text-white scale-105 shadow-lg shadow-indigo-600/20"
                                                    : "border-slate-100 dark:border-slate-800 text-slate-400 hover:border-indigo-200 active:scale-95"
                                            )}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-between px-1 text-[8px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Not Likely</span>
                                    <span>Extremely Likely</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                    Recommendation Score *
                                </label>
                                <p className="text-[11px] font-bold text-slate-400 italic">
                                    How likely are you to recommend ItaloStudy to a friend?
                                </p>
                                <Textarea
                                    value={suggestions}
                                    onChange={(e) => setSuggestions(e.target.value)}
                                    placeholder="What one thing would make Italostudy perfect for you? *"
                                    className="min-h-[100px] rounded-2xl border-2 focus:border-indigo-600 font-medium text-sm"
                                />
                            </div>

                            <div className="p-6 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <p className="text-[11px] font-bold leading-relaxed opacity-90">
                                    Almost done! Your detailed report helps our engineers target the most important areas.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 md:p-8 md:pt-0 pt-4 flex gap-3 border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950">
                    {step < totalSteps ? (
                        <Button
                            onClick={() => setStep(s => s + 1)}
                            disabled={
                                (step === 1 && (rating === 0 || wordCount > maxWords || review.trim().length === 0)) ||
                                (step === 2 && (questionQuality === 0 || mocktestQuality === 0 || videoLectures === 0)) ||
                                (step === 3 && (uiUxRating === 0 || securityRating === 0 || (bugsExperienced && bugDetails.trim().length === 0)))
                            }
                            className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next Step <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || npsScore === null || suggestions.trim().length === 0}
                            className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Submitting Report..." : "Submit Detailed Report"}
                            {!isSubmitting && <Send className="w-4 h-4 ml-2" />}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
