import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
    Microscope, FlaskConical, Zap, Info, Maximize2,
    RotateCcw, Calculator, Brain, ChevronRight, Atom,
    Box, X, AlertTriangle, Compass, Activity, PanelLeft, Globe
} from 'lucide-react';
import { LabSkeleton } from '@/components/SkeletonLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelCanvas } from '@/components/labs/ModelCanvas';
import { DNAHelix } from '@/components/labs/subjects/biology/DNAHelix';
import { CellStructure } from '@/components/labs/subjects/biology/CellStructure';
import { SkeletalSystem } from '@/components/labs/subjects/biology/SkeletalSystem';
import { NervousSystem } from '@/components/labs/subjects/biology/NervousSystem';
import { MuscularSystem } from '@/components/labs/subjects/biology/MuscularSystem';
import { BohrAtom } from '@/components/labs/subjects/chemistry/BohrAtom';
import { ForceVisualizer } from '@/components/labs/subjects/physics/ForceVisualizer';
import { TrigCircle } from '@/components/labs/subjects/math/TrigCircle';
import { Button } from '@/components/ui/button';

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

export default function MobileLabs() {
    const { toast } = useToast();
    const [activeSubject, setActiveSubject] = useState('biology');
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

    useEffect(() => { fetchModels(); }, []);

    const fetchModels = async () => {
        setIsLoading(true);
        try {
            const { data } = await (supabase as any).from('lab_models').select('*');
            if (data) {
                setDbModels(data);
                const first = data.find((m: any) => normalizeSubject(m.subject) === activeSubject);
                if (first) setSelectedModelId(first.id);
            }
        } catch (e) {
            console.error("Labs Fetch Error:", e);
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
    const currentModelsFlat = Object.values(currentSubjectTopics).flat();
    const currentModel = currentModelsFlat.find(m => m.id === selectedModelId) || currentModelsFlat[0];

    const subjects = [
        { id: 'biology', name: 'Bio', icon: Microscope },
        { id: 'chemistry', name: 'Chem', icon: FlaskConical },
        { id: 'physics', name: 'Phys', icon: Zap },
        { id: 'math', name: 'Math', icon: Calculator },
        { id: 'reasoning', name: 'Logic', icon: Brain }
    ];

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden relative">
            <div className="absolute inset-0 z-0">
                {isLoading ? (
                    <div className="absolute inset-0 bg-slate-950 z-50">
                        <LabSkeleton />
                    </div>
                ) : currentModel ? (
                    currentModel.embed_code ? (
                        <div className="absolute inset-0 w-full h-full bg-slate-900 overflow-hidden">
                            <div
                                className="absolute -top-[10%] left-0 w-full h-[120%] [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-none scale-[1.05]"
                                dangerouslySetInnerHTML={{
                                    __html: currentModel.embed_code
                                        .replace(/width="[^"]*"/g, 'width="100%"')
                                        .replace(/height="[^"]*"/g, 'height="100%"')
                                        .replace(/src="([^"]*)"/g, (match, src) => {
                                            const connector = src.includes('?') ? '&' : '?';
                                            const params = 'ui_infos=0&ui_watermark=0&ui_help=0&ui_settings=0&ui_ar=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&ui_theme=dark';
                                            return `src="${src}${connector}${params}"`;
                                        })
                                }}
                            />
                        </div>
                    ) : (
                        <ModelCanvas environmentType={activeSubject as any}>
                            {(currentModel?.component_id && componentMap[currentModel.component_id]) || <DNAHelix />}
                        </ModelCanvas>
                    )
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-50 text-slate-500 font-black uppercase tracking-[0.2em]">
                        Sector Offline
                    </div>
                )}
            </div>

            <div className="absolute top-4 right-4 z-20 flex gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                    className={`rounded-2xl backdrop-blur-md border ${isLibraryOpen ? 'bg-primary text-white border-primary' : 'bg-white/10 text-white border-white/10'}`}
                >
                    <PanelLeft className="w-5 h-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsInfoOpen(!isInfoOpen)}
                    className={`rounded-2xl backdrop-blur-md border ${isInfoOpen ? 'bg-primary text-white border-primary' : 'bg-white/10 text-white border-white/10'}`}
                >
                    <Info className="w-5 h-5" />
                </Button>
            </div>

            <AnimatePresence>
                {isInfoOpen && currentModel && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
                        className="absolute bottom-24 inset-x-4 z-30 p-6 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl"
                    >
                        <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Subject IQ</h3>
                        <p className="text-xs font-bold text-slate-300 leading-relaxed mb-4">{currentModel?.description || 'No description available'}</p>
                        <div className="flex flex-wrap gap-2">
                            {currentModel?.concepts?.map((c: string) => (
                                <span key={c} className="px-2 py-1 bg-white/5 rounded-lg text-[8px] font-black text-white uppercase tracking-widest border border-white/5">{c}</span>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isLibraryOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsLibraryOpen(false)}
                            className="absolute inset-0 z-[40] bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
                            className="absolute inset-y-0 left-0 w-[85%] z-[50] bg-slate-900 border-r border-white/10 p-6 flex flex-col gap-6"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black uppercase tracking-tighter">Lab <span className="text-primary">Vault</span></h2>
                                <Button variant="ghost" size="icon" onClick={() => setIsLibraryOpen(false)}><X /></Button>
                            </div>

                            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 shrink-0">
                                {subjects.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setActiveSubject(s.id)}
                                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeSubject === s.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-400'}`}
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar pb-10">
                                {Object.keys(currentSubjectTopics).length === 0 ? (
                                    <div className="text-center py-20 opacity-30 text-[10px] font-black uppercase tracking-widest">No Modules Found</div>
                                ) : Object.entries(currentSubjectTopics).map(([topic, models]) => (
                                    <div key={topic} className="space-y-3">
                                        <h3 className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] px-2">{topic}</h3>
                                        {models.map(sim => (
                                            <button
                                                key={sim.id}
                                                onClick={() => { setSelectedModelId(sim.id); setIsLibraryOpen(false); }}
                                                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all border ${selectedModelId === sim.id ? 'bg-primary border-transparent shadow-lg shadow-primary/20' : 'bg-white/5 border-white/5 active:bg-white/10'}`}
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                                    {sim.embed_code ? <Globe size={20} className="text-indigo-400" /> : <Box size={20} className="text-emerald-400" />}
                                                </div>
                                                <div className="text-left shrink-0 max-w-[150px]">
                                                    <h4 className="text-sm font-black uppercase tracking-tight truncate">{sim.model_title || 'Untitled'}</h4>
                                                    <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest leading-none">
                                                        {sim.embed_code ? 'Interactive Simulation' : '3D Model View'}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
