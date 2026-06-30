const fs = require('fs');

const backupPath = 'd:\\italostudy\\italostudy-app\\src\\components\\PricingModal_backup_utf8.tsx';
const targetPath = 'd:\\italostudy\\italostudy-app\\src\\components\\PricingModal.tsx';
let content = fs.readFileSync(backupPath, 'utf8');

const desktopUI = `
                        {/* 
                          ----------------------------------------------------------------------
                          DESKTOP UI (WHITE THEME V2 - 80% SCALE & 3-WAY TOGGLE)
                          ----------------------------------------------------------------------
                        */}
                        <motion.div
                            key="pricing-modal-desktop"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="hidden md:flex flex-col w-[900px] max-w-[95vw] h-[600px] max-h-[85vh] rounded-3xl bg-white dark:bg-slate-900 overflow-hidden relative shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] font-sans"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {(() => {
                                const explorerPlan = config?.plans?.find(p => p.id === 'explorer');
                                const globalPlan = config?.plans?.find(p => p.id === 'global');
                                
                                // Default to first global cycle if none selected, or if selected doesn't belong to global
                                let globalCycle = globalPlan?.cycles?.find((c: any) => c.id === selectedCycleId);
                                if (!globalCycle) globalCycle = globalPlan?.cycles?.[0];

                                const planPrice = globalCycle?.price || 0;
                                const regionalInfo = getRegionalPrice(planPrice, globalCycle?.regionalPrices || globalPlan?.regionalPrices);

                                const leftFeatures = [
                                    { title: "Unlimited Practice", sub: "Access unlimited practice questions", icon: FileText, color: "bg-indigo-600", iconColor: "text-white" },
                                    { title: "Premium Learning", sub: "Watch all concept videos", icon: PlaySquare, color: "bg-rose-500", iconColor: "text-white" },
                                    { title: "Advanced Analytics", sub: "Track performance in detail", icon: BarChart2, color: "bg-amber-500", iconColor: "text-white" },
                                    { title: "Mock Simulations", sub: "Full-length mocks with analysis", icon: Target, color: "bg-blue-500", iconColor: "text-white" },
                                    { title: "Priority Support", sub: "Get faster & dedicated support", icon: MessageSquare, color: "bg-emerald-500", iconColor: "text-white" }
                                ];

                                const isGlobalSelected = selectedPlan === 'global';

                                // Cycle Toggle Options
                                const globalCycles = globalPlan?.cycles || [];

                                return (
                                    <div className="flex flex-col w-full h-full relative">
                                        {/* Close Button */}
                                        <button onClick={closePricingModal} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full z-50 transition-colors">
                                            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                        </button>

                                        {/* Main Content (Split) */}
                                        <div className="flex flex-1 p-6 pb-4 min-h-0">
                                            
                                            {/* Left Column */}
                                            <div className="w-[340px] shrink-0 pr-6 flex flex-col border-r border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-2.5 mb-6 mt-1">
                                                    <img src="/logo-dark-full.webp" alt="Logo" className="h-5 w-auto hidden dark:block" />
                                                    <img src="/logo.webp" alt="Logo" className="h-5 w-auto block dark:hidden" />
                                                    <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700" />
                                                    <span className="text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase">Upgrade Hub</span>
                                                </div>

                                                <h1 className="text-2xl font-black leading-[1.2] mb-2 text-slate-900 dark:text-white tracking-tight">
                                                    Go Premium,<br/>
                                                    <span className="text-indigo-600 dark:text-indigo-400">Ace Every Exam</span> <Zap className="inline w-4 h-4 text-indigo-600 dark:text-indigo-400 fill-indigo-600 dark:fill-indigo-400 mb-1"/>
                                                </h1>
                                                <p className="text-slate-500 dark:text-slate-400 text-[13px] leading-relaxed mb-5 font-medium pr-2">
                                                    Unlock premium features and take your preparation to the next level.
                                                </p>

                                                <div className="flex-1 flex flex-col justify-center gap-4">
                                                    {leftFeatures.map((f, i) => (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", f.color)}>
                                                                <f.icon className={cn("w-3.5 h-3.5", f.iconColor)} />
                                                            </div>
                                                            <div className="flex flex-col flex-1">
                                                                <span className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight mb-0.5">{f.title}</span>
                                                                <span className="text-[11px] text-slate-500 dark:text-slate-400">{f.sub}</span>
                                                            </div>
                                                            <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                                                                <Check className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" strokeWidth={3} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-3 flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center shrink-0">
                                                        <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400 leading-tight">7-Day Money-Back Guarantee</span>
                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Cancel anytime. No questions asked.</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Column (Cards) */}
                                            <div className="flex-1 flex flex-col pl-6 min-h-0">
                                                
                                                {/* Top Toggle Area for Global Cycles */}
                                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 shrink-0">
                                                    {globalCycles.map((cycle: any) => {
                                                        const isCycleActive = isGlobalSelected && globalCycle?.id === cycle.id;
                                                        // Simplify names like "Monthly" or "Quarterly" from standard cycle names
                                                        let shortName = cycle.name.replace(' Plan', '');
                                                        
                                                        return (
                                                            <button 
                                                                key={cycle.id}
                                                                onClick={() => {
                                                                    setSelectedPlan('global');
                                                                    setSelectedCycleId(cycle.id);
                                                                }}
                                                                className={cn(
                                                                    "flex-1 py-2 px-3 rounded-lg flex flex-col items-center justify-center transition-all", 
                                                                    isCycleActive ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                                                )}
                                                            >
                                                                <span className="font-bold text-[13px]">{shortName}</span>
                                                                {cycle.name.toLowerCase().includes('year') || cycle.name.toLowerCase().includes('annual') ? (
                                                                    <span className="text-[9px] font-bold text-emerald-500 mt-0.5">Best Value</span>
                                                                ) : null}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Cards Area */}
                                                <div className="flex-1 flex gap-4 min-h-0">
                                                    {/* Free Card */}
                                                    <div className={cn("flex-1 rounded-2xl border-[1.5px] p-4 flex flex-col transition-all", 
                                                        !isGlobalSelected ? "border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5 shadow-sm" : "border-slate-100 dark:border-slate-800"
                                                    )}>
                                                        <div className="flex flex-col items-center text-center mb-4 pt-1">
                                                            <div className="w-10 h-10 bg-[#F0EEFF] dark:bg-indigo-500/20 rounded-full flex items-center justify-center mb-3">
                                                                <Gem className="w-5 h-5 text-[#5A32FA] dark:text-indigo-400" />
                                                            </div>
                                                            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-0.5">Explore Plan</h3>
                                                            <div className="text-3xl font-black text-slate-900 dark:text-white mb-0.5">₹0</div>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Forever Free</p>
                                                        </div>

                                                        <div className="flex-1 flex flex-col gap-2.5 justify-center px-2">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-3.5 h-3.5 rounded-full bg-[#5A32FA] flex items-center justify-center shrink-0"><Check className="w-2 h-2 text-white" strokeWidth={3}/></div>
                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Limited Daily Practice</span>
                                                            </div>
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0"><X className="w-2 h-2 text-slate-400" strokeWidth={3}/></div>
                                                                <span className="text-[11px] font-medium text-slate-400">Basic Learning Modules</span>
                                                            </div>
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0"><X className="w-2 h-2 text-slate-400" strokeWidth={3}/></div>
                                                                <span className="text-[11px] font-medium text-slate-400">Performance Insights</span>
                                                            </div>
                                                        </div>

                                                        <button 
                                                            onClick={() => setSelectedPlan('explorer')}
                                                            disabled={profile?.selected_plan === 'explorer' || isUpdating !== null}
                                                            className="h-10 mt-3 rounded-lg border-2 border-indigo-200 dark:border-indigo-500/30 text-[#5A32FA] dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors disabled:opacity-50 text-[12px]"
                                                        >
                                                            {profile?.selected_plan === 'explorer' ? 'Current Plan' : 'Select Free Plan'}
                                                        </button>
                                                    </div>

                                                    {/* Premium Card */}
                                                    <div className={cn("flex-1 rounded-2xl border-[1.5px] p-4 flex flex-col relative transition-all", 
                                                        isGlobalSelected ? "border-rose-100 dark:border-rose-500/20 bg-white dark:bg-slate-800 shadow-xl" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 opacity-90 scale-[0.98]"
                                                    )}>
                                                        <div className="absolute -top-2.5 right-4 bg-[#F94F3C] text-white text-[9px] font-black px-2 py-0.5 rounded-sm tracking-wider uppercase shadow-md">
                                                            Popular
                                                        </div>

                                                        <div className="flex flex-col items-center text-center mb-3 pt-1">
                                                            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center mb-3">
                                                                <Award className="w-5 h-5 text-[#F59E0B]" />
                                                            </div>
                                                            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-0.5">Global Plan</h3>
                                                            
                                                            <div className="flex items-baseline gap-1 mb-0.5">
                                                                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                                    {config.mode === 'beta' ? 'FREE' : formatPrice(regionalInfo.amount, regionalInfo.currency)}
                                                                </span>
                                                            </div>
                                                            <div className="h-[18px]">
                                                                {config.mode !== 'beta' && regionalInfo.amount > 0 && (
                                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold">
                                                                        <span className="text-emerald-500">Save 60%</span>
                                                                        <span className="text-slate-400 line-through">{formatPrice(regionalInfo.amount * 2.5, regionalInfo.currency)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 flex flex-col gap-2 justify-center pl-1">
                                                            {[
                                                                "Everything in Explore Plan",
                                                                "Unlimited Practice",
                                                                "All Learning Modules",
                                                                "Advanced Analytics",
                                                                "Mock Tests & Analysis",
                                                                "Priority Support"
                                                            ].map((text, i) => (
                                                                <div key={i} className="flex items-center gap-2.5">
                                                                    <div className="w-[14px] h-[14px] rounded-full bg-[#5A32FA] flex items-center justify-center shrink-0">
                                                                        <Check className="w-2 h-2 text-white" strokeWidth={3}/>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{text}</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <button 
                                                            onClick={() => {
                                                                if (config.mode === 'live' && planPrice > 0) {
                                                                    closePricingModal();
                                                                    openCheckout();
                                                                } else {
                                                                    handlePlanSelect('global');
                                                                }
                                                            }}
                                                            disabled={profile?.selected_plan === 'global' || isUpdating !== null}
                                                            className="h-10 mt-3 rounded-lg bg-gradient-to-r from-[#5A32FA] to-[#F94F3C] hover:opacity-90 text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 text-[12px]"
                                                        >
                                                            {isUpdating !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : (profile?.selected_plan === 'global' ? 'Current Plan' : 'Upgrade Now')}
                                                            {profile?.selected_plan !== 'global' && isUpdating === null && <ArrowRight className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>

                                        {/* Bottom Footer Trust Badges */}
                                        <div className="h-[55px] bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 px-6 flex items-center justify-between shrink-0">
                                            <div className="flex gap-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                                        <Shield className="w-3 h-3 text-[#5A32FA] dark:text-indigo-400" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-slate-900 dark:text-white leading-tight">Secure Payment</span>
                                                        <span className="text-[8px] text-slate-500 dark:text-slate-400">100% safe & encrypted</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                                        <Zap className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-slate-900 dark:text-white leading-tight">Instant Access</span>
                                                        <span className="text-[8px] text-slate-500 dark:text-slate-400">Get started immediately</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                        <Disc className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-slate-900 dark:text-white leading-tight">Cancel Anytime</span>
                                                        <span className="text-[8px] text-slate-500 dark:text-slate-400">No questions asked</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Payment Methods */}
                                            <div className="flex gap-4 items-center opacity-70">
                                                <span className="text-[10px] font-black italic text-slate-600 dark:text-slate-400 tracking-tighter">UPI</span>
                                                <span className="text-[10px] font-black text-blue-800 dark:text-blue-400">VISA</span>
                                                <div className="flex -space-x-1">
                                                    <div className="w-3 h-3 rounded-full bg-red-500 mix-blend-multiply dark:mix-blend-screen opacity-90" />
                                                    <div className="w-3 h-3 rounded-full bg-orange-500 mix-blend-multiply dark:mix-blend-screen opacity-90" />
                                                </div>
                                                <span className="text-[10px] font-black italic text-slate-600 dark:text-slate-400">RuPay</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
`;

let importsStr = content.substring(0, content.indexOf('const FAQItem'));
if (!importsStr.includes('FileText')) {
    importsStr = importsStr.replace('Check, Zap', 'Check, Zap, Target, Gem, Globe, Shield, Disc, Award, FileText, PlaySquare, BarChart2, MessageSquare, ArrowRight');
}
content = importsStr + content.substring(content.indexOf('const FAQItem'));

// Hide mobile wrapper on md
content = content.replace('key="pricing-modal-content"', 'key="pricing-modal-mobile"');
content = content.replace(
    /className="bg-slate-50 dark:bg-slate-900 w-full max-w-5xl h-\[95vh\] md:h-auto md:max-h-\[90vh\] rounded-t-\[2\.5rem\] md:rounded-\[2\.5rem\] overflow-hidden shadow-2xl shadow-indigo-900\/10 flex flex-col relative gpu-accelerated border-t md:border border-slate-200\/50 dark:border-white\/10"/g,
    'className="flex md:hidden bg-slate-50 dark:bg-slate-900 w-full h-[95vh] rounded-t-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-900/10 flex-col relative gpu-accelerated border-t border-slate-200/50 dark:border-white/10"'
);

let checkoutIdx = content.indexOf('<CheckoutModal');
if (checkoutIdx !== -1) {
    let animatePresenceEnd = content.lastIndexOf('</AnimatePresence>', checkoutIdx);
    let closingParen = content.lastIndexOf(')}', animatePresenceEnd);
    let overlayMotionDivEnd = content.lastIndexOf('</motion.div>', closingParen);
    let mobileMotionDivEnd = content.lastIndexOf('</motion.div>', overlayMotionDivEnd - 1);

    let startPoint = mobileMotionDivEnd + '</motion.div>'.length;
    let endPoint = overlayMotionDivEnd;

    let finalContent = content.substring(0, startPoint) + '\n' + desktopUI + '\n' + content.substring(endPoint);
    
    fs.writeFileSync(targetPath, finalContent, 'utf8');
    console.log('Successfully applied scaled down light theme with dynamic cycle toggles.');
} else {
    console.error('Could not find CheckoutModal');
}
