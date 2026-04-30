import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface StepPersonalProps {
    data: any;
    onChange: (data: any) => void;
}

export function StepPersonal({ data, onChange }: StepPersonalProps) {
    const handleChange = (field: string, value: any) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>First Name <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.first_name || ''}
                        onChange={(e) => handleChange('first_name', e.target.value)}
                        placeholder="e.g. John"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Last Name <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.last_name || ''}
                        onChange={(e) => handleChange('last_name', e.target.value)}
                        placeholder="e.g. Doe"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Date of Birth <span className="text-red-500">*</span></Label>
                    <Input
                        type="date"
                        value={data.date_of_birth || ''}
                        onChange={(e) => handleChange('date_of_birth', e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={data.gender} onValueChange={(val) => handleChange('gender', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Nationality <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.nationality || ''}
                        onChange={(e) => handleChange('nationality', e.target.value)}
                        placeholder="e.g. Indian"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Passport Number</Label>
                    <Input
                        value={data.passport_number || ''}
                        onChange={(e) => handleChange('passport_number', e.target.value)}
                        placeholder="Enter passport number"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Email Address <span className="text-red-500">*</span></Label>
                    <Input
                        type="email"
                        value={data.email || ''}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="e.g. john@example.com"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Phone Number <span className="text-red-500">*</span></Label>
                    <Input
                        type="tel"
                        value={data.phone || ''}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="e.g. +1 234 567 890"
                    />
                </div>
            </div>
        </div>
    );
}
