import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';

interface MarkdownContentProps {
    content: string;
    className?: string;
    truncate?: number;
}

export default function MarkdownContent({ content, className, truncate }: MarkdownContentProps) {
    // Truncate if needed (for previews)
    const displayContent = truncate ? (content.length > truncate ? content.substring(0, truncate) + '...' : content) : content;

    // Custom renderer for links and mentions
    const components = {
        a: ({ node, ...props }: any) => {
            const href = props.href || '';
            // Handle @mentions
            if (href.startsWith('mention:')) {
                const username = href.replace('mention:', '');
                return (
                    <Link
                        to={`/u/${username}`}
                        className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        @{username}
                    </Link>
                );
            }
            // Standard links
            return (
                <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                    onClick={(e) => e.stopPropagation()}
                />
            );
        },
        // Optional: Style other elements to match platform aesthetic
        p: ({ node, ...props }: any) => <p {...props} className="mb-3 last:mb-0 leading-relaxed" />,
        ul: ({ node, ...props }: any) => <ul {...props} className="list-disc pl-5 mb-3 space-y-1" />,
        ol: ({ node, ...props }: any) => <ol {...props} className="list-decimal pl-5 mb-3 space-y-1" />,
        h1: ({ node, ...props }: any) => <h1 {...props} className="text-xl font-black mb-3" />,
        h2: ({ node, ...props }: any) => <h2 {...props} className="text-lg font-black mb-2" />,
        blockquote: ({ node, ...props }: any) => (
            <blockquote {...props} className="border-l-4 border-slate-200 dark:border-slate-700 pl-4 italic my-3 text-slate-600 dark:text-slate-400" />
        ),
        code: ({ node, inline, ...props }: any) => (
            inline 
                ? <code {...props} className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-sm font-mono" />
                : <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto my-3"><code {...props} className="text-sm font-mono" /></pre>
        ),
        img: ({ node, ...props }: any) => (
            <img 
                {...props} 
                className="rounded-xl border border-slate-200 dark:border-white/10 max-h-[400px] w-auto my-4 shadow-lg cursor-zoom-in" 
                loading="lazy"
            />
        )
    };

    // Pre-process content to find @mentions and turn them into pseudo-links for the renderer
    // Regex: @ followed by alphanumeric/underscores
    const processedContent = displayContent.replace(/@(\w{3,20})/g, '[@$1](mention:$1)');

    return (
        <div className={cn("markdown-body prose prose-slate dark:prose-invert max-w-none prose-sm sm:prose-base", className)}>
            <ReactMarkdown 
                components={components}
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
}
