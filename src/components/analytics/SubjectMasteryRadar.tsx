import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';
import { Brain, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubjectMasteryData {
    subject: string;
    score: number;
}

interface SubjectMasteryRadarProps {
    data: SubjectMasteryData[];
    isMobile?: boolean;
}

const SubjectMasteryRadar: React.FC<SubjectMasteryRadarProps> = ({ data, isMobile }) => {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                        {payload[0].payload.subject}
                    </p>
                    <p className="text-xl font-black text-white">{payload[0].value.toFixed(1)}% Mastery</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={cn(
            "bg-white dark:bg-card border-2 border-slate-200 dark:border-border p-5 shadow-sm overflow-hidden h-full flex flex-col",
            isMobile ? "rounded-[2.5rem]" : "rounded-2xl"
        )}>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Subject Mastery</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cross-Domain Proficiency</p>
                </div>
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center">
                    <Brain className="w-5 h-5 text-indigo-500" />
                </div>
            </div>

            <div className={cn(
                "flex-1 flex items-center justify-center relative",
                isMobile ? "min-h-[200px]" : "min-h-[250px]"
            )}>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                    <Star className="w-48 h-48 text-indigo-500" />
                </div>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#cbd5e1" strokeDasharray="5 5" opacity={0.3} />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: '#64748b', fontWeight: '900', fontSize: 10 }}
                        />
                        <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Radar
                            name="Mastery"
                            dataKey="score"
                            stroke="#6366f1"
                            strokeWidth={4}
                            fill="#6366f1"
                            fillOpacity={0.4}
                            animationDuration={2000}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-border/50">
                <div className="flex flex-wrap gap-2">
                    {data.map((item, idx) => (
                        <div
                            key={idx}
                            className="px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-border/50 flex items-center gap-3 transition-all hover:border-indigo-200 group/item"
                        >
                            <div className={`w-2 h-2 rounded-full ${item.score > 75 ? 'bg-emerald-400' : item.score > 50 ? 'bg-indigo-400' : 'bg-rose-400'} group-hover/item:scale-125 transition-transform`} />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.subject}</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white leading-none">{item.score.toFixed(0)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SubjectMasteryRadar;
