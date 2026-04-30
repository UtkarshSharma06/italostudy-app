import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="w-[140px] h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        )
    }

    const themes = [
        { name: 'light', icon: Sun, label: 'Light' },
        { name: 'dark', icon: Moon, label: 'Dark' },
        { name: 'system', icon: Monitor, label: 'Auto' },
    ]

    return (
        <div className="relative inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-border dark:border-slate-700 shadow-sm">
            {/* Sliding background indicator */}
            <div
                className={cn(
                    "absolute h-10 rounded-xl bg-white dark:bg-card dark:bg-slate-700 shadow-md transition-all duration-300 ease-out",
                    theme === 'light' && "left-1 w-[44px]",
                    theme === 'dark' && "left-[49px] w-[44px]",
                    theme === 'system' && "left-[97px] w-[44px]"
                )}
            />

            {/* Theme buttons */}
            {themes.map(({ name, icon: Icon, label }) => (
                <button
                    key={name}
                    onClick={() => setTheme(name)}
                    className={cn(
                        "relative z-10 flex items-center justify-center w-11 h-10 rounded-xl transition-all duration-200",
                        theme === name
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300"
                    )}
                    aria-label={`Switch to ${label} theme`}
                    title={label}
                >
                    <Icon className={cn(
                        "w-5 h-5 transition-all duration-200",
                        theme === name && "scale-110"
                    )} />
                </button>
            ))}
        </div>
    )
}

// Alternative: Dropdown style theme toggle
export function ThemeToggleDropdown() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
    }

    const themes = [
        { name: 'light', icon: Sun, label: 'Light Mode' },
        { name: 'dark', icon: Moon, label: 'Dark Mode' },
        { name: 'system', icon: Monitor, label: 'System' },
    ]

    const currentTheme = themes.find(t => t.name === theme) || themes[2]
    const Icon = currentTheme.icon

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-border dark:border-slate-700 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                aria-label="Toggle theme"
            >
                <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400 dark:text-slate-300" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown menu */}
                    <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-card dark:bg-slate-800 border border-slate-200 dark:border-border dark:border-slate-700 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {themes.map(({ name, icon: ThemeIcon, label }) => (
                            <button
                                key={name}
                                onClick={() => {
                                    setTheme(name)
                                    setIsOpen(false)
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                                    theme === name
                                        ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-muted dark:hover:bg-slate-700/50"
                                )}
                            >
                                <ThemeIcon className="w-4 h-4" />
                                <span>{label}</span>
                                {theme === name && (
                                    <div className="ml-auto w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
