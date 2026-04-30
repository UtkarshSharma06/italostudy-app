import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Target, XCircle, MinusCircle, Flame, Sparkles, CheckCircle, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PenaltyAnalysisProps {
    grossScore: number;
    penalty: number;
    netScore: number;
    skippedCount: number;
    wrongCount: number;
    correctCount?: number;
    attemptedCount?: number;
    totalQuestions?: number;
    isMobile?: boolean;
}

const PenaltyAnalysis: React.FC<PenaltyAnalysisProps> = ({
    grossScore, penalty, netScore, skippedCount, wrongCount,
    correctCount = 0, attemptedCount, isMobile
}) => {
    const pointsLostToWrong = parseFloat(penalty.toFixed(1));
    const efficientPoints = parseFloat(netScore.toFixed(1));
    // Derive gross as net + penalty so they are always consistent (avoids DB vs local calc mismatch)
    const derivedGross = parseFloat((netScore + penalty).toFixed(1));
    const attempted = attemptedCount ?? (correctCount + wrongCount);

    const data = [
        { name: 'Correct', value: Math.max(0.01, efficientPoints), color: '#10b981' },
        { name: 'Wrong', value: Math.max(0.01, pointsLostToWrong), color: '#f43f5e' },
        { name: 'Skipped', value: Math.max(0.01, skippedCount * 0.01), color: '#94a3b8' }, // Skipped usually 0 pts, tiny slice for visibility
    ];

    const efficiencyRate = derivedGross > 0 ? Math.round((netScore / derivedGross) * 100) : 0;
    const accuracyTax = 100 - efficiencyRate;

    const verdict =
        accuracyTax > 30
            ? { label: 'Heavy Tax', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', tip: "You're losing a lot to wrong guesses. Try skipping more when you're unsure." }
            : accuracyTax > 15
                ? { label: 'Moderate', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', tip: "Some risky points burnt here. Be a bit more selective with your answers." }
                : { label: 'Efficient', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', tip: "Clean performance! You're keeping almost every point you earn." };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-white/10 px-4 py-3 rounded-xl shadow-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{payload[0].name}</p>
                    <p className="text-lg font-black text-white">{payload[0].value.toFixed(1)} pts</p>
                </div>
            );
        }
        return null;
    };

    const statItems = [
        { label: 'Attempted', value: attempted, icon: ListChecks, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/5', border: 'border-indigo-100 dark:border-indigo-500/20' },
        { label: 'Correct', value: correctCount, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/5', border: 'border-emerald-100 dark:border-emerald-500/20' },
        { label: 'Skipped', value: skippedCount, icon: MinusCircle, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-500/5', border: 'border-slate-100 dark:border-slate-500/20' },
        { label: 'Wrong', value: wrongCount, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-500/5', border: 'border-rose-100 dark:border-rose-500/20' },
        { label: 'Score', value: efficientPoints, icon: Target, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-500/5', border: 'border-violet-100 dark:border-violet-500/20' },
    ];

    return (
        <div className={cn(
            "bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 p-8 shadow-sm flex flex-col h-full transition-all duration-300",
            isMobile ? "rounded-[2.5rem]" : "rounded-[2.5rem]"
        )}>
            <div className="flex items-start justify-between mb-2">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Accuracy <span className="text-rose-500">Tax</span></h3>
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-1">POINTS LOST TO GUESSING</p>
                </div>
                <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-800/30">
                    <Flame className="w-5 h-5 text-rose-500" />
                </div>
            </div>

            {/* Donut Chart */}
            <div className={cn("flex-1 relative flex items-center justify-center", isMobile ? "min-h-[180px]" : "min-h-[200px]")}>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-2">
                    <span className="text-4xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{correctCount}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Correct</span>
                    <div className="mt-3 px-3 py-1 bg-emerald-500/10 rounded-full">
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{efficiencyRate}% Efficient</span>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={isMobile ? 70 : 85}
                            outerRadius={isMobile ? 90 : 105}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mb-4">
                {data.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d.name}</span>
                    </div>
                ))}
            </div>

            {/* 5-stat grid matches reference */}
            <div className="grid grid-cols-5 gap-3 my-6">
                {statItems.map((s, i) => (
                    <div key={i} className={cn("flex flex-col items-center gap-1.5 py-4 px-1 rounded-2xl border bg-white dark:bg-white/5 shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md", s.border)}>
                        <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center bg-white dark:bg-black/20 shadow-sm mb-1", s.bg)}>
                            <s.icon className={cn("w-3.5 h-3.5", s.color)} />
                        </div>
                        <p className={cn("text-sm font-black leading-none", s.color)}>{s.value}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none text-center mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Verdict */}
            <div className={cn("p-5 rounded-[1.8rem] border border-transparent shadow-inner relative overflow-hidden", verdict.bg)}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
                <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg bg-white shadow-sm")}>
                            <Sparkles className={cn("w-3 h-3", verdict.color)} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Guessing Strategy</span>
                    </div>
                    <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-xl bg-white/80 dark:bg-black/40 shadow-sm", verdict.color)}>{verdict.label}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-bold leading-relaxed relative z-10">{verdict.tip}</p>
            </div>
        </div>
    );
};

export default PenaltyAnalysis;
