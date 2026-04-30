import React, { useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Clock, Target, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionData {
    id: string;
    time_spent: number;
    difficulty: string;
    is_correct: boolean;
    topic: string;
}

interface TimeEfficiencyScatterProps {
    data: QuestionData[];
    isMobile?: boolean;
}

const TimeEfficiencyScatter: React.FC<TimeEfficiencyScatterProps> = ({ data, isMobile }) => {
    const bins = [
        { label: '0-15s', min: 0, max: 15 },
        { label: '15-30s', min: 15, max: 30 },
        { label: '30-45s', min: 30, max: 45 },
        { label: '45-60s', min: 45, max: 60 },
        { label: '1-2m', min: 60, max: 120 },
        { label: '2m+', min: 120, max: Infinity },
    ];

    const { binnedData, sweetSpot, avgTimeCorrect, avgTimeWrong } = useMemo(() => {
        // Filter out non-interactions (skips/accidental clicks)
        const validQuestions = data.filter(q => q.time_spent > 1);

        const result = bins.map(bin => {
            const inBin = validQuestions.filter(q => q.time_spent >= bin.min && q.time_spent < bin.max);
            const correct = inBin.filter(q => q.is_correct).length;
            const wrong = inBin.length - correct;
            const accuracy = inBin.length > 0 ? (correct / inBin.length) * 100 : 0;
            return {
                range: bin.label,
                correct,
                wrong,
                total: inBin.length,
                accuracy: Math.round(accuracy)
            };
        });

        // Find "Sweet Spot" - bin with highest accuracy that has meaningful data
        // Logic: 
        // 1. Accuracy must be > 0
        // 2. Must have at least 2 correct answers to be statistically "sweet"
        const eligibleBins = result.filter(b => b.accuracy > 0 && b.correct >= 2);
        
        // Sort by Accuracy DESC, then by Correct Count DESC (volume as tie-breaker)
        const sortedBins = [...eligibleBins].sort((a, b) => {
            if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
            return b.correct - a.correct;
        });

        const bestBin = sortedBins[0];

        const correctData = validQuestions.filter(q => q.is_correct);
        const wrongData = validQuestions.filter(q => !q.is_correct);

        return {
            binnedData: result,
            sweetSpot: bestBin ? bestBin.range : 'N/A',
            avgTimeCorrect: correctData.length > 0 ? Math.round(correctData.reduce((s, q) => s + q.time_spent, 0) / correctData.length) : 0,
            avgTimeWrong: wrongData.length > 0 ? Math.round(wrongData.reduce((s, q) => s + q.time_spent, 0) / wrongData.length) : 0
        };
    }, [data]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-900 border border-white/10 px-4 py-3 rounded-xl shadow-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Time: {label}</p>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-6">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase">Correct</span>
                            <span className="text-sm font-black text-white">{data.correct}</span>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                            <span className="text-[10px] font-bold text-rose-400 uppercase">Wrong</span>
                            <span className="text-sm font-black text-white">{data.wrong}</span>
                        </div>
                        <div className="pt-1.5 border-t border-white/5 flex items-center justify-between gap-6">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase">Accuracy</span>
                            <span className="text-sm font-black text-indigo-400">{data.accuracy}%</span>
                        </div>
                    </div>
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
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">TIME EFFICIENCY</h3>
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-1">PERFORMANCE VS RESPONSE TIME</p>
                </div>
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100 dark:border-white/5 shadow-sm">
                    <Zap className="w-5 h-5 text-indigo-500" />
                </div>
            </div>

            <div className={cn(
                "flex-1",
                isMobile ? "min-h-[200px]" : "min-h-[240px]"
            )}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={binnedData} margin={{ top: 10, right: -10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                        <XAxis
                            dataKey="range"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontWeight: '900', fontSize: 10 }}
                        />
                        <YAxis
                            yAxisId="left"
                            axisLine={false}
                            tickLine={false}
                            ticks={[0, 40, 80, 120, 160]}
                            tick={{ fill: '#94a3b8', fontWeight: '900', fontSize: 10 }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 100]}
                            ticks={[0, 25, 50, 75, 100]}
                            tick={{ fill: '#6366f1', fontWeight: '900', fontSize: 10 }}
                            tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            yAxisId="left"
                            dataKey="correct"
                            stackId="a"
                            fill="#10b981"
                            barSize={isMobile ? 20 : 32}
                        />
                        <Bar
                            yAxisId="left"
                            dataKey="wrong"
                            stackId="a"
                            fill="#f43f5e"
                            radius={[4, 4, 0, 0]}
                            barSize={isMobile ? 20 : 32}
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="accuracy"
                            stroke="#6366f1"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Insights Row */}
            <div className="grid grid-cols-2 gap-6 mt-8">
                <div className="p-6 rounded-[2rem] bg-indigo-50/30 dark:bg-indigo-500/5 border border-indigo-100/50 dark:border-indigo-500/10 transition-all hover:shadow-md">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                            <Target className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Your Sweet Spot</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{sweetSpot}</p>
                    <p className="text-[10px] font-bold text-slate-300 dark:text-slate-500 uppercase tracking-tight mt-2">Best accuracy range</p>
                </div>
                <div className="p-6 rounded-[2rem] bg-amber-50/30 dark:bg-amber-500/5 border border-amber-100/50 dark:border-amber-500/10 transition-all hover:shadow-md">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Avg on Correct</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{avgTimeCorrect}s</p>
                    <p className="text-[10px] font-bold text-slate-300 dark:text-slate-500 uppercase tracking-tight mt-2">Per question</p>
                </div>
            </div>

            {/* Legend matches reference screenshot */}
            <div className="flex flex-wrap items-center justify-center gap-8 mt-10 pt-8 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correct</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-[#f43f5e]" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wrong</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-1 rounded-full bg-[#6366f1]" />
                    <span className="text-[10px] font-black text-[#6366f1] uppercase tracking-widest">Accuracy %</span>
                </div>
            </div>
        </div>
    );
};

export default TimeEfficiencyScatter;
