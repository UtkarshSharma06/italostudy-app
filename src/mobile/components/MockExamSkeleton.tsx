import { Skeleton } from "@/components/SkeletonLoader";
import { Card, CardContent } from "@/components/ui/card";

export function MockExamSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-secondary/20 border-border/40 rounded-[2.5rem] overflow-hidden border-b-4 shadow-xl relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/10 dark:via-white/5 to-transparent -translate-x-full animate-shimmer" />
                    <CardContent className="p-6 space-y-6">
                        <div className="flex justify-between items-start">
                            <Skeleton className="h-6 w-24 rounded-full" />
                            <div className="text-right space-y-2">
                                <Skeleton className="h-2 w-16 ml-auto" />
                                <Skeleton className="h-4 w-20 ml-auto" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Skeleton className="h-6 w-3/4" />
                            <div className="flex gap-4">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>

                        <Skeleton className="h-14 w-full rounded-2xl" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export function PlanLimitSkeleton() {
    return (
        <div className="bg-secondary/30 rounded-[2rem] p-6 border border-border/50 shadow-sm backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/10 dark:via-white/5 to-transparent -translate-x-full animate-shimmer" />
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-2 w-24" />
                <Skeleton className="h-4 w-8" />
            </div>
            <Skeleton className="h-3 w-full rounded-full mb-6" />
            <Skeleton className="h-12 w-full rounded-xl" />
        </div>
    );
}
