const fs = require('fs');

const backupPath = 'd:\\italostudy\\italostudy-app\\src\\components\\PricingModal_backup_utf8.tsx';
const targetPath = 'd:\\italostudy\\italostudy-app\\src\\components\\PricingModal.tsx';

let content = fs.readFileSync(backupPath, 'utf8');

const desktopUI = `
                        {/* 
                          ----------------------------------------------------------------------
                          DESKTOP UI (PW EXACT LAYOUT)
                          ----------------------------------------------------------------------
                        */}
                        <motion.div
                            key="pricing-modal-desktop"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="hidden md:flex flex-col w-[850px] max-w-[95vw] h-[650px] max-h-[90vh] rounded-2xl bg-[#1B1B1E] overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.6)] border border-[#2D2D35] font-sans"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {(() => {
                                const explorerPlan = config?.plans?.find(p => p.id === 'explorer');
                                const globalPlan = config?.plans?.find(p => p.id === 'global');
                                const globalMonthlyCycle = globalPlan?.cycles?.find(c => c.name.toLowerCase().includes('month'));
                                const globalQuarterlyCycle = globalPlan?.cycles?.find(c => c.name.toLowerCase().includes('quarter') || c.name.toLowerCase().includes('3 month')) || globalPlan?.cycles?.[1] || globalMonthlyCycle;
                                
                                const options = [
                                    { id: 'explorer', name: 'Explorer', planId: 'explorer', cycleId: explorerPlan?.cycles?.[0]?.id, color: 'border-blue-500', bgChecked: 'bg-[#3B82F6]', textChecked: 'text-[#3B82F6]', icon: <div className="w-3 h-3 bg-[#3B82F6] rounded-sm rotate-45" /> },
                                    { id: 'monthly', name: 'Global Monthly', planId: 'global', cycleId: globalMonthlyCycle?.id, color: 'border-emerald-500', bgChecked: 'bg-[#10B981]', textChecked: 'text-[#10B981]', icon: <div className="w-4 h-2.5 border-2 border-[#10B981] rounded-full flex items-center justify-center"><div className="w-1 h-1 bg-[#10B981] rounded-full" /></div> },
                                    { id: 'quarterly', name: 'Global Quarterly', planId: 'global', cycleId: globalQuarterlyCycle?.id, color: 'border-amber-500', bgChecked: 'bg-[#F59E0B]', textChecked: 'text-[#F59E0B]', icon: <Target className="w-4 h-4 text-[#F59E0B]" /> }
                                ];

                                const currentOptionId = selectedPlan === 'explorer' ? 'explorer' : (selectedCycleId === globalQuarterlyCycle?.id ? 'quarterly' : 'monthly');
                                const currentOption = options.find(o => o.id === currentOptionId) || options[0];

                                const features = [
                                    { name: "Daily Practice with Video Solutions", explorer: true, monthly: true, quarterly: true },
                                    { name: "Structured Learning Modules", explorer: true, monthly: true, quarterly: true },
                                    { name: "Live Doubt Support", explorer: false, monthly: true, quarterly: true },
                                    { name: "Advanced Exam Analytics", explorer: false, monthly: true, quarterly: true },
                                    { name: "Full-length Mock Simulations", explorer: false, monthly: true, quarterly: true },
                                    { name: "Priority Mentor Access", explorer: false, monthly: true, quarterly: true },
                                ];

                                // Find price for footer
                                const footerPlan = config?.plans?.find(p => p.id === currentOption.planId);
                                const footerCycle = footerPlan?.cycles?.find((c: any) => c.id === currentOption.cycleId) || footerPlan?.cycles?.[0];
                                const planPrice = footerCycle?.price || 0;
                                const regionalInfo = getRegionalPrice(planPrice, footerCycle?.regionalPrices || footerPlan?.regionalPrices);

                                return (
                                    <div className="flex flex-col w-full h-full">
                                        {/* Header */}
                                        <div className="flex items-center justify-between p-5 border-b border-[#2D2D35] bg-[#1B1B1E] shrink-0">
                                            <span className="text-xl font-bold text-white tracking-tight">Upgrade Hub</span>
                                            <button onClick={closePricingModal} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full z-50 transition-colors">
                                                <X className="w-5 h-5 text-slate-400" />
                                            </button>
                                        </div>

                                        {/* Main Content Area */}
                                        <div className="flex flex-col flex-1 min-h-0 bg-[#161618]">
                                            
                                            {/* Tabs Container */}
                                            <div className="flex justify-center gap-4 px-6 pt-6 pb-2 shrink-0">
                                                {options.map(opt => {
                                                    const isChecked = currentOptionId === opt.id;
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => {
                                                                setSelectedPlan(opt.planId);
                                                                if (opt.cycleId) setSelectedCycleId(opt.cycleId);
                                                            }}
                                                            className={cn(
                                                                "flex-1 max-w-[200px] h-14 rounded-xl border-t-[3px] border-x border-b border-x-[#2D2D35] border-b-[#2D2D35] relative flex items-center justify-center transition-all bg-[#1B1B1E]",
                                                                isChecked ? \`\${opt.color} bg-white/[0.03]\` : "border-t-[#2D2D35] hover:bg-white/5"
                                                            )}
                                                        >
                                                            <span className={cn("text-[15px] font-medium transition-colors", isChecked ? "text-white" : "text-slate-400")}>{opt.name}</span>
                                                            
                                                            {/* Radio Bubble */}
                                                            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2">
                                                                <div className={cn("w-5 h-5 rounded-full border-4 border-[#161618] flex items-center justify-center bg-[#2D2D35]")}>
                                                                    {isChecked && <div className={cn("w-2 h-2 rounded-full", opt.bgChecked)} />}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Table Container */}
                                            <div className="flex-1 min-h-0 overflow-y-auto mt-6 custom-scrollbar px-6 pb-6">
                                                <div className="flex flex-col w-full min-w-[700px]">
                                                    {/* Table Header Row */}
                                                    <div className="flex items-end mb-4 border-b border-[#2D2D35] pb-3 sticky top-0 bg-[#161618] z-10">
                                                        <div className="flex-1 pr-4">
                                                            <span className="text-white font-bold text-[15px]">What you get</span>
                                                        </div>
                                                        <div className="flex w-[300px] shrink-0 border-l border-[#2D2D35]">
                                                            {options.map(opt => (
                                                                <div key={opt.id} className="flex-1 flex flex-col items-center justify-center gap-2">
                                                                    {opt.icon}
                                                                    <span className={cn("text-[11px] font-medium", opt.textChecked)}>{opt.name.replace('Global ', '')}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Table Rows */}
                                                    <div className="flex flex-col space-y-0">
                                                        {features.map((feature, idx) => (
                                                            <div key={idx} className="flex items-center min-h-[52px] border-b border-[#2D2D35]/50 hover:bg-[#1B1B1E] transition-colors">
                                                                <div className="flex-1 pr-4 py-2">
                                                                    <span className="text-[13px] text-slate-300 font-medium">{feature.name}</span>
                                                                </div>
                                                                <div className="flex w-[300px] shrink-0 border-l border-[#2D2D35]">
                                                                    {[feature.explorer, feature.monthly, feature.quarterly].map((hasFeature, colIdx) => {
                                                                        const opt = options[colIdx];
                                                                        const isHighlighted = currentOptionId === opt.id;
                                                                        return (
                                                                            <div key={colIdx} className={cn("flex-1 flex items-center justify-center", isHighlighted ? "bg-white/[0.02]" : "")}>
                                                                                {hasFeature ? (
                                                                                    <Check className="w-4 h-4 text-[#10B981]" strokeWidth={3} />
                                                                                ) : (
                                                                                    <X className="w-4 h-4 text-[#EF4444]" strokeWidth={3} />
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                        </div>

                                        {/* Footer */}
                                        <div className="h-[84px] bg-[#161618] border-t border-[#2D2D35] px-6 flex items-center justify-between shrink-0">
                                            <div className="flex flex-col">
                                                <span className="text-slate-400 text-xs mb-1 font-medium">{currentOption.name} Plan</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl font-bold text-white tracking-tight">
                                                        {config.mode === 'beta' ? 'FREE' : formatPrice(regionalInfo.amount, regionalInfo.currency)}
                                                    </span>
                                                    {config.mode !== 'beta' && regionalInfo.amount > 0 && (
                                                        <>
                                                            <span className="text-slate-500 text-sm line-through">
                                                                {formatPrice(regionalInfo.amount * 1.5, regionalInfo.currency)}
                                                            </span>
                                                            <span className="bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold px-2 py-0.5 rounded-sm">
                                                                33% OFF
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    if (config.mode === 'live' && planPrice > 0) {
                                                        closePricingModal();
                                                        openCheckout();
                                                    } else {
                                                        handlePlanSelect(selectedPlan);
                                                    }
                                                }}
                                                disabled={isUpdating !== null || (profile?.selected_plan === currentOption.planId && profile?.subscription_cycle === currentOption.cycleId)}
                                                className="h-11 px-12 rounded-lg bg-[#EAB308] hover:bg-[#FACC15] text-yellow-950 font-bold text-[15px] shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {isUpdating !== null ? <Loader2 className="w-5 h-5 animate-spin" /> : "Buy Now"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
`;

let importsStr = content.substring(0, content.indexOf('const FAQItem'));
if (!importsStr.includes('Target')) {
    importsStr = importsStr.replace('Check, Zap', 'Check, Zap, Target, Gem, Globe, Shield, Disc, Award');
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
    console.log('Successfully built PW exact layout PricingModal.');
} else {
    console.error('Could not find CheckoutModal');
}
