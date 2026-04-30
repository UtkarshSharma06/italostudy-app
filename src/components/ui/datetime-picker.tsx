import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
    value: string; // ISO datetime string
    onChange: (value: string) => void;
    label: string;
    required?: boolean;
}

export function DateTimePicker({ value, onChange, label, required }: DateTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Parse the datetime value
    const dateValue = value ? new Date(value) : undefined;

    // Extract time components
    const hours = dateValue ? String(dateValue.getHours()).padStart(2, '0') : '12';
    const minutes = dateValue ? String(dateValue.getMinutes()).padStart(2, '0') : '00';

    const handleDateSelect = (date: Date | undefined) => {
        if (!date) return;

        // Preserve existing time or use current time
        const currentHours = dateValue?.getHours() ?? 12;
        const currentMinutes = dateValue?.getMinutes() ?? 0;

        date.setHours(currentHours, currentMinutes, 0, 0);
        onChange(date.toISOString());
    };

    const handleTimeChange = (type: 'hours' | 'minutes', val: string) => {
        const newDate = dateValue ? new Date(dateValue) : new Date();

        if (type === 'hours') {
            const h = Math.min(23, Math.max(0, parseInt(val) || 0));
            newDate.setHours(h);
        } else {
            const m = Math.min(59, Math.max(0, parseInt(val) || 0));
            newDate.setMinutes(m);
        }

        newDate.setSeconds(0, 0);
        onChange(newDate.toISOString());
    };

    return (
        <div className="space-y-2">
            <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-start text-left font-normal h-10",
                            !dateValue && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateValue ? (
                            <span className="flex items-center gap-2">
                                {format(dateValue, "PPP")}
                                <span className="text-muted-foreground">•</span>
                                <Clock className="h-3.5 w-3.5" />
                                {format(dateValue, "HH:mm")}
                            </span>
                        ) : (
                            <span>Pick a date and time</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex">
                        <Calendar
                            mode="single"
                            selected={dateValue}
                            onSelect={handleDateSelect}
                            initialFocus
                        />
                        <div className="flex flex-col gap-2 p-3 border-l">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</Label>
                            <div className="flex items-center gap-2">
                                <div className="grid gap-1">
                                    <Label htmlFor="hours" className="text-xs">Hours</Label>
                                    <Input
                                        id="hours"
                                        type="number"
                                        min="0"
                                        max="23"
                                        value={hours}
                                        onChange={(e) => handleTimeChange('hours', e.target.value)}
                                        className="w-16 h-9 text-center"
                                    />
                                </div>
                                <span className="text-2xl font-bold text-muted-foreground mt-5">:</span>
                                <div className="grid gap-1">
                                    <Label htmlFor="minutes" className="text-xs">Minutes</Label>
                                    <Input
                                        id="minutes"
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={minutes}
                                        onChange={(e) => handleTimeChange('minutes', e.target.value)}
                                        className="w-16 h-9 text-center"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        const now = new Date();
                                        onChange(now.toISOString());
                                    }}
                                    className="text-xs"
                                >
                                    Now
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setIsOpen(false)}
                                    className="text-xs"
                                >
                                    Done
                                </Button>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
