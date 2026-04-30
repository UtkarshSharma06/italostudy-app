import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { generateUUID } from '@/lib/uuid';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useExam } from '@/context/ExamContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { SectionTimer } from '@/components/SectionTimer';
import { SectionProgressTracker } from '@/components/SectionProgressTracker';
import {
    ChevronRight, ChevronLeft,
    CheckCircle, Flag, Loader2, Bookmark, AlertTriangle, Lock
} from 'lucide-react';
import { MathText } from '@/components/MathText';
import DiagramRenderer from '@/components/DiagramRenderer';
import QuestionMedia from '@/components/QuestionMedia';
import { MediaContent } from '@/types/test';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useProctoring } from '@/hooks/useProctoring';
// Proctoring components are lazy-loaded — the ML chunk only downloads
// when a proctored mobile exam actually starts
const ProctoringSetup = lazy(() => import('@/components/ProctoringSetup'));
const ProctoringSystem = lazy(() => import('@/components/ProctoringSystem'));
import { ReportQuestionDialog } from '@/components/ReportQuestionDialog';

interface Question {
    id: string;
    question_number: number;
    question_text: string;
    options: string[];
    section_number: number;
    section_name: string;
    diagram?: any;
    media?: MediaContent | null;
    is_saved?: boolean;
    is_reported_by_user?: boolean;
    is_corrected?: boolean;
    master_question_id?: string | null;
    practice_question_id?: string | null;
    session_question_id?: string | null;
    source_table?: string;
    passage?: string; // Added passage to Question interface
    difficulty?: string;
}

interface TestSection {
    number: number;
    name: string;
    questionCount: number;
    durationMinutes: number;
    icon?: string;
}

export default function MobileSectionedTest() {
    const { activeExam, allExams } = useExam();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const params = useParams();
    const id = params.id || params.testId;

    // State
    const [test, setTest] = useState<any>(null);
    const [sections, setSections] = useState<TestSection[]>([]);
    const [allQuestions, setAllQuestions] = useState<Question[]>([]);
    const [currentSection, setCurrentSection] = useState(1);
    const [completedSections, setCompletedSections] = useState<number[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [infractions, setInfractions] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [isProctored, setIsProctored] = useState(false); // Default to false for safety
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [sectionTimeRemaining, setSectionTimeRemaining] = useState(0);
    const [showProctoringSetup, setShowProctoringSetup] = useState(false);
    const [isDisqualified, setIsDisqualified] = useState(false);

    const [isLocked, setIsLocked] = useState(false);
    const [sessionId] = useState(() => {
        const key = `test_session_${id}`;
        let sid = sessionStorage.getItem(key);
        if (!sid) {
            sid = generateUUID();
            sessionStorage.setItem(key, sid);
        }
        return sid;
    });

    // Get current section's questions based on index ranges
    const sectionQuestions = (() => {
        if (sections.length === 0 || allQuestions.length === 0) return [];

        // Calculate the slice for the current section
        let startIndex = 0;
        for (let i = 0; i < currentSection - 1; i++) {
            startIndex += sections[i].questionCount;
        }
        const currentCount = sections[currentSection - 1]?.questionCount || 0;
        return allQuestions.slice(startIndex, startIndex + currentCount);
    })();

    const currentQuestion = sectionQuestions[currentQuestionIndex];
    const currentSectionInfo = sections.find(s => s.number === currentSection);

    useEffect(() => {
        if (isDisqualified) return;

        // STRICT MODE BYPASS: Evaluate mount caching SYNCHRONOUSLY
        // before making the async DB call.
        const lastMount = (window as any)[`mount_cache_${id}`] || 0;
        const isRecentMount = Date.now() - lastMount < 2000;
        
        // Immediately set the cache if first run
        if (!lastMount) {
            (window as any)[`mount_cache_${id}`] = Date.now();
        }

        if (user && id) {
            fetchTestData(isRecentMount);
        }
    }, [user, id, isDisqualified]);

    // Proctoring Logic
    useEffect(() => {
        if (!isProctored || isLoading || isSubmitting) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                handleInfraction();
            }
        };

        const handleBlur = () => {
            handleInfraction();
        };

        const handleInfraction = () => {
            setInfractions(prev => {
                const next = prev + 1;
                if (next >= 5) {
                    setIsDisqualified(true);
                    toast({
                        title: "Exam Terminated",
                        description: "Security protocol violation limit reached.",
                        variant: "destructive"
                    });
                    abortTest();
                    return next;
                }
                setShowWarning(true);
                return next;
            });
        };

        const handleBeforeUnload = () => {
            // Synchronous release for "Ghost Session" prevention
            if (id && sessionId) {
                // Use beacon or sync request to notify DB on way out
                supabase
                    .from('tests')
                    .update({ active_session_id: null, last_heartbeat_at: null })
                    .eq('id', id)
                    .eq('active_session_id', sessionId);
            }
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Attempt Fullscreen
        const enterFullscreen = async () => {
            try {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
            } catch (e) {
            }
        };

        enterFullscreen();

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            handleBeforeUnload(); // Also clear on component unmount
        };
    }, [isProctored, isLoading, isSubmitting, id, sessionId]);

    const saveProgress = useCallback(async () => {
        if (!id || !test || isSubmitting) return;

        // Calculate global question index for cross-device sync
        let globalQuestionIndex = currentQuestionIndex;
        if (sections.length > 0) {
            let offset = 0;
            for (let i = 0; i < currentSection - 1; i++) {
                offset += sections[i].questionCount;
            }
            globalQuestionIndex = offset + currentQuestionIndex;
        }

        try {
            await (supabase as any)
                .from('tests')
                .update({
                    current_question_index: globalQuestionIndex,
                    current_section: currentSection,
                    current_section_index: currentSection - 1,
                    time_remaining_seconds: timeRemaining,
                    section_time_remaining_seconds: sectionTimeRemaining,
                    sections_completed: completedSections,
                    active_session_id: sessionId,
                    last_heartbeat_at: new Date().toISOString()
                })
                .eq('id', id);
        } catch (e) {
            console.error('Failed to auto-save progress:', e);
        }
    }, [id, test, isSubmitting, currentQuestionIndex, sections, currentSection, timeRemaining, sectionTimeRemaining, completedSections, sessionId]);

    // Timer logic — stable interval using refs, no teardown every tick
    const timeRemainingRef = useRef(timeRemaining);
    const sectionTimeRemainingRef = useRef(sectionTimeRemaining);
    useEffect(() => { timeRemainingRef.current = timeRemaining; }, [timeRemaining]);
    useEffect(() => { sectionTimeRemainingRef.current = sectionTimeRemaining; }, [sectionTimeRemaining]);

    // Auto-save periodically for Cross-device sync (Standard Mode)
    useEffect(() => {
        if (!test || test.status !== 'in_progress' || isDisqualified || isLoading) return;
        
        // High frequency (10s) for standard, Low frequency (30s) for restricted missions
        const isStandard = !isProctored && !test.is_ranked;
        const intervalTime = isStandard ? 10000 : 30000;

        const interval = setInterval(() => {
            saveProgress();
        }, intervalTime);

        return () => clearInterval(interval);
    }, [test, isDisqualified, isLoading, isProctored, saveProgress]);

    // HIGH-FREQUENCY Local Caching for Standard Mode (every 1.5 seconds)
    // Ensures exact restoration on accidental reloads
    useEffect(() => {
        if (!test || isProctored || test.is_ranked || isDisqualified || isLoading) return;

        const cacheInterval = setInterval(() => {
            // Calculate global index for accurate restoration
            let globalIdx = currentQuestionIndex;
            if (sections.length > 0) {
                let offset = 0;
                for (let i = 0; i < currentSection - 1; i++) {
                    offset += sections[i].questionCount;
                }
                globalIdx = offset + currentQuestionIndex;
            }

            sessionStorage.setItem(`test_cache_${id}`, JSON.stringify({
                timeRemaining,
                sectionTimeRemaining,
                currentSection,
                globalQuestionIndex: globalIdx,
                timestamp: Date.now()
            }));
        }, 1500);

        return () => clearInterval(cacheInterval);
    }, [test, id, timeRemaining, sectionTimeRemaining, currentSection, currentQuestionIndex, isDisqualified, isLoading, isProctored, sections]);

    useEffect(() => {
        if (!test || isLoading || isSubmitting || showProctoringSetup || isDisqualified) return;

        const timer = setInterval(() => {
            const newTime = Math.max(0, timeRemainingRef.current - 1);
            setTimeRemaining(newTime);
            if (newTime <= 0) {
                clearInterval(timer);
                finishTest();
                return;
            }
            const newSectionTime = Math.max(0, sectionTimeRemainingRef.current - 1);
            setSectionTimeRemaining(newSectionTime);
            if (test.section_timing_mode !== 'total' && newSectionTime <= 0 && currentSectionInfo) {
                clearInterval(timer);
                // Force immediate transition
                handleSectionTimeExpired();
            }
        }, 1000);

        return () => clearInterval(timer);
        // Restart on test, section, or setup visibility changes
    }, [test, isLoading, isSubmitting, currentSection, showProctoringSetup]);

    const {
        cameraAllowed,
        isFullscreen: isProctoringFullscreen,
        requestPermissions,
        enterFullscreen: enterProctoringFullscreen,
        videoStream,
        aiState,
        setVideoElement,
        startAI,
        stopAI
    } = useProctoring({
        enabled: !showProctoringSetup && isProctored && !isDisqualified && !isLoading && !isSubmitting,
        testId: id!,
        userId: user?.id || 'anonymous',
        onDisqualify: () => setIsDisqualified(true)
    });

    useEffect(() => {
        if (isProctored && !isDisqualified) {
            setShowProctoringSetup(true);
            if (startAI) startAI();
        }
        return () => { if (stopAI) stopAI(); };
    }, [isProctored, isDisqualified]);



    const abortTest = async () => {
        setIsSubmitting(true);
        try {
            await (supabase as any).from('tests').delete().eq('id', id);
        } catch (e) {
            console.error('Failed to abort test:', e);
        }
        setIsSubmitting(false);
        navigate('/mobile/dashboard');
    };

    useEffect(() => {
        if (isDisqualified) {
            abortTest();
        }
    }, [isDisqualified]);

    const fetchTestData = async (isRecentMount: boolean) => {
        if (!id) return;
        
        setIsLoading(true);
        try {
            // 1. Parallel fetch Test and Questions (Core roundtrip)
            const [testRes, questionsRes] = await Promise.all([
                supabase.from('tests').select('*').eq('id', id).maybeSingle(),
                supabase.from('questions').select('*').eq('test_id', id).order('question_number')
            ]);

            if (testRes.error || !testRes.data) {
                toast({ title: 'Test not found', variant: 'destructive' });
                setIsLoading(false);
                navigate('/mobile/dashboard');
                return;
            }

            const testData = testRes.data;
            if (testData.status === 'completed') {
                setIsLoading(false);
                navigate(`/results/${id}`);
                return;
            }

            // Check for cross-device locking
            if (testData.active_session_id && testData.active_session_id !== sessionId) {
                const lastHeartbeat = new Date(testData.last_heartbeat_at).getTime();
                if (Date.now() - lastHeartbeat < 20000) {
                    setIsLocked(true);
                    setIsLoading(false);
                    return;
                }
            }

            setTest(testData);
            setIsProctored((testData as any).is_proctored === true);

            const isReload = sessionStorage.getItem(`test_${id}_started`) === 'true';
            const isRankedLive = testData.is_ranked === true;

            if (isReload && !isRecentMount && ((testData as any).is_proctored || isRankedLive)) {
                toast({ title: 'Mission Terminated', description: 'Exam terminated due to reload.', variant: 'destructive' });
                await supabase.from('questions').delete().eq('test_id', id);
                await supabase.from('tests').delete().eq('id', id);
                setIsDisqualified(true);
                setIsLoading(false);
                return;
            }

            sessionStorage.setItem(`test_${id}_started`, 'true');

            // --- Reload Persistence Logic ---
            const cacheKey = `test_cache_${id}`;
            const cachedStateRaw = sessionStorage.getItem(cacheKey);
            const isStandardMode = !(testData as any).is_proctored && !testData.is_ranked;

            let restoredSection = testData.current_section ? parseInt(String(testData.current_section)) : (testData.current_section_index !== null ? testData.current_section_index + 1 : 1);
            let restoredTime = testData.time_remaining_seconds;
            let restoredSectionTime = testData.section_time_remaining_seconds;
            let restoredQuestionIdx = testData.current_question_index;

            if (isStandardMode && cachedStateRaw) {
                try {
                    const cached = JSON.parse(cachedStateRaw);
                    if (Date.now() - cached.timestamp < 300000) {
                        restoredSection = cached.currentSection;
                        restoredTime = cached.timeRemaining;
                        restoredSectionTime = cached.sectionTimeRemaining;
                        restoredQuestionIdx = cached.globalQuestionIndex;
                    }
                } catch (e) {}
            }

            setCurrentSection(restoredSection);
            setCompletedSections((testData.sections_completed || []).map(Number));

            const questionsData = questionsRes.data || [];
            
            if (questionsData.length > 0) {
                // 2. Parallel secondary data
                const masterIds = questionsData.map((q: any) => q.master_question_id).filter(Boolean);
                const questionIds = questionsData.map((q: any) => q.id);

                const [masterOrderRes, bookmarksRes] = await Promise.all([
                    masterIds.length > 0 ? supabase.from('session_questions').select('id, order_index').in('id', masterIds) : Promise.resolve({ data: [] }),
                    user?.id && questionIds.length > 0 ? supabase.from('bookmarked_questions').select('question_id, is_reported_by_user').eq('user_id', user.id).in('question_id', questionIds) : Promise.resolve({ data: [] })
                ]);

                let finalQuestions = [...questionsData];
                if (masterOrderRes.data && masterOrderRes.data.length > 0) {
                    const orderMap = new Map<string, number>(
                        masterOrderRes.data.map((m: any) => [m.id, m.order_index ?? 9999] as [string, number])
                    );
                    finalQuestions = finalQuestions.sort((a: any, b: any) => {
                        const oa = orderMap.get(a.master_question_id) ?? 9999;
                        const ob = orderMap.get(b.master_question_id) ?? 9999;
                        return oa - ob;
                    });
                }

                const bookmarkMap = new Map<string, any>(
                    (bookmarksRes.data?.map(b => [b.question_id, b as any]) || []) as [string, any][]
                );

                const processedQuestions = finalQuestions.map((q: any, idx: number) => ({
                    ...q,
                    question_number: idx + 1,
                    passage: q.passage,
                    media: q.media as unknown as MediaContent | null,
                    is_saved: bookmarkMap.has(q.id),
                    is_reported_by_user: (bookmarkMap.get(q.id) as any)?.is_reported_by_user || false,
                    is_marked: false
                }));

                setAllQuestions(processedQuestions);
                
                // Restore answers
                const answersMap: Record<string, number> = {};
                questionsData.forEach((q: any) => {
                    if (q.user_answer !== null && q.user_answer !== undefined) {
                        answersMap[q.id] = q.user_answer;
                    }
                });
                setAnswers(answersMap);

                // 3. BACKGROUND FALLBACKS
                const missingPassageIds = processedQuestions
                    .filter((q: any) => !q.passage && (q.master_question_id || q.practice_question_id || q.session_question_id))
                    .map((q: any) => q.master_question_id || q.practice_question_id || q.session_question_id);

                if (missingPassageIds.length > 0) {
                    Promise.all([
                        supabase.from('practice_questions').select('id, passage').in('id', missingPassageIds),
                        supabase.from('session_questions').select('id, passage').in('id', missingPassageIds),
                        supabase.from('learning_quiz_questions').select('id, passage').in('id', missingPassageIds)
                    ]).then(([pRes, sRes, lRes]) => {
                        const pMap = new Map();
                        pRes.data?.forEach((m: any) => { if (m.passage) pMap.set(m.id, m.passage); });
                        sRes.data?.forEach((m: any) => { if (m.passage) pMap.set(m.id, m.passage); });
                        lRes.data?.forEach((m: any) => { if (m.passage) pMap.set(m.id, m.passage); });
                        if (pMap.size > 0) {
                            setAllQuestions(prev => prev.map(q => {
                                const mid = q.master_question_id || q.practice_question_id || q.session_question_id;
                                if (!q.passage && mid && pMap.has(mid)) return { ...q, passage: pMap.get(mid) };
                                return q;
                            }));
                        }
                    });
                }

                // 4. Dynamic Section Generation
                let dynamicSections: TestSection[] = [];
                const baseType = testData.exam_type?.toLowerCase().split('-')[0];
                const normalizedId = baseType === 'cent' ? 'cent-s-prep' : (baseType === 'imat' ? 'imat-prep' : testData.exam_type);
                const examConfig = allExams[normalizedId];

                if (examConfig?.sections && (testData.test_type === 'mock' || testData.is_mock)) {
                    dynamicSections = examConfig.sections.map((s, idx) => ({
                        number: idx + 1,
                        name: s.name,
                        questionCount: s.questionCount,
                        durationMinutes: s.durationMinutes,
                        icon: s.icon || '📝'
                    }));
                } else {
                    let currentSectionName = '';
                    let currentSecIdx = -1;
                    finalQuestions.forEach((q: any) => {
                        const qSection = q.section_name || 'General';
                        if (qSection !== currentSectionName) {
                            currentSectionName = qSection;
                            currentSecIdx++;
                            const configSection = examConfig?.sections?.find((s: any) => s.name === qSection);
                            dynamicSections.push({
                                number: currentSecIdx + 1,
                                name: qSection,
                                questionCount: 0,
                                durationMinutes: configSection?.durationMinutes || 0,
                                icon: configSection?.icon || '📝'
                            });
                        }
                        if (dynamicSections[currentSecIdx]) dynamicSections[currentSecIdx].questionCount++;
                    });
                }
                setSections(dynamicSections);

                // Restore relative index
                if (restoredQuestionIdx !== null && restoredQuestionIdx !== undefined) {
                    let offset = 0;
                    for (let i = 0; i < restoredSection - 1; i++) offset += dynamicSections[i]?.questionCount || 0;
                    const relativeIndex = Math.max(0, restoredQuestionIdx - offset);
                    const currentSecCount = dynamicSections[restoredSection - 1]?.questionCount || 0;
                    setCurrentQuestionIndex(Math.min(relativeIndex, Math.max(0, currentSecCount - 1)));
                }

                // Timers
                setTimeRemaining(restoredTime ?? (testData.time_limit_minutes * 60));
                if (restoredSectionTime !== null) {
                    setSectionTimeRemaining(restoredSectionTime);
                } else {
                    const currentSecConfig = dynamicSections.find(s => s.number === restoredSection);
                    if (currentSecConfig && currentSecConfig.durationMinutes) setSectionTimeRemaining(currentSecConfig.durationMinutes * 60);
                }

                setIsLoading(false); // FINISH LOADING
            } else if (testData.total_questions > 0) {
                setTimeout(async () => {
                    const { data: retryData } = await supabase.from('questions').select('*').eq('test_id', id).order('question_number');
                    if (retryData && retryData.length > 0) {
                        setAllQuestions(retryData.map((rq: any, idx: number) => ({
                            ...rq,
                            question_number: idx + 1,
                            passage: rq.passage,
                            media: rq.media as unknown as MediaContent | null,
                            is_saved: false,
                            is_marked: false
                        })));
                    }
                    setIsLoading(false);
                }, 1000);
            } else {
                setIsLoading(false);
            }
        } catch (e: any) {
            toast({ title: "Error loading test", description: e.message, variant: "destructive" });
            setIsLoading(false);
            navigate('/mobile/dashboard');
        }
    };

    const saveAnswer = async (questionId: string, selectedIndex: number) => {
        setAnswers(prev => ({ ...prev, [questionId]: selectedIndex }));

        // Save to database (Sync with laptop by updating questions table)
        await (supabase as any)
            .from('questions')
            .update({
                user_answer: selectedIndex,
                answered_at: new Date().toISOString()
            })
            .eq('id', questionId);
    };

    const handleAnswerSelect = (index: number) => {
        if (currentQuestion) {
            Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
            saveAnswer(currentQuestion.id, index);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < sectionQuestions.length - 1) {
            Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const toggleFlag = () => {
        if (!currentQuestion) return;
        setFlaggedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(currentQuestion.id)) {
                newSet.delete(currentQuestion.id);
            } else {
                newSet.add(currentQuestion.id);
            }
            return newSet;
        });
    };

    const handleBookmark = async () => {
        if (!user || !currentQuestion) return;

        // Prevent unbookmarking if reported and not fixed
        if (currentQuestion.is_saved && currentQuestion.is_reported_by_user && !currentQuestion.is_corrected) {
            toast({
                title: "Mandatory Bookmark",
                description: "This question is reported and cannot be removed until fixed.",
                variant: "destructive"
            });
            return;
        }

        const newSavedState = !currentQuestion.is_saved;
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { });

        setAllQuestions(prev => prev.map(q => q.id === currentQuestion.id ? { ...q, is_saved: newSavedState } : q));

        if (newSavedState) {
            try {
                const { error } = await (supabase as any).from('bookmarked_questions').insert({
                    user_id: user.id,
                    question_id: currentQuestion.id,
                    master_question_id: currentQuestion.master_question_id || currentQuestion.practice_question_id || currentQuestion.session_question_id || currentQuestion.id,
                    source_table: currentQuestion.source_table || (test?.test_type === 'mock' ? 'session_questions' : 'practice_questions'),
                    exam_type: test?.exam_type || 'standard'
                });

                if (error) throw error;
                toast({ title: "Question Saved" });
            } catch (err: any) {
                console.error("Bookmark Error:", err);
                toast({ title: "Save Failed", description: err.message, variant: "destructive" });
                // Revert state
                setAllQuestions(prev => prev.map(q => q.id === currentQuestion.id ? { ...q, is_saved: false } : q));
            }
        } else {
            try {
                const { error } = await (supabase as any).from('bookmarked_questions').delete().eq('question_id', currentQuestion.id).eq('user_id', user.id);
                if (error) throw error;
                toast({ title: "Bookmark Removed" });
            } catch (err: any) {
                console.error("Unbookmark Error:", err);
                toast({ title: "Remove Failed", description: err.message, variant: "destructive" });
                // Revert state
                setAllQuestions(prev => prev.map(q => q.id === currentQuestion.id ? { ...q, is_saved: true } : q));
            }
        }
    };

    const [showReportDialog, setShowReportDialog] = useState(false);

    const handleReport = async (reason: string, details?: string) => {
        if (!user || !currentQuestion) return;

        try {
            const masterQuestionId = currentQuestion.master_question_id || currentQuestion.practice_question_id || currentQuestion.session_question_id;
            const { error } = await (supabase as any).from('question_reports').insert({
                user_id: user.id,
                question_id: currentQuestion.id,
                master_question_id: masterQuestionId,
                source_table: currentQuestion.source_table || 'session_questions',
                reason: reason,
                details: details,
                status: 'pending'
            });

            if (error) throw error;

            // Automatically bookmark if reported
            setAllQuestions(prev => prev.map(q =>
                q.id === currentQuestion.id ? { ...q, is_reported_by_user: true, is_saved: true } : q
            ));

            await (supabase as any).from('bookmarked_questions').upsert({
                user_id: user.id,
                question_id: currentQuestion.id,
                master_question_id: masterQuestionId,
                source_table: currentQuestion.source_table || (test?.test_type === 'mock' ? 'session_questions' : 'practice_questions'),
                exam_type: test?.exam_type || 'standard',
                is_reported_by_user: true
            }, { onConflict: 'user_id,question_id' });

            toast({ title: "Report Submitted", description: "Question has been bookmarked for tracking." });
        } catch (err: any) {
            console.error("Report Error:", err);
            toast({ title: "Report Failed", description: err.message, variant: "destructive" });
            throw err; // Re-throw to let the dialog handle it if needed
        }
    };

    const handleOpenReport = () => {
        if (!user || !currentQuestion) return;
        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => { });
        setShowReportDialog(true);
    };

    const handleSectionTimeExpired = async () => {
        toast({
            title: "Time's Up!",
            description: `Section ${currentSection} time has expired. Moving to next section.`,
            variant: "default"
        });
        await completeSection();
    };

    const completeSection = async () => {
        setIsSubmitting(true);
        try {
            // Mark section as completed (ONLY if not IMAT)
            const isImat = test.exam_type === 'imat-prep';
            const newCompletedSections = isImat ? completedSections : [...completedSections, currentSection];

            // Calculate next section start index
            let nextSectionStartIndex = 0;
            for (let i = 0; i < currentSection; i++) {
                nextSectionStartIndex += (sections[i]?.questionCount || 0);
            }

            // Update test record
            await (supabase as any)
                .from('tests')
                .update({
                    current_section: currentSection + 1,
                    current_section_index: currentSection,
                    current_question_index: nextSectionStartIndex,
                    sections_completed: newCompletedSections
                })
                .eq('id', id);

            // Check if this was the last section
            if (currentSection >= sections.length) {
                await finishTest();
            } else {
                // Move to next section
                setCompletedSections(newCompletedSections);
                setCurrentSection(currentSection + 1);
                setCurrentQuestionIndex(0);
                setShowConfirmModal(false);
            }
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };


    const finishTest = async () => {
        setIsSubmitting(true);
        toast({
            title: 'Submitting Results...',
            description: 'Your results are being calculated and saved.',
        });
        try {
            // Fetch correct answers for comparison
            const { data: questionsData } = await (supabase as any)
                .from('questions')
                .select('id, correct_index, section_number')
                .eq('test_id', id);

            const examConfig = allExams[test.exam_type];
            let correct = 0;
            let wrong = 0;
            let skipped = 0;
            let rawScore = 0;

            questionsData?.forEach((q: any) => {
                const userAns = answers[q.id];
                if (userAns === undefined || userAns === null) {
                    skipped++;
                    rawScore += examConfig?.scoring.skipped || 0;
                } else if (userAns === q.correct_index) {
                    correct++;
                    rawScore += examConfig?.scoring.correct || 1;
                } else {
                    wrong++;
                    rawScore += examConfig?.scoring.incorrect || 0;
                }
            });

            const total = questionsData?.length || 1;
            const scorePercentage = Math.max(0, Math.round((correct / total) * 100));

            // Update test record with calculated results
            await (supabase as any)
                .from('tests')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    score: scorePercentage,
                    correct_answers: correct,
                    wrong_answers: wrong,
                    skipped_answers: skipped,
                    is_ranked: test.test_type === 'mock', // Enable ranking for mocks
                    active_session_id: null,
                    last_heartbeat_at: null
                })
                .eq('id', id);

            // Update topic performance for analytics
            const topicGroups: Record<string, { correct: number; total: number; subject: string }> = {};

            questionsData?.forEach((q: any) => {
                const userAns = answers[q.id];
                if (userAns === undefined || userAns === null || userAns === -1) return;

                const subject = q.subject || test?.subject || 'General';
                const topic = q.topic || subject;
                const key = `${subject}:${topic}`;

                if (!topicGroups[key]) {
                    topicGroups[key] = { correct: 0, total: 0, subject };
                }
                topicGroups[key].total++;
                if (userAns === q.correct_index) {
                    topicGroups[key].correct++;
                }
            });

            await Promise.all(Object.entries(topicGroups).map(async ([key, data]) => {
                const [subject, topic] = key.split(':');
                const { data: existing } = await (supabase.from('topic_performance') as any)
                    .select('*')
                    .eq('user_id', user!.id)
                    .eq('subject', data.subject)
                    .eq('topic', topic)
                    .eq('exam_type', test.exam_type)
                    .maybeSingle();

                if (existing) {
                    await supabase
                        .from('topic_performance')
                        .update({
                            total_questions: (existing.total_questions || 0) + data.total,
                            correct_answers: (existing.correct_answers || 0) + data.correct,
                            accuracy_percentage: (((existing.correct_answers || 0) + data.correct) / ((existing.total_questions || 0) + data.total)) * 100,
                            last_attempted_at: new Date().toISOString(),
                        })
                        .eq('id', existing.id);
                } else {
                    await supabase
                        .from('topic_performance')
                        .insert({
                            user_id: user!.id,
                            exam_type: test.exam_type,
                            subject: data.subject,
                            topic,
                            total_questions: data.total,
                            correct_answers: data.correct,
                            accuracy_percentage: (data.correct / data.total) * 100,
                            last_attempted_at: new Date().toISOString(),
                        });
                }
            }));

            // Exit fullscreen if active
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }

            toast({ title: "Test Complete!", description: "Your results have been calculated." });
            navigate(`/results/${id}`);
        } catch (e: any) {
            toast({ title: "Error finishing test", description: e.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const requestSectionComplete = () => {
        setShowConfirmModal(true);
    };

    if (isLocked) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center uppercase tracking-tight">
                <div className="w-16 h-16 bg-amber-500/10 rounded-[2rem] flex items-center justify-center mb-6 border border-amber-500/20">
                    <Lock className="w-8 h-8 text-amber-500" />
                </div>
                <h1 className="text-xl font-black text-white mb-2">Session Conflict</h1>
                <p className="text-slate-500 text-[10px] mb-8 max-w-[280px] leading-relaxed font-bold tracking-widest">
                    ACTIVE SESSION DETECTED ON ANOTHER TERMINAL. PLEASE DISCONNECT REMOTE SESSIONS TO SECURE THIS DATASTREAM.
                </p>
                <div className="grid gap-4 w-full max-w-[200px]">
                    <Button
                        onClick={() => window.location.reload()}
                        className="h-12 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl"
                    >
                        Retry Connection
                    </Button>
                    <Button
                        onClick={() => navigate('/mobile/dashboard')}
                        variant="ghost"
                        className="h-12 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:bg-white/5 rounded-xl border border-white/10"
                    >
                        Return Home
                    </Button>
                </div>
            </div>
        );
    }

    if (isDisqualified) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center uppercase tracking-tight">
                <div className="w-16 h-16 bg-rose-500/10 rounded-[2rem] flex items-center justify-center mb-6 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                    <AlertTriangle className="w-8 h-8 text-rose-500" />
                </div>
                <h1 className="text-xl font-black text-white mb-2">Examination Terminated</h1>
                <p className="text-slate-500 text-[10px] mb-8 max-w-[280px] leading-relaxed font-bold tracking-widest opacity-60">
                    NEURAL MONITORING HAS DETECTED CRITICAL SECURITY FAILURES. SESSION INTEGRITY COMPROMISED. DATA HAS BEEN EXPUNGED.
                </p>
                <Button 
                    onClick={() => navigate('/mobile/dashboard')}
                    className="w-full max-w-[200px] h-12 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg"
                >
                    Return Home
                </Button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-center p-8">
                <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
                    <Loader2 className="w-8 h-8 text-slate-600 dark:text-slate-400 animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Preparing Assessment</h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[260px] leading-relaxed">
                    Loading your exam environment and securing the session. Please wait.
                </p>
            </div>
        );
    }

    if (!currentQuestion || !currentSectionInfo) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950 text-center p-8 uppercase tracking-tight">
                <div>
                    <div className="w-16 h-16 bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-white/5">
                        <AlertTriangle className="w-8 h-8 text-slate-600" />
                    </div>
                    <h2 className="text-xl font-black text-white mb-4">Mission Unavailable</h2>
                    <p className="text-slate-500 text-[10px] font-bold tracking-widest mb-8">NO ACTIVE QUESTION SETS DETECTED FOR THIS SESSION.</p>
                    <Button 
                        onClick={() => navigate('/mobile/dashboard')}
                        className="h-12 px-8 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl"
                    >
                        Return Home
                    </Button>
                </div>
            </div>
        );
    }

    const answeredInSection = sectionQuestions.filter(q => answers[q.id] !== undefined).length;
    const isCurrentQuestionAnswered = currentQuestion && answers[currentQuestion.id] !== undefined;

    return (
        <div className="flex flex-col min-h-screen bg-background pb-24 relative">
            {!showProctoringSetup && !isDisqualified && (
                <>
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                        <h1 className="text-base font-black uppercase tracking-tight text-primary leading-tight">
                            {currentSectionInfo.name}
                        </h1>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mt-0.5">
                            Section {currentSection} • {currentSectionInfo.questionCount} Questions • {currentSectionInfo.durationMinutes}m
                        </p>
                    </div>
                    <SectionTimer
                        durationMinutes={(test.exam_type === 'imat-prep' || test.section_timing_mode === 'total') ? test.time_limit_minutes : currentSectionInfo.durationMinutes}
                        onTimeExpired={(test.exam_type === 'imat-prep' || test.section_timing_mode === 'total') ? finishTest : handleSectionTimeExpired}
                        secondsLeft={(test.exam_type === 'imat-prep' || test.section_timing_mode === 'total') ? timeRemaining : sectionTimeRemaining}
                        warningMinutes={5}
                        onWarning={() => toast({
                            title: "5 Minutes Remaining",
                            description: "Almost out of time!",
                            variant: "default"
                        })}
                    />
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(currentQuestionIndex + 1) / sectionQuestions.length * 100}%` }}
                    />
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                {/* Question */}
                <div className="bg-secondary/10 border-2 border-slate-200 rounded-3xl p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="w-10 h-10 bg-primary/10 text-primary border border-primary/20 rounded-xl flex items-center justify-center font-black text-sm">
                                {currentQuestion.question_number}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-primary tracking-widest">
                                    {currentSectionInfo.name}
                                </span>
                                <span className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest leading-none">
                                    {currentSectionInfo.icon} Section {currentSection}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => !completedSections.includes(currentSection) && toggleFlag()}
                                disabled={completedSections.includes(currentSection)}
                                className={`rounded-xl px-2 h-8 ${flaggedQuestions.has(currentQuestion.id) ? 'bg-orange-500/10 text-orange-500' : 'text-muted-foreground'}`}
                            >
                                <Flag className={`w-3.5 h-3.5 ${flaggedQuestions.has(currentQuestion.id) ? 'fill-current' : ''}`} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => !completedSections.includes(currentSection) && handleBookmark()}
                                disabled={completedSections.includes(currentSection) || (currentQuestion.is_saved && currentQuestion.is_reported_by_user && !currentQuestion.is_corrected)}
                                className={`rounded-xl px-2 h-8 ${currentQuestion.is_saved ? 'bg-indigo-500/10 text-indigo-500' : 'text-muted-foreground'} ${completedSections.includes(currentSection) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {currentQuestion.is_saved && currentQuestion.is_reported_by_user && !currentQuestion.is_corrected ? (
                                    <Lock className="w-3.5 h-3.5" />
                                ) : (
                                    <Bookmark className={`w-3.5 h-3.5 ${currentQuestion.is_saved ? 'fill-current' : ''}`} />
                                )}
                            </Button>
                            <button
                                onClick={handleOpenReport}
                                className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 active:scale-95 transition-all"
                            >
                                <AlertTriangle size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Passage Area (Full Width Top) */}
                    {currentQuestion.passage && (
                        <div className="mb-6">
                            <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border-2 border-indigo-100 dark:border-indigo-500/20 rounded-[2.5rem] relative overflow-hidden pt-10 shadow-sm">
                                <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-bl-lg">
                                    Reading Passage
                                </div>
                                <MathText
                                    content={currentQuestion.passage}
                                    className="text-sm text-slate-700 dark:text-slate-300 leading-[1.7] font-medium prose dark:prose-invert max-w-none break-words overflow-x-auto max-w-full"
                                />
                            </div>
                        </div>
                    )}

                    {/* Question Card (Images, Charts, Diagrams, Text) */}
                    <div className="bg-white dark:bg-card rounded-[2.5rem] border-2 border-slate-300 dark:border-border px-4 py-8 shadow-sm">
                        {/* Illustrative Media (Image/Chart/Diagram/Table) */}
                        {(() => {
                            const m = currentQuestion?.media as any;
                            const hasDiagram = !!currentQuestion?.diagram;
                            
                            // Robust check: Render if anything looks like media
                            const hasRenderableMedia = m && (
                                ['image', 'chart', 'graph', 'pie', 'bar', 'line', 'scatter', 'diagram', 'table'].includes(m.type) ||
                                m.url || m.imageUrl || m.image_url || m.image || m.data || m.table
                            );

                            if (!hasDiagram && !hasRenderableMedia) return null;

                            return (
                                <div className="mb-6">
                                    {hasRenderableMedia ? (
                                        <QuestionMedia media={currentQuestion.media} />
                                    ) : (
                                        <div className="rounded-3xl border border-border/50 overflow-hidden bg-secondary/10 p-4">
                                            <DiagramRenderer diagram={currentQuestion.diagram} />
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        <div className="flex items-center justify-between mb-6">
                            <div className="flex gap-2">
                                <div className="px-2.5 py-1 bg-slate-900 text-white text-[7px] font-black uppercase tracking-widest rounded-lg">Question {currentQuestionIndex + 1}</div>
                                <div className="px-2.5 py-1 bg-slate-50 dark:bg-muted text-slate-400 text-[7px] font-black uppercase tracking-widest rounded-lg border border-slate-100 dark:border-border">{currentQuestion.difficulty || 'Standard'}</div>
                            </div>
                        </div>

                        <MathText
                            content={currentQuestion.question_text || "[Question text missing]"}
                            className="text-base font-bold text-slate-800 dark:text-slate-100 leading-relaxed tracking-tight overflow-x-auto max-w-full"
                        />
                    </div>

                    {/* Options */}
                    <div className="space-y-3 mt-8">
                        {currentQuestion.options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => !completedSections.includes(currentSection) && handleAnswerSelect(index)}
                                disabled={completedSections.includes(currentSection)}
                                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${answers[currentQuestion.id] === index
                                    ? 'border-primary bg-primary/10'
                                    : 'border-slate-200 dark:border-slate-800 bg-background hover:border-primary/30'
                                    } ${completedSections.includes(currentSection) ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${answers[currentQuestion.id] === index
                                        ? 'border-primary bg-primary'
                                        : 'border-border/60'
                                        }`}>
                                        {answers[currentQuestion.id] === index && (
                                            <CheckCircle className="w-4 h-4 text-white fill-current" />
                                        )}
                                    </div>
                                    <MathText content={option} className="text-sm font-medium overflow-x-auto max-w-full" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Section Progress */}
                <SectionProgressTracker
                    sections={sections.map(s => ({ number: s.number, name: s.name, icon: s.icon }))}
                    currentSection={currentSection}
                    completedSections={completedSections}
                    sectionQuestions={sectionQuestions.map(q => ({
                        id: q.id,
                        user_answer: answers[q.id],
                        is_flagged: flaggedQuestions.has(q.id)
                    }))}
                    currentQuestionIndex={currentQuestionIndex}
                    onNavigate={(idx) => setCurrentQuestionIndex(idx)}
                    isSectionsLocked={test.exam_type === 'imat-prep' ? false : test.is_sections_locked}
                    onSectionClick={(sectionNum) => {
                        if (sectionNum === currentSection) return;
                        
                        // Calculate start index for that section
                        let startIndex = 0;
                        for (let i = 0; i < sectionNum - 1; i++) {
                            startIndex += sections[i].questionCount;
                        }
                        
                        setCurrentSection(sectionNum);
                        setCurrentQuestionIndex(0);
                        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { });
                    }}
                />

                {/* Section Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-secondary/10 border border-border/40 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-black">{answeredInSection}</p>
                        <p className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">Answered</p>
                    </div>
                    <div className="bg-secondary/10 border border-border/40 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-black">{sectionQuestions.length - answeredInSection}</p>
                        <p className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">Remaining</p>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/50 p-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        className="flex-1 h-14 rounded-2xl"
                    >
                        <ChevronLeft className="w-5 h-5 mr-2" />
                        Previous
                    </Button>

                    {currentQuestionIndex < sectionQuestions.length - 1 ? (
                        <Button
                            onClick={handleNext}
                            className="flex-1 h-14 rounded-2xl"
                        >
                            Next
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            onClick={test.exam_type === 'imat-prep' ? completeSection : requestSectionComplete}
                            className="flex-1 h-14 rounded-2xl bg-green-600 hover:bg-green-700"
                        >
                            {test.exam_type === 'imat-prep' ? 'Next Section' : 'Complete Section'}
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                    )}
                </div>
            </div>
            </>
            )}

            {/* Confirmation Modal */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="bg-background border-border/50 rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase">
                            <AlertTriangle className="w-6 h-6 text-orange-500" />
                            Ready to Continue?
                        </DialogTitle>
                        <DialogDescription className="text-sm pt-4 space-y-3" asChild>
                            <div>
                                <p>You're about to move to:</p>
                                <div className="bg-primary/10 border-2 border-primary/40 rounded-2xl p-4">
                                    <p className="font-black uppercase text-primary">
                                        Section {currentSection + 1}: {sections[currentSection]?.name || 'Next Section'}
                                    </p>
                                </div>
                                <div className="bg-red-500/10 border-2 border-red-500/40 rounded-2xl p-4">
                                    <p className="font-black uppercase text-red-500 text-xs flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        You CANNOT return to Section {currentSection} once you continue!
                                    </p>
                                </div>
                                <p className="text-muted-foreground text-xs">
                                    Answered: {answeredInSection} / {sectionQuestions.length} questions
                                </p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirmModal(false)}
                            className="flex-1 rounded-xl"
                        >
                            Go Back
                        </Button>
                        <Button
                            onClick={completeSection}
                            disabled={isSubmitting}
                            className="flex-1 rounded-xl bg-primary"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>Continue <ChevronRight className="w-4 h-4 ml-2" /></>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Proctoring Warning Modal */}
            <Dialog open={showWarning} onOpenChange={setShowWarning}>
                <DialogContent className="max-w-[90vw] rounded-[2.5rem] p-8">
                    <DialogHeader className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-destructive/10 rounded-3xl flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight">Proctoring Warning</DialogTitle>
                        <DialogDescription className="text-sm font-bold leading-relaxed">
                            You have navigated away from the exam window. This is strictly prohibited.
                            <div className="mt-4 p-4 bg-destructive/5 rounded-2xl border border-destructive/10">
                                <span className="text-destructive font-black">Warning {infractions} of 5</span>
                            </div>
                            <div className="mt-4 text-muted-foreground font-medium">
                                The exam will automatically submit after the 5th infraction.
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-8 flex flex-col gap-3">
                        <Button
                            onClick={() => setShowWarning(false)}
                            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-destructive hover:bg-destructive/90 text-white"
                        >
                            Return to Exam
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Suspense fallback={null}>
                <ProctoringSystem
                    testId={id!}
                    isActive={isProctored && !showProctoringSetup}
                    onViolationThresholdReached={() => {
                        setIsDisqualified(true);
                        toast({
                            title: "Exam Terminated",
                            description: "Security protocol violation limit reached.",
                            variant: "destructive"
                        });
                        finishTest();
                    }}
                />
            </Suspense>

            {showProctoringSetup && isProctored && (
                <Suspense fallback={null}>
                    <ProctoringSetup
                        cameraAllowed={cameraAllowed}
                        isFullscreen={isProctored && !showProctoringSetup}
                        onPermissionsGranted={requestPermissions}
                        onEnterFullscreen={enterProctoringFullscreen}
                        videoStream={videoStream}
                        aiState={aiState}
                        setVideoElement={setVideoElement}
                        onStartExam={() => setShowProctoringSetup(false)}
                    />
                </Suspense>
            )}

            <ReportQuestionDialog
                isOpen={showReportDialog}
                onOpenChange={setShowReportDialog}
                onReport={handleReport}
            />
        </div>
    );
}
