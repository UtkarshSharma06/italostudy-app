import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MockTrendData {
    date: string;
    score: number;
    [key: string]: any;
}

interface MockPerformanceTrendsProps {
    data: MockTrendData[];
    subjects?: string[];
    isMobile?: boolean;
    unit?: string;
    maxScore?: number;
}

const MockPerformanceTrends: React.FC<MockPerformanceTrendsProps> = ({ 
    data = [], 
    subjects = [], 
    isMobile,
    unit = '%',
    maxScore = 100
}) => {
    // 1. Calculate Summary Stats from RAW data (most accurate)
    const stats = useMemo(() => {
        if (!data || data.length === 0) {
            return { best: 0, latest: 0, improvement: 0, avg: 0 };
        }

        // Data is newest first from AnalyticsDashboard
        const latest = data[0].score;
        const best = Math.max(...data.map(d => d.score));
        const avg = Number((data.reduce((s, d) => s + d.score, 0) / data.length).toFixed(1));

        // Improvement: Latest - Earliest 
        const improvement = data.length > 1 ? data[0].score - data[data.length - 1].score : 0;

        return { best, latest, improvement, avg };
    }, [data]);

    // 2. Aggregate duplicate dates for the chart (cleaner view)
    const chartData = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) return [];

        const grouped: Record<string, { totalScore: number; count: number; timestamp: number }> = {};

        data.forEach(d => {
            const dateKey = d.date;
            const timestamp = new Date(d.date).getTime() || 0;

            if (!grouped[dateKey]) {
                grouped[dateKey] = { totalScore: 0, count: 0, timestamp };
            }
            grouped[dateKey].totalScore += d.score;
            grouped[dateKey].count += 1;
        });

        const deduped = Object.entries(grouped).map(([date, val]) => ({
            date,
            score: Math.round((val.totalScore / val.count) * 10) / 10,
            timestamp: val.timestamp
        }));

        // Sort chronologically
        return deduped.sort((a, b) => a.timestamp - b.timestamp).slice(-12);
    }, [data]);

    const hasData = chartData.length > 0;
    const { best, latest: latestScore, improvement, avg } = stats;

    const trend = improvement > (unit === '%' ? 3 : 1.5) ? 'up' : improvement < (unit === '%' ? -3 : -1.5) ? 'down' : 'stable';
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-amber-500';

    // Dynamic Y domain: pad by 10 points either side, min floor 0
    const minScoresInChart = chartData.map(d => d.score);
    const minScore = minScoresInChart.length > 0 ? Math.min(...minScoresInChart) : 0;
    const maxScoreVal = minScoresInChart.length > 0 ? Math.max(...minScoresInChart) : maxScore;
    const yMin = Math.max(0, Math.floor(minScore - (unit === '%' ? 10 : 5)));
    const yMax = Math.min(maxScore, Math.ceil(maxScoreVal + (unit === '%' ? 10 : 5)));

    // Hide individual dots when there are many points (looks cleaner)
    const showDots = chartData.length <= 8;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-white/10 px-4 py-3 rounded-xl shadow-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                    {payload.map((entry: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{entry.name}</span>
                            </div>
                            <span className="text-sm font-black text-white">{entry.value.toFixed(1)}{unit}</span>
                        </div>
                    ))}
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
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Score Progression</h3>
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-1">MOCK TEST HISTORY</p>
                </div>
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100 dark:border-white/5 shadow-sm">
                    <Activity className="w-5 h-5 text-indigo-600" />
                </div>
            </div>

            <div className={cn(
                "flex-1",
                isMobile ? "min-h-[150px]" : "min-h-[180px]"
            )}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: '900', fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: '900', fontSize: 10 }} domain={[yMin, yMax]} tickFormatter={(v) => `${v}${unit}`} />
                        <Tooltip content={<CustomTooltip />} />
                        {avg > 0 && <ReferenceLine y={avg} stroke="#6366f1" strokeDasharray="4 4" strokeOpacity={0.4} />}
                        <Line
                            type="monotone"
                            dataKey="score"
                            name="Score"
                            stroke="url(#scoreGrad)"
                            strokeWidth={3}
                            dot={showDots ? { r: 5, fill: '#fff', stroke: '#6366f1', strokeWidth: 2.5 } : false}
                            activeDot={{ r: 7, fill: '#6366f1', stroke: '#fff', strokeWidth: 3 }}
                            animationDuration={1500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-70">Best</p>
                    <p className="text-xl font-black text-emerald-600 leading-none">{best.toFixed(1)}{unit}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-70">Average</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{avg}{unit}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-70">Latest</p>
                    <p className="text-xl font-black text-indigo-600 leading-none">{latestScore.toFixed(1)}{unit}</p>
                </div>
            </div>

            {/* Trend */}
            {chartData.length > 1 && (
                <div className="mt-3 flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-border/50">
                    <div className="flex items-center gap-2">
                        <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            {trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'} over {data.length} mocks
                        </span>
                    </div>
                    <span className={`text-xs font-black ${improvement >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {improvement >= 0 ? '+' : ''}{improvement.toFixed(1)}{unit}
                    </span>
                </div>
            )}
        </div>
    );
};

export default MockPerformanceTrends;
