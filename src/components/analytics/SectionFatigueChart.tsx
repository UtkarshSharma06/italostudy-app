import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BatteryLow, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FatigueData {
    segment: string;
    accuracy: number;
    avgTime: number;
}

interface SectionFatigueChartProps {
    data: FatigueData[];
    isMobile?: boolean;
}

const SectionFatigueChart: React.FC<SectionFatigueChartProps> = ({ data = [], isMobile }) => {
    const performanceDrop = (data && data.length > 1) ? data[0].accuracy - data[data.length - 1].accuracy : 0;
    const isFatigued = performanceDrop > 15;
    const peakSegment = (data && data.length > 0) ? [...data].sort((a, b) => b.accuracy - a.accuracy)[0]?.segment || '-' : '-';
    const worstSegment = (data && data.length > 0) ? [...data].sort((a, b) => a.accuracy - b.accuracy)[0]?.segment || '-' : '-';

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-white/10 px-4 py-3 rounded-xl shadow-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-base font-black text-white">{payload[0].value.toFixed(0)}% accuracy</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Avg {payload[0].payload.avgTime}s / question</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={cn(
            "bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 p-8 shadow-sm flex flex-col h-full transition-all duration-300",
            isMobile ? "rounded-[2.5rem]" : "rounded-[2.5rem]"
        )}>
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Fatigue Analysis</h3>
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-1">ACCURACY ACROSS DURATION</p>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isFatigued ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                    {isFatigued
                        ? <BatteryLow className="w-4 h-4 text-amber-500" />
                        : <CheckCircle className="w-4 h-4 text-emerald-500" />
                    }
                </div>
            </div>

            <div className={cn(
                "flex-1",
                isMobile ? "min-h-[150px]" : "min-h-[180px]"
            )}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="fatigueGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isFatigued ? "#f59e0b" : "#10b981"} stopOpacity={0.15} />
                                <stop offset="95%" stopColor={isFatigued ? "#f59e0b" : "#10b981"} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                        <XAxis dataKey="segment" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: '900', fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: '#94a3b8', fontWeight: '900', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="accuracy"
                            stroke={isFatigued ? "#f59e0b" : "#10b981"}
                            strokeWidth={2.5}
                            fill="url(#fatigueGrad)"
                            dot={{ r: 4, fill: '#fff', stroke: isFatigued ? '#f59e0b' : '#10b981', strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Real insight rows */}
            <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peak</span>
                    </div>
                    <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{peakSegment}</p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tight mt-1">Best accuracy window</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dropout</span>
                    </div>
                    <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{worstSegment}</p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tight mt-1">Lowest accuracy window</p>
                </div>
            </div>

            {/* Verdict */}
            {/* Verdict */}
            <div className={`mt-6 p-5 rounded-[1.8rem] border transition-all duration-300 ${isFatigued ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30'}`}>
                <p className="text-[11px] font-bold leading-relaxed text-slate-600 dark:text-slate-300">
                    {isFatigued
                        ? `Accuracy dropped ${performanceDrop.toFixed(0)}% by the final section. Prioritize harder questions early, and practice timed full-length tests to build stamina.`
                        : `Consistent performance across all segments. Your exam stamina is strong — keep this up during the real test.`
                    }
                </p>
            </div>
        </div>
    );
};

export default SectionFatigueChart;
