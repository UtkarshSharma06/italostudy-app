import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useExam } from '@/context/ExamContext';
import { useAuth } from '@/lib/auth';
import { 
  ShieldCheck, Clock, Target, Info, Zap, 
  CheckCircle2, Monitor, Globe, ChevronLeft,
  Loader2, AlertTriangle, User, FileText,
  CheckSquare, ArrowRight, XCircle,
  GraduationCap, Shield, Activity, Scan
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export default function MobileMockGuidelines() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { allExams } = useExam();
    const { profile } = useAuth();
    const { toast } = useToast();
    
    const sessionId = searchParams.get('session_id');
    const examTypeParam = searchParams.get('exam_type');
    
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAccepted, setIsAccepted] = useState(false);

    useEffect(() => {
        if (sessionId) {
            fetchSession();
        } else {
            setLoading(false);
        }
    }, [sessionId]);

    const fetchSession = async () => {
        try {
            const { data, error } = await supabase
                .from('mock_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();
            
            if (data) setSession(data);
        } catch (error) {
            console.error('Error fetching session:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStart = () => {
        if (!isAccepted) {
            toast({
                title: "Missing Action: Checkbox",
                description: "Please tick the confirmation checkbox at the bottom of the screen to proceed.",
                variant: "destructive"
            });
            return;
        }

        const params = new URLSearchParams({
            mode: 'mock',
            full_exam: 'true',
            session_id: sessionId || '',
            practice_mode: 'true',
            proctored: 'false'
        });
        navigate(`/mobile/start-test?${params.toString()}`);
    };

    const finalExamType = examTypeParam || session?.exam_type || 'cent-s-prep';
    const examConfig = allExams[finalExamType];
    
    const scoring = examConfig?.scoring || {
        correct: 1,
        incorrect: 0,
        skipped: 0
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Initialising Exam...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background relative pb-32">
            {/* MOBILE HEADER */}
            <header className="px-6 py-6 flex items-center gap-4 bg-background sticky top-0 z-50 border-b border-border/10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground">
                    <ChevronLeft />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-sm font-black uppercase tracking-tight leading-none mb-1">
                        Mock Guidelines
                    </h1>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Official Practice Protocol</p>
                </div>
            </header>

            <main className="flex-1 px-6 pt-6 space-y-8">
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* CANDIDATE BRIEFING CARD */}
                    <div className="p-6 bg-secondary/20 rounded-[2.5rem] border border-border/40 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-muted-foreground leading-none mb-1.5">Candidate</span>
                                <span className="text-sm font-black uppercase tracking-tight">{profile?.display_name || 'Guest User'}</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="p-4 bg-background rounded-2xl border border-border/40">
                                <Clock className="w-4 h-4 text-primary mb-2" />
                                <span className="text-[8px] font-black uppercase text-muted-foreground block">Duration</span>
                                <span className="text-[10px] font-black uppercase">{(session?.duration && session.duration !== 120) ? session.duration : (examConfig?.durationMinutes || '--')} Min</span>
                            </div>
                            <div className="p-4 bg-background rounded-2xl border border-border/40">
                                <Target className="w-4 h-4 text-primary mb-2" />
                                <span className="text-[8px] font-black uppercase text-muted-foreground block">Questions</span>
                                <span className="text-[10px] font-black uppercase">{examConfig?.totalQuestions || '--'} Questions</span>
                            </div>
                        </div>
                    </div>

                    {/* OPERATIONAL RULES */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Examination Rules</h2>
                        </div>
                        <div className="space-y-3">
                            {[
                                { title: 'Time Sync', desc: 'The timer starts the moment you enter. Progress is saved automatically.' },
                                { title: 'Safe Navigation', desc: 'You can navigate within a section, but review closes after finalization.' },
                                { title: 'Hardware Check', desc: 'Ensure your device has sufficient battery and a stable connection.' }
                            ].map((rule, idx) => (
                                <div key={idx} className="p-5 bg-background border border-border/40 rounded-3xl flex gap-4">
                                    <span className="text-xs font-black text-primary/30 mt-0.5">{idx + 1}</span>
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase leading-tight mb-1">{rule.title}</h4>
                                        <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">{rule.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SCORING MATRIX */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <Target className="w-4 h-4 text-primary" />
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scoring Matrix</h2>
                        </div>
                        <div className="bg-background border border-border/40 rounded-3xl overflow-hidden">
                            <div className="grid grid-cols-2 divide-x divide-border/20">
                                <div className="p-4 space-y-1">
                                    <span className="text-[8px] font-black text-slate-400 uppercase">Correct</span>
                                    <span className="text-sm font-black text-emerald-600 block">+{scoring.correct}</span>
                                </div>
                                <div className="p-4 space-y-1">
                                    <span className="text-[8px] font-black text-slate-400 uppercase">Incorrect</span>
                                    <span className="text-sm font-black text-rose-600 block">{scoring.incorrect}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PERFORMANCE MODE SELECTION (MOBILE VIEW) */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2 justify-between">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-indigo-500" />
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-indigo-900">Performance Mode</h2>
                            </div>
                            <span className="text-[8px] font-black text-white bg-indigo-600 px-2.5 py-1 rounded-full shadow-sm">Active</span>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/80 border-2 border-indigo-200/60 rounded-[2.5rem] p-8 relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-400/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-400/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />
                            
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md">
                                    <GraduationCap className="w-6 h-6" />
                                </div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                    Selected Protocol
                                </div>
                            </div>
                            <h4 className="text-[13px] font-black uppercase tracking-tight text-indigo-900 mb-2 relative z-10">Standard Practice Protocol</h4>
                            <p className="text-[10px] font-bold text-indigo-600/80 leading-relaxed uppercase tracking-tight relative z-10">
                                Traditional examination environment. High-stability practice session without active proctoring analysis.
                            </p>
                            
                            <div className="mt-8 pt-5 border-t border-indigo-100/50 flex flex-col gap-3 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-violet-100 flex items-center justify-center">
                                            <Scan className="w-3.5 h-3.5 text-violet-600" />
                                        </div>
                                        <span className="text-[9px] font-black uppercase text-violet-900 tracking-widest">AI Proctored Mode</span>
                                    </div>
                                    <span className="text-[8px] font-black uppercase text-violet-700 bg-violet-100 px-2 py-0.5 rounded shadow-sm">Restricted</span>
                                </div>
                                <span className="text-[8px] font-bold text-violet-600/70 text-left uppercase pl-8">Requires Desktop Environment for tracking</span>
                            </div>
                        </div>
                    </div>

                    {/* FINAL WARNING */}
                    <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl flex gap-4">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">Safe-Lock Warning</h4>
                            <p className="text-[10px] font-medium text-amber-700/80 leading-relaxed">
                                Avoid switching apps during the mock exam. The system may flag excessive activity as a synchronization error.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </main>

            <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-zinc-100 p-6 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                <div className="max-w-md mx-auto space-y-6">
                    <div className="flex items-start gap-4 px-2">
                        <Checkbox 
                            id="mobile-terms" 
                            checked={isAccepted}
                            onCheckedChange={(checked) => setIsAccepted(checked === true)}
                            className="w-5 h-5 border-zinc-300 rounded-none data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 transition-colors"
                        />
                        <Label 
                            htmlFor="mobile-terms" 
                            className="text-[10px] font-black uppercase tracking-tight text-zinc-400 leading-relaxed select-none"
                        >
                            I confirm adherence to the official examination protocols and privacy terms.
                        </Label>
                    </div>

                    <Button
                        onClick={handleStart}
                        className={cn(
                            "w-full h-14 rounded-sm font-black uppercase text-xs tracking-[0.3em] transition-all flex items-center justify-center gap-3",
                            isAccepted 
                                ? "bg-zinc-900 text-white shadow-sm" 
                                : "bg-zinc-50 text-zinc-400 opacity-90 shadow-none border border-zinc-200"
                        )}
                    >
                        Start Official Mock Session
                    </Button>
                </div>
            </footer>
        </div>
    );
}
