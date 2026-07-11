import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import MobileLayout from '@/mobile/components/MobileLayout';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { 
    BookOpen, ChevronDown, ChevronRight, FileText, Lock, Unlock, Download, Loader2, 
    Search, CheckCircle2, CloudDownload, Star, Dna, FlaskConical, Atom, Sigma, File
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { usePricing } from '@/context/PricingContext';
import { useExam } from '@/context/ExamContext';
import { Helmet } from 'react-helmet-async';

interface Subject {
    id: string;
    title: string;
    exam_model_id?: string | null;
    position: number;
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

const getSubjectConfig = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('bio')) return { icon: Dna, color: 'text-emerald-500', bg: 'bg-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', desc: 'Detailed notes, concept maps, and chapter-wise PDFs.' };
    if (t.includes('chem')) return { icon: FlaskConical, color: 'text-blue-500', bg: 'bg-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400', desc: 'Comprehensive notes, formulas, reactions & PDF guides.' };
    if (t.includes('phys')) return { icon: Atom, color: 'text-purple-500', bg: 'bg-purple-500', lightBg: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400', desc: 'Concepts, derivations, numericals & exam-focused PDFs.' };
    if (t.includes('math')) return { icon: Sigma, color: 'text-orange-500', bg: 'bg-orange-500', lightBg: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400', desc: 'Short notes, formulas, solved examples & practice PDFs.' };
    return { icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-500', lightBg: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', desc: 'Study notes, summaries, and downloadable PDF materials.' };
};

export default function MobileNotesAndPdfs() {
    const { profile, loading: authLoading } = useAuth();
    const { openPricingModal } = usePricing();
    const { activeExam } = useExam();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const isGlobalPlan = profile?.selected_plan === 'global' || profile?.subscription_tier === 'global' || profile?.role === 'admin' || profile?.role === 'sub_admin';

    useEffect(() => {
        fetchData();
    }, [activeExam?.id]);

    const fetchData = async () => {
        setIsLoading(true);
        const [subRes, chapRes, matRes] = await Promise.all([
            supabase.from('pdf_subjects').select('*').order('position', { ascending: true }),
            supabase.from('pdf_chapters').select('*').order('position', { ascending: true }),
            supabase.from('pdf_materials').select('*').order('position', { ascending: true })
        ]);

        if (subRes.data) setSubjects(subRes.data);
        if (chapRes.data) setChapters(chapRes.data);
        if (matRes.data) setMaterials(matRes.data);
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

    const filteredSubjects = subjects.filter(sub => {
        if (activeExam && activeExam.dbId && sub.exam_model_id !== activeExam.dbId) return false;

        if (!searchQuery) return true;
        const matchesSubject = sub.title.toLowerCase().includes(searchQuery.toLowerCase());
        const subjectChapters = chapters.filter(c => c.subject_id === sub.id);
        const matchesChapters = subjectChapters.some(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
        const chapterIds = subjectChapters.map(c => c.id);
        const matchesMaterials = materials.some(m => chapterIds.includes(m.chapter_id) && m.title.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSubject || matchesChapters || matchesMaterials;
    });

    return (
        <MobileLayout>
            <Helmet>
                <title>Notes & PDFs | ItaloStudy Mobile</title>
            </Helmet>

            <div className="w-full px-4 pt-6 pb-24 space-y-6">
                {/* Header section */}
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest mb-2">NOTES & PDFS</p>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Notes & <span className="text-purple-600 dark:text-purple-400">PDFs</span>
                        </h1>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
                            Your all-in-one library for high-quality study materials, chapter summaries & premium PDF guides.
                        </p>
                    </div>
                    
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder="Search notes & PDFs..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-sm" 
                        />
                    </div>
                </div>

                {/* Features Row */}
                <div className="flex overflow-x-auto pb-2 -mx-4 px-4 gap-3 scrollbar-hide snap-x">
                    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-[20px] border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-center gap-3 shrink-0 snap-start w-[160px]">
                        <div className="w-9 h-9 rounded-[14px] bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4 text-purple-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-[11px] leading-tight mb-0.5">High Quality</h4>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">Curated by experts.</p>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-[20px] border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-center gap-3 shrink-0 snap-start w-[160px]">
                        <div className="w-9 h-9 rounded-[14px] bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-[11px] leading-tight mb-0.5">Well Structured</h4>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">Topics & chapters.</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-[20px] border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-center gap-3 shrink-0 snap-start w-[160px]">
                        <div className="w-9 h-9 rounded-[14px] bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                            <CloudDownload className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-[11px] leading-tight mb-0.5">Downloadable</h4>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">Study anytime.</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-[20px] border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-center gap-3 shrink-0 snap-start w-[160px]">
                        <div className="w-9 h-9 rounded-[14px] bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                            <Star className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-[11px] leading-tight mb-0.5">Regular Updates</h4>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">New PDFs added.</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Browse by Subject</h2>
                    
                    <div className="space-y-3">
                        {authLoading || isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800/60 p-4 flex flex-col gap-3">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-3 w-1/2" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                                        <Skeleton className="h-7 w-28 rounded-full" />
                                        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                                    </div>
                                </div>
                            ))
                        ) : filteredSubjects.length === 0 ? (
                            <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <p className="text-slate-500 text-sm">No subjects found.</p>
                            </div>
                        ) : (
                            filteredSubjects.map((subject) => {

                                const subjectChapters = chapters.filter(c => c.subject_id === subject.id);
                                const subjectChapterIds = subjectChapters.map(c => c.id);
                                const subjectMaterials = materials.filter(m => subjectChapterIds.includes(m.chapter_id));
                                
                                const config = getSubjectConfig(subject.title);
                                const Icon = config.icon;
                                
                                const totalResources = subjectMaterials.length;
                                const mockNotes = Math.floor(totalResources * 0.7);
                                const mockPdfs = totalResources - mockNotes;
                                
                                return (
                                    <div key={subject.id} className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800/60 shadow-sm transition-all overflow-hidden active:scale-[0.98]">
                                    <div 
                                        className="p-4 flex flex-col gap-3 cursor-pointer"
                                        onClick={() => navigate(`/mobile/notes/${subject.id}`)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", config.bg)}>
                                                <Icon className="w-7 h-7 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-0.5">{subject.title}</h3>
                                                <div className="flex items-center gap-2 text-xs font-semibold">
                                                    <span className={config.color}>{mockNotes} Notes</span>
                                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                                    <span className={config.color}>{mockPdfs} PDFs</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                                            <div className={cn("px-3 py-1.5 rounded-full flex items-center gap-1.5", config.lightBg)}>
                                                <File className="w-3.5 h-3.5" />
                                                <span className="text-xs font-bold">{totalResources} <span className="font-medium opacity-80">Resources</span></span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </MobileLayout>
    );
}
