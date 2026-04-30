import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, LayoutDashboard, User, GraduationCap, FileText, Upload, Plane, CreditCard, Send } from "lucide-react";
import { cn } from "@/lib/utils";

// Step Definitions
export const STEPS = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'address', label: 'Address', icon: Plane },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'tests', label: 'Test Scores', icon: FileText },
    { id: 'program', label: 'Program', icon: LayoutDashboard },
    { id: 'review', label: 'Review', icon: Check }
];

interface ApplicationStepperProps {
    currentStepId: string;
    onStepChange: (stepId: string) => void;
    completedSteps: string[];
}

export function ApplicationStepper({ currentStepId, onStepChange, completedSteps }: ApplicationStepperProps) {
    return (
        <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex items-center gap-4 min-w-max px-2">
                {STEPS.map((step, index) => {
                    const isCompleted = completedSteps.includes(step.id);
                    const isCurrent = currentStepId === step.id;
                    const Icon = step.icon;

                    return (
                        <div key={step.id} className="flex items-center gap-4">
                            <button
                                onClick={() => onStepChange(step.id)}
                                disabled={!isCompleted && !isCurrent && index > completedSteps.length}
                                className={cn(
                                    "relative flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300",
                                    isCurrent
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none scale-105"
                                        : isCompleted
                                            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900"
                                            : "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-800"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                    isCurrent ? "bg-white/20" : isCompleted ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-slate-50 dark:bg-slate-800"
                                )}>
                                    {isCompleted && !isCurrent ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        <Icon className="w-4 h-4" />
                                    )}
                                </div>
                                <div className="text-left">
                                    <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-0.5 opacity-60">Step {index + 1}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-tight leading-none whitespace-nowrap">{step.label}</p>
                                </div>
                            </button>

                            {index < STEPS.length - 1 && (
                                <div className="w-4 h-0.5 rounded-full bg-slate-100 dark:bg-slate-800" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Navigation Buttons Component
export function StepNavigation({
    onNext,
    onBack,
    isLastStep = false,
    isSubmitting = false,
    canNavigateNext = true
}: {
    onNext: () => void;
    onBack?: () => void;
    isLastStep?: boolean;
    isSubmitting?: boolean;
    canNavigateNext?: boolean;
}) {
    return (
        <div className="flex items-center justify-between mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            {onBack ? (
                <Button variant="ghost" onClick={onBack} disabled={isSubmitting} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                    Back
                </Button>
            ) : <div />}

            <Button
                onClick={onNext}
                disabled={isSubmitting || !canNavigateNext}
                className={cn(
                    "px-8 py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl text-white",
                    isLastStep ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"
                )}
            >
                {isSubmitting ? "Processing..." : isLastStep ? "Submit Application" : "Next Step"}
                {!isSubmitting && !isLastStep && <ChevronRight className="w-4 h-4 ml-2" />}
                {!isSubmitting && isLastStep && <Send className="w-4 h-4 ml-2" />}
            </Button>
        </div>
    );
}
