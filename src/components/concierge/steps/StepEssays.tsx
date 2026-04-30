import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface StepEssaysProps {
    data: any;
    onChange: (data: any) => void;
}

export function StepEssays({ data, onChange }: StepEssaysProps) {
    const handleChange = (field: string, value: any) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-base">Personal Statement / Motivation Letter</Label>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Explain why you want to study this program, your future goals, and why you are a good candidate. (Min 300 words recommended)
                    </p>
                    <Textarea
                        value={data.personal_statement || ''}
                        onChange={(e) => handleChange('personal_statement', e.target.value)}
                        placeholder="Write your personal statement here..."
                        className="min-h-[300px] leading-relaxed"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Additional Information (Optional)</Label>
                    <Textarea
                        value={data.additional_info || ''}
                        onChange={(e) => handleChange('additional_info', e.target.value)}
                        placeholder="Any gaps in study, special circumstances, etc."
                        className="h-32"
                    />
                </div>
            </div>
        </div>
    );
}
