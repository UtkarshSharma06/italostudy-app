import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
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

export default function SubjectNotes() {
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
        const sb = supabase as any;
        const { data: subData } = await sb.from('pdf_subjects').select('*').eq('id', subjectId).single();
        const { data: chapData } = await sb.from('pdf_chapters').select('*').eq('subject_id', subjectId).order('position', { ascending: true });
        
        let matData = [];
        if (chapData && chapData.length > 0) {
            const chapIds = chapData.map((c: any) => c.id);
            const { data } = await sb.from('pdf_materials').select('*').in('chapter_id', chapIds).order('position', { ascending: true });
            matData = data || [];
        }

        if (subData) setSubject(subData);
        if (chapData) setChapters(chapData as Chapter[]);
        setMaterials(matData as Material[]);
        setIsLoading(false);
    };

    const handleMaterialClick = (material: Material) => {
        if (!material.is_free && !isGlobalPlan) {
            openPricingModal();
            return;
        }
        
        let downloadUrl = material.pdf_url;
        let isDriveLink = false;
        
        if (downloadUrl.includes('drive.google.com/file/d/')) {
            const match = downloadUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                downloadUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
                isDriveLink = true;
            }
        } else if (downloadUrl.includes('drive.google.com/open?id=')) {
             const match = downloadUrl.match(/id=([a-zA-Z0-9_-]+)/);
             if (match && match[1]) {
                 downloadUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
                 isDriveLink = true;
             }
        }
        
        if (isDriveLink) {
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `${material.title}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            window.open(downloadUrl, '_blank');
        }
    };

    if (authLoading || isLoading) {
        return (
            <Layout>
                <div className="flex h-[60vh] items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            </Layout>
        );
    }

    if (!subject) {
        return (
            <Layout>
                <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-slate-500">
                    <p>Subject not found.</p>
                    <Button onClick={() => navigate('/notes')} variant="outline">Go Back</Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Helmet>
                <title>{subject.title} Notes & PDFs | ItaloStudy</title>
            </Helmet>

            <div className="w-full max-w-5xl mx-auto px-4 lg:px-8 py-8 md:py-10">
                <button 
                    onClick={() => navigate('/notes')}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Subjects
                </button>

                <div className="mb-10">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                        {subject.title}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Explore all notes, chapter summaries & premium PDF guides for {subject.title}.
                    </p>
                </div>

                <div className="space-y-8">
                    {chapters.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <p className="text-slate-500">No chapters available yet.</p>
                        </div>
                    ) : (
                        chapters.map((chapter) => {
                            const chapterMaterials = materials.filter(m => m.chapter_id === chapter.id);
                            
                            return (
                                <div key={chapter.id} className="space-y-4">
                                    <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                                            {chapter.position}
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{chapter.title}</h2>
                                        <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{chapterMaterials.length} files</span>
                                    </div>
                                    
                                    {chapterMaterials.length === 0 ? (
                                        <p className="text-sm text-slate-400 py-2 pl-2">No materials in this chapter.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-2 md:pl-4">
                                            {chapterMaterials.map((material) => {
                                                const isLocked = !material.is_free && !isGlobalPlan;
                                                
                                                return (
                                                    <div 
                                                        key={material.id} 
                                                        onClick={() => handleMaterialClick(material)}
                                                        className={cn(
                                                            "group flex flex-col p-5 rounded-[24px] border-2 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-sm hover:shadow-md",
                                                            material.is_free 
                                                                ? "border-emerald-100 hover:border-emerald-300 dark:border-emerald-900/30 dark:hover:border-emerald-700" 
                                                                : "border-indigo-50 hover:border-indigo-300 dark:border-indigo-900/30 dark:hover:border-indigo-700/60"
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between w-full mb-4">
                                                            <div className={cn(
                                                                "w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 transition-colors shadow-sm",
                                                                material.is_free ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20"
                                                            )}>
                                                                <FileText className="w-6 h-6" />
                                                            </div>
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                                                isLocked ? "bg-slate-50 text-slate-400 dark:bg-slate-800 group-hover:bg-indigo-100 group-hover:text-indigo-600" : "bg-slate-50 text-slate-400 dark:bg-slate-800 group-hover:bg-emerald-100 group-hover:text-emerald-600"
                                                            )}>
                                                                {isLocked ? <Lock className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="mt-auto">
                                                            <h4 className="font-bold text-base text-slate-900 dark:text-white line-clamp-2 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{material.title}</h4>
                                                            <div className="flex items-center gap-2">
                                                                {material.is_free ? (
                                                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1"><Unlock className="w-3.5 h-3.5" /> Free Access</span>
                                                                ) : (
                                                                    <span className="text-xs font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Premium</span>
                                                                )}
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
        </Layout>
    );
}
