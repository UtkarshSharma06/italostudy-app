const fs = require('fs');

const backupPath = 'd:\\italostudy\\italostudy-app\\src\\components\\PricingModal_backup_utf8.tsx';
const targetPath = 'd:\\italostudy\\italostudy-app\\src\\components\\PricingModal.tsx';

let content = fs.readFileSync(backupPath, 'utf8');

const desktopUI = `
                        {/* 
                          ----------------------------------------------------------------------
                          DESKTOP UI (COMPACT EXACT LAYOUT)
                          ----------------------------------------------------------------------
                        */}
                        <motion.div
                            key="pricing-modal-desktop"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="hidden md:flex flex-col w-[1100px] max-w-[95vw] h-[750px] max-h-[90vh] rounded-[2rem] bg-[#12121A] overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 font-sans"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button onClick={closePricingModal} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full z-50 transition-colors">
                                <X className="w-4 h-4 text-slate-400" />
                            </button>

                            <div className="flex flex-1 min-h-0">
                                {/* Left Side: Hero & Features */}
                                <div className="w-[380px] shrink-0 bg-[#171721] p-8 flex flex-col border-r border-white/5">
                                    <div className="flex items-center gap-3 mb-6">
                                        <img src="/logo-dark-full.webp" alt="Logo" className="h-5 w-auto" />
                                        <div className="h-4 w-[1px] bg-slate-700" />
                                        <span className="text-[9px] font-bold text-slate-400 tracking-[0.2em] uppercase">Upgrade Hub</span>
                                    </div>
                                    
                                    <h1 className="text-3xl font-black leading-[1.1] mb-3 text-white tracking-tight">
                                        Unlock your<br/>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">full potential</span> <Zap className="inline w-5 h-5 text-fuchsia-400 fill-fuchsia-400 mb-1"/>
                                    </h1>
                                    
                                    <p className="text-slate-400 text-xs leading-relaxed mb-6 font-medium pr-4">
                                        Go premium and access everything you need to ace every exam.
                                    </p>

                                    <div className="bg-[#1C1C28] border border-white/5 rounded-2xl p-3 flex items-center justify-between shadow-md mb-8">
                                        <div className="flex -space-x-2">
                                            <img src="https://i.pravatar.cc/100?img=1" className="w-6 h-6 rounded-full border-2 border-[#1C1C28]" />
                                            <img src="https://i.pravatar.cc/100?img=2" className="w-6 h-6 rounded-full border-2 border-[#1C1C28]" />
                                            <img src="https://i.pravatar.cc/100?img=3" className="w-6 h-6 rounded-full border-2 border-[#1C1C28]" />
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[11px] font-bold text-white">50,000+ students</span>
                                            <span className="text-[#888899] text-[8px] font-medium uppercase tracking-wider">Learning Better</span>
                                        </div>
                                    </div>

                                    {/* Features List (Acts as row headers for checkmarks) */}
                                    <div className="flex-1 flex flex-col min-h-0">
                                        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">What you'll get</h3>
                                        <div className="flex flex-col justify-between flex-1 pb-4">
                                            {[
                                                { title: "Daily Practice", sub: "Unlimited practice questions", icon: FileText, textClass: "text-amber-400", bgClass: "bg-amber-400/10" },
                                                { title: "Learning Modules", sub: "Structured video lessons", icon: PlaySquare, textClass: "text-rose-400", bgClass: "bg-rose-400/10" },
                                                { title: "Exam Analytics", sub: "Advanced performance insights", icon: BarChart2, textClass: "text-fuchsia-400", bgClass: "bg-fuchsia-400/10" },
                                                { title: "Mock Simulations", sub: "Full-length test experience", icon: Target, textClass: "text-blue-400", bgClass: "bg-blue-400/10" },
                                                { title: "Smart Analytics", sub: "AI-powered progress tracker", icon: TrendingUp, textClass: "text-emerald-400", bgClass: "bg-emerald-400/10" },
                                                { title: "Priority Support", sub: "Faster response & dedicated help", icon: MessageSquare, textClass: "text-indigo-400", bgClass: "bg-indigo-400/10" }
                                            ].map((f, i) => (
                                                <div key={i} className="flex gap-3 items-center flex-1 max-h-[44px]">
                                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", f.bgClass, f.textClass)}>
                                                        <f.icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex flex-col justify-center">
                                                        <span className="text-[12px] font-bold text-white leading-tight">{f.title}</span>
                                                        <span className="text-[#888899] text-[10px]">{f.sub}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Tabs & Pricing Cards */}
                                <div className="flex-1 flex flex-col p-8 bg-[#12121A] min-h-0">
                                    {/* Tabs */}
                                    <div className="flex gap-4 justify-center mb-8">
                                        {plans.map(p => (
                                            <button 
                                                key={p.id}
                                                onClick={() => { setSelectedPlan(p.id); if (p.cycles && p.cycles.length > 0) setSelectedCycleId(p.cycles[0].id); }}
                                                className={cn(
                                                    "flex flex-col items-center justify-center py-2.5 w-[200px] rounded-xl border transition-all relative overflow-hidden",
                                                    selectedPlan === p.id 
                                                        ? "bg-[#1C1C28]/80 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]" 
                                                        : "bg-[#1C1C28] border-white/5 hover:border-white/10"
                                                )}
                                            >
                                                {selectedPlan === p.id && <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />}
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    {p.id === 'global' ? <Globe className="w-4 h-4 text-slate-300" /> : <Gem className="w-4 h-4 text-fuchsia-400 fill-fuchsia-400/20" />}
                                                    <span className="text-white font-bold text-sm tracking-wide capitalize">{p.name}</span>
                                                </div>
                                                <span className="text-[#888899] text-[9px] font-medium tracking-widest uppercase">{p.badge || (p.id==='explorer'?'Most Popular':'All Access')}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Cards Grid */}
                                    <div className="flex gap-4 flex-1 min-h-0">
                                        {t?.cycles?.map((cycle) => {
                                            const isSelected = selectedCycleId === cycle.id;
                                            const isPopular = cycle.name.toLowerCase().includes('year') || cycle.name.toLowerCase().includes('12 month');
                                            const planPrice = cycle.price;
                                            const info = getRegionalPrice(planPrice, cycle.regionalPrices || t.regionalPrices);
                                            
                                            return (
                                                <div 
                                                    key={cycle.id}
                                                    onClick={() => setSelectedCycleId(cycle.id)}
                                                    className={cn(
                                                        "flex-1 rounded-2xl border flex flex-col cursor-pointer transition-all relative group overflow-hidden", 
                                                        isSelected 
                                                            ? "border-fuchsia-500 bg-gradient-to-b from-[#1C1C28] to-fuchsia-500/5 shadow-[0_0_30px_rgba(217,70,239,0.1)]" 
                                                            : "border-white/5 bg-[#171721] hover:border-white/10"
                                                    )}
                                                >
                                                    {isPopular && (
                                                        <div className="absolute top-0 inset-x-0 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest py-1 text-center shadow-lg">
                                                            Save 60%
                                                        </div>
                                                    )}
                                                    
                                                    {/* Card Header (Price) */}
                                                    <div className={cn("border-b border-white/5 flex flex-col justify-center items-center relative", isPopular ? "h-[140px] pt-4" : "h-[140px]")}>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">{t.name}</span>
                                                        <span className="text-[12px] text-[#888899] mb-2 font-bold">{cycle.name}</span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-3xl font-black tracking-tight text-white">
                                                                {config.mode === 'beta' ? 'FREE' : formatPrice(info.amount, info.currency)}
                                                            </span>
                                                        </div>
                                                        {config.mode !== 'beta' && (
                                                            <span className="text-[#888899] font-medium text-[10px] mt-1">
                                                                / {cycle.name.toLowerCase().includes('month') ? 'month' : cycle.name.toLowerCase().includes('year') ? 'year' : 'cycle'}
                                                            </span>
                                                        )}
                                                        {isPopular && config.mode !== 'beta' && (
                                                            <span className="text-[10px] text-[#888899] mt-2 font-medium tracking-wide">
                                                                <span className="line-through decoration-fuchsia-400/50 mr-1">{formatPrice(info.amount * 2.5, info.currency)}</span> 
                                                                <span className="text-emerald-400 font-bold">60% OFF</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Card Checkmarks (Aligned with left column) */}
                                                    <div className="flex-1 flex flex-col justify-between py-0 pb-4 px-4 mt-2 mb-2">
                                                        {/* We render exactly 6 checkmarks that will vertically align with the 6 feature rows on the left. */}
                                                        {[1,2,3,4,5,6].map((_, i) => (
                                                            <div key={i} className="flex items-center justify-center flex-1 max-h-[44px]">
                                                                <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                                                    <Check className="w-3.5 h-3.5 text-indigo-400" strokeWidth={3} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {isSelected && (
                                                        <div className="absolute bottom-4 inset-x-4">
                                                            <div className="bg-fuchsia-500 text-white text-[10px] font-bold py-1.5 rounded-full shadow-lg shadow-fuchsia-500/30 text-center uppercase tracking-wider">
                                                                Selected
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Footer / CTA inside Right Column */}
                                    <div className="mt-6 bg-[#171721] border border-white/5 rounded-2xl py-4 px-6 flex items-center justify-between shrink-0 shadow-lg">
                                        <div className="flex gap-6 items-center">
                                            <div className="flex gap-2 items-center">
                                                <Shield className="w-6 h-6 text-indigo-400 fill-indigo-400/10 stroke-1" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Secure</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <Disc className="w-6 h-6 text-amber-500 fill-amber-500/10 stroke-1" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Cancel Anytime</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <button 
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
                                                className="h-10 w-44 rounded-full bg-gradient-to-r from-indigo-500 to-rose-400 hover:from-indigo-400 hover:to-rose-300 text-white font-bold text-[12px] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                                            >
                                                {isUpdating === selectedPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                                                 (profile?.selected_plan === selectedPlan ? "Current Plan" : "Upgrade Now")}
                                                {profile?.selected_plan !== selectedPlan && isUpdating !== selectedPlan && <ArrowRight className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
`;

let importsStr = content.substring(0, content.indexOf('const FAQItem'));
if (!importsStr.includes('Shield')) {
    importsStr = importsStr.replace('Check, Zap', 'Check, Zap, Shield, Disc, Award, Lock, FileText, PlaySquare, BarChart2, Target, TrendingUp, MessageSquare, Gem, Globe, ArrowRight');
}
content = importsStr + content.substring(content.indexOf('const FAQItem'));

// Hide mobile wrapper on md
content = content.replace('key="pricing-modal-content"', 'key="pricing-modal-mobile"');
content = content.replace(
    /className="bg-slate-50 dark:bg-slate-900 w-full max-w-5xl h-\[95vh\] md:h-auto md:max-h-\[90vh\] rounded-t-\[2\.5rem\] md:rounded-\[2\.5rem\] overflow-hidden shadow-2xl shadow-indigo-900\/10 flex flex-col relative gpu-accelerated border-t md:border border-slate-200\/50 dark:border-white\/10"/g,
    'className="flex md:hidden bg-slate-50 dark:bg-slate-900 w-full h-[95vh] rounded-t-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-900/10 flex-col relative gpu-accelerated border-t border-slate-200/50 dark:border-white/10"'
);

// Precisely find insertion point using exact index math backwards from CheckoutModal
let checkoutIdx = content.indexOf('<CheckoutModal');
if (checkoutIdx !== -1) {
    let animatePresenceEnd = content.lastIndexOf('</AnimatePresence>', checkoutIdx);
    let closingParen = content.lastIndexOf(')}', animatePresenceEnd);
    let overlayMotionDivEnd = content.lastIndexOf('</motion.div>', closingParen);
    let mobileMotionDivEnd = content.lastIndexOf('</motion.div>', overlayMotionDivEnd - 1);

    let insertPoint = mobileMotionDivEnd + '</motion.div>'.length;
    
    let finalContent = content.substring(0, insertPoint) + '\n' + desktopUI + '\n' + content.substring(insertPoint);
    
    fs.writeFileSync(targetPath, finalContent, 'utf8');
    console.log('Successfully rebuilt PricingModal from pristine backup with strict bounds.');
} else {
    console.error('Could not find CheckoutModal');
}
