import { useState, useEffect, useRef, memo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';
import { MediaContent } from '@/types/test';
import DiagramRenderer from './DiagramRenderer';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger, VisuallyHidden, DialogTitle } from '@/components/ui/dialog';
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';
import 'katex/dist/katex.min.css';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';

interface QuestionMediaProps {
    media: MediaContent | null;
    className?: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

const QuestionMedia = memo(function QuestionMedia({ media, className }: QuestionMediaProps) {
    const [isZoomed, setIsZoomed] = useState(false);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (media?.type === 'table' && tableContainerRef.current) {
            try {
                renderMathInElement(tableContainerRef.current, {
                    delimiters: [
                        { left: '\\[', right: '\\]', display: true },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false }
                    ],
                    throwOnError: false,
                    errorColor: '#cc0000',
                    trust: true,
                    strict: false,
                    fleqn: false
                });
            } catch (error) {
                console.error('KaTeX rendering error in table:', error);
            }
        }
    }, [media]);

    if (!media) {
        // Only log if specifically requested to prevent spamming
        // onDebugLog?.("⚠️ Media object is null");
        return null;
    }
    const renderImage = (imgData?: any) => {
        const imageData = imgData || media.image || media;
        // Exhaustive URL resolution — try every known field name variant
        const url = (typeof imageData === 'string' && imageData.startsWith('http')) ? imageData :
            (imageData.url ||
            imageData.imageUrl ||
            imageData.image_url ||
            imageData.src ||
            (media as any).image?.url ||
            (media as any).image?.imageUrl ||
            (media as any).graph?.url ||
            (media as any).pie?.url ||
            (media as any).chart?.url ||
            (media as any).url ||
            (media as any).imageUrl ||
            (media as any).image_url ||
            (media as any).src ||
            (typeof media === 'string' && media.startsWith('http') ? media : null));

        if (!url) return null;

        const alt = imageData.alt || 'Question media';
        const caption = imageData.caption || (media as any).caption;

        return (
            <div className="space-y-4">
                <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
                    <DialogTrigger asChild>
                        <div className="group relative cursor-zoom-in overflow-hidden rounded-[2rem] border-2 border-slate-100 dark:border-border/50 bg-slate-50/30 dark:bg-muted/10 hover:shadow-xl transition-all duration-500 mx-auto inline-block max-w-full">
                            <img
                                src={getOptimizedImageUrl(url, 800)}
                                alt={alt}
                                className="max-h-[320px] w-auto h-auto object-contain transition-transform duration-700 group-hover:scale-[1.05]"
                                loading="lazy"
                                onError={() => console.warn(`Failed to load image: ${url.substring(0, 80)}`)}
                            />
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-300" />
                        </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-[85vw] p-0 border-none bg-transparent shadow-none">
                        <VisuallyHidden>
                            <DialogTitle>{alt}</DialogTitle>
                        </VisuallyHidden>
                        <div className="relative w-full h-[90vh] flex items-center justify-center p-4">
                            <img
                                src={getOptimizedImageUrl(url, 1600)}
                                alt={alt}
                                className="max-h-full max-w-full object-contain rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
                {caption && (
                    <p className="text-center text-[10px] text-muted-foreground italic font-black uppercase tracking-[0.15em] bg-slate-100/50 dark:bg-muted/30 py-1.5 px-4 rounded-full mx-auto w-fit border border-slate-200/50 dark:border-border/50">
                        {caption}
                    </p>
                )}
            </div>
        );
    };

    const renderContent = () => {
        switch (media.type) {
            case 'image':
                return renderImage();

            case 'table':
                const tableData = media.table || (media as any).content || media;
                if (!tableData || !tableData.rows) return null;
                return (
                    <div className="w-full" ref={tableContainerRef}>
                        {/* ACTUAL TABLE */}
                        <div className="overflow-x-auto rounded-[2rem] border-2 border-slate-900 dark:border-border bg-card shadow-xl">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-900 dark:bg-muted font-black uppercase tracking-widest text-[9px] text-white">
                                    <tr>
                                        {tableData.headers?.map((header: string, i: number) => (
                                            <th key={i} className="px-6 py-5 border-b border-slate-800 dark:border-border">{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-border">
                                    {tableData.rows.map((row: string[], i: number) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            {row.map((cell, j) => (
                                                <td key={j} className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-border last:border-r-0">{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {tableData.caption && (
                                <div className="p-4 bg-slate-50 dark:bg-muted/20 border-t-2 border-slate-900 dark:border-border text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">{tableData.caption}</p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'chart':
            case 'pie' as any:
            case 'graph' as any:
            case 'bar' as any:
            case 'line' as any:
            case 'scatter' as any:
                // Support both nested and flat structures
                const chartData = media.chart || (media as any).pie || (media as any).graph || (media as any).bar || (media as any).line || (media as any).scatter || ((media as any).data ? media : null);
                
                if (!chartData || !chartData.data) {
                    // Check if any property contains a URL - might be an image representation of a chart
                    const potentialUrl = (media as any).image?.url || (media as any).url || (media as any).imageUrl || (media as any).image_url || (media as any).graph?.url || (media as any).pie?.url || (media as any).chart?.url;
                    if (potentialUrl) {
                        return renderImage();
                    }
                    return null;
                }
                
                const type = chartData.chartType || media.type;
                const { data, xKey, yKey, title, xLabel, yLabel } = chartData;

                return (
                    <div className="p-8 rounded-[2.5rem] border-2 border-slate-900 dark:border-border bg-white dark:bg-card shadow-2xl space-y-6">
                        {title && (
                            <h4 className="text-xs font-black text-center uppercase tracking-[0.2em] text-slate-900 dark:text-slate-100 pb-4 border-b border-slate-100 dark:border-border">
                                {title}
                            </h4>
                        )}
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                {type === 'bar' ? (
                                    <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis
                                            dataKey={xKey}
                                            fontSize={10}
                                            tick={{ fill: '#64748b', fontWeight: 800 }}
                                            axisLine={false}
                                            tickLine={false}
                                            label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -10, fontSize: 10, fontWeight: 900, fill: '#94a3b8' } : undefined}
                                        />
                                        <YAxis 
                                            fontSize={10} 
                                            tick={{ fill: '#64748b', fontWeight: 800 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
                                        />
                                        <Bar dataKey={yKey} fill="#6366f1" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                ) : type === 'line' ? (
                                    <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey={xKey} fontSize={10} tick={{ fill: '#64748b', fontWeight: 800 }} axisLine={false} tickLine={false} />
                                        <YAxis fontSize={10} tick={{ fill: '#64748b', fontWeight: 800 }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800 }} />
                                        <Line type="monotone" dataKey={yKey} stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                                    </LineChart>
                                ) : type === 'pie' ? (
                                    <PieChart>
                                        <Pie
                                            data={data}
                                            innerRadius={70}
                                            outerRadius={100}
                                            paddingAngle={8}
                                            dataKey={yKey}
                                            nameKey={xKey}
                                            stroke="none"
                                        >
                                            {data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800 }} />
                                    </PieChart>
                                ) : (
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" dataKey={xKey} name={xLabel || 'X'} fontSize={10} tick={{ fill: '#64748b', fontWeight: 800 }} />
                                        <YAxis type="number" dataKey={yKey} name={yLabel || 'Y'} fontSize={10} tick={{ fill: '#64748b', fontWeight: 800 }} />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                        <Scatter name="Data" data={data} fill="#6366f1" />
                                    </ScatterChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                );

            case 'diagram':
                return (
                    <div className="rounded-[2rem] border-2 border-slate-100 dark:border-border overflow-hidden bg-slate-50/30 dark:bg-muted/10 p-6 lg:p-10">
                        <DiagramRenderer diagram={media.diagram as any} />
                    </div>
                );

            default:
                // Fallback: If any property contains a URL, try to render it as an image
                const fallbackUrl = (media as any).image?.url ||
                    (media as any).url ||
                    (media as any).imageUrl ||
                    (media as any).image_url ||
                    (media as any).graph?.url ||
                    (media as any).pie?.url ||
                    (media as any).chart?.url ||
                    (typeof media === 'string' && (media as string).startsWith('http') ? media : null);

                if (fallbackUrl) {
                    return renderImage(media);
                }
                return null;
        }
    };

    return (
        <div className={cn("question-media animate-in fade-in zoom-in-95 duration-500", className)}>
            {renderContent()}
        </div>
    );
});

export default QuestionMedia;
