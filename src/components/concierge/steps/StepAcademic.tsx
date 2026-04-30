import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StepAcademicProps {
    data: any;
    onChange: (data: any) => void;
}

export function StepAcademic({ data, onChange }: StepAcademicProps) {
    const history = data.history || [];

    const addEducation = () => {
        const newHistory = [
            ...history,
            {
                institution: '',
                degree: '',
                grade: '',
                start_year: '',
                end_year: ''
            }
        ];
        onChange({ ...data, history: newHistory });
    };

    const updateEducation = (index: number, field: string, value: any) => {
        const newHistory = [...history];
        newHistory[index] = { ...newHistory[index], [field]: value };
        onChange({ ...data, history: newHistory });
    };

    const removeEducation = (index: number) => {
        const newHistory = history.filter((_: any, i: number) => i !== index);
        onChange({ ...data, history: newHistory });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Academic History</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">List all previous education</p>
                </div>
                <Button onClick={(e) => { e.preventDefault(); addEducation(); }} variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add School
                </Button>
            </div>

            {history.length === 0 ? (
                <div className="text-center p-10 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-xs tracking-widest">No education history added yet.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {history.map((edu: any, index: number) => (
                        <Card key={index} className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm relative group hover:shadow-md transition-all">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-4 right-4 text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => removeEducation(index)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                    Institution #{index + 1}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Institution Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={edu.institution}
                                        onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                                        placeholder="School / University Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Degree / Qualification <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={edu.degree}
                                        onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                                        placeholder="e.g. High School Diploma, Bachelor's"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Grade / GPA</Label>
                                    <Input
                                        value={edu.grade}
                                        onChange={(e) => updateEducation(index, 'grade', e.target.value)}
                                        placeholder="e.g. 3.8/4.0 or 85%"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Start Date</Label>
                                        <Input
                                            type="month"
                                            value={edu.start_year}
                                            onChange={(e) => updateEducation(index, 'start_year', e.target.value)}
                                            placeholder="MM/YYYY"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End Date</Label>
                                        <Input
                                            type="month"
                                            value={edu.end_year}
                                            onChange={(e) => updateEducation(index, 'end_year', e.target.value)}
                                            placeholder="MM/YYYY"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
