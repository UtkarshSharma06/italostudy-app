import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { 
    BookOpen, ChevronDown, ChevronRight, FileText, Lock, Unlock, Download, Loader2, 
    Search, LayoutGrid, CheckCircle2, CloudDownload, Star, Dna, FlaskConical, Atom, Sigma, File
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

export default function NotesAndPdfs() {
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
        const sb = supabase as any;
        const [subRes, chapRes, matRes] = await Promise.all([
            sb.from('pdf_subjects').select('*').order('position', { ascending: true }),
            sb.from('pdf_chapters').select('*').order('position', { ascending: true }),
            sb.from('pdf_materials').select('*').order('position', { ascending: true })
        ]);

        if (subRes.data) setSubjects(subRes.data as Subject[]);
        if (chapRes.data) setChapters(chapRes.data as Chapter[]);
        if (matRes.data) setMaterials(matRes.data as Material[]);
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

    // Derived filtering logic
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

    if (authLoading || isLoading) {
        return (
            <Layout>
                <div className="flex h-[60vh] items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Helmet>
                <title>Notes & PDFs | ItaloStudy</title>
            </Helmet>

            <div className="w-full max-w-6xl mx-auto px-4 lg:px-8 py-8 md:py-10">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest mb-2">NOTES & PDFS</p>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            Notes & <span className="text-purple-600 dark:text-purple-400">PDFs</span>
                        </h1>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 max-w-md">
                            Your all-in-one library for high-quality study materials, chapter summaries & premium PDF guides.
                        </p>
                    </div>
                    
                    <div className="relative w-full md:w-72 shrink-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder="Search notes & PDFs..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus-visible:ring-indigo-500" 
                        />
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                            <BookOpen className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">High Quality Content</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Curated by experts for exam success.</p>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Well Structured</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Organized by topics & chapters for easy learning.</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                            <CloudDownload className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Download & Access</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Save PDFs and study anytime, anywhere.</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                            <Star className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Regular Updates</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">New notes & PDFs added frequently.</p>
                        </div>
                    </div>
                </div>

                {/* Section Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Browse by Subject</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select a subject to explore notes, chapter summaries & PDF resources.</p>
                    </div>
                    <Button variant="outline" className="hidden sm:flex h-10 rounded-xl gap-2 text-xs font-bold shadow-sm border-slate-200 dark:border-slate-800">
                        <LayoutGrid className="w-4 h-4 text-indigo-500" /> Grid View
                    </Button>
                </div>

                {/* Subjects List */}
                <div className="space-y-4">
                    {filteredSubjects.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <p className="text-slate-500">No subjects or materials found matching your search.</p>
                        </div>
                    ) : (
                        filteredSubjects.map((subject) => {

                            const subjectChapters = chapters.filter(c => c.subject_id === subject.id);
                            const subjectChapterIds = subjectChapters.map(c => c.id);
                            const subjectMaterials = materials.filter(m => subjectChapterIds.includes(m.chapter_id));
                            
                            const config = getSubjectConfig(subject.title);
                            const Icon = config.icon;
                            
                            // Mock a split between notes and PDFs for visual aesthetics, or just show real totals
                            const totalResources = subjectMaterials.length;
                            const mockNotes = Math.floor(totalResources * 0.7);
                            const mockPdfs = totalResources - mockNotes;
                            
                            return (
                                <div key={subject.id} className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800/60 shadow-sm transition-all overflow-hidden hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/50">
                                    <div 
                                        className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                        onClick={() => navigate(`/notes/${subject.id}`)}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={cn("w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[24px] flex items-center justify-center shrink-0 shadow-inner", config.bg)}>
                                                <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors">{subject.title}</h3>
                                                <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                                                    <span className={config.color}>{mockNotes} Notes</span>
                                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                                    <span className={config.color}>{mockPdfs} PDFs</span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">{config.desc}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-4 sm:pt-0">
                                            <div className={cn("px-4 py-2 rounded-full flex items-center gap-2", config.lightBg)}>
                                                <File className="w-4 h-4" />
                                                <span className="text-sm font-bold">{totalResources} <span className="font-medium opacity-80">Resources</span></span>
                                            </div>
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600">
                                                <ChevronRight className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </Layout>
    );
}
