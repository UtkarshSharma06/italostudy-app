import React from 'react';

// ─── Shimmer base atom ────────────────────────────────────────────────────────
const Shimmer = ({ className = '' }: { className?: string }) => (
    <div className={`relative overflow-hidden rounded-xl bg-slate-200/70 dark:bg-slate-800/50 ${className}`}>
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/5 to-transparent" />
    </div>
);

// ─── Hero Banner ─────────────────────────────────────────────────────────────
const HeroSkeleton = () => (
    <div className="relative overflow-hidden w-full h-[88px] flex-shrink-0
        bg-gradient-to-r from-orange-400 via-rose-500 to-purple-600
        dark:from-orange-600 dark:via-rose-700 dark:to-purple-800">

        {/* Radial overlays matching the real hero */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="absolute top-0 right-0 w-96 h-full opacity-10 bg-[radial-gradient(circle_at_center,white,transparent_70%)]" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
            {/* Left: greeting + title shimmer */}
            <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-white/20" />
                    <Shimmer className="h-3 w-36 rounded-full bg-white/25" />
                </div>
                <Shimmer className="h-7 w-80 rounded-xl bg-white/20" />
            </div>

            {/* Right: XP / Stars / Days pills */}
            <div className="hidden md:flex items-center gap-3">
                {['w-20', 'w-20', 'w-20'].map((w, i) => (
                    <Shimmer key={i} className={`h-8 ${w} rounded-full bg-white/20`} />
                ))}
            </div>
        </div>
    </div>
);

// ─── Getting Started card ─────────────────────────────────────────────────────
const GettingStartedSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-slate-50/80 dark:via-white/3 to-transparent" />
        <div className="flex items-center gap-3 mb-4">
            <Shimmer className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/20" />
            <div className="space-y-1.5">
                <Shimmer className="h-2.5 w-20 rounded-full" />
                <Shimmer className="h-4 w-52 rounded-full" />
            </div>
        </div>
        <div className="flex items-center gap-3 mb-4">
            <Shimmer className="flex-1 h-2 rounded-full" />
            <Shimmer className="w-8 h-3.5 rounded-full" />
        </div>
        <div className="flex gap-2">
            <Shimmer className="h-9 w-28 rounded-xl bg-indigo-50 dark:bg-indigo-900/20" />
            <Shimmer className="h-9 w-28 rounded-xl" />
        </div>
    </div>
);

// ─── Nav icons row ────────────────────────────────────────────────────────────
const NavIconsSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm overflow-hidden">
        <div className="flex items-center gap-5">
            {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="flex flex-col items-center gap-2 min-w-[52px]">
                    <Shimmer className="w-14 h-14 rounded-2xl" />
                    <Shimmer className="h-2 w-9 rounded-full" />
                </div>
            ))}
        </div>
    </div>
);

// ─── Stats grid (5 cells) ─────────────────────────────────────────────────────
const StatsGridSkeleton = () => (
    <div className="grid grid-cols-5 gap-3">
        {[
            { w: 'w-12', color: 'bg-blue-100 dark:bg-blue-900/20' },
            { w: 'w-14', color: 'bg-emerald-100 dark:bg-emerald-900/20' },
            { w: 'w-10', color: 'bg-violet-100 dark:bg-violet-900/20' },
            { w: 'w-12', color: 'bg-amber-100 dark:bg-amber-900/20' },
            { w: 'w-16', color: 'bg-rose-100 dark:bg-rose-900/20' },
        ].map(({ w, color }, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm flex flex-col items-center gap-3">
                <Shimmer className={`w-9 h-9 rounded-xl ${color}`} />
                <Shimmer className={`h-6 ${w} rounded-lg mx-auto`} />
                <Shimmer className="h-2 w-10 rounded-full mx-auto opacity-50" />
            </div>
        ))}
    </div>
);

// ─── Two-column action row ────────────────────────────────────────────────────
const ActionRowSkeleton = () => (
    <div className="grid sm:grid-cols-2 gap-4">
        {/* Practice card — orange tint */}
        <div className="h-[165px] rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50/60 dark:from-slate-900 dark:to-slate-900 border border-orange-100 dark:border-slate-800 p-5 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-orange-100/60 dark:bg-orange-900/10 blur-2xl -mr-6 -mt-6" />
            <div className="space-y-3 relative z-10">
                <Shimmer className="h-3 w-28 rounded-full bg-orange-200/80 dark:bg-slate-700/50" />
                <Shimmer className="h-6 w-44 rounded-xl bg-orange-200/60 dark:bg-slate-700/40" />
            </div>
            <Shimmer className="h-9 w-32 rounded-xl bg-orange-200/80 dark:bg-slate-700/50 relative z-10" />
        </div>

        {/* Progress card */}
        <div className="h-[165px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 flex gap-3">
            <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 flex flex-col items-center justify-center gap-3">
                <Shimmer className="w-10 h-10 rounded-full opacity-30" />
                <Shimmer className="h-6 w-10 rounded-lg" />
                <Shimmer className="h-2 w-14 rounded-full opacity-50" />
            </div>
            <div className="flex-1 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-4 flex flex-col gap-3">
                <Shimmer className="h-2.5 w-12 rounded-full opacity-50 bg-indigo-200 dark:bg-indigo-800/40" />
                <Shimmer className="h-2 w-full rounded-full opacity-30 bg-indigo-200 dark:bg-indigo-800/30" />
                <Shimmer className="h-2 w-3/4 rounded-full opacity-20 bg-indigo-200 dark:bg-indigo-800/20" />
                <Shimmer className="h-9 w-full rounded-xl bg-indigo-200/80 dark:bg-indigo-800/40 mt-auto" />
            </div>
        </div>
    </div>
);

// ─── Right Sidebar — Streak ────────────────────────────────────────────────────
const StreakSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
            <Shimmer className="h-4 w-28 rounded-full" />
            <Shimmer className="h-6 w-12 rounded-full bg-amber-100 dark:bg-amber-900/20" />
        </div>
        <div className="flex justify-between gap-2">
            {[1,2,3,4,5,6,7].map(i => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <Shimmer className={`w-full aspect-square rounded-full ${i <= 4 ? 'bg-amber-100 dark:bg-amber-900/30' : ''}`} />
                    <Shimmer className="h-2 w-4 rounded-full opacity-40" />
                </div>
            ))}
        </div>
    </div>
);

// ─── Right Sidebar — Oracle card (indigo) ─────────────────────────────────────
const OracleSkeleton = () => (
    <div className="rounded-[2rem] relative overflow-hidden flex flex-col gap-5 p-7"
        style={{ minHeight: 210, background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute left-4 bottom-0 w-24 h-24 rounded-full bg-violet-300/10 blur-2xl" />

        <div className="relative z-10 space-y-3">
            <Shimmer className="h-3 w-20 rounded-full bg-white/30" />
            <Shimmer className="h-8 w-44 rounded-xl bg-white/25" />
            <Shimmer className="h-3 w-36 rounded-full bg-white/20" />
        </div>
        <Shimmer className="relative z-10 h-11 w-full rounded-2xl bg-white/90 mt-auto" />
    </div>
);

// ─── Right Sidebar — Rankings ─────────────────────────────────────────────────
const RankingsSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
            <Shimmer className="h-4 w-24 rounded-full" />
            <Shimmer className="h-6 w-16 rounded-full" />
        </div>
        <div className="space-y-3">
            {[
                'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/20',
                'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700',
                'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/20',
            ].map((cls, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${cls}`}>
                    <Shimmer className="w-7 h-7 rounded-full flex-shrink-0" />
                    <Shimmer className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <Shimmer className="h-3 w-24 rounded-full" />
                        <Shimmer className="h-2 w-16 rounded-full opacity-50" />
                    </div>
                    <Shimmer className="h-5 w-12 rounded-full flex-shrink-0" />
                </div>
            ))}
            {[4,5].map(i => (
                <div key={i} className="flex items-center gap-3 p-3">
                    <Shimmer className="w-6 h-6 rounded-full flex-shrink-0 opacity-40" />
                    <Shimmer className="w-8 h-8 rounded-full flex-shrink-0 opacity-40" />
                    <div className="flex-1 space-y-1.5">
                        <Shimmer className="h-3 w-20 rounded-full opacity-40" />
                        <Shimmer className="h-2 w-14 rounded-full opacity-30" />
                    </div>
                    <Shimmer className="h-4 w-10 rounded-full opacity-30" />
                </div>
            ))}
        </div>
    </div>
);

// ─── Main export ──────────────────────────────────────────────────────────────
export const DesktopHeroBannerSkeleton = HeroSkeleton; // keep named export for skeletons.tsx

export const DesktopDashboardSkeleton = () => (
    <div className="w-full flex flex-col animate-in fade-in duration-500">
        {/* Hero */}
        <HeroSkeleton />

        {/* Body */}
        <div className="max-w-7xl mx-auto w-full px-6 py-6">
            <div className="grid lg:grid-cols-12 gap-6">

                {/* ── Left col (8/12) ── */}
                <div className="lg:col-span-8 space-y-5">
                    <GettingStartedSkeleton />
                    <NavIconsSkeleton />
                    <StatsGridSkeleton />
                    <ActionRowSkeleton />
                </div>

                {/* ── Right col (4/12) ── */}
                <div className="lg:col-span-4 space-y-5">
                    <StreakSkeleton />
                    <OracleSkeleton />
                    <RankingsSkeleton />
                </div>

            </div>
        </div>
    </div>
);
