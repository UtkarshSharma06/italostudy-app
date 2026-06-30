import React from 'react';
import { cn } from '@/lib/utils';

export function getSubjectColorClass(subjectName: string): string {
  const nameLower = subjectName.toLowerCase();
  if (nameLower.includes('math')) return "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400";
  if (nameLower.includes('reasoning') || nameLower.includes('logic')) return "bg-green-50 text-green-500 dark:bg-green-500/10 dark:text-green-400";
  if (nameLower.includes('bio')) return "bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400";
  if (nameLower.includes('chem')) return "bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400";
  if (nameLower.includes('phys')) return "bg-yellow-50 text-yellow-500 dark:bg-yellow-500/10 dark:text-yellow-400";
  return "bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
}

interface SubjectIconProps {
  subjectName?: string;
  className?: string; // Standard sizing classes applied to the wrapper or icon
  fallbackIcon?: React.ReactNode; // Optional fallback if name isn't recognized
}
export const SubjectIcon: React.FC<SubjectIconProps> = ({ 
  subjectName = '',
  className,
  fallbackIcon = '📝'
}) => {
  const nameLower = subjectName.toLowerCase();

  if (nameLower.includes('math')) {
    return (
        <div className={cn("w-7 h-7 bg-blue-500 rounded-md shadow-sm flex flex-col p-[2px] shrink-0", className)}>
            <div className="flex h-1/2">
                <div className="w-1/2 flex items-center justify-center text-white text-[12px] font-bold leading-none border-r border-b border-blue-400/50 pb-0.5">+</div>
                <div className="w-1/2 flex items-center justify-center text-white text-[14px] font-bold leading-none border-b border-blue-400/50 pb-0.5">-</div>
            </div>
            <div className="flex h-1/2">
                <div className="w-1/2 flex items-center justify-center text-white text-[10px] font-bold leading-none border-r border-blue-400/50 pt-0.5">×</div>
                <div className="w-1/2 flex items-center justify-center text-white text-[12px] font-bold leading-none pt-0.5">=</div>
            </div>
        </div>
    );
  }

  if (nameLower.includes('reasoning') || nameLower.includes('logic')) {
    return <span className={cn("text-[26px] drop-shadow-sm leading-none shrink-0 flex items-center justify-center", className)}>💡</span>;
  }

  if (nameLower.includes('bio')) {
    return <span className={cn("text-[26px] drop-shadow-sm leading-none shrink-0 flex items-center justify-center", className)}>🧬</span>;
  }

  if (nameLower.includes('chem')) {
    return <img src="/chemistry.webp" alt="Chemistry" className={cn("w-7 h-7 object-contain shrink-0 scale-[1.55]", className)} />;
  }

  if (nameLower.includes('phys')) {
    return <img src="/physics.webp" alt="Physics" className={cn("w-7 h-7 object-contain shrink-0 scale-[1.55]", className)} />;
  }

  return <span className={cn("text-[26px] drop-shadow-sm leading-none shrink-0 flex items-center justify-center", className)}>{fallbackIcon}</span>;
};
