import React, { useState } from 'react';
import { ADMISSION_THRESHOLDS, UniversityThreshold } from '@/config/admission-data';
import {
    Trophy,
    MapPin,
    Users,
    Globe,
    Search,
    CheckCircle2,
    AlertTriangle,
    ArrowUpRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AdmissionPredictorProps {
    userScore: number;
    examType: 'imat' | 'cent-s';
    isEuOrigin?: boolean;
    isMobile?: boolean;
}

const AdmissionPredictor: React.FC<AdmissionPredictorProps> = ({
    userScore,
    examType,
    isEuOrigin = true,
    isMobile
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredThresholds = ADMISSION_THRESHOLDS.filter(t =>
        t.exam === examType &&
        (searchQuery === '' || t.university.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => {
        const threshA = isEuOrigin ? a.euThreshold : a.nonEuThreshold;
        const threshB = isEuOrigin ? b.euThreshold : b.nonEuThreshold;
        return threshB - threshA;
    });

    const getStatus = (threshold: number) => {
        const diff = userScore - threshold;
        if (diff > 5) return { label: 'High Probability', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: CheckCircle2 };
        if (diff >= 0) return { label: 'Good Chance', color: 'text-indigo-500', bg: 'bg-indigo-50', icon: CheckCircle2 };
        if (diff >= -5) return { label: 'Competitive', color: 'text-amber-500', bg: 'bg-amber-50', icon: Activity };
        return { label: 'Challenging', color: 'text-rose-500', bg: 'bg-rose-50', icon: AlertTriangle };
    };

    const Activity = ({ className }: { className?: string }) => (
        <div className={className}>
            <div className="w-1 h-3 bg-amber-500 rounded-full animate-pulse" />
            <div className="w-1 h-2 bg-amber-500/50 rounded-full" />
        </div>
    );

    return (
        <div className={cn(
            "bg-white dark:bg-card border-2 border-slate-200 dark:border-border p-5 shadow-sm overflow-hidden h-full flex flex-col",
            isMobile ? "rounded-[2.5rem]" : "rounded-2xl"
        )}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Admission Predictor</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Mirror of Historical Cut-offs</p>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                        placeholder="Search Universities..."
                        className="pl-9 h-10 bg-slate-50 border-none rounded-xl text-xs font-bold"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {filteredThresholds.length > 0 ? filteredThresholds.map((t, idx) => {
                    const threshold = isEuOrigin ? t.euThreshold : t.nonEuThreshold;
                    const status = getStatus(threshold);
                    const Icon = status.icon;

                    return (
                        <div
                            key={idx}
                            className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-border/50 rounded-2xl group transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-none hover:-translate-y-0.5"
                        >
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white dark:bg-card border border-slate-100 dark:border-border rounded-xl flex items-center justify-center shadow-sm">
                                        <MapPin className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{t.university}</h4>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1">
                                                <Trophy className="w-2.5 h-2.5 text-amber-500" />
                                                <span className="text-[10px] font-black text-slate-400">{threshold} req</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Users className="w-2.5 h-2.5 text-indigo-400" />
                                                <span className="text-[10px] font-black text-slate-400">{t.year} Cycle</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={`px-4 py-2 ${status.bg} rounded-2xl flex items-center gap-2 border border-black/5`}>
                                    <Icon className={`w-3 h-3 ${status.color}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                                        {status.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Search className="w-8 h-8 text-slate-200 mb-4" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching universities</p>
                    </div>
                )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${isEuOrigin ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {isEuOrigin ? 'EU Origin' : 'Non-EU'}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Based on your Current Rank</span>
                </div>
                <button className="flex items-center gap-2 group/btn">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Global Ranking</span>
                    <ArrowUpRight className="w-3 h-3 text-indigo-500 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </button>
            </div>
        </div>
    );
};

export default AdmissionPredictor;
