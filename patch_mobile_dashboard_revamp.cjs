const fs = require('fs');
const targetPath = 'd:/italostudy/italostudy-app/src/mobile/pages/MobileDashboard.tsx';
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Hero Header
content = content.replace(
    `className="relative w-full bg-[#FBFCFF] dark:bg-background px-6 pt-10 pb-4 overflow-hidden transition-colors duration-500"`,
    `className="relative w-full bg-slate-950 px-6 pt-12 pb-8 overflow-hidden rounded-b-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-10"`
);

// Greeting text
content = content.replace(
    `className="text-slate-400 dark:text-slate-500 text-base font-medium">{getGreeting()},</p>`,
    `className="text-slate-400 text-sm font-black uppercase tracking-[0.2em]">{getGreeting()},</p>`
);

content = content.replace(
    `className="text-5xl font-extrabold text-[#1A1F36] dark:text-white flex items-center gap-2 tracking-tight"`,
    `className="text-5xl font-black text-white flex items-center gap-2 tracking-tighter leading-none mt-1"`
);

// 2. Main Background
// Find the outer flex flex-col container
// It is: <div className="flex flex-col min-h-full bg-background animate-in fade-in duration-700 overflow-y-auto">
content = content.replace(
    `className="flex flex-col min-h-full bg-background animate-in fade-in duration-700 overflow-y-auto"`,
    `className="flex flex-col min-h-full bg-slate-900 animate-in fade-in duration-700 overflow-y-auto"`
);

// 3. Quick Grid Tools
// The background of the HubItem
content = content.replace(
    /className="p-3 bg-card\/50 rounded-\[1\.5rem\] border border-border\/10 active:bg-secondary\/20 transition-all flex items-center gap-2 group min-w-0"/g,
    `className="p-4 bg-slate-800/50 backdrop-blur-xl rounded-[1.5rem] border border-white/10 active:scale-95 shadow-lg shadow-black/20 transition-all flex items-center gap-3 group min-w-0"`
);
// Make the text in HubItem white
content = content.replace(
    /className="text-\[10px\] font-black uppercase tracking-tight truncate text-foreground leading-tight">\{label\}<\/p>/g,
    `className="text-[11px] font-black uppercase tracking-tight truncate text-white leading-tight">{label}</p>`
);
content = content.replace(
    /className="text-\[7px\] font-black text-muted-foreground uppercase tracking-widest mt-0\.5 truncate opacity-60 leading-tight">\{sub\}<\/p>/g,
    `className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5 truncate leading-tight">{sub}</p>`
);

// 4. Recommended For You (Ad Card) - the wrapper we just added is <section className="mt-6 px-4">
// Let's modify the section to feel overlapping
content = content.replace(
    `<section className="mt-6 px-4">
                <DynamicStoreAd placementId="dashboard-bottom" />
            </section>`,
    `<section className="mt-8 px-2 relative z-20">
                <DynamicStoreAd placementId="dashboard-bottom" />
            </section>`
);

// 5. WhatsApp Banner
// Original: className="group relative flex items-center justify-between p-5 rounded-3xl bg-[#25D366] text-white cursor-pointer shadow-xl shadow-emerald-900/10 active:scale-[0.98] transition-all border border-white/10 overflow-hidden"
content = content.replace(
    `shadow-xl shadow-emerald-900/10 active:scale-[0.98] transition-all border border-white/10`,
    `shadow-[0_20px_40px_rgba(37,211,102,0.2)] active:scale-95 transition-all border border-white/20 backdrop-blur-md`
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('MobileDashboard.tsx revamped successfully');
