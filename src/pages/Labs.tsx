import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Microscope,
    FlaskConical,
    Zap,
    Info,
    Maximize2,
    RotateCcw,
    Calculator,
    Brain,
    ChevronRight,
    Atom,
    Dna,
    Activity,
    Compass,
    Box,
    Loader2,
    X,
    AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html } from '@react-three/drei';
import DOMPurify from 'dompurify';

// Modular Imports
import { ModelCanvas } from '@/components/labs/ModelCanvas';
// Modular Imports (Lazy Loaded)
const DNAHelix = React.lazy(() => import('@/components/labs/subjects/biology/DNAHelix').then(module => ({ default: module.DNAHelix })));
const CellStructure = React.lazy(() => import('@/components/labs/subjects/biology/CellStructure').then(module => ({ default: module.CellStructure })));
const SkeletalSystem = React.lazy(() => import('@/components/labs/subjects/biology/SkeletalSystem').then(module => ({ default: module.SkeletalSystem })));
const NervousSystem = React.lazy(() => import('@/components/labs/subjects/biology/NervousSystem').then(module => ({ default: module.NervousSystem })));
const MuscularSystem = React.lazy(() => import('@/components/labs/subjects/biology/MuscularSystem').then(module => ({ default: module.MuscularSystem })));
const BohrAtom = React.lazy(() => import('@/components/labs/subjects/chemistry/BohrAtom').then(module => ({ default: module.BohrAtom })));
const ForceVisualizer = React.lazy(() => import('@/components/labs/subjects/physics/ForceVisualizer').then(module => ({ default: module.ForceVisualizer })));
const TrigCircle = React.lazy(() => import('@/components/labs/subjects/math/TrigCircle').then(module => ({ default: module.TrigCircle })));

const componentMap: Record<string, React.ReactNode> = {
    'DNAHelix': <DNAHelix />,
    'CellStructure': <CellStructure />,
    'SkeletalSystem': <SkeletalSystem />,
    'NervousSystem': <NervousSystem />,
    'MuscularSystem': <MuscularSystem />,
    'BohrAtom': <BohrAtom />,
    'ForceVisualizer': <ForceVisualizer />,
    'TrigCircle': <TrigCircle />
};

type Subject = 'biology' | 'chemistry' | 'physics' | 'math' | 'reasoning';

interface LabModel {
    id: string;
    name: string;
    icon: any;
    component: React.ReactNode;
    description: string;
    concepts: string[];
}

export default function Labs() {
    const { toast } = useToast();
    const [activeSubject, setActiveSubject] = useState<Subject>('biology');
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
    const [dbModels, setDbModels] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);

    const normalizeSubject = (subject: string): string => {
        const lower = (subject || '').toLowerCase();
        if (lower.includes('math')) return 'math';
        if (lower.includes('physic')) return 'physics';
        if (lower.includes('chem')) return 'chemistry';
        if (lower.includes('bio')) return 'biology';
        if (lower.includes('logic') || lower.includes('reason')) return 'reasoning';
        return lower;
    };

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('lab_models')
                .select('*');

            if (error) throw error;
            setDbModels(data || []);

            if (data && data.length > 0) {
                // Ensure we scan for subject in lowercase to match activeSubject logic
                const firstForSub = data.find((m: any) => normalizeSubject(m.subject) === activeSubject);
                if (firstForSub) setSelectedModelId(firstForSub.id);
            }
        } catch (error: any) {
            console.error('Fetch error:', error);
            // Fallback to static if table missing
            setDbModels([]);
            toast({
                title: "Error loading labs",
                description: "Could not fetch interactive lab models. Please try again later.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const modelsBySubject = useMemo(() => {
        const grouped: Record<string, Record<string, any[]>> = {};
        dbModels.forEach(m => {
            const subjectKey = normalizeSubject(m.subject);
            const topicKey = m.topic_title || 'General';

            if (!grouped[subjectKey]) grouped[subjectKey] = {};
            if (!grouped[subjectKey][topicKey]) grouped[subjectKey][topicKey] = [];

            grouped[subjectKey][topicKey].push(m);
        });
        return grouped;
    }, [dbModels]);

    const currentSubjectTopics = modelsBySubject[activeSubject] || {};
    // Flatten for initial selection logic if needed, but we mostly navigate by ID
    const currentModelsFlat = Object.values(currentSubjectTopics).flat();
    const currentModel = currentModelsFlat.find(m => m.id === selectedModelId) || currentModelsFlat[0];

    const subjects = [
        { id: 'biology', name: 'Biology', icon: Microscope, color: 'indigo' },
        { id: 'chemistry', name: 'Chemistry', icon: FlaskConical, color: 'rose' },
        { id: 'physics', name: 'Physics', icon: Zap, color: 'amber' },
        { id: 'math', name: 'Mathematics', icon: Calculator, color: 'emerald' },
        { id: 'reasoning', name: 'Reasoning', icon: Brain, color: 'indigo' }
    ];

    return (
        <Layout>
            <div className="h-[calc(100vh-72px)] lg:h-[calc(100vh-72px)] bg-[#020617] p-4 lg:p-10 flex flex-col lg:flex-row gap-6 lg:gap-8 animate-in fade-in duration-1000 overflow-hidden relative">
                {/* Mobile Toggle Buttons */}
                <div className="lg:hidden absolute top-6 right-6 z-50 flex flex-col gap-3">
                    <button
                        onClick={() => setIsLibraryOpen(true)}
                        className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 active:scale-90 transition-transform"
                    >
                        <Box className="w-6 h-6" />
                    </button>
                    {currentModel && (
                        <button
                            onClick={() => setIsInfoOpen(!isInfoOpen)}
                            className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all",
                                isInfoOpen ? "bg-white text-slate-900" : "bg-white/5 text-white border border-white/10"
                            )}
                        >
                            <Info className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {/* Sidebar */}
                <motion.div
                    initial={false}
                    animate={{
                        x: typeof window !== 'undefined' && window.innerWidth < 1024
                            ? (isLibraryOpen ? 0 : -400)
                            : 0
                    }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className={cn(
                        "lg:w-96 flex flex-col gap-8 h-full bg-[#020617] lg:bg-transparent z-[60] lg:z-0 shrink-0 custom-scrollbar",
                        "fixed lg:relative inset-0 lg:inset-auto p-8 lg:p-0 overflow-y-auto"
                    )}
                >
                    <div className="flex items-center justify-between lg:block space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Virtual <span className="text-indigo-500">Labs.</span></h1>
                            <motion.div
                                animate={{ opacity: [1, 0.4, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                            >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Under Development
                            </motion.div>
                        </div>
                        <button
                            onClick={() => setIsLibraryOpen(false)}
                            className="lg:hidden p-2 rounded-xl bg-white/5 text-slate-400"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <div className="flex flex-col gap-2">
                        <p className="text-slate-400 font-bold text-sm leading-relaxed hidden lg:block">Interactive 3D simulators mapped to official syllabi.</p>
                        <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest hidden lg:block flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3 animate-pulse" />
                            Warning: Experiencing frequent updates.
                        </p>
                    </div>

                    {/* Subject Selector */}
                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar lg:flex-wrap shrink-0">
                        {subjects.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    setActiveSubject(s.id as Subject);
                                    const subjectTopics = modelsBySubject[s.id as Subject] || {};
                                    const allModels = Object.values(subjectTopics).flat();
                                    if (allModels.length > 0) {
                                        setSelectedModelId(allModels[0].id);
                                    } else {
                                        setSelectedModelId(null);
                                    }
                                }}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all shrink-0 ${activeSubject === s.id
                                    ? 'bg-white text-slate-900 shadow-xl'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                    }`}
                            >
                                <s.icon className={`w-3.5 h-3.5 ${activeSubject === s.id ? 'text-indigo-600' : ''}`} />
                                {s.name}
                            </button>
                        ))}
                    </div>

                    {/* Model List */}
                    <div className="flex flex-col gap-3">
                        {/* Simulations List */}
                        <div className="space-y-6">
                            {isLoading ? (
                                <div className="py-10 text-center text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    <p className="text-[10px] uppercase font-black tracking-widest">Syncing archive...</p>
                                </div>
                            ) : Object.keys(currentSubjectTopics).length === 0 ? (
                                <div className="py-10 text-center text-slate-500 italic text-xs">
                                    No interactive modules found for this sector.
                                </div>
                            ) : (
                                Object.entries(currentSubjectTopics).map(([topic, models]) => (
                                    <div key={topic} className="space-y-3">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-50 pl-2 sticky top-0 bg-[#020617] py-2 z-10">{topic}</h3>
                                        {models.map((sim: any) => (
                                            <button
                                                key={sim.id}
                                                onClick={() => {
                                                    setSelectedModelId(sim.id);
                                                    if (window.innerWidth < 1024) setIsLibraryOpen(false);
                                                }}
                                                className={`w-full p-4 flex items-center justify-between rounded-2xl border transition-all text-left group ${selectedModelId === sim.id
                                                    ? 'bg-indigo-600 border-transparent shadow-xl shadow-indigo-500/40'
                                                    : 'bg-white/5 border-white/5 hover:border-white/10'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selectedModelId === sim.id ? 'bg-white/20 text-white' : 'bg-white/10 text-white group-hover:bg-white/20'}`}>
                                                        <Box className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className={`font-bold text-sm tracking-tight leading-none mb-1 ${selectedModelId === sim.id ? 'text-white' : 'text-slate-200'}`}>
                                                            {sim.model_title}
                                                        </h3>
                                                        <p className={`text-[9px] font-medium leading-none ${selectedModelId === sim.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                                                            Interactive Module
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight className={`w-3.5 h-3.5 ${selectedModelId === sim.id ? 'text-white' : 'text-slate-600'}`} />
                                            </button>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Lab Metadata Card - Toggleable on Mobile */}
                    <AnimatePresence mode="wait">
                        {currentModel && (
                            <motion.div
                                key={currentModel.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{
                                    opacity: (typeof window !== 'undefined' && window.innerWidth < 1024) ? (isInfoOpen ? 1 : 0) : 1,
                                    y: (typeof window !== 'undefined' && window.innerWidth < 1024) ? (isInfoOpen ? 0 : 20) : 0,
                                    display: (typeof window !== 'undefined' && window.innerWidth < 1024) ? (isInfoOpen ? 'block' : 'none') : 'block'
                                }}
                                className={cn(
                                    "p-8 rounded-[2.5rem] bg-slate-900/90 backdrop-blur-xl border border-white/10 relative overflow-hidden shrink-0",
                                    "fixed lg:relative bottom-10 inset-x-4 lg:inset-auto lg:mt-auto z-50 lg:z-0 shadow-2xl"
                                )}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Topic Intelligence</h4>
                                    <button onClick={() => setIsInfoOpen(false)} className="lg:hidden text-slate-500"><X size={16} /></button>
                                </div>
                                <p className="text-xs font-bold text-slate-400 leading-relaxed mb-6">
                                    {currentModel.description}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {(currentModel.concepts || []).map((c: string) => (
                                        <span key={c} className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black text-white uppercase tracking-wider border border-white/5">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Main Viewport */}
                <div className="flex-1 h-[65vh] lg:h-full relative bg-slate-950 rounded-3xl lg:rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl group/viewport">
                    {currentModel?.embed_code ? (
                        <div className="absolute inset-0 w-full h-full bg-slate-900 overflow-hidden">
                            <div
                                className="absolute -top-[10%] left-0 w-full h-[120%] [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-none scale-[1.1]"
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(currentModel.embed_code
                                        .replace(/width="[^"]*"/g, 'width="100%"')
                                        .replace(/height="[^"]*"/g, 'height="100%"')
                                        .replace(/src="([^"]*)"/g, (match, src) => {
                                            const connector = src.includes('?') ? '&' : '?';
                                            const params = 'ui_infos=0&ui_watermark=0&ui_help=0&ui_settings=0&ui_ar=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&ui_theme=dark';
                                            return `src="${src}${connector}${params}"`;
                                        }), { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] })
                                }}
                            />
                            {/* Decorative labels for external mode */}
                            <div className="absolute top-8 left-8 z-10 flex gap-4 pointer-events-none">
                                <div className="px-4 py-2 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-xl flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">External Module Feed</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <ModelCanvas environmentType={activeSubject as any}>
                            {isLoading ? (
                                <Html center>
                                    <div className="flex items-center justify-center">
                                        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                                    </div>
                                </Html>
                            ) : currentModel ? (
                                <React.Suspense fallback={<Html center><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></Html>}>
                                    {componentMap[currentModel.component_id] || <DNAHelix />}
                                </React.Suspense>
                            ) : (
                                <Html center>
                                    <div className="text-slate-500 text-sm font-bold uppercase tracking-widest whitespace-nowrap">
                                        Sector Offline • Map Model in Admin
                                    </div>
                                </Html>
                            )}
                        </ModelCanvas>
                    )}

                    {!currentModel?.embed_code && (
                        <>
                            <div className="absolute top-8 left-8 z-10 flex gap-4">
                                <div className="px-4 py-2 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-xl flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">High Fidelity Render</span>
                                </div>
                            </div>

                            <div className="absolute bottom-8 right-8 z-10 flex gap-2">
                                <Button variant="outline" size="icon" className="w-12 h-12 rounded-2xl bg-black/40 border-white/10 text-white backdrop-blur-xl hover:bg-black/60">
                                    <Maximize2 className="w-5 h-5" />
                                </Button>
                                <Button variant="outline" size="icon" className="w-12 h-12 rounded-2xl bg-black/40 border-white/10 text-white backdrop-blur-xl hover:bg-black/60">
                                    <RotateCcw className="w-5 h-5" />
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Background Title */}
                    <div className="absolute top-[65%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] select-none whitespace-nowrap">
                        <h2 className="text-[5rem] lg:text-[12rem] font-black text-white uppercase tracking-tighter">
                            {activeSubject}
                        </h2>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
