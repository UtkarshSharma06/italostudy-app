import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MathText } from '@/components/MathText';
import { 
    ChevronLeft, 
    ChevronRight, 
    BookOpen, 
    CheckCircle2,
    Info,
    Layout as LayoutIcon,
    X,
    Menu,
    ListFilter,
    ArrowLeft,
    Share2,
    Maximize2,
    Star,
    PlayCircle,
    Copy,
    Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Question, MediaContent } from '@/types/test';
import QuestionMedia from '@/components/QuestionMedia';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { AuthModal } from '@/components/auth/AuthModal';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function PublicSolutions() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [session, setSession] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'quest' | 'passage'>('passage');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isShared, setIsShared] = useState(false);

    useEffect(() => {
        if (sessionId) {
            fetchData();
        }
    }, [sessionId]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const { data: sessionData, error: sessionError } = await supabase
                .from('mock_sessions')
                .select('*')
                .eq('id', sessionId)
                .maybeSingle();

            if (sessionError || !sessionData) return;
            setSession(sessionData);

            const { data: questionsData, error: questionsError } = await supabase
                .from('session_questions')
                .select('*')
                .eq('session_id', sessionId)
                .order('order_index', { ascending: true });

            if (questionsError) throw questionsError;

            if (questionsData) {
                setQuestions(questionsData.map((q, idx) => ({
                    ...q,
                    question_number: idx + 1,
                    options: q.options as string[],
                    media: q.media as unknown as MediaContent | null
                })));
                if (questionsData[0]?.passage) setActiveTab('passage');
                else setActiveTab('quest');
            }
        } catch (error) {
            console.error('Error fetching solution data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const currentQuestion = questions[currentIndex];

    // Auto-switch mobile tabs
    useEffect(() => {
        if (currentQuestion) {
            if (currentQuestion.passage) setActiveTab('passage');
            else setActiveTab('quest');
        }
    }, [currentIndex]);

    const handleAttemptMock = () => {
        navigate(`/waiting-room/${sessionId}`);
    };

    const handleShare = async () => {
        const shareData = {
            title: `Solutions: ${session?.title}`,
            text: `Check out the step-by-step expert solutions for ${session?.title} on ItaloStudy!`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                setIsShared(true);
                toast({
                    title: "Link Copied!",
                    description: "Solution link has been copied to your clipboard.",
                });
                setTimeout(() => setIsShared(false), 2000);
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    const contentRef = useRef<HTMLDivElement>(null);
    const passageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) contentRef.current.scrollTo(0, 0);
        if (passageRef.current) passageRef.current.scrollTo(0, 0);
    }, [currentIndex]);

    if (isLoading) {
        return (
            <div className="h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <img src="/logo.webp" alt="ItaloStudy" className="h-8 mb-6 animate-pulse mx-auto" />
                    <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 animate-[loading_1.5s_infinite_ease-in-out]" />
                    </div>
                </div>
            </div>
        );
    }

    if (!session || questions.length === 0) {
        return (
            <div className="h-screen flex items-center justify-center bg-white p-6">
                <div className="max-w-md text-center space-y-6">
                    <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-rose-500">
                        <X size={40} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Access Expired or Private</h1>
                    <p className="text-slate-500 text-sm">This solution walkthrough might have been removed or the ID is incorrect.</p>
                    <Button onClick={() => navigate('/')} variant="outline" className="rounded-2xl h-12 px-8">Return to Homepage</Button>
                </div>
            </div>
        );
    }

    const QuestionList = () => (
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {questions.map((q, idx) => (
                <button
                    key={idx}
                    onClick={() => {
                        setCurrentIndex(idx);
                        // On mobile, the sheet will stay open unless we handle it, 
                        // but usually clicking an item should close it or show progress.
                    }}
                    className={cn(
                        "w-full text-left p-3 rounded-2xl transition-all flex items-center gap-4 group",
                        currentIndex === idx 
                            ? "bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-100" 
                            : "hover:bg-white/50"
                    )}
                >
                    <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-colors shrink-0",
                        currentIndex === idx ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500 group-hover:bg-slate-300"
                    )}>
                        {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                        <MathText
                            content={q.section_name || 'Question'}
                            className={cn(
                                "text-[11px] font-bold uppercase transition-colors tracking-wide",
                                currentIndex === idx ? "text-indigo-600" : "text-slate-400"
                            )}
                            variant="default"
                        />
                        <MathText 
                            content={q.question_text.replace(/<[^>]*>/g, '').substring(0, 100) + (q.question_text.length > 100 ? '...' : '')} 
                            className="text-xs text-slate-600 opacity-80 mt-0.5 line-clamp-1 pointer-events-none"
                            variant="default"
                        />
                    </div>
                </button>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-white flex flex-col font-sans text-slate-900 select-none overflow-hidden">
            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                onSuccess={() => navigate(`/waiting-room/${sessionId}`)}
            />

            {/* --- Premium Navbar --- */}
            <header className="h-16 bg-white border-b flex items-center px-4 lg:px-6 justify-between shrink-0 z-[100] shadow-sm">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-500 hidden lg:flex"
                    >
                        <Menu size={20} />
                    </button>
                    
                    {/* Mobile Menu Trigger */}
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-500">
                                    <Menu size={20} />
                                </button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[300px] p-0 flex flex-col bg-slate-50">
                                <SheetHeader className="p-6 border-b bg-white">
                                    <SheetTitle className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                        <ListFilter size={14} />
                                        Question List
                                    </SheetTitle>
                                </SheetHeader>
                                <div className="p-4 flex-1 overflow-hidden flex flex-col">
                                    <QuestionList />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <div className="flex items-center gap-3">
                        <img src="/logo.webp" alt="ItaloStudy Logo" className="h-5 sm:h-7 shrink-0" />
                        <div className="hidden lg:block w-px h-6 bg-slate-200" />
                        <div className="min-w-0 hidden md:block">
                            <h1 className="text-sm font-bold truncate max-w-[200px] lg:max-w-md">{session.title}</h1>
                            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-indigo-600 uppercase tracking-widest leading-none mt-0.5">
                                <Star size={10} fill="currentColor" />
                                <span>Official Solutions</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <Button 
                        onClick={handleAttemptMock}
                        variant="default" 
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-black text-[10px] sm:text-[11px] px-3 sm:px-5 h-8 sm:h-9 uppercase tracking-widest shadow-lg shadow-indigo-200 flex items-center gap-2"
                    >
                        <PlayCircle size={14} />
                        <span className="hidden xs:inline">Attempt Mock</span>
                        <span className="xs:hidden">Attempt</span>
                    </Button>

                    <div className="hidden sm:flex flex-col items-end px-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Progress</span>
                        <div className="flex items-center gap-2">
                             <div className="w-16 lg:w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-indigo-600 transition-all duration-500 rounded-full" 
                                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} 
                                />
                             </div>
                             <span className="text-xs font-black tabular-nums">{currentIndex + 1}/<span className="text-slate-300 font-bold">{questions.length}</span></span>
                        </div>
                    </div>

                    <div className="w-px h-6 bg-slate-200 hidden sm:block mx-1" />
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleShare}
                        className={cn(
                            "rounded-full transition-all duration-300 h-9 w-9",
                            isShared ? "text-emerald-500 bg-emerald-50" : "text-slate-400 hover:bg-slate-50"
                        )}
                    >
                        {isShared ? <Check size={18} /> : <Share2 size={18} />}
                    </Button>
                </div>
            </header>

            <div className="flex-1 min-h-0 flex overflow-hidden">
                {/* --- Sidebar (Desktop) --- */}
                <AnimatePresence initial={false}>
                    {isSidebarOpen && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 300, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="hidden lg:flex flex-col border-r bg-slate-50/50 shrink-0 overflow-hidden"
                        >
                            <div className="p-6 h-full flex flex-col">
                                <div className="flex items-center justify-between mb-6 shrink-0">
                                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                        <ListFilter size={14} />
                                        Question List
                                    </h3>
                                </div>
                                <QuestionList />
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* --- Main Solution Content --- */}
                <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-white relative">
                    {/* Passage Pane (Desktop: Left, Mobile: Stacks on top) */}
                    <AnimatePresence mode="wait">
                        {currentQuestion.passage && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="w-full lg:w-1/2 flex flex-col bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-100 shrink-0 overflow-hidden"
                            >
                                <div className="h-12 border-b bg-white/50 px-6 flex items-center shrink-0">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 flex items-center gap-2">
                                        <BookOpen size={14} />
                                        Reading Passage
                                    </h4>
                                </div>
                                
                                <div ref={passageRef} className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar">
                                    <motion.div 
                                        key={currentIndex + '_passage'}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="max-w-2xl mx-auto space-y-6"
                                    >
                                        <div className="relative group p-8 lg:p-12 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden">
                                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-indigo-600 opacity-20" />
                                            <MathText 
                                                content={currentQuestion.passage} 
                                                className="text-base lg:text-lg leading-[1.8] text-slate-700 font-medium selection:bg-indigo-100 prose prose-slate max-w-none break-words" 
                                            />
                                        </div>
                                        <div className="pt-8 border-t border-slate-100 flex items-center gap-4 opacity-30">
                                            <div className="p-2 bg-slate-200 rounded-lg"><Maximize2 size={14} /></div>
                                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">End of Passage</span>
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Question Pane (Desktop: Right, Mobile: Stacks below passage) */}
                    <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
                        <div className="h-12 border-b px-6 flex items-center shrink-0 bg-white z-10">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 flex items-center gap-2">
                                <CheckCircle2 size={14} />
                                Solution Analysis
                            </h4>
                        </div>

                        <div ref={contentRef} className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar pb-32">
                            <motion.div
                                key={currentIndex + '_question'}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="max-w-2xl mx-auto space-y-8 lg:space-y-10"
                            >
                                {/* Section Header */}
                                <div className="flex items-center gap-2">
                                    <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap shrink-0">
                                        Question No. {currentIndex + 1}
                                    </div>
                                    {currentQuestion.section_name && (
                                        <div className="px-3 py-1 bg-indigo-50 rounded-full text-[10px] font-black uppercase text-indigo-600 tracking-widest truncate">
                                            {currentQuestion.section_name}
                                        </div>
                                    )}
                                </div>

                                {/* Question Text */}
                                <MathText 
                                    content={currentQuestion.question_text} 
                                    className="text-lg sm:text-xl lg:text-3xl font-black text-slate-800 leading-[1.3] lg:leading-[1.1] tracking-tight"
                                />

                                {/* Media (Image/Chart/Diagram/Table) */}
                                {(() => {
                                    const m = currentQuestion?.media as any;
                                    
                                    // Robust check: Render if anything looks like media
                                    const hasRenderableMedia = m && (
                                        ['image', 'chart', 'graph', 'pie', 'bar', 'line', 'scatter', 'table', 'diagram'].includes(m.type) ||
                                        m.url || m.imageUrl || m.image_url || m.image || m.data || m.table
                                    );
                                    
                                    if (!hasRenderableMedia) return null;

                                    return (
                                        <div className="rounded-2xl border border-slate-100 p-2 bg-slate-50/50 shadow-inner overflow-hidden">
                                            <QuestionMedia media={currentQuestion.media} />
                                        </div>
                                    );
                                })()}

                                {/* Options Wrapper */}
                                <div className="grid gap-3">
                                    {currentQuestion.options.map((option: string, idx: number) => {
                                        const isCorrect = idx === currentQuestion.correct_index;
                                        return (
                                            <div 
                                                key={idx}
                                                className={cn(
                                                    "group relative flex items-center gap-4 lg:gap-5 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border-2 transition-all duration-300",
                                                    isCorrect 
                                                        ? "bg-emerald-50/70 border-emerald-400/30 ring-4 ring-emerald-500/5 shadow-xl shadow-emerald-700/5" 
                                                        : "bg-white border-slate-50 opacity-40 grayscale-[0.5] hover:opacity-60"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-9 h-9 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center text-xs sm:text-sm font-black shrink-0 transition-transform group-hover:scale-105",
                                                    isCorrect ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-100 text-slate-400"
                                                )}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <div className="flex-1">
                                                    <MathText content={option} className={cn("text-sm sm:text-base lg:text-lg font-bold transition-colors leading-relaxed", isCorrect ? "text-emerald-950" : "text-slate-600")} />
                                                </div>
                                                {isCorrect && (
                                                    <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-8 h-8 lg:w-10 lg:h-10 bg-emerald-500 rounded-xl lg:rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 hidden sm:flex">
                                                        <CheckCircle2 size={20} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Expert Logic Box */}
                                <div className="mt-8 lg:mt-16 relative">
                                    <div className="absolute -inset-4 lg:-inset-10 bg-indigo-600/5 rounded-[2rem] lg:rounded-[3rem] -z-10" />
                                    
                                    <div className="space-y-4 lg:space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-600 rounded-xl lg:rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                                                <Info size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] lg:text-[11px] font-black uppercase text-indigo-600 tracking-[0.25em] leading-none">Logic & Explanation</h4>
                                                <p className="text-[10px] text-slate-400 mt-1">Verified Expert Walkthrough</p>
                                            </div>
                                        </div>

                                        <div className="relative p-5 lg:p-8 bg-white border border-indigo-100 shadow-xl shadow-indigo-600/5 rounded-2xl lg:rounded-3xl">
                                             <MathText 
                                                content={currentQuestion.explanation || "No expert explanation provided for this question yet."} 
                                                className="text-sm sm:text-base lg:text-lg leading-[1.6] text-slate-700 prose prose-indigo max-w-none" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </main>
            </div>

            {/* --- Smart Floating Footer --- */}
            <footer className="h-20 lg:h-24 bg-white border-t flex items-center justify-between px-4 lg:px-10 shrink-0 z-[110]">
                <Button 
                    variant="outline" 
                    className="h-11 lg:h-14 px-4 lg:px-10 border-slate-200 rounded-xl lg:rounded-2xl font-black text-xs text-slate-500 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-30"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                >
                    <ChevronLeft size={18} className="mr-1 lg:mr-2" />
                    <span className="hidden xs:inline">PREVIOUS</span>
                    <span className="xs:hidden">PREV</span>
                </Button>

                <div className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 bg-slate-100/70 rounded-full max-w-sm lg:hidden">
                    <span className="text-[10px] font-black text-slate-400 tabular-nums">{currentIndex + 1} / {questions.length}</span>
                </div>

                <div className="hidden lg:flex items-center gap-4 text-slate-300 text-[10px] font-black uppercase tracking-[0.3em]">
                    <span className={cn(currentIndex === 0 && "opacity-20")}>Start</span>
                    <div className="w-32 lg:w-48 h-[2px] bg-slate-100 relative">
                        <motion.div 
                            className="absolute top-0 bottom-0 left-0 bg-indigo-600"
                            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                    <span className={cn(currentIndex === questions.length - 1 && "opacity-20")}>Finish</span>
                </div>

                <Button 
                    className="h-11 lg:h-14 px-4 lg:px-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl lg:rounded-2xl font-black text-xs tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-30"
                    disabled={currentIndex === questions.length - 1}
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                >
                    <span className="hidden xs:inline">{currentIndex === questions.length - 1 ? 'ALL REVIEWED' : 'NEXT QUESTION'}</span>
                    <span className="xs:hidden">{currentIndex === questions.length - 1 ? 'FINISH' : 'NEXT'}</span>
                    <ChevronRight size={18} className="ml-1 lg:ml-2" />
                </Button>
            </footer>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                
                @media (max-width: 400px) {
                  .xs\\:hidden { display: inline-flex; }
                  .xs\\:inline { display: none; }
                }
            `}} />
        </div>
    );
}
