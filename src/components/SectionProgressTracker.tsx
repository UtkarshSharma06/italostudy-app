import { Check, Lock, Circle } from 'lucide-react';

interface Section {
    number: number;
    name: string;
    icon?: string;
}

interface SectionProgressTrackerProps {
    sections: Section[];
    currentSection: number;
    completedSections: number[];
    sectionQuestions?: any[];
    currentQuestionIndex?: number;
    onNavigate?: (index: number) => void;
    onSectionClick?: (sectionNumber: number) => void;
    isSectionsLocked?: boolean;
}

export function SectionProgressTracker({
    sections,
    currentSection,
    completedSections,
    sectionQuestions = [],
    currentQuestionIndex = 0,
    onNavigate,
    onSectionClick,
    isSectionsLocked = true
}: SectionProgressTrackerProps) {
    return (
        <div className="bg-secondary/5 border border-border/30 rounded-3xl p-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-5">
                Mission Progress
            </h3>
            <div className="space-y-4">
                {sections.map((section) => {
                    const isCompleted = completedSections.includes(section.number);
                    const isCurrent = section.number === currentSection;
                    const isLocked = section.number > currentSection;

                    return (
                        <div key={section.number} className="space-y-3">
                            <div
                                onClick={() => {
                                    if (!isSectionsLocked && onSectionClick) {
                                        onSectionClick(section.number);
                                    }
                                }}
                                className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all ${
                                    !isSectionsLocked ? 'cursor-pointer hover:bg-primary/5' : ''
                                } ${isCurrent
                                        ? 'bg-primary/10 border-2 border-primary/40 shadow-sm'
                                        : isCompleted
                                            ? 'bg-green-500/5 border border-green-500/20 opacity-80'
                                            : 'bg-secondary/5 border border-border/10 opacity-40'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${isCurrent
                                        ? 'bg-primary text-white'
                                        : isCompleted
                                            ? 'bg-green-500 text-white'
                                            : 'bg-secondary text-muted-foreground'
                                    }`}>
                                    {isCompleted ? (
                                        <Check className="w-4 h-4" />
                                    ) : isLocked ? (
                                        <Lock className="w-3.5 h-3.5" />
                                    ) : (
                                        section.number
                                    )}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {section.icon && <span className="text-sm">{section.icon}</span>}
                                        <span className={`text-[11px] font-black uppercase tracking-wider ${isCurrent ? 'text-primary' : 'text-foreground'
                                            }`}>
                                            {section.name}
                                        </span>
                                    </div>
                                    <span className="text-[8px] font-bold uppercase text-muted-foreground tracking-tighter">
                                        {isCompleted ? 'Mission Completed' : isCurrent ? 'Active Domain' : isLocked ? 'Locked' : 'Pending'}
                                    </span>
                                </div>

                                {isCurrent && (
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                )}
                            </div>

                            {/* Question Palette for CURRENT Domain ONLY */}
                            {isCurrent && sectionQuestions.length > 0 && (
                                <div className="grid grid-cols-5 gap-2 p-3 bg-white dark:bg-card border border-border/40 rounded-2xl mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {sectionQuestions.map((q, idx) => {
                                        const isAnswered = q.user_answer !== undefined && q.user_answer !== null;
                                        const isFlagged = q.is_flagged;
                                        const isActive = idx === currentQuestionIndex;

                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => onNavigate?.(idx)}
                                                className={`aspect-square rounded-xl text-[10px] font-black border-2 transition-all active:scale-95 flex items-center justify-center ${isActive
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                                        : isFlagged
                                                            ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                                                            : isAnswered
                                                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                                                : 'bg-slate-50 dark:bg-muted/30 border-slate-100 dark:border-border text-slate-400'
                                                    }`}
                                            >
                                                {idx + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
