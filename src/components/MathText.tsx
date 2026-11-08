import { useEffect, useRef, HTMLAttributes, memo } from 'react';
import 'katex/dist/katex.min.css';
// KaTeX and DOMPurify are now dynamically imported for better initial performance
import { cn } from '@/lib/utils';

interface MathTextProps extends HTMLAttributes<HTMLDivElement> {
    content: string;
    isHtml?: boolean;
    variant?: 'default' | 'premium';
}

export const MathText = memo(({ content, className, isHtml = false, variant = 'premium', ...props }: MathTextProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const renderMath = async () => {
            if (containerRef.current) {
                try {
                    const renderMathInElement = (await import('katex/dist/contrib/auto-render.mjs')).default;
                    
                    // Temporarily remove tables so KaTeX doesn't process their content
                    const tables = Array.from(containerRef.current.querySelectorAll('table'));
                    const tablePlaceholders: { placeholder: Comment; table: Element }[] = [];

                    tables.forEach(table => {
                        const placeholder = document.createComment('table-placeholder');
                        table.parentNode?.insertBefore(placeholder, table);
                        table.parentNode?.removeChild(table);
                        tablePlaceholders.push({ placeholder, table });
                    });

                    renderMathInElement(containerRef.current, {
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

                    // Re-insert tables back into their original positions
                    tablePlaceholders.forEach(({ placeholder, table }) => {
                        placeholder.parentNode?.insertBefore(table, placeholder);
                        placeholder.parentNode?.removeChild(placeholder);

                        // Now that the table is safely back in its place, render math inside its cells
                        setTimeout(async () => {
                            if (table) {
                                renderMathInElement(table as HTMLElement, {
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
                            }
                        }, 0);
                    });
                } catch (error) {
                    console.error('KaTeX rendering error:', error);
                }
            }
        };

        const processAndSanitize = async () => {
            if (containerRef.current) {
                const DOMPurify = (await import('dompurify')).default;
                let processedContent = content || '';

                // Auto-detect math...
                const mathCommands = ['\\frac', '\\sqrt', '\\text{', '\\alpha', '\\beta', '\\gamma', '\\sum', '\\int', '\\pm', '\\times', '\\div'];
                const hasMathCommand = mathCommands.some(cmd => processedContent.includes(cmd));
                const hasDelimiter = ['$', '\\(', '\\['].some(del => processedContent.includes(del));

                if (hasMathCommand && !hasDelimiter) {
                    if (processedContent.trim().startsWith('\\')) {
                        processedContent = `\\[ ${processedContent} \\]`;
                    }
                }

                processedContent = processedContent.replace(/(?<!\\)%/g, '\\%');

                if (isHtml) {
                    containerRef.current.innerHTML = DOMPurify.sanitize(processedContent);
                } else {
                    const formattedContent = processedContent.replace(/\n/g, '<br/>');
                    containerRef.current.innerHTML = DOMPurify.sanitize(formattedContent);
                }

                renderMath();
            }
        };

        processAndSanitize();
    }, [content, isHtml]);

    return (
        <div
            ref={containerRef}
            className={cn(className, variant === 'premium' && 'katex-premium')}
            {...props}
        />
    );
}, (prev, next) => prev.content === next.content && prev.className === next.className && prev.isHtml === next.isHtml && prev.variant === next.variant);
