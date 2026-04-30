import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StepTestScoresProps {
    data: any;
    onChange: (data: any) => void;
}

export function StepTestScores({ data, onChange }: StepTestScoresProps) {
    const handleChange = (field: string, value: any) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">English Proficiency</h3>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Test Type</Label>
                    <Select value={data.english_test_type} onValueChange={(v) => handleChange('english_test_type', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Test" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ielts">IELTS</SelectItem>
                            <SelectItem value="toefl">TOEFL</SelectItem>
                            <SelectItem value="duolingo">Duolingo</SelectItem>
                            <SelectItem value="pte">PTE</SelectItem>
                            <SelectItem value="none">Not Taken Yet</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Overall Score</Label>
                    <Input
                        value={data.english_score || ''}
                        onChange={(e) => handleChange('english_score', e.target.value)}
                        placeholder="e.g. 6.5"
                    />
                </div>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 pt-6 border-t border-slate-100 dark:border-slate-800">Standardized Tests (Optional)</h3>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>SAT Score</Label>
                    <Input
                        value={data.sat_score || ''}
                        onChange={(e) => handleChange('sat_score', e.target.value)}
                        placeholder="Total Score"
                    />
                </div>
                <div className="space-y-2">
                    <Label>GMAT / GRE Score</Label>
                    <Input
                        value={data.gmat_gre_score || ''}
                        onChange={(e) => handleChange('gmat_gre_score', e.target.value)}
                        placeholder="Total Score"
                    />
                </div>
            </div>
        </div>
    );
}
