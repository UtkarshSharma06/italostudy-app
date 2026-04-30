import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">{label}</p>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-8">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Correct Answers</span>
                        <span className="text-xs font-black text-white">{data.score}</span>
                    </div>
                    <div className="flex items-center justify-between gap-8">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Questions Solved</span>
                        <span className="text-xs font-black text-white">{data.questions}</span>
                    </div>
                    <div className="flex items-center justify-between gap-8">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Daily Accuracy</span>
                        <span className="text-xs font-black text-emerald-400">{data.accuracy}%</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

interface VelocityChartProps {
    data: any[];
}

const VelocityChart: React.FC<VelocityChartProps> = ({ data }) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontWeight: '900', fontSize: 10 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontWeight: '900', fontSize: 10 }}
                />
                <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                />
                <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#6366f1"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorScore)"
                    animationDuration={1500}
                    activeDot={{
                        r: 6,
                        fill: '#6366f1',
                        stroke: '#fff',
                        strokeWidth: 3,
                        className: "shadow-2xl"
                    }}
                    dot={{
                        r: 4,
                        fill: '#fff',
                        stroke: '#6366f1',
                        strokeWidth: 2
                    }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default VelocityChart;
