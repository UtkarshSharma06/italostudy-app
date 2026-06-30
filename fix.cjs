const fs = require('fs');

const backupPath = 'd:\\italostudy\\italostudy-app\\src\\components\\PricingModal_backup.tsx';
const targetPath = 'd:\\italostudy\\italostudy-app\\src\\components\\PricingModal.tsx';

let content = fs.readFileSync(backupPath, 'utf16le');
content = content.replace(/^\uFEFF/, '');

const desktopUI = `                        {/* 
                          ----------------------------------------------------------------------
                          DESKTOP UI (COMPACT FIXED LAYOUT)
                          ----------------------------------------------------------------------
                        */}
                        <motion.div
                            key="pricing-modal-desktop"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="hidden md:flex flex-col w-[1100px] max-w-[95vw] h-[85vh] max-h-[800px] rounded-[2rem] bg-[#121217] overflow-hidden relative shadow-2xl border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex-1 flex overflow-hidden">
                                {/* Left Panel */}
                                <div className="w-[380px] shrink-0 bg-[#1A1A24] p-10 flex flex-col justify-between overflow-y-auto custom-scrollbar border-r border-white/5">
                                    <div>
                                        <div className="flex items-center gap-3 mb-8">
                                            <img src="/logo-dark-full.webp" alt="Logo" className="h-6 w-auto" />
                                            <div className="h-4 w-[1px] bg-slate-700" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upgrade Hub</span>
                                        </div>
                                        <h1 className="text-4xl font-black text-white leading-[1.15] mb-4 tracking-tight">
                                            Unlock your<br/>
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">full potential ⚡</span>
                                        </h1>
                                        <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                            Go premium and access everything you need to ace every exam.
                                        </p>

                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between mt-8">
                                            <div className="flex -space-x-3">
                                                <div className="w-8 h-8 rounded-full border-2 border-[#1A1A24] bg-indigo-500 overflow-hidden"><img src="https://i.pravatar.cc/100?img=1" /></div>
                                                <div className="w-8 h-8 rounded-full border-2 border-[#1A1A24] bg-purple-500 overflow-hidden"><img src="https://i.pravatar.cc/100?img=2" /></div>
                                                <div className="w-8 h-8 rounded-full border-2 border-[#1A1A24] bg-pink-500 overflow-hidden"><img src="https://i.pravatar.cc/100?img=3" /></div>
                                                <div className="w-8 h-8 rounded-full border-2 border-[#1A1A24] bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">+</div>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-white text-sm font-bold">50,000+ students</span>
                                                <span className="text-slate-400 text-[10px]">are already learning better</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-10">
                                        <h3 className="text-white font-bold text-sm mb-5">What you'll get</h3>
                                        <div className="space-y-5">
                                            {[
                                                { title: "Daily Practice", sub: "Unlimited practice questions" },
                                                { title: "Learning Modules", sub: "Structured video lessons" },
                                                { title: "Exam Analytics", sub: "Advanced performance insights" },
                                                { title: "Mock Simulations", sub: "Full-length test experience" },
                                                { title: "Smart Analytics", sub: "AI-powered progress tracker" },
                                                { title: "Priority Support", sub: "Faster response & dedicated help" },
                                            ].map((feat, i) => (
                                                <div key={i} className="flex gap-4 items-center">
                                                    <div className="bg-indigo-500/20 text-indigo-400 rounded-xl p-2 shrink-0">
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex flex-col flex-1">
                                                        <span className="text-white text-sm font-bold">{feat.title}</span>
                                                        <span className="text-slate-400 text-xs">{feat.sub}</span>
                                                    </div>
                                                    <Check className="text-indigo-400 w-4 h-4 shrink-0" strokeWidth={3} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Panel */}
                                <div className="flex-1 flex flex-col bg-[#121217] relative">
                                    <button onClick={closePricingModal} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-50 group">
                                        <X className="text-slate-400 group-hover:text-white w-5 h-5" />
                                    </button>

                                    <div className="flex-1 flex flex-col p-10 overflow-hidden">
                                        {/* Plan Tabs */}
                                        <div className="flex gap-4 mb-8">
                                            {plans.map(p => (
                                                <button 
                                                    key={p.id}
                                                    onClick={() => { setSelectedPlan(p.id); if (p.cycles && p.cycles.length > 0) setSelectedCycleId(p.cycles[0].id); }}
                                                    className={["flex flex-col items-center justify-center p-4 rounded-2xl border-2 w-48 transition-all", selectedPlan === p.id ? "bg-white/5 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]" : "bg-transparent border-white/5 hover:border-white/20 hover:bg-white/5"].join(' ')}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {p.id === 'global' ? <Zap className="w-4 h-4 text-fuchsia-400 fill-fuchsia-400" /> : <Sparkles className="w-4 h-4 text-indigo-400 fill-indigo-400" />}
                                                        <span className="text-white font-bold text-sm tracking-wide capitalize">{p.name}</span>
                                                    </div>
                                                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">{p.badge || (p.id==='explorer'?'Most Popular':'All Access')}</span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Table Body */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-10">
                                            {isLoading || isRendering ? (
                                                <PricingSkeleton />
                                            ) : (
                                                <div className="flex gap-4 min-w-max">
                                                    {/* Row Headers */}
                                                    <div className="w-[200px] shrink-0 pt-6">
                                                        <h4 className="text-fuchsia-400 font-bold text-sm mb-1 tracking-wide">Choose your plan</h4>
                                                        <p className="text-slate-400 text-[10px] mb-8 leading-relaxed uppercase font-bold tracking-widest">All plans include<br/>7-day money-back guarantee.</p>

                                                        <div className="space-y-4">
                                                            {comparison.map((feat, i) => (
                                                                <div key={i} className="flex gap-3 items-center h-[52px]">
                                                                    <div className="bg-white/5 rounded-lg p-1.5 shrink-0 text-slate-300 border border-white/5">
                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="text-slate-300 text-[11px] font-bold leading-tight">{feat.name}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Cycle Columns */}
                                                    {t?.cycles?.map((cycle, idx) => {
                                                        const isSelected = selectedCycleId === cycle.id;
                                                        const isPopular = idx === 1; // Assuming second cycle is yearly/popular
                                                        const planPrice = cycle.price;
                                                        const info = getRegionalPrice(planPrice, cycle.regionalPrices || t.regionalPrices);
                                                        
                                                        return (
                                                            <div 
                                                                key={cycle.id}
                                                                onClick={() => setSelectedCycleId(cycle.id)}
                                                                className={["w-[240px] shrink-0 rounded-[2rem] border-2 p-6 flex flex-col cursor-pointer transition-all relative group", isSelected ? "border-fuchsia-500 bg-fuchsia-500/5 shadow-[0_0_30px_rgba(217,70,239,0.15)]" : "border-white/5 hover:border-white/20 bg-white/[0.02]"].join(' ')}
                                                            >
                                                                {isPopular && (
                                                                    <div className="absolute -top-3 right-6 bg-green-500 text-slate-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-green-500/20 z-10">
                                                                        Save 60%
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Column Header */}
                                                                <div className="mb-6 h-[88px] flex flex-col justify-end border-b border-white/5 pb-5">
                                                                    <span className="text-white font-black uppercase tracking-widest text-xs mb-1">{t.name}</span>
                                                                    <span className="text-slate-400 text-xs mb-2 font-bold">{cycle.name}</span>
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className="text-white text-3xl font-black tracking-tighter">
                                                                            {config.mode === 'beta' ? 'FREE' : formatPrice(info.amount, info.currency)}
                                                                        </span>
                                                                        {config.mode !== 'beta' && (
                                                                            <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                                                                                / {cycle.name.toLowerCase().includes('month') ? 'mo' : cycle.name.toLowerCase().includes('year') ? 'yr' : 'cycle'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Column Rows (Features) */}
                                                                <div className="space-y-4 flex-1">
                                                                    {comparison.map((feat, i) => {
                                                                        const hasFeature = feat[t.id];
                                                                        return (
                                                                            <div key={i} className="h-[52px] flex items-center justify-center">
                                                                                {hasFeature ? (
                                                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                                                                        <Check className="w-5 h-5 text-indigo-400" strokeWidth={3} />
                                                                                    </div>
                                                                                ) : (
                                                                                    <Minus className="w-5 h-5 text-slate-700" />
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* Cycle Selector Indicator */}
                                                                <div className={[
                                                                    "mt-6 text-[10px] font-black text-center py-2.5 rounded-xl uppercase tracking-widest transition-all",
                                                                    isSelected ? "bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30" : "bg-white/5 text-slate-400 group-hover:bg-white/10"
                                                                ].join(' ')}>
                                                                    {isSelected ? 'Selected' : 'Select'}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="h-[100px] bg-[#16161E] flex items-center justify-between px-10 shrink-0 border-t border-white/5 relative z-20">
                                <div className="flex items-center gap-8">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="w-6 h-6 text-indigo-400" />
                                        <div className="flex flex-col">
                                            <span className="text-white text-sm font-bold">Secure Payment</span>
                                            <span className="text-slate-400 text-[10px]">100% safe & encrypted</span>
                                        </div>
                                    </div>
                                    <div className="w-[1px] h-8 bg-white/10" />
                                    <div className="flex items-center gap-3">
                                        <RefreshCcw className="w-6 h-6 text-amber-400" />
                                        <div className="flex flex-col">
                                            <span className="text-white text-sm font-bold">Cancel Anytime</span>
                                            <span className="text-slate-400 text-[10px]">No questions asked</span>
                                        </div>
                                    </div>
                                    <div className="w-[1px] h-8 bg-white/10" />
                                    <div className="flex items-center gap-3">
                                        <BadgeCheck className="w-6 h-6 text-emerald-400" />
                                        <div className="flex flex-col">
                                            <span className="text-white text-sm font-bold">7-Day Guarantee</span>
                                            <span className="text-slate-400 text-[10px]">Full refund if not satisfied</span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => {
                                        const planPrice = currentCycle?.price || 0;
                                        if (config.mode === 'live' && planPrice > 0) {
                                            closePricingModal();
                                            openCheckout();
                                        } else {
                                            handlePlanSelect(selectedPlan);
                                        }
                                    }}
                                    disabled={isUpdating !== null || (profile?.selected_plan === selectedPlan)}
                                    className="h-14 px-10 rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 text-white font-black uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(217,70,239,0.3)] transition-all active:scale-95 group relative overflow-hidden disabled:opacity-50 disabled:shadow-none"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                    <div className="flex items-center gap-2 relative z-10">
                                        {isUpdating === selectedPlan ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                                         (profile?.selected_plan === selectedPlan ? "Current Plan" : "Upgrade Now")}
                                        {profile?.selected_plan !== selectedPlan && isUpdating !== selectedPlan && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                                    </div>
                                </Button>
                            </div>
                        </motion.div>`;

let importsStr = content.substring(0, content.indexOf('const FAQItem'));
if (!importsStr.includes('CheckCircle2')) {
    importsStr = importsStr.replace('Check, Zap', 'Check, Zap, CheckCircle2, Minus, ShieldCheck, RefreshCcw, CircleCheck');
}
content = importsStr + content.substring(content.indexOf('const FAQItem'));

content = content.replace(
    /className="bg-slate-50 dark:bg-slate-900 w-full max-w-5xl h-\[95vh\] md:h-auto md:max-h-\[90vh\] rounded-t-\[2\.5rem\] md:rounded-\[2\.5rem\] overflow-hidden shadow-2xl shadow-indigo-900\/10 flex flex-col relative gpu-accelerated border-t md:border border-slate-200\/50 dark:border-white\/10"/g,
    'className="flex md:hidden bg-slate-50 dark:bg-slate-900 w-full h-[95vh] rounded-t-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-900/10 flex-col relative gpu-accelerated border-t border-slate-200/50 dark:border-white/10"'
);

const searchStr1 = '<motion.div\r\n                            key="pricing-modal-content"';
const searchStr2 = '<motion.div\n                            key="pricing-modal-content"';

if (content.includes(searchStr1)) {
    content = content.replace(searchStr1, desktopUI + '\n                        <motion.div\r\n                            key="pricing-modal-mobile"');
} else if (content.includes(searchStr2)) {
    content = content.replace(searchStr2, desktopUI + '\n                        <motion.div\n                            key="pricing-modal-mobile"');
} else {
    content = content.replace('<motion.div\n                            key="pricing-modal-content"', desktopUI + '\n                        <motion.div\n                            key="pricing-modal-mobile"');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Fixed file.');
