import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface StepProgramProps {
    data: any;
    onChange: (data: any) => void;
}

const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
    "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo, Democratic Republic of the", "Congo, Republic of the", "Costa Rica", "Côte d’Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic",
    "Denmark", "Djibouti", "Dominica", "Dominican Republic",
    "East Timor (Timor-Leste)", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
    "Fiji", "Finland", "France",
    "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
    "Haiti", "Honduras", "Hungary",
    "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
    "Jamaica", "Japan", "Jordan",
    "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan",
    "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (Burma)",
    "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway",
    "Oman",
    "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar",
    "Romania", "Russia", "Rwanda",
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
    "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
    "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
    "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
    "Yemen",
    "Zambia", "Zimbabwe"
];

const priorityLabels = ["1st Priority", "2nd Priority", "3rd Priority", "4th Priority", "5th Priority"];

export function StepProgram({ data, onChange }: StepProgramProps) {
    const handleChange = (field: string, value: any) => {
        onChange({ ...data, [field]: value });
    };

    const unis = Array.isArray(data.university_preferences) ? data.university_preferences : [];

    const addUni = () => {
        if (unis.length < 5) {
            handleChange('university_preferences', [...unis, '']);
        }
    };

    const updateUni = (index: number, value: string) => {
        const newUnis = [...unis];
        newUnis[index] = value;
        handleChange('university_preferences', newUnis);
    };

    const removeUni = (index: number) => {
        handleChange('university_preferences', unis.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Preferred Country <span className="text-red-500">*</span></Label>
                    <Select value={data.preferred_country} onValueChange={(v) => handleChange('preferred_country', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {COUNTRIES.map(country => (
                                <SelectItem key={country} value={country.toLowerCase()}>{country}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Target Degree Level <span className="text-red-500">*</span></Label>
                    <Select value={data.degree_level} onValueChange={(v) => handleChange('degree_level', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Level" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                            <SelectItem value="master">Master's Degree</SelectItem>
                            <SelectItem value="phd">PhD / Doctorate</SelectItem>
                            <SelectItem value="foundation">Foundation Year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Preferred Intake <span className="text-red-500">*</span></Label>
                    <Select value={data.intake} onValueChange={(v) => handleChange('intake', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Intake" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sept_2026">September 2026</SelectItem>
                            <SelectItem value="jan_2027">January 2027</SelectItem>
                            <SelectItem value="sept_2027">September 2027</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Field of Study / Major Interest <span className="text-red-500">*</span> <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold ml-1">(One entry only)</span></Label>
                    <Input
                        value={data.major || ''}
                        onChange={(e) => handleChange('major', e.target.value)}
                        placeholder="e.g. Computer Science"
                    />
                </div>

                <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-base font-bold text-slate-900 dark:text-white">Specific University Preferences (Optional)</Label>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Please add your preferences in priority order (1-5)</p>
                        </div>
                        {unis.length < 5 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addUni}
                                className="h-8 gap-2 font-black text-[10px] uppercase tracking-widest"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Preference
                            </Button>
                        )}
                    </div>

                    <div className="grid gap-3">
                        {unis.map((uni, index) => (
                            <div key={index} className="flex gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 dark:text-slate-500 opacity-60">
                                        {priorityLabels[index]}
                                    </span>
                                    <Input
                                        value={uni}
                                        onChange={(e) => updateUni(index, e.target.value)}
                                        placeholder={`Name of University (${index + 1})`}
                                        className="pl-24"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeUni(index)}
                                    className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {unis.length === 0 && (
                            <p className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">
                                No specific universities added.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
