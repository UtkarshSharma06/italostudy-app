import React from 'react';
import { Skeleton } from "@/components/SkeletonLoader";

export const DashboardSkeleton = () => {
    return (
        <div className="flex flex-col min-h-screen bg-[#FBFCFF] dark:bg-background px-6 pt-10 pb-4 space-y-6 animate-in fade-in duration-500 w-full overflow-hidden transition-colors duration-500">
            {/* Greeting Skeleton */}
            <div className="relative flex justify-between items-start mb-8">
                <div className="space-y-3 pt-4">
                    <Skeleton className="h-4 w-24 rounded-full opacity-40" />
                    <Skeleton className="h-14 w-48 rounded-2xl" />
                    <Skeleton className="h-4 w-56 rounded-full opacity-40 mt-4" />
                </div>
                {/* Character placeholder */}
                <Skeleton className="w-32 h-32 rounded-full opacity-10 absolute -right-4 -top-4" />
            </div>

            {/* Next Lesson Card Skeleton */}
            <Skeleton className="w-full h-32 rounded-[2.5rem] shadow-[0_15px_45px_rgba(0,0,0,0.02)]" />

            {/* Bottom Two Cards Skeleton */}
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-48 rounded-[2.2rem] shadow-[0_10px_35px_rgba(0,0,0,0.02)]" />
                <Skeleton className="h-48 rounded-[2.2rem] shadow-[0_10px_35px_rgba(0,0,0,0.02)]" />
            </div>

            {/* Mini Stat Grid Skeleton */}
            <div className="flex items-center justify-between pt-8 px-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-xl opacity-40" />
                        <Skeleton className="h-2 w-6 rounded-full opacity-20" />
                    </div>
                ))}
            </div>

            {/* Content Section Skeleton */}
            <div className="space-y-6 pt-10">
                <div className="flex justify-between items-center px-2">
                    <Skeleton className="h-4 w-40 rounded-full opacity-50" />
                    <Skeleton className="h-4 w-12 rounded-full opacity-30" />
                </div>
                <div className="flex gap-4 overflow-hidden px-2">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="w-28 h-28 rounded-2xl shrink-0 shadow-sm" />
                    ))}
                </div>
            </div>
        </div>
    );
};
