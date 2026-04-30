import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useExam } from '@/context/ExamContext';
import { useAuth } from '@/lib/auth';
import { 
  ShieldCheck, Clock, Target, Info, Zap, 
  CheckCircle2, Monitor, Globe, ChevronLeft,
  CheckSquare, ArrowRight, XCircle, Fingerprint, Scan, 
  Activity, GraduationCap, Loader2, User, FileText,
  Shield, Lock, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useActiveTest } from '@/hooks/useActiveTest';

export default function MockGuidelines() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { allExams } = useExam();
    const { profile } = useAuth();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const { activeTest } = useActiveTest();
    
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

    const [proctorMode, setProctorMode] = useState<'standard' | 'proctor' | null>(null);

    useEffect(() => {
        if (isMobile && proctorMode === 'proctor') {
            setProctorMode('standard');
        }
        // Force proctor mode for official live sessions on desktop
        if (!isMobile && session?.is_official) {
            setProctorMode('proctor');
        }
    }, [isMobile, proctorMode, session]);

    const handleStart = () => {
        if (!isAccepted) {
            toast({
                title: "Missing Action: Checkbox",
                description: "Please tick the confirmation checkbox at the bottom of the screen to proceed.",
                variant: "destructive"
            });
            return;
        }

        if (!proctorMode) {
            toast({
                title: "Missing Action: Protocol Selection",
                description: "Please click on either the Standard Protocol or AI Proctored Protocol to proceed.",
                variant: "destructive"
            });
            return;
        }

        if (activeTest) {
            toast({
                title: 'Active Test Found',
                description: 'You have a test in progress. Please finish it in the Dashboard first before starting a new one.',
                variant: 'destructive',
            });
            return;
        }

        const params = new URLSearchParams({
            mode: 'mock',
            full_exam: 'true',
            session_id: sessionId || '',
            practice_mode: 'true',
            proctored: proctorMode === 'proctor' ? 'true' : 'false'
        });
        navigate(`/start-test?${params.toString()}`);
    };

    const finalExamType = examTypeParam || session?.exam_type || 'cent-s-prep';
    const examConfig = allExams[finalExamType];
    
    // Scoring defaults if not from config
    const scoring = examConfig?.scoring || {
        correct: 1,
        incorrect: 0,
        skipped: 0
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initialising Secure Environment...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f1f5f9] font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
            {/* OFFICIAL HEADER */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <img src="/logo.webp" alt="ItaloStudy" className="h-8 w-auto" />
                        <div className="h-6 w-px bg-slate-200 hidden md:block" />
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-tight text-slate-600">
                                {session?.title || examConfig?.name || 'Mock Examination'}
                            </h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official Examination Guidelines</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Candidate</span>
                                <span className="text-xs font-bold text-slate-900 leading-none">{profile?.display_name || 'Guest User'}</span>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Status</span>
                            <span className="text-xs font-bold text-emerald-600 leading-none flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Ready to Launch
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="max-w-5xl mx-auto px-6 py-10 pb-32">
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-10"
                >
                    {/* SECTION 1: CANDIDATE BRIEFING */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-slate-400" />
                                <h2 className="text-xs font-black uppercase tracking-widest text-slate-600">Part 01: Examination Parameters</h2>
                            </div>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Mandatory Review</span>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Duration</p>
                                <p className="text-2xl font-black text-slate-900">{(session?.duration && session.duration !== 120) ? session.duration : (examConfig?.durationMinutes || '--')} Minutes</p>
                                <p className="text-[11px] text-slate-500 italic">No scheduled breaks allowed.</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Count</p>
                                <p className="text-2xl font-black text-slate-900">{examConfig?.totalQuestions || '--'} Questions</p>
                                <p className="text-[11px] text-slate-500">Distributed across all sections.</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Section Count</p>
                                <p className="text-2xl font-black text-slate-900">{examConfig?.sections?.length || '--'} Modules</p>
                                <p className="text-[11px] text-slate-500">Sequential progression in effect.</p>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: OFFICIAL INSTRUCTIONS */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-slate-400" />
                            <h2 className="text-xs font-black uppercase tracking-widest text-slate-600">Part 02: General Instructions</h2>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-2">Operational Rules</h3>
                                    <ul className="space-y-5">
                                        {[
                                            { title: 'Browser Lock', desc: 'The simulation environment monitors tab switching. Excessive switching may invalidate results.' },
                                            { title: 'Session Persistence', desc: 'Progress is saved in real-time. If disconnected, re-entry is permitted via Dashboard.' },
                                            { title: 'Navigation Protocol', desc: 'You can navigate between questions within a section. Once a section is finalized, review is closed.' },
                                            { title: 'Automatic Submission', desc: 'Upon timer expiry, the system will automatically synchronize and submit all responses.' }
                                        ].map((rule, idx) => (
                                            <li key={idx} className="flex gap-4">
                                                <span className="text-sm font-black text-slate-200 mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                                                <div>
                                                    <h4 className="text-[12px] font-black uppercase text-slate-900 leading-tight mb-1">{rule.title}</h4>
                                                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{rule.desc}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="space-y-8">
                                    {/* SCORING TABLE */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-2">Scoring Matrix</h3>
                                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-left text-[11px]">
                                                <thead className="bg-slate-50 font-black uppercase text-slate-400 tracking-wider">
                                                    <tr>
                                                        <th className="px-4 py-3 border-r border-slate-200">Parameter</th>
                                                        <th className="px-4 py-3">Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    <tr>
                                                        <td className="px-4 py-3 font-bold text-slate-600 bg-slate-50/30 border-r border-slate-200">Correct Response</td>
                                                        <td className="px-4 py-3 font-black text-emerald-600">+{scoring.correct} Points</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-4 py-3 font-bold text-slate-600 bg-slate-50/30 border-r border-slate-200">Incorrect Response</td>
                                                        <td className="px-4 py-3 font-black text-rose-600">{scoring.incorrect} Points</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-4 py-3 font-bold text-slate-600 bg-slate-50/30 border-r border-slate-200">Skipped/No Response</td>
                                                        <td className="px-4 py-3 font-black text-slate-400">{scoring.skipped} Points</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* TECHNICAL CHECK */}
                                    <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-6 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Monitor className="w-4 h-4 text-slate-400" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Technical Readiness</h4>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-slate-600">Secure Connection</span>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-slate-600">Browser Compatibility</span>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-slate-600">Rendering Engine</span>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: MODE SELECTION */}
                    <div className="bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/80 border-2 border-indigo-200/60 rounded-xl overflow-hidden shadow-sm relative relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

                        <div className="bg-indigo-100/50 px-8 py-4 border-b border-indigo-200/50 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-indigo-500 text-white rounded-lg shadow-sm">
                                    <Target className="w-4 h-4" />
                                </div>
                                <h2 className="text-xs font-black uppercase tracking-widest text-indigo-900">Part 03: Performance Mode</h2>
                            </div>
                            <span className="text-[10px] font-black text-white bg-indigo-600 px-3 py-1 rounded-full shadow-sm animate-pulse">Action Required</span>
                        </div>
                        <div className="p-8 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button
                                    onClick={() => setProctorMode('standard')}
                                    disabled={session?.is_official && !isMobile}
                                    className={cn(
                                        "p-8 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group text-left",
                                        proctorMode === 'standard' 
                                            ? "bg-white border-indigo-500 shadow-md ring-4 ring-indigo-500/10" 
                                            : "bg-white/60 border-indigo-100 opacity-70 hover:opacity-100 hover:border-indigo-300 hover:bg-white",
                                        (session?.is_official && !isMobile) && "opacity-50 cursor-not-allowed grayscale"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                                            proctorMode === 'standard' ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-400 group-hover:bg-indigo-100"
                                        )}>
                                            <GraduationCap className="w-6 h-6" />
                                        </div>
                                        {proctorMode === 'standard' && (
                                            <div className="text-[9px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                                Selected Mode
                                            </div>
                                        )}
                                    </div>
                                    <h4 className={cn(
                                        "text-sm font-black uppercase tracking-widest mb-2 transition-colors relative z-10",
                                        proctorMode === 'standard' ? "text-indigo-900" : "text-slate-700"
                                    )}>Standard Protocol</h4>
                                    <p className={cn(
                                        "text-[10px] font-bold leading-relaxed uppercase tracking-tight relative z-10",
                                        proctorMode === 'standard' ? "text-indigo-600/80" : "text-slate-400"
                                    )}>
                                        Traditional practice environment. No active monitoring or proctoring metrics. Ideal for casual learning.
                                    </p>
                                    {proctorMode === 'standard' && (
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent pointer-events-none" />
                                    )}
                                </button>

                                <button
                                    onClick={() => setProctorMode('proctor')}
                                    disabled={isMobile}
                                    className={cn(
                                        "p-8 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group text-left",
                                        isMobile 
                                            ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed grayscale" 
                                            : proctorMode === 'proctor' 
                                                ? "bg-white border-violet-500 shadow-md ring-4 ring-violet-500/10" 
                                                : "bg-white/60 border-violet-100 opacity-70 hover:opacity-100 hover:border-violet-300 hover:bg-white grayscale hover:grayscale-0"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                                            isMobile ? "bg-slate-200 text-slate-400" :
                                            proctorMode === 'proctor' ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-400 group-hover:bg-violet-100"
                                        )}>
                                            <Scan className="w-6 h-6" />
                                        </div>
                                        <div className={cn(
                                            "px-2 py-1 text-[8px] font-black uppercase rounded-full tracking-widest",
                                            isMobile ? "bg-slate-200 text-slate-500" :
                                            proctorMode === 'proctor' ? "bg-violet-100 text-violet-700" : "bg-violet-600 text-white"
                                        )}>Desktop Required</div>
                                    </div>
                                    <h4 className={cn(
                                        "text-sm font-black uppercase tracking-widest mb-2 transition-colors relative z-10",
                                        proctorMode === 'proctor' ? "text-violet-900" : "text-slate-700"
                                    )}>AI Proctored Protocol</h4>
                                    <p className={cn(
                                        "text-[10px] font-bold leading-relaxed uppercase tracking-tight relative z-10",
                                        proctorMode === 'proctor' ? "text-violet-600/80" : "text-slate-400"
                                    )}>
                                        Board-certified integrity monitoring. Real-time AI analysis and security verification.
                                    </p>
                                    {proctorMode === 'proctor' && (
                                        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 to-transparent pointer-events-none" />
                                    )}
                                </button>
                            </div>

                            {proctorMode === 'proctor' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className="mt-8 overflow-hidden border-2 border-violet-200 rounded-xl shadow-sm bg-white"
                                >
                                    <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-4 border-b border-violet-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-white" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Protocol Specification</span>
                                        </div>
                                        <span className="text-[8px] font-bold text-violet-100 uppercase tracking-widest bg-white/20 px-2 py-1 rounded">v2.4 Certified AI</span>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                                                        <Scan className="w-5 h-5 text-violet-600" />
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[11px] font-black uppercase tracking-tight text-violet-900 mb-1">Visual Authentication</h5>
                                                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                                                            Continuous face detection and presence verification to ensure candidate integrity.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                                                        <Activity className="w-5 h-5 text-violet-600" />
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[11px] font-black uppercase tracking-tight text-violet-900 mb-1">Attention Metrics</h5>
                                                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                                                            Real-time analysis of focus and interaction patterns to prevent external assistance.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-5 rounded-xl flex flex-col justify-center relative overflow-hidden">
                                                <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10" />
                                                <div className="flex items-center gap-2 mb-3 relative z-10">
                                                    <div className="p-1.5 bg-emerald-500 text-white rounded-md">
                                                        <Lock className="w-3 h-3" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Privacy Guarantee</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-emerald-600/80 leading-relaxed uppercase relative z-10">
                                                    Official examinations do not record or transmit biometric data. All AI analysis is performed locally.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* SECTION 4: FINAL CONFIRMATION */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex gap-4">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-900 mb-1">Warning: Exam Initiation</h4>
                            <p className="text-[11px] font-medium text-amber-700 leading-relaxed">
                                Once the mock exam is started, the timer will begin immediately. Ensure you are in a quiet environment with a stable internet connection. Closing the browser or navigating away may result in loss of progress.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* OFFICIAL FOOTER ACTIONS */}
            <footer className="bg-white border-t border-slate-200 fixed bottom-0 left-0 w-full z-50 py-4 px-10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Checkbox 
                            id="terms" 
                            checked={isAccepted}
                            onCheckedChange={(checked) => setIsAccepted(checked === true)}
                            className="w-5 h-5 border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900 transition-colors"
                        />
                        <Label 
                            htmlFor="terms" 
                            className="text-[11px] font-medium max-w-md leading-tight text-slate-500 cursor-pointer select-none"
                        >
                            By clicking here, I confirm that I have read the instructions and am ready to start the personal mock practice session.
                        </Label>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/mock-exams')}
                            className="h-12 px-8 rounded-lg text-xs font-black uppercase tracking-widest border-slate-200 text-slate-500 hover:bg-slate-50 transition-all w-full md:w-auto"
                        >
                            Return to Selection
                        </Button>
                        <Button
                            onClick={handleStart}
                            className={cn(
                                "h-12 px-12 rounded-sm font-black uppercase text-xs tracking-[0.3em] transition-all flex items-center gap-3 w-full md:w-auto",
                                (isAccepted && proctorMode)
                                    ? "bg-slate-900 text-white hover:bg-slate-800 shadow-sm" 
                                    : "bg-slate-100 text-slate-400 opacity-90 shadow-none border border-slate-200"
                            )}
                        >
                            {proctorMode === 'proctor' && <Shield className="w-3 h-3 text-white" />}
                            Start Official Mock
                        </Button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
