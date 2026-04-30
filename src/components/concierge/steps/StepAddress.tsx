import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StepAddressProps {
    data: any;
    onChange: (data: any) => void;
}

export function StepAddress({ data, onChange }: StepAddressProps) {
    const handleChange = (field: string, value: any) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                    <Label>Street Address <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.street || ''}
                        onChange={(e) => handleChange('street', e.target.value)}
                        placeholder="House number, street name"
                    />
                </div>

                <div className="space-y-2">
                    <Label>City <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.city || ''}
                        onChange={(e) => handleChange('city', e.target.value)}
                        placeholder="City"
                    />
                </div>

                <div className="space-y-2">
                    <Label>State / Province</Label>
                    <Input
                        value={data.state || ''}
                        onChange={(e) => handleChange('state', e.target.value)}
                        placeholder="State"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Postal / Zip Code <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.postal_code || ''}
                        onChange={(e) => handleChange('postal_code', e.target.value)}
                        placeholder="Zip Code"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Country <span className="text-red-500">*</span></Label>
                    <Input
                        value={data.country || ''}
                        onChange={(e) => handleChange('country', e.target.value)}
                        placeholder="Country"
                    />
                </div>
            </div>
        </div>
    );
}
