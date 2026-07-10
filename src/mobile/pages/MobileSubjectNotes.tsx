import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import MobileLayout from '@/mobile/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { 
    FileText, Lock, Unlock, Download, Loader2, ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePricing } from '@/context/PricingContext';
import { Helmet } from 'react-helmet-async';

interface Subject {
    id: string;
    title: string;
}

interface Chapter {
    id: string;
    subject_id: string;
    title: string;
    position: number;
}

interface Material {
    id: string;
    chapter_id: string;
    title: string;
    pdf_url: string;
    is_free: boolean;
    position: number;
}

export default function MobileSubjectNotes() {
    const { subjectId } = useParams();
    const navigate = useNavigate();
    const { profile, loading: authLoading } = useAuth();
    const { openPricingModal } = usePricing();
    
    const [subject, setSubject] = useState<Subject | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isGlobalPlan = profile?.selected_plan === 'global' || profile?.subscription_tier === 'global' || profile?.role === 'admin' || profile?.role === 'sub_admin';

    useEffect(() => {
        if (subjectId) {
            fetchData();
        }
    }, [subjectId]);

    const fetchData = async () => {
        setIsLoading(true);
        const [subRes, chapRes, matRes] = await Promise.all([
            supabase.from('pdf_subjects').select('*').eq('id', subjectId).single(),
            supabase.from('pdf_chapters').select('*').eq('subject_id', subjectId).order('position', { ascending: true }),
            supabase.from('pdf_materials').select('*, pdf_chapters!inner(subject_id)').eq('pdf_chapters.subject_id', subjectId).order('position', { ascending: true })
        ]);

        if (subRes.data) setSubject(subRes.data);
        if (chapRes.data) setChapters(chapRes.data);
        if (matRes.data) setMaterials(matRes.data as unknown as Material[]);
        setIsLoading(false);
    };

    const handleMaterialClick = (material: Material) => {
        if (!material.is_free && !isGlobalPlan) {
            openPricingModal();
            return;
        }
        window.open(material.pdf_url, '_blank');
    };

    if (authLoading || isLoading) {
        return (
            <MobileLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            </MobileLayout>
        );
    }

    if (!subject) {
        return (
            <MobileLayout>
                <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-slate-500">
                    <p>Subject not found.</p>
                    <Button onClick={() => navigate('/mobile/notes')} variant="outline" size="sm">Go Back</Button>
                </div>
            </MobileLayout>
        );
    }

    return (
        <MobileLayout>
            <Helmet>
                <title>{subject.title} Notes & PDFs | ItaloStudy Mobile</title>
            </Helmet>

            <div className="w-full px-4 pt-4 pb-24">
                <button 
                    onClick={() => navigate('/mobile/notes')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 active:text-slate-900 dark:text-slate-400 dark:active:text-white transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Subjects
                </button>

                <div className="mb-6">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
                        {subject.title}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Explore all notes and PDFs for {subject.title}.
                    </p>
                </div>

                <div className="space-y-6">
                    {chapters.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-slate-500 text-sm font-medium">No chapters available yet.</p>
                        </div>
                    ) : (
                        chapters.map((chapter) => {
                            const chapterMaterials = materials.filter(m => m.chapter_id === chapter.id);
                            
                            return (
                                <div key={chapter.id} className="space-y-3">
                                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                                            {chapter.position}
                                        </div>
                                        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{chapter.title}</h2>
                                        <span className="ml-auto text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{chapterMaterials.length} files</span>
                                    </div>
                                    
                                    {chapterMaterials.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-1 pl-1">No materials in this chapter.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-2 pl-1">
                                            {chapterMaterials.map((material) => {
                                                const isLocked = !material.is_free && !isGlobalPlan;
                                                
                                                return (
                                                    <div 
                                                        key={material.id} 
                                                        onClick={() => handleMaterialClick(material)}
                                                        className={cn(
                                                            "flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer active:scale-[0.98] bg-white dark:bg-slate-900 shadow-sm",
                                                            material.is_free 
                                                                ? "border-emerald-100 dark:border-emerald-900/30" 
                                                                : "border-indigo-50 dark:border-indigo-900/30"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3 w-full min-w-0">
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 transition-colors",
                                                                material.is_free ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10" : "bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10"
                                                            )}>
                                                                <FileText className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1 min-w-0 pr-2">
                                                                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{material.title}</h4>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    {material.is_free ? (
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1"><Unlock className="w-2.5 h-2.5" /> Free</span>
                                                                    ) : (
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Premium</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                                                isLocked ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                                                            )}>
                                                                {isLocked ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </MobileLayout>
    );
}
