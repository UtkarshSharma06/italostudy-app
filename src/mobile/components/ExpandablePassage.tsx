import { useState, useRef, useEffect } from 'react';
import { MathText } from '@/components/MathText';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandablePassageProps {
    content: string;
}

export function ExpandablePassage({ content }: ExpandablePassageProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isExpandable, setIsExpandable] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!contentRef.current) return;

        const checkExpandable = () => {
            if (contentRef.current) {
                // If scrollHeight is significantly larger than the visible area (or our threshold)
                // 180px is approx 8 lines of text-sm with 1.7 leading
                // Also add a fallback based on character count (~500 chars is roughly 8 lines)
                const isOverflowing = contentRef.current.scrollHeight > 190 || content.length > 500;
                setIsExpandable(isOverflowing);
            }
        };

        const observer = new ResizeObserver(() => {
            checkExpandable();
        });

        observer.observe(contentRef.current);
        
        // Initial check after a short delay for Katex
        const timer = setTimeout(checkExpandable, 500);

        return () => {
            observer.disconnect();
            clearTimeout(timer);
        };
    }, [content]);

    return (
        <div className="mb-6">
            <div className={`p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border-2 border-indigo-100 dark:border-indigo-500/20 rounded-[2.5rem] relative pt-10 shadow-sm transition-all duration-300 ${!isExpanded && isExpandable ? 'pb-16' : ''}`}>
                <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-bl-lg">
                    Reading Passage
                </div>
                
                <div 
                    ref={contentRef}
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${!isExpanded && isExpandable ? 'max-h-[190px] line-clamp-8' : 'max-h-[5000px]'}`}
                >
                    <MathText
                        content={content}
                        className="text-sm text-slate-700 dark:text-slate-300 leading-[1.7] font-medium prose dark:prose-invert max-w-none break-words max-w-full overflow-x-auto"
                    />
                </div>

                {!isExpanded && isExpandable && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-indigo-50 dark:from-[#111322] to-transparent pointer-events-none rounded-b-[2.5rem]" />
                )}

                {isExpandable && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-600 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700 z-10`}
                    >
                        {isExpanded ? (
                            <>Show Less <ChevronUp size={14} /></>
                        ) : (
                            <>Read More <ChevronDown size={14} /></>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
