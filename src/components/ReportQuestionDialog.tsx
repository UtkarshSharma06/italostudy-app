import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Send, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportQuestionDialogProps {
    onReport: (reason: string, details?: string) => Promise<void>;
    trigger?: React.ReactNode;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const REASONS = [
    "Inaccurate Information",
    "Incorrect Answer Key",
    "Typo or Grammatical Error",
    "Unclear Explanation",
    "Broken Diagram/Image",
    "Other"
];

export function ReportQuestionDialog({ onReport, trigger, isOpen, onOpenChange }: ReportQuestionDialogProps) {
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedReason) return;
        setIsSubmitting(true);
        try {
            await onReport(selectedReason, details);
            if (onOpenChange) onOpenChange(false);
        } catch (error) {
            console.error('Report failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-none shadow-2xl bg-white dark:bg-slate-950">
                <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-900 bg-gradient-to-br from-rose-50/50 via-white to-orange-50/50 dark:from-rose-950/20 dark:via-slate-950 dark:to-orange-950/20">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest">
                            Quality Assurance
                        </div>
                    </div>
                    <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Report Question</DialogTitle>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Help us improve the mission data</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Select Reason *</label>
                        <div className="grid grid-cols-1 gap-2">
                            {REASONS.map((reason) => (
                                <button
                                    key={reason}
                                    onClick={() => setSelectedReason(reason)}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-xl border-2 transition-all font-bold text-xs text-left",
                                        selectedReason === reason
                                            ? "border-rose-600 bg-rose-50/50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 shadow-sm"
                                            : "border-slate-100 dark:border-slate-900 hover:border-slate-200 text-slate-600 dark:text-slate-400"
                                    )}
                                >
                                    {reason}
                                    {selectedReason === reason && <CheckCircle2 className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Additional Details</label>
                        <Textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="Provide more context (optional)..."
                            className="min-h-[100px] rounded-xl border-2 focus:ring-0 focus:border-rose-600 font-medium text-sm leading-relaxed"
                        />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex gap-3">
                        <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed italic">
                            Your reports are reviewed by our academic team within 24 hours. Corrected questions are propagated site-wide.
                        </p>
                    </div>
                </div>

                <DialogFooter className="p-8 pt-0 flex flex-col sm:flex-row gap-3 items-center">
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !selectedReason}
                        className="w-full h-14 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? "Submitting..." : "Submit Report"}
                        {!isSubmitting && <Send className="w-4 h-4 ml-2" />}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange?.(false)}
                        className="w-full h-14 rounded-xl font-black text-sm uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all sm:hidden"
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
