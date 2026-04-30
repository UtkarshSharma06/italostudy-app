import { useCurrency, SUPPORTED_CURRENCIES } from '@/hooks/useCurrency';
import { Globe, ChevronDown, Check } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

export default function CurrencySelector({ className }: { className?: string }) {
    const { currency, setManualCurrency } = useCurrency();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={cn(
                    "flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-full hover:bg-white dark:hover:bg-slate-900 transition-all group shadow-sm",
                    className
                )}>
                    <Globe size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{currency.code}</span>
                    <ChevronDown size={10} className="text-slate-300" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl border-slate-100 dark:border-slate-800 shadow-2xl">
                <div className="px-2 py-1.5 mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Select Region</p>
                </div>
                {SUPPORTED_CURRENCIES.map((c) => (
                    <DropdownMenuItem
                        key={c.code}
                        onClick={() => setManualCurrency(c.code)}
                        className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors",
                            currency.code === c.code
                                ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                        )}
                    >
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tight">{c.name}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{c.code} ({c.symbol})</span>
                        </div>
                        {currency.code === c.code && <Check size={14} className="text-indigo-600" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
