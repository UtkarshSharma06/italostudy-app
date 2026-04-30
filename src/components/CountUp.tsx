import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, useTransform, animate } from 'framer-motion';

interface CountUpProps {
    to: number;
    from?: number;
    duration?: number;
    precision?: number;
    suffix?: string;
    prefix?: string;
    className?: string;
}

export default function CountUp({
    to,
    from = 0,
    duration = 2,
    precision = 0,
    suffix = '',
    prefix = '',
    className = ''
}: CountUpProps) {
    const nodeRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const node = nodeRef.current;
        if (!node) return;

        const controls = animate(from, to, {
            duration,
            ease: [0.16, 1, 0.3, 1], // Custom "expo out" ease
            onUpdate(value) {
                node.textContent = prefix + value.toFixed(precision) + suffix;
            },
        });

        return () => controls.stop();
    }, [from, to, duration, precision, prefix, suffix]);

    return <span ref={nodeRef} className={className}>{prefix}{from.toFixed(precision)}{suffix}</span>;
}
