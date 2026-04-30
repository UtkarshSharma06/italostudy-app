import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QuestionMedia from "@/components/QuestionMedia";
import { MediaContent } from "@/types/test";

// Types
export type QuestionType = 'mcq' | 'bool' | 'gap' | 'multi_select' | 'short_answer';

export interface QuestionProps {
    question: {
        id: string;
        question_text: string;
        options?: string[]; // For MCQ and MultiSelect
        question_type: QuestionType;
        media?: MediaContent | null;
    };
    value: any; // Can be string or string[]
    onChange: (val: any) => void;
}

export function MultipleChoiceQuestion({ question, value, onChange }: QuestionProps) {
    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{question.question_text}</h3>
            {question.media && <QuestionMedia media={question.media} />}
            <RadioGroup value={value} onValueChange={onChange} className="space-y-2">
                {question.options?.map((opt, i) => (
                    <div key={i} className="flex items-center space-x-2 p-3 rounded-lg border border-slate-100 dark:border-border hover:bg-slate-50 dark:bg-muted transition-colors cursor-pointer">
                        <RadioGroupItem value={opt} id={`${question.id}-${i}`} />
                        <Label htmlFor={`${question.id}-${i}`} className="flex-1 cursor-pointer font-medium text-slate-700 dark:text-slate-300">{opt}</Label>
                    </div>
                ))}
            </RadioGroup>
        </div>
    );
}

export function TrueFalseQuestion({ question, value, onChange }: QuestionProps) {
    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{question.question_text}</h3>
            {question.media && <QuestionMedia media={question.media} />}
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Answer" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="TRUE">TRUE</SelectItem>
                    <SelectItem value="FALSE">FALSE</SelectItem>
                    <SelectItem value="NOT GIVEN">NOT GIVEN</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}

export function GapFillQuestion({ question, value, onChange }: QuestionProps) {
    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{question.question_text}</h3>
            {question.media && <QuestionMedia media={question.media} />}
            <Input
                placeholder="Type your answer..."
                value={value as string || ''}
                onChange={(e) => onChange(e.target.value)}
                className="max-w-md"
            />
        </div>
    );
}

export function MultiSelectQuestion({ question, value, onChange }: QuestionProps) {
    const selectedOptions = Array.isArray(value) ? value : [];

    const toggleOption = (opt: string) => {
        if (selectedOptions.includes(opt)) {
            onChange(selectedOptions.filter(o => o !== opt));
        } else {
            onChange([...selectedOptions, opt]);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{question.question_text}</h3>
            {question.media && <QuestionMedia media={question.media} />}
            <div className="space-y-2">
                {question.options?.map((opt, i) => (
                    <div
                        key={i}
                        onClick={() => toggleOption(opt)}
                        className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${selectedOptions.includes(opt)
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-slate-100 dark:border-border hover:border-slate-300'
                            }`}
                    >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${selectedOptions.includes(opt) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white dark:bg-card'
                            }`}>
                            {selectedOptions.includes(opt) && <div className="w-2 h-2 bg-white rounded-sm" />}
                        </div>
                        <Label className="flex-1 cursor-pointer font-medium text-slate-700 dark:text-slate-300">{opt}</Label>
                    </div>
                ))}
            </div>
        </div>
    );
}
