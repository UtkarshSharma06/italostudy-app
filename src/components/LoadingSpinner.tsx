import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg" | "xl";
    text?: string;
    variant?: "primary" | "subtle" | "white";
    className?: string;
}

const sizeMap = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
    xl: "w-16 h-16 border-4",
};

const variantMap = {
    primary: "border-indigo-600/30 border-t-indigo-600",
    subtle: "border-slate-300/30 border-t-slate-600",
    white: "border-white/30 border-t-white",
};

export const LoadingSpinner = ({
    size = "md",
    text,
    variant = "primary",
    className,
}: LoadingSpinnerProps) => {
    return (
        <div className={cn("flex flex-col items-center gap-3", className)}>
            <div
                className={cn(
                    "rounded-full animate-spin",
                    sizeMap[size],
                    variantMap[variant]
                )}
                style={{
                    animation: "spin 0.8s linear infinite",
                }}
            />
            {text && (
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );
};
