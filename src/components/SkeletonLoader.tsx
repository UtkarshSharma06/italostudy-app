import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => {
    return (
        <div
            className={cn(
                "animate-pulse bg-slate-200/60 dark:bg-slate-800/40 rounded-lg",
                className
            )}
        />
    );
};


export const SubjectCardSkeleton = () => {
    return (
        <div className="bg-white dark:bg-card p-6 rounded-[2rem] border-2 border-slate-100 dark:border-border border-b-[6px] shadow-sm relative overflow-hidden">
            <div className="absolute top-6 right-6">
                <Skeleton className="w-12 h-6 rounded-full" />
            </div>
            <div className="mb-4">
                <Skeleton className="w-10 h-10 rounded-xl mb-3" />
                <Skeleton className="h-7 w-1/2 mb-2 rounded" />
                <Skeleton className="h-4 w-full mb-1 rounded" />
                <Skeleton className="h-4 w-2/3 mb-1 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4 py-6 border-y border-slate-50 dark:border-slate-800 mb-8">
                <div>
                    <Skeleton className="h-3 w-10 mb-2 rounded" />
                    <Skeleton className="h-5 w-16 rounded" />
                </div>
                <div className="flex flex-col items-end">
                    <Skeleton className="h-3 w-10 mb-2 rounded" />
                    <Skeleton className="h-5 w-16 rounded" />
                </div>
            </div>
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="w-8 h-8 rounded-full" />
            </div>
        </div>
    );
};

export const SubjectsGridSkeleton = () => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
                <SubjectCardSkeleton key={i} />
            ))}
        </div>
    );
};

export const AnalyticsSkeleton = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-10 px-6 py-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2.5rem] shadow-sm">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-[1.2rem]" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48 rounded-xl" />
                        <Skeleton className="h-3 w-32 rounded-full" />
                    </div>
                </div>
                <div className="flex items-center gap-10">
                    <div className="flex flex-col items-end gap-2">
                        <Skeleton className="h-3 w-16 rounded" />
                        <Skeleton className="h-6 w-12 rounded" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Skeleton className="h-3 w-16 rounded" />
                        <Skeleton className="h-6 w-16 rounded" />
                    </div>
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem] shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <Skeleton className="w-10 h-10 rounded-2xl" />
                            <Skeleton className="w-2 h-2 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-20 mb-2 rounded" />
                        <Skeleton className="h-8 w-24 rounded-xl" />
                    </div>
                ))}
            </div>

            {/* Chart Area Skeleton */}
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <Skeleton className="h-6 w-40 rounded" />
                        <div className="flex gap-2">
                            <Skeleton className="w-12 h-8 rounded-xl" />
                            <Skeleton className="w-12 h-8 rounded-xl" />
                        </div>
                    </div>
                    <Skeleton className="h-[300px] w-full rounded-2xl" />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm">
                    <Skeleton className="h-6 w-40 mb-8 rounded" />
                    <div className="space-y-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="w-10 h-10 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-full rounded" />
                                    <Skeleton className="h-2 w-2/3 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


export const TestListSkeleton = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="p-8 rounded-[2rem] border-2 border-slate-100 dark:border-border bg-slate-50/30 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <Skeleton className="w-10 h-10 rounded-xl" />
                            <Skeleton className="w-16 h-5 rounded-full" />
                        </div>
                        <Skeleton className="h-7 w-3/4 mb-2 rounded" />
                        <Skeleton className="h-4 w-full mb-1 rounded" />
                        <Skeleton className="h-4 w-2/3 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
};

export const BlogSkeleton = () => {
    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[3rem] p-6 shadow-sm overflow-hidden relative group">
                    <div className="relative z-10">
                        <div className="aspect-[4/3] bg-slate-50 dark:bg-slate-800 rounded-[2rem] mb-6" />
                        <div className="h-4 bg-slate-50 dark:bg-slate-800 rounded-full w-2/3 mb-4" />
                        <div className="space-y-2">
                            <div className="h-3 bg-slate-50 dark:bg-slate-800 rounded-full w-full" />
                            <div className="h-3 bg-slate-50 dark:bg-slate-800 rounded-full w-4/5" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const HistorySkeleton = () => {
    return (
        <div className="grid gap-6">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white dark:bg-card p-6 sm:p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-border border-b-[6px] shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-6">
                        <Skeleton className="w-12 h-12 rounded-2xl" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-1/3 rounded-full" />
                            <Skeleton className="h-3 w-1/4 rounded-full opacity-50" />
                        </div>
                        <Skeleton className="w-24 h-8 rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(j => (
                            <div key={j} className="h-20 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-4 flex flex-col justify-center gap-2">
                                <Skeleton className="h-2 w-10 rounded-full opacity-50" />
                                <Skeleton className="h-5 w-16 rounded-lg" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export const SidebarSkeleton = () => {
    return (
        <div className="flex flex-col items-center h-full w-full space-y-10 relative overflow-hidden">
            <div className="h-4" /> {/* Spacer instead of duplicate logo */}
            
            {/* Nav items placeholders */}
            <div className="flex-1 w-full space-y-4 px-3">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <div key={i} className="flex items-center gap-3 h-12 w-full px-3">
                        <Skeleton className="w-5 h-5 rounded-lg shrink-0" />
                        <Skeleton className="h-3 w-24 rounded-full" />
                    </div>
                ))}
            </div>

            {/* Bottom utility */}
            <div className="mt-auto w-full px-3">
                <div className="flex items-center gap-3 h-12 w-full px-3">
                    <Skeleton className="w-5 h-5 rounded-lg shrink-0" />
                </div>
            </div>
        </div>
    );
};

export const HeaderSkeleton = () => {
    return (
        <div className="container mx-auto px-6 h-[56px] flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-32 rounded-full opacity-60" />
            </div>
            <div className="flex items-center gap-5">
                <Skeleton className="w-8 h-8 rounded-full opacity-40" />
                <Skeleton className="w-24 h-8 rounded-xl opacity-60" />
                <div className="w-[1px] h-5 bg-slate-200/60 dark:bg-slate-800/60" />
                <Skeleton className="w-9 h-9 rounded-full opacity-40" />
                <Skeleton className="w-28 h-9 rounded-full opacity-80" />
            </div>
        </div>
    );
};

export const MobileHeaderSkeleton = () => {
    return (
        <header className="h-16 flex items-center justify-between px-4 bg-background border-b border-border/50 sticky top-0 z-40">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24 rounded-full" />
                    <Skeleton className="h-2 w-16 rounded-full opacity-60" />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="w-10 h-10 rounded-full" />
            </div>
        </header>
    );
};

export const MobileBottomBarSkeleton = () => {
    return (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom,16px))] z-50 w-full">
            <div className="w-full max-w-md mx-auto h-20 bg-background/95 backdrop-blur-3xl border border-white/20 rounded-[2rem] flex items-center justify-around px-1 shadow-[0_25px_60px_rgba(0,0,0,0.4)]">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-center h-full">
                        <Skeleton className="w-10 h-10 rounded-2xl" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const SubjectMasterySkeleton = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <Skeleton className="h-4 w-24 rounded-full" />
            </div>
            <div className="text-right">
                <Skeleton className="h-6 w-12 rounded-lg mb-1" />
                <Skeleton className="h-2 w-10 rounded-full opacity-50" />
            </div>
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
);

export const ChampionItemSkeleton = () => (
    <div className="flex items-center gap-3 py-2.5 px-3">
        <Skeleton className="w-6 h-6 rounded-lg shrink-0" />
        <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-2 w-12 rounded-full opacity-50" />
        </div>
        <div className="text-right space-y-1">
            <Skeleton className="h-4 w-10 rounded-lg" />
            <Skeleton className="h-2 w-6 rounded-full opacity-50" />
        </div>
    </div>
);

export const HeroBannerSkeleton = () => {
    return (
        <div className="relative overflow-hidden bg-slate-50 dark:bg-slate-950 h-[160px] w-full px-6 pt-10 transition-colors duration-500">
            <div className="relative z-10 flex justify-between items-start">
                <div className="space-y-3 pt-4">
                    <Skeleton className="h-4 w-24 rounded-full opacity-40" />
                    <Skeleton className="h-12 w-48 rounded-2xl" />
                </div>
                <div className="sk-bar w-32 h-32 rounded-full opacity-10 dark:opacity-20 absolute -right-4 -top-4" />
            </div>
        </div>
    );
};

export const GettingStartedSkeleton = () => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 dark:via-white/5 to-transparent -translate-x-full animate-shimmer" />
            <div className="space-y-5 relative z-10">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/20" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-2 w-20 rounded-full" />
                            <Skeleton className="h-4 w-48 rounded-full" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="flex-1 h-2 rounded-full" />
                    <Skeleton className="w-8 h-4 rounded-full" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-28 rounded-xl bg-indigo-50 dark:bg-indigo-900/20" />
                    <Skeleton className="h-9 w-28 rounded-xl" />
                </div>
            </div>
        </div>
    );
};

export const NavIconsSkeleton = () => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 dark:via-white/5 to-transparent -translate-x-full animate-shimmer" />
            <div className="flex items-center gap-6 overflow-hidden">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="flex flex-col items-center gap-2 min-w-[60px]">
                        <Skeleton className="w-14 h-14 rounded-2xl" />
                        <Skeleton className="h-2 w-10 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const StatsGridSkeleton = () => {
    return (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm flex flex-col items-center gap-3 text-center relative overflow-hidden">
                    <Skeleton className="w-9 h-9 rounded-xl mx-auto" />
                    <Skeleton className="h-6 w-16 rounded-lg mx-auto" />
                    <Skeleton className="h-2 w-12 rounded-full mx-auto" />
                </div>
            ))}
        </div>
    );
};


export const AuthorityPageSkeleton = () => {
    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pt-40 md:pt-8 animate-in fade-in duration-700">
            <main className="container mx-auto px-4 pb-12">
                <Skeleton className="h-6 w-48 mb-8 rounded-full" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-8 space-y-16">
                        {/* Hero Section */}
                        <div className="space-y-8">
                            <Skeleton className="h-6 w-40 rounded-full" />
                            <Skeleton className="h-20 w-3/4 rounded-3xl" />
                            <Skeleton className="h-8 w-full rounded-2xl" />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <Skeleton key={i} className="h-24 rounded-2xl" />
                                ))}
                            </div>
                        </div>

                        {/* Content Blocks */}
                        <div className="space-y-8">
                            <Skeleton className="h-64 w-full rounded-[3rem]" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[1, 2, 3].map(i => (
                                    <Skeleton key={i} className="h-48 rounded-[2rem]" />
                                ))}
                            </div>
                            <Skeleton className="h-56 w-full rounded-[3rem]" />
                        </div>

                        {/* FAQ Style List */}
                        <div className="space-y-6">
                            <Skeleton className="h-10 w-64 rounded-xl mb-4" />
                            {[1, 2, 3, 4].map(i => (
                                <Skeleton key={i} className="h-24 w-full rounded-3xl" />
                            ))}
                        </div>
                    </div>

                    {/* Dashboard Sidebar style sidebar */}
                    <div className="lg:col-span-4 hidden lg:block space-y-6">
                        <div className="sticky top-24 space-y-6">
                            <Skeleton className="h-[500px] w-full rounded-[2.5rem]" />
                            <Skeleton className="h-64 w-full rounded-[2.5rem]" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export const MockExamsSkeleton = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white dark:bg-card p-6 sm:p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-border border-b-[6px] shadow-sm relative overflow-hidden">
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                            <div className="flex gap-2">
                                <Skeleton className="w-24 h-6 rounded-full" />
                                <Skeleton className="w-16 h-6 rounded-full" />
                            </div>
                            <div className="space-y-2 flex flex-col items-end">
                                <Skeleton className="h-2 w-12 rounded-full opacity-50" />
                                <Skeleton className="h-5 w-16 rounded-lg" />
                            </div>
                        </div>
                        <Skeleton className="h-8 w-3/4 rounded-xl mb-6" />
                        <div className="flex items-center gap-6 mb-8 py-4 border-y border-slate-50 dark:border-slate-800/50">
                            <Skeleton className="h-4 w-20 rounded-full" />
                            <Skeleton className="h-4 w-20 rounded-full" />
                            <Skeleton className="h-4 w-20 rounded-full" />
                        </div>
                        <div className="flex gap-3">
                            <Skeleton className="flex-1 h-12 rounded-2xl" />
                            <Skeleton className="flex-1 h-12 rounded-2xl" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const LearningSkeleton = () => {
    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl animate-in fade-in duration-700">
            <div className="text-center mb-12 space-y-4">
                <Skeleton className="h-6 w-32 rounded-full mx-auto" />
                <Skeleton className="h-12 w-2/3 rounded-3xl mx-auto" />
                <Skeleton className="h-4 w-1/2 rounded-full mx-auto" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-900 aspect-square rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
                        <Skeleton className="w-16 h-16 rounded-2xl" />
                        <Skeleton className="h-6 w-3/4 rounded-xl" />
                        <Skeleton className="h-3 w-1/2 rounded-full opacity-50" />
                        <Skeleton className="h-10 w-full rounded-2xl mt-4" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ResourceDetailSkeleton = () => {
    return (
        <div className="container mx-auto px-4 py-8 lg:py-12 max-w-4xl animate-in fade-in duration-700">
            <div className="space-y-8">
                <Skeleton className="h-4 w-32 rounded-full" />
                
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border-2 border-slate-100 dark:border-slate-800 relative overflow-hidden h-64 flex flex-col items-center justify-center space-y-6">
                    <Skeleton className="h-6 w-32 rounded-full" />
                    <Skeleton className="h-12 w-3/4 rounded-2xl" />
                    <Skeleton className="h-4 w-48 rounded-full" />
                </div>

                <div className="space-y-6">
                    <Skeleton className="h-4 w-40 rounded-full" />
                    <Skeleton className="h-32 w-full rounded-[2.5rem]" />
                </div>

                <div className="bg-slate-100 dark:bg-slate-800/50 h-56 w-full rounded-[3rem] relative overflow-hidden">
                </div>
            </div>
        </div>
    );
};


export const NotificationSkeleton = () => {
    return (
        <div className="space-y-4 animate-in fade-in duration-700">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-white dark:bg-card p-6 rounded-[2rem] border-2 border-slate-100 dark:border-border shadow-sm flex gap-4 relatives overflow-hidden">
                    <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-4 w-32 rounded-full" />
                            <Skeleton className="h-3 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-6 w-3/4 rounded-xl" />
                        <Skeleton className="h-3 w-full rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    );
};

export const LabSkeleton = () => {
    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl animate-in fade-in duration-700">
            <div className="flex items-center gap-4 mb-12 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800">
                <Skeleton className="w-16 h-16 rounded-2xl" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48 rounded-xl" />
                    <Skeleton className="h-4 w-64 rounded-full" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white dark:bg-card aspect-[16/10] rounded-[2.5rem] border-2 border-slate-100 dark:border-border p-8 relative overflow-hidden flex flex-col justify-end">
                            <div className="space-y-4">
                            <Skeleton className="h-8 w-1/2 rounded-xl" />
                            <Skeleton className="h-4 w-3/4 rounded-full" />
                            <div className="flex gap-2">
                                <Skeleton className="h-10 w-28 rounded-xl" />
                                <Skeleton className="h-10 w-28 rounded-xl" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const SettingsSkeleton = () => {
    return (
        <div className="flex flex-col min-h-full bg-background animate-in fade-in duration-500">
            <header className="px-6 py-8 flex items-center gap-4 border-b border-border/10">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-xl" />
            </header>
            <div className="px-6 py-10 space-y-8">
                <div className="flex items-center gap-6 p-8 rounded-[2.5rem] bg-card border border-border/5 relative overflow-hidden">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-3">
                        <Skeleton className="h-7 w-48 rounded-xl" />
                        <Skeleton className="h-4 w-32 rounded-full" />
                    </div>
                </div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-card rounded-[2.5rem] border border-border/10 p-2 space-y-1">
                        {[1, 2, 3].map(j => (
                            <div key={j} className="flex items-center justify-between p-6 rounded-2xl relative overflow-hidden">
                                            <div className="flex items-center gap-4">
                                    <Skeleton className="w-12 h-12 rounded-xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32 rounded-full" />
                                        <Skeleton className="h-3 w-48 rounded-full opacity-50" />
                                    </div>
                                </div>
                                <Skeleton className="w-6 h-6 rounded-full" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const GlobalSkeleton = () => {

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] p-8 space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-2xl" />
                    <Skeleton className="h-8 w-48 rounded-xl" />
                </div>
                <div className="flex gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="w-10 h-10 rounded-full" />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-900 h-40 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 relative overflow-hidden">
                        </div>
                ))}
            </div>
            <div className="bg-white dark:bg-slate-900 h-96 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 relative overflow-hidden">
            </div>
        </div>
    );
};

export const PricingSkeleton = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-700 p-6">
            <div className="text-center space-y-2 mb-8">
                <Skeleton className="h-8 w-64 mx-auto rounded-xl" />
                <Skeleton className="h-4 w-48 mx-auto rounded-full" />
            </div>

            {/* Feature Table Skeleton */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                    <Skeleton className="h-4 w-full rounded-full" />
                </div>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="p-4 flex items-center justify-between border-b border-slate-50 dark:border-white/5">
                        <Skeleton className="h-4 w-1/3 rounded-full" />
                        <div className="flex gap-4">
                            <Skeleton className="w-4 h-4 rounded-full" />
                            <Skeleton className="w-4 h-4 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Plan Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                        <Skeleton className="h-4 w-20 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-24 rounded-xl" />
                            <Skeleton className="h-3 w-16 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const CommunitySkeleton = () => {
    return (
        <div className="flex h-[calc(100vh-72px)] bg-white dark:bg-black overflow-hidden animate-in fade-in duration-700">
            {/* Sidebar Placeholder */}
            <div className="w-80 border-r border-slate-100 dark:border-white/5 hidden md:flex flex-col p-6 space-y-8">
                <Skeleton className="h-10 w-full rounded-xl" />
                <div className="space-y-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="flex items-center gap-3 p-2">
                            <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-3/4 rounded" />
                                <Skeleton className="h-2 w-1/2 rounded-full opacity-50" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Main Chat Area Placeholder */}
            <div className="flex-1 flex flex-col bg-slate-50/30 dark:bg-slate-900/10">
                <div className="h-16 border-b border-slate-100 dark:border-white/5 flex items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-xl" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-32 rounded-full" />
                            <Skeleton className="h-2 w-20 rounded-full opacity-50" />
                        </div>
                    </div>
                </div>
                <div className="flex-1 p-8 space-y-8 overflow-hidden">
                    {[1, 0, 1, 1, 0].map((side, i) => (
                        <div key={i} className={cn("flex gap-4 max-w-2xl", side === 1 ? "" : "ml-auto flex-row-reverse")}>
                            <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
                            <div className={cn("space-y-2 flex-1", side === 0 ? "items-end" : "")}>
                                <Skeleton className={cn("h-4 w-32 rounded-full mb-1", side === 0 ? "ml-auto" : "")} />
                                <div className={cn("p-4 rounded-3xl bg-white dark:bg-white/5 space-y-2", side === 1 ? "rounded-tl-none" : "rounded-tr-none")}>
                                    <Skeleton className="h-4 w-full rounded" />
                                    <Skeleton className="h-4 w-2/3 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-8 border-t border-slate-100 dark:border-white/5">
                    <Skeleton className="h-14 w-full rounded-2xl" />
                </div>
            </div>
        </div>
    );
};

export const ProfileSkeleton = () => {
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-16 py-12 max-w-[1800px] animate-in fade-in duration-700">
            {/* Profile Header Skeleton */}
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl mb-12 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                    <Skeleton className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800" />
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div className="space-y-2 flex flex-col items-center md:items-start">
                            <Skeleton className="h-12 w-64 rounded-2xl" />
                            <Skeleton className="h-4 w-32 rounded-full opacity-50" />
                        </div>
                        <div className="flex gap-8 justify-center md:justify-start pt-2">
                            <Skeleton className="h-4 w-32 rounded-full" />
                            <Skeleton className="h-4 w-32 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Analytics Section */}
            <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-100 dark:border-white/5 overflow-hidden">
                <AnalyticsSkeleton />
            </div>
        </div>
    );
};

export const BookmarkSkeleton = () => {
    return (
        <div className="container mx-auto px-6 py-16 max-w-5xl animate-in fade-in duration-700">
            {/* Header Skeleton */}
            <div className="text-center mb-16 space-y-4">
                <Skeleton className="h-10 w-40 rounded-full mx-auto" />
                <Skeleton className="h-16 w-64 rounded-2xl mx-auto" />
                <Skeleton className="h-5 w-80 rounded-full mx-auto opacity-50" />
            </div>

            {/* Tabs Skeleton */}
            <div className="flex justify-center gap-4 mb-12">
                <Skeleton className="h-12 w-40 rounded-2xl" />
                <Skeleton className="h-12 w-40 rounded-2xl opacity-50" />
            </div>

            {/* List Skeleton */}
            <div className="grid gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
                             <Skeleton className="w-16 h-16 rounded-3xl shrink-0" />
                        <div className="flex-1 space-y-4">
                            <div className="flex gap-3">
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full rounded" />
                                <Skeleton className="h-4 w-2/3 rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


export const LayoutSkeleton = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-[#020617]">
            {/* Sidebar Shimmer (Desktop) */}
            <div className="hidden lg:flex flex-col w-[280px] bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 p-6 space-y-8 h-screen sticky top-0">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <Skeleton className="h-4 w-32 rounded-full" />
                </div>
                <div className="space-y-4 pt-10">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton className="w-5 h-5 rounded-lg" />
                            <Skeleton className="h-3 w-24 rounded-full" />
                        </div>
                    ))}
                </div>
                <div className="mt-auto space-y-4">
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <div className="flex items-center gap-3 pt-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <Skeleton className="h-3 w-20 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header Shimmer - Hidden on Mobile Dashboard to prevent layout flash */}
                {!window.location.pathname.startsWith('/mobile') && (
                    <header className="h-[72px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-[40]">
                        <div className="flex items-center gap-4 lg:hidden">
                            <Skeleton className="w-10 h-10 rounded-xl" />
                            <Skeleton className="h-6 w-24 rounded-lg" />
                        </div>
                        <div className="hidden lg:flex items-center gap-4">
                            <Skeleton className="h-5 w-40 rounded-full" />
                        </div>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-24 rounded-xl hidden sm:block" />
                            <Skeleton className="w-10 h-10 rounded-full" />
                        </div>
                    </header>
                )}

                <main className="flex-1 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
};

// Premium Blinking Animation Override
const blinkStyles = `
  @keyframes premium-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
  }
  .animate-premium-blink {
    animation: premium-blink 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;

if (typeof document !== 'undefined') {
    const styleId = 'skeleton-premium-blink-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = blinkStyles;
        document.head.appendChild(style);
    }
}
