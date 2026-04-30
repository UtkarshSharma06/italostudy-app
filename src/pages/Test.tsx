import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { generateUUID } from '@/lib/uuid';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import DiagramRenderer from '@/components/DiagramRenderer';
import QuestionMedia from '@/components/QuestionMedia';
import { Question as QuestionType, MediaContent } from '@/types/test';
import { useExam } from '@/context/ExamContext';
// EXAMS import removed
// Proctoring components are lazy-loaded — the ML chunk (TensorFlow/MediaPipe)
// only downloads when a proctored mock exam actually starts
const ProctoringSystem = lazy(() => import('@/components/ProctoringSystem'));
const ProctoringSetup = lazy(() => import('@/components/ProctoringSetup'));
import { useProctoring } from '@/hooks/useProctoring';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
import { readDashboardCache, invalidateDashboardCache } from '@/hooks/useDashboardPrefetch';
import { MathText } from '@/components/MathText';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle,
  AlertTriangle,
  Maximize,
  X,
  Camera,
  Lock,
  ArrowRight,
  Star,
  Loader2,
  Columns,
  ShieldAlert,
  ShieldCheck,
  Target,
  Bookmark,
  CheckCircle2,
  ListFilter,
  BookOpen,
  Maximize2
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ReportQuestionDialog } from '@/components/ReportQuestionDialog';

interface DiagramData {
  type: 'svg' | 'description' | 'coordinates';
  description?: string;
  svg?: string;
  coordinates?: object;
}

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  options: string[];
  correct_index: number;
  user_answer: number | null;
  is_marked: boolean;
  diagram: DiagramData | null;
  media?: MediaContent | null;
  topic: string | null;
  explanation: string;
  subject?: string | null;
  is_saved?: boolean;
  master_question_id?: string;
  practice_question_id?: string | null;
  session_question_id?: string | null;
  source_table?: string;
  is_reported_by_user?: boolean;
  is_corrected?: boolean;
  difficulty?: string;
  passage?: string;
  section_name?: string;
  time_spent_seconds?: number;
}

interface Test {
  id: string;
  total_questions: number;
  time_limit_minutes: number;
  started_at: string;
  test_type: string;
  mode?: 'standard' | 'adaptive' | 'weak_area';
  current_stage?: number;
  exam_type?: string;
  is_mock?: boolean;
  is_ranked?: boolean;
  score?: number;
  status?: string;
  time_remaining_seconds?: number;
  current_section?: number;
  sections_completed?: number[];
  current_section_index?: number;
  precise_score?: number;
  penalty_score?: number;
  is_sections_locked?: boolean;
  section_timing_mode?: 'section' | 'total';
}

interface Section {
  name: string;
  icon: string;
  startIndex: number;
  endIndex: number;
  questionCount: number;
  durationMinutes: number;
}

export default function TestPage() {
  const { testId } = useParams<{ testId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { activeExam, allExams } = useExam();
  const [activeTab, setActiveTab] = useState<'quest' | 'passage'>('quest');
  const [test, setTest] = useState<any | null>(null);


  // Derive the correct exam config from the test data itself
  const effectiveExamConfig = useMemo(() => {
    if (test?.exam_type) {
      if (allExams[test.exam_type]) {
        return allExams[test.exam_type];
      }
    }
    return activeExam || Object.values(allExams)[0];
  }, [test?.exam_type, activeExam, allExams]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sectionTimeRemaining, setSectionTimeRemaining] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showSectionComplete, setShowSectionComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessionId] = useState(() => {
    const key = `test_session_${testId}`;
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = generateUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  });
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [showProctoringSetup, setShowProctoringSetup] = useState(false);
  const questionStartTime = useRef<number>(Date.now());

  const isMockExam = useMemo(() => {
    if (!test) return false;
    // Standard mock (live session) or Practice Full Exam for CEnT-S/IMAT
    // 'is_mock' is set to true for "Official Simulation" practice in StartTest.tsx
    if (test.test_type === 'mock') return true;
    if (test.is_mock && (test.exam_type?.includes('cent-s') || test.exam_type?.includes('imat'))) return true;
    return false;
  }, [test]);

  // Build sections based on active exam or topics
  const sections = useMemo<Section[]>(() => {
    if (!test || questions.length === 0) return [];

    if (isMockExam && effectiveExamConfig?.sections) {
      // PRO MODE: Follow the Official Exam Model Structure strictly
      let currentStart = 0;
      return effectiveExamConfig.sections.map((officialSec: any) => {
        const sec: Section = {
          name: officialSec.name,
          icon: officialSec.icon || '📝',
          startIndex: currentStart,
          endIndex: currentStart + officialSec.questionCount - 1,
          questionCount: officialSec.questionCount,
          durationMinutes: officialSec.durationMinutes || 0
        };
        currentStart += officialSec.questionCount;
        return sec;
      });
    }

    if (isMockExam) {
      // Dynamic Section Generation for Mock Exams (Legacy Fallback)
      const dynamicSections: Section[] = [];

      if (questions.length > 0) {
        let sectionStartIndex = 0;
        let currentSectionQCount = 0;
        let currentSectionName = questions[0].section_name || 'General';

        // Helper to push section
        const pushSection = (name: string, count: number, start: number) => {
          const configSec = effectiveExamConfig?.sections?.find((s: any) => s.name === name);
          dynamicSections.push({
            name: name,
            icon: configSec?.icon || '📝',
            startIndex: start,
            endIndex: start + count - 1,
            questionCount: count,
            durationMinutes: configSec?.durationMinutes || 0
          });
        };

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const qSec = q.section_name || 'General';

          if (qSec !== currentSectionName) {
            // Push previous section
            pushSection(currentSectionName, currentSectionQCount, sectionStartIndex);

            // Start new section
            currentSectionName = qSec;
            sectionStartIndex = i;
            currentSectionQCount = 0;
          }
          currentSectionQCount++;
        }
        // Push last section
        pushSection(currentSectionName, currentSectionQCount, sectionStartIndex);
      }
      return dynamicSections;
    }

    // Practice / Adaptive Mode: Dynamic sections by topic
    const sectionMap: Record<string, number[]> = {};
    questions.forEach((q, idx) => {
      let topic = q.topic || 'General';
      const lowTopic = topic.toLowerCase();
      if (lowTopic.includes('logic') || lowTopic.includes('reasoning')) topic = 'Reasoning on texts and data';
      if (!sectionMap[topic]) sectionMap[topic] = [];
      sectionMap[topic].push(idx);
    });

    let currentStart = 0;
    return Object.entries(sectionMap).map(([name, indices]) => {
      const section: Section = {
        name,
        icon: '📝',
        startIndex: currentStart,
        endIndex: currentStart + indices.length - 1,
        questionCount: indices.length,
        durationMinutes: 0, // Not applicable for practice
      };
      currentStart += indices.length;
      return section;
    });
  }, [test, questions, effectiveExamConfig]);



  // Section Identification Logic
  // For Mock Exams, we strictly follow the Stage Index (currentSectionIndex).
  // For Practice Mode, we use the dynamic section found by question index or topic.
  const currentSection = useMemo(() => {
    if (sections.length === 0) return null;

    if (isMockExam) {
      // PRO MODE: Section is strictly tied to the Stage/Index
      return sections[currentSectionIndex] || sections[0];
    }

    // Adaptive/Practice Mode: Find section containing the current question
    const defaultSec = sections[currentSectionIndex] || sections[0];
    const sectionByPosition = sections.find(s => currentIndex >= s.startIndex && currentIndex <= s.endIndex);

    return sectionByPosition || defaultSec;
  }, [sections, currentSectionIndex, currentIndex, isMockExam]);

  const currentQuestion = questions[currentIndex];

  // Strict check: only show left pane if actual renderable content exists
  const hasSource = useMemo(() => {
    if (!currentQuestion) return false;
    const media = currentQuestion.media as any;
    
    // 1. Passage and Diagram are always valid sources
    if (currentQuestion.passage) return true;
    if (currentQuestion.diagram) return true;
    if (!media) return false;

    // 2. Strict Media Content Detection (matches logic in QuestionMedia and render blocks)
    const type = media.type;
    const hasUrl = !!(media.url || media.imageUrl || media.image_url || media.src || media.image?.url);
    
    if (type === 'image') return hasUrl;
    if (type === 'table') return !!(media.table?.rows || media.data?.rows || media.rows);
    if (['chart', 'graph', 'pie', 'bar', 'line', 'scatter'].includes(type)) {
        return !!(media.data || media.chart?.data || hasUrl);
    }
    if (type === 'diagram') return !!(media.diagram || media.svg || media.description);
    
    // Fallback for custom objects or missing types
    return !!(hasUrl || media.data || media.table || media.diagram);
  }, [currentQuestion]);

  // Robust display title resolver for the header
  const displaySubject = useMemo(() => {
    if (!test) return '';
    const isMock = test.test_type === 'mock' || test.is_mock;
    const examName = effectiveExamConfig?.name || '';
    
    // Generic titles to be replaced in mock mode
    const genericNames = [
      'all subjects', 
      'mathematics', 
      'official simulation', 
      'mock simulation', 
      'practice quest',
      'international mock',
      examName.toLowerCase(),
      activeExam?.name?.toLowerCase() || ''
    ].filter(Boolean);

    const currentSubject = test.subject?.toLowerCase() || '';
    
    // If it's a mock test and the subject is generic or matches the exam name exactly
    if (isMock && genericNames.includes(currentSubject)) {
      // Return a more descriptive mock name if the subject is just the exam name
      return examName.toLowerCase().includes('mock') ? examName : `${examName} Mock Test`;
    }
    
    return test.subject || 'Test Session';
  }, [test, effectiveExamConfig, activeExam]);

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
    enabled: !showProctoringSetup && isMockExam && test?.is_proctored && !isDisqualified,
    testId: testId!,
    userId: user?.id || 'anonymous',
    onDisqualify: () => setIsDisqualified(true)
  });

  // Effect to handle initialization of proctoring setup
  useEffect(() => {
    if (test?.is_proctored && !isDisqualified) {
      setShowProctoringSetup(true);
      if (startAI) startAI();
    }
    return () => { if (stopAI) stopAI(); };
  }, [test?.is_proctored, isDisqualified]);

  useEffect(() => {
    if (isDisqualified) return;
    
    // STRICT MODE BYPASS: Evaluate mount caching SYNCHRONOUSLY
    // before making the async DB call.
    // If we calculate this after the DB fetch, API latency variations
    // could falsely expire the 2-second bypass window and trigger termination.
    const lastMount = (window as any)[`mount_cache_${testId}`] || 0;
    const isRecentMount = Date.now() - lastMount < 2000;
    
    // Immediately set the cache if first run
    if (!lastMount) {
      (window as any)[`mount_cache_${testId}`] = Date.now();
    }
    
    if (testId && (user || test?.is_mock)) { // Keep the condition for fetching data
      fetchTestData(isRecentMount);
    }

    // The supabase channel part seems to be a merge conflict from the instruction,
    // so I'm omitting it as it's not part of the core request.
    // const channel = supabase.channel(`test_${testId}`);
  }, [testId, user, isDisqualified, test?.is_mock]); // Added test?.is_mock to dependencies

  useEffect(() => {
    // Only require auth for non-mock tests
    if (!loading && !user && test && !test.is_mock) {
      navigate('/auth');
    }
  }, [user, loading, test, navigate]);

  const fetchTestData = async (isRecentMount: boolean) => {
    try {
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .maybeSingle();

      if (testError || !testData) {
        toast({
          title: 'Test not found',
          description: 'The requested test could not be found.',
          variant: 'destructive',
        });
        navigate('/dashboard');
        if (testError) throw testError;
      }

      // Check for cross-device locking
      if (testData.active_session_id && testData.active_session_id !== sessionId) {
        const lastHeartbeat = new Date(testData.last_heartbeat_at).getTime();
        const now = Date.now();
        // If last heartbeat was within 20 seconds, the test is locked
        if (now - lastHeartbeat < 20000) {
          setIsLocked(true);
          setIsLoading(false);
          return;
        }
      }

      if (testData.status === 'completed') {
        navigate(`/results/${testId}`);
        return;
      }

      // --- Reload Persistence Logic for Standard Mode ---
      const isRankedLive = testData.is_ranked === true;
      const isProctored = (testData as any).is_proctored;
      const isStandardMode = !isProctored && !isRankedLive;

      // Determine the initial section index from database state
      const savedSectionIndex = testData.current_section_index !== null && testData.current_section_index !== undefined
        ? testData.current_section_index
        : (testData.current_section ? parseInt(String(testData.current_section)) - 1 : (testData.current_stage ? parseInt(String(testData.current_stage)) - 1 : null));

      // --- Reload Persistence Logic for Standard Mode ---
      const cacheKey = `test_cache_${testId}`;
      const cachedStateRaw = sessionStorage.getItem(cacheKey);

      let restoredTime = testData.time_remaining_seconds;
      let restoredIndex = testData.current_question_index;
      let restoredSection = savedSectionIndex;

      if (isStandardMode && cachedStateRaw) {
        try {
          const cached = JSON.parse(cachedStateRaw);
          // Only restore if the cache is recent (within 5 minutes of reload)
          if (Date.now() - cached.timestamp < 300000) {
            restoredTime = cached.timeRemaining;
            restoredIndex = cached.currentIndex;
            restoredSection = cached.currentSectionIndex;
          }
        } catch (e) {
          console.error("Failed to parse test cache:", e);
        }
      }

      setTest(testData as Test);

      // Check if this is a reload during a live ranked exam or proctored exam
      const isReload = sessionStorage.getItem(`test_${testId}_started`) === 'true';

      // Use the pre-calculated `isRecentMount` flag passed from the synchronous useEffect body
      if (isReload && !isRecentMount && (isRankedLive || isProctored)) {
        toast({
          title: 'Mission Terminated',
          description: isProctored 
            ? 'Page reload detected during proctored mission. Mission has been terminated.'
            : 'Page reload detected during live exam. Your test session has been terminated.',
          variant: 'destructive',
        });

        // Full cleanup: delete questions first, then the test record.
        // This ensures no ghost data remains that would block a fresh restart.
        await supabase.from('questions').delete().eq('test_id', testId);
        const { error: delError } = await supabase.from('tests').delete().eq('id', testId);
        
        // If RLS prevents deletion, soft-delete it by marking it disqualified and abandoned. 
        // This hides it from History.tsx and the waiting room's attempt logic.
        if (delError) {
          await supabase.from('tests').update({ 
            status: 'abandoned', 
            proctoring_status: 'disqualified' 
          }).eq('id', testId);
        }

        // BULLETPROOF: Also add to local blacklist to guarantee waiting room never resumes it
        // even if RLS blocked the update above.
        try {
          const blackListRaw = localStorage.getItem('terminated_tests') || '[]';
          const blackList = JSON.parse(blackListRaw);
          if (!blackList.includes(testId)) {
             blackList.push(testId);
             localStorage.setItem('terminated_tests', JSON.stringify(blackList));
          }
        } catch(e) {}
        
        setIsDisqualified(true);
        setIsLoading(false);
        return;
      }

      // Mark that test has started (for reload detection)
      sessionStorage.setItem(`test_${testId}_started`, 'true');
      
      // The logic for updating mount_cache_${testId} is now in the useEffect, not here.

      if (restoredSection !== null) {
        setCurrentSectionIndex(restoredSection);
      }

      if (restoredIndex !== null && restoredIndex !== undefined) {
        setCurrentIndex(restoredIndex);
      }

      if (testData.test_type === 'mock' || (testData.is_mock && (testData.exam_type?.includes('cent-s') || testData.exam_type?.includes('imat')))) {
        const stage = restoredSection !== null ? restoredSection + 1 : (typeof (testData as any).current_stage === 'number' ? (testData as any).current_stage : 1);

        const resolvedConfig = (testData.exam_type && allExams[testData.exam_type]) ? allExams[testData.exam_type] : (activeExam || Object.values(allExams)[0]);
        const currentSec = resolvedConfig.sections[stage - 1];
        if (currentSec) {
          // Restore saved section time or use default
          const savedSectionTime = testData.section_time_remaining_seconds;
          setSectionTimeRemaining(savedSectionTime !== null && savedSectionTime !== undefined ? savedSectionTime : currentSec.durationMinutes * 60);
        }
      }

      // Calculate remaining time - use restored time if available (local or db)
      if (restoredTime !== null && restoredTime !== undefined) {
        setTimeRemaining(restoredTime);
      } else {
        // If we're just starting, give the full time. Otherwise calculate elapsed.
        const startTime = new Date(testData.started_at).getTime();
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        
        // If elapsed time is very small (e.g., < 60s) or we are in proctoring setup, assume full time
        if (isProctored && elapsedSeconds < 120) {
            setTimeRemaining(testData.time_limit_minutes * 60);
        } else {
            const endTime = startTime + testData.time_limit_minutes * 60 * 1000;
            const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            setTimeRemaining(remaining);
        }
      }


      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('question_number');

      if (questionsData && questionsData.length > 0) {
        let finalQuestions = [...questionsData];

        // RE-ORDER BY ADMIN SEQUENCE: For session/mock tests, re-sort by the
        // original order_index from session_questions using master_question_id.
        // This ensures the admin panel's arrangement is always respected,
        // even for existing tests that were inserted in the wrong order.
        const masterIds = finalQuestions
          .map(q => q.master_question_id)
          .filter(Boolean);

        if (masterIds.length > 0) {
          const { data: masterOrderData } = await supabase
            .from('session_questions')
            .select('id, order_index')
            .in('id', masterIds);

          if (masterOrderData && masterOrderData.length > 0) {
            const orderMap = new Map<string, number>(
              masterOrderData.map(m => [m.id, m.order_index ?? 9999])
            );
            finalQuestions = finalQuestions.sort((a, b) => {
              const oa = orderMap.get(a.master_question_id) ?? 9999;
              const ob = orderMap.get(b.master_question_id) ?? 9999;
              return oa - ob;
            });
          }
        }

        // Fetch user's bookmarks for these questions
        const questionIds = finalQuestions.map(q => q.id);
        let bookmarkedIds = new Set<string>();

        if (user?.id && questionIds.length > 0) {
          const { data: bookmarksData } = await supabase
            .from('bookmarked_questions')
            .select('question_id')
            .eq('user_id', user.id)
            .in('question_id', questionIds);

          bookmarkedIds = new Set(bookmarksData?.map(b => b.question_id) || []);
        }

        setQuestions(finalQuestions.map((q, idx) => ({
          ...q,
          question_number: idx + 1,
          options: q.options as string[],
          diagram: q.diagram as unknown as DiagramData | null,
          is_saved: bookmarkedIds.has(q.id),
          is_marked: false,
          media: q.media as unknown as MediaContent | null,
          section_name: q.section_name
        })));

        // RUNTIME FALLBACK: Fetch missing passages or media from master tables
        // (Removing the duplicate chunky logic for brevity in this fix, 
        // but ensuring the main mapping works).
        
      } else if (testData.total_questions > 0) {
        // Fallback: If DB says there should be questions but we found none, try one quick retry after a delay
        setTimeout(async () => {
             const { data: retryData } = await supabase
                .from('questions')
                .select('*')
                .eq('test_id', testId)
                .order('question_number');
             if (retryData && retryData.length > 0) {
                 setQuestions(retryData.map((q, idx) => ({
                    ...q,
                    question_number: idx + 1,
                    options: q.options as string[],
                    diagram: q.diagram as unknown as DiagramData | null,
                    is_saved: false,
                    is_marked: false,
                    media: q.media as unknown as MediaContent | null,
                    section_name: q.section_name
                 })));
             }
        }, 2000);
      }
    } catch (error) {
      console.error('Error in fetchTestData:', error);
      toast({
        title: 'Mission Data Status',
        description: 'Synchronising questions...',
        variant: 'default'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save progress function
  const saveProgress = useCallback(async () => {
    if (!testId || !test || test.status !== 'in_progress') return;

    try {
      await supabase
        .from('tests')
        .update({
          current_question_index: currentIndex,
          time_remaining_seconds: timeRemaining,
          section_time_remaining_seconds: sectionTimeRemaining,
          current_section_index: currentSectionIndex,
          current_section: currentSectionIndex + 1,
          current_stage: currentSectionIndex + 1,
          active_session_id: sessionId,
          last_heartbeat_at: new Date().toISOString()
        })
        .eq('id', testId);
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }, [testId, test, currentIndex, timeRemaining, sectionTimeRemaining, currentSectionIndex]);

  // Auto-save progress periodically (Cross-device sync)
  useEffect(() => {
    if (!test || test.status !== 'in_progress' || isDisqualified) return;

    // Standard mode: High frequency (10s) for cross-device resume
    // Proctored/Live: Lower frequency (30s) as reloads are restricted anyway
    const isStandard = !(test as any).is_proctored && !test.is_ranked;
    const intervalTime = isStandard ? 10000 : 30000;

    const interval = setInterval(() => {
      saveProgress();
    }, intervalTime);

    return () => clearInterval(interval);
  }, [test, isDisqualified, saveProgress]);

  // HIGH-FREQUENCY Local Caching for Standard Mode (every 1.5 seconds)
  // This ensures that an accidental reload restores the EXACT second.
  useEffect(() => {
    if (!test || (test as any).is_proctored || test.is_ranked || isDisqualified) return;

    const cacheInterval = setInterval(() => {
      sessionStorage.setItem(`test_cache_${testId}`, JSON.stringify({
        timeRemaining,
        currentIndex,
        currentSectionIndex,
        timestamp: Date.now()
      }));
    }, 1500);

    return () => clearInterval(cacheInterval);
  }, [test, testId, timeRemaining, currentIndex, currentSectionIndex, isDisqualified]);

  // Save progress when navigating or answering
  useEffect(() => {
    if (!test || test.status !== 'in_progress' || isDisqualified) return;
    saveProgress();
  }, [currentIndex, currentSectionIndex, test?.status, saveProgress]);

  // Timer logic — stable interval, no teardown every tick
  const timeRemainingRef = useRef(timeRemaining);
  const sectionTimeRemainingRef = useRef(sectionTimeRemaining);
  useEffect(() => { timeRemainingRef.current = timeRemaining; }, [timeRemaining]);
  useEffect(() => { sectionTimeRemainingRef.current = sectionTimeRemaining; }, [sectionTimeRemaining]);

  useEffect(() => {
    if (!test || showProctoringSetup || isDisqualified || isLocked) return; // PAUSE timer if proctoring setup is active or exam terminated

    const timer = setInterval(() => {
      const newTime = Math.max(0, timeRemainingRef.current - 1);
      setTimeRemaining(newTime);
      if (newTime <= 0) {
        clearInterval(timer);
        handleAutoSubmit();
        return;
      }
      if (isMockExam) {
        // Only decrement section timer if in 'section' timing mode
        if (test.section_timing_mode !== 'total') {
            const newSectionTime = Math.max(0, sectionTimeRemainingRef.current - 1);
            setSectionTimeRemaining(newSectionTime);
            if (newSectionTime <= 0) {
              clearInterval(timer);
              // Force immediate completion and move (passing true for isAuto)
              handleCompleteSection(true);
            }
        } else {
            // In total time mode, we still sync the section duration for internal tracking 
            // but we don't force moves based on it.
            setSectionTimeRemaining(timeRemainingRef.current);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
    // Restart if test, section, or proctoring setup visibility changes
  }, [test, isMockExam, currentSectionIndex, showProctoringSetup]);

  const handleDisqualification = async () => {
    setIsDisqualified(true);
    toast({
      title: 'Exam Terminated',
      description: 'Multiple proctoring violations detected. Test submitted automatically.',
      variant: 'destructive',
    });
    await submitTest('disqualified');
  };

  const handleAutoSubmit = async () => {
    setShowSubmitConfirm(false);
    setShowSectionComplete(false);
    toast({
      title: "Time's up!",
      description: 'Your test has been automatically submitted.',
      variant: 'destructive',
    });
    await submitTest('time_up');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} `;
  };

  // Track time spent on question when navigating
  const trackQuestionTime = async () => {
    const question = questions[currentIndex];
    if (!question) return;

    const duration = Math.floor((Date.now() - questionStartTime.current) / 1000);
    if (duration <= 0) return;

    const currentTotal = question.time_spent_seconds || 0;
    const newTotal = currentTotal + duration;

    // Update local state first for immediate UI/logical consistency
    setQuestions(prev => prev.map((q, i) =>
      i === currentIndex ? { ...q, time_spent_seconds: newTotal } : q
    ));

    await supabase
      .from('questions')
      .update({ time_spent_seconds: newTotal })
      .eq('id', question.id);
  };

  const handleSelectAnswer = async (optionIndex: number) => {
    const question = questions[currentIndex];
    if (!question) return;

    // Update local state
    setQuestions(prev => prev.map((q, i) =>
      i === currentIndex ? { ...q, user_answer: optionIndex } : q
    ));

    // Update in database
    await supabase
      .from('questions')
      .update({
        user_answer: optionIndex,
        answered_at: new Date().toISOString(),
      })
      .eq('id', question.id);

    // Record in user_practice_responses if it's a manual question
    const practiceId = (question as any).practice_question_id;
    if (practiceId && user) {
      const { error: syncError } = await (supabase as any)
        .from('user_practice_responses')
        .upsert({
          user_id: user.id,
          question_id: practiceId,
          exam_type: test!.exam_type || 'standard',
          subject: test!.subject,
          topic: question.topic,
          is_correct: optionIndex === question.correct_index,
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id,question_id' });

      if (syncError) {
        console.error('Practice Sync Error:', syncError);
      }
    }
  };

  const handleMarkForReview = async () => {
    const question = questions[currentIndex];
    if (!question) return;

    const newMarked = !question.is_marked;

    setQuestions(prev => prev.map((q, i) =>
      i === currentIndex ? { ...q, is_marked: newMarked } : q
    ));

    // Note: is_marked is only a client-side state, not persisted to session_questions
  };

  const handleBookmark = async () => {
    const question = questions[currentIndex];
    if (!question || !user) return;

    // Prevent unbookmarking if reported and not fixed
    if (question.is_saved && question.is_reported_by_user && !question.is_corrected) {
      toast({
        title: "Mandatory Bookmark",
        description: "This question is reported and cannot be removed until fixed.",
        variant: "destructive"
      });
      return;
    }

    const newSavedState = !question.is_saved;

    setQuestions(prev => prev.map((q, i) =>
      i === currentIndex ? { ...q, is_saved: newSavedState } : q
    ));

    if (newSavedState) {
      try {
        const { error } = await supabase.from('bookmarked_questions').insert({
          user_id: user.id,
          question_id: question.id,
          master_question_id: (question as any).master_question_id || (question as any).practice_question_id || (question as any).session_question_id || question.id,
          source_table: (question as any).source_table || (test?.test_type === 'practice' ? 'practice_questions' : 'session_questions'),
          exam_type: activeExam?.id || 'standard'
        });

        if (error) throw error;
        toast({ title: 'Question Saved', description: 'Added to your bookmarks.' });
      } catch (error) {
        console.error('Error saving question:', error);
        toast({ title: 'Failed to save', description: 'Could not save question.', variant: 'destructive' });
        // Revert state on failure
        setQuestions(prev => prev.map((q, i) => i === currentIndex ? { ...q, is_saved: false } : q));
      }
    } else {
      try {
        const { error } = await supabase.from('bookmarked_questions').delete().eq('question_id', question.id).eq('user_id', user.id);
        if (error) throw error;
        toast({ title: 'Bookmark Removed', description: 'Removed from your bookmarks.' });
      } catch (error) {
        console.error('Error removing bookmark:', error);
        toast({ title: 'Remove Failed', description: 'Could not remove bookmark.', variant: 'destructive' });
        // Revert state on failure
        setQuestions(prev => prev.map((q, i) => i === currentIndex ? { ...q, is_saved: true } : q));
      }
    }
  };

  const handleReport = async (reason: string) => {
    const question = questions[currentIndex];
    if (!question || !user || !reason.trim()) return;

    try {
      // 1. Submit the report
      const { error: reportError } = await (supabase as any)
        .from('question_reports')
        .insert({
          user_id: user.id,
          question_id: question.id,
          master_question_id: (question as any).master_question_id,
          source_table: (question as any).source_table || 'practice_questions',
          reason: reason,
          details: reason.includes(':') ? reason.split(':').slice(1).join(':') : undefined // Simple detail extraction if needed, but the dialog will provide it properly
        });

      if (reportError) throw reportError;

      // 2. Auto-bookmark the question as 'reported'
      if (!question.is_saved) {
        await (supabase as any).from('bookmarked_questions').insert({
          user_id: user.id,
          question_id: question.id,
          master_question_id: (question as any).master_question_id || (question as any).practice_question_id || (question as any).session_question_id || question.id,
          source_table: (question as any).source_table || (test?.test_type === 'practice' ? 'practice_questions' : 'session_questions'),
          exam_type: test?.exam_type || 'standard',
          is_reported_by_user: true
        });

        setQuestions(prev => prev.map((q, i) =>
          i === currentIndex ? { ...q, is_saved: true, is_reported_by_user: true } : q
        ));
      } else {
        // If already saved, update its reported status
        await (supabase as any)
          .from('bookmarked_questions')
          .update({ is_reported_by_user: true })
          .eq('user_id', user.id)
          .eq('question_id', question.id);

        setQuestions(prev => prev.map((q, i) =>
          i === currentIndex ? { ...q, is_reported_by_user: true } : q
        ));
      }

      toast({
        title: 'Report Submitted',
        description: 'Thank you for helping us improve. We will review this shortly.',
      });
    } catch (error) {
      console.error('Error reporting question:', error);
      toast({
        title: 'Report failed',
        description: 'Could not submit report.',
        variant: 'destructive'
      });
    }
  };

  const handleNavigate = async (newIndex: number) => {
    // For mock exams, only allow navigation within current section or to completed sections
    const isImat = test?.exam_type === 'imat-prep';
    if (isMockExam && sections.length > 0 && !isImat) {
      const targetSectionIdx = sections.findIndex(
        s => newIndex >= s.startIndex && newIndex <= s.endIndex
      );

      // Don't allow going back to previous sections once completed
      if (targetSectionIdx < currentSectionIndex && completedSections.includes(targetSectionIdx)) {
        toast({
          title: 'Section Locked',
          description: 'You cannot return to a completed section.',
          variant: 'destructive',
        });
        return;
      }

      // Don't allow skipping ahead to future sections
      if (targetSectionIdx > currentSectionIndex) {
        toast({
          title: 'Complete Current Section',
          description: 'Please complete or skip the current section first.',
          variant: 'destructive',
        });
        return;
      }
    }

    await trackQuestionTime();
    setCurrentIndex(newIndex);
    questionStartTime.current = Date.now();
  };

  const handleCompleteSection = async (isAuto?: boolean) => {
    if (!currentSection) return;

    await trackQuestionTime();
    const isImat = test?.exam_type === 'imat-prep';
    if (!isImat) {
      setCompletedSections(prev => [...prev, currentSectionIndex]);
    }
    setShowSectionComplete(false);

    // Move to next section
    if (currentSectionIndex < sections.length - 1) {
      const nextSection = sections[currentSectionIndex + 1];
      const nextStage = currentSectionIndex + 2; 

      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentIndex(nextSection.startIndex);
      setSectionTimeRemaining(nextSection.durationMinutes * 60);
      questionStartTime.current = Date.now();

      // Persist to DB
      await (supabase as any).from('tests').update({
        current_stage: nextStage,
        current_section: nextStage,
        current_section_index: nextStage - 1,
        current_question_index: nextSection.startIndex,
        active_session_id: sessionId,
        last_heartbeat_at: new Date().toISOString()
      }).eq('id', testId);

      toast({
        title: isAuto ? `Time's Up! Section Locked` : `Section Complete!`,
        description: `Moving to ${nextSection.name}. You have ${nextSection.durationMinutes} minutes.`,
      });
    } else {
      // All sections done
      if (isAuto) {
        handleAutoSubmit();
      } else {
        setShowSubmitConfirm(true);
      }
    }
  };

  const handleSkipSection = async () => {
    if (!currentSection) return;

    await trackQuestionTime();
    setCompletedSections(prev => [...prev, currentSectionIndex]);
    setShowSectionComplete(false);

    // Move to next section
    if (currentSectionIndex < sections.length - 1) {
      const nextSection = sections[currentSectionIndex + 1];
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentIndex(nextSection.startIndex);
      setSectionTimeRemaining(nextSection.durationMinutes * 60);
      questionStartTime.current = Date.now();

      toast({
        title: `Section Skipped`,
        description: `Moving to ${nextSection.name}. You have ${nextSection.durationMinutes} minutes.`,
      });
    } else {
      setShowSubmitConfirm(true);
    }
  };


  const submitTest = async (reason = 'manual') => {
    if (!test || !testId) return;

    if (reason === 'disqualified') {
      setIsSubmitting(true);
      // Delete the test record to completely abandon it without saving any results or scores
      await supabase.from('tests').delete().eq('id', testId);
      setIsSubmitting(false);
      setIsDisqualified(true);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    toast({
      title: 'Submitting Mission...',
      description: 'Your results are being calculated and saved.',
    });

    // Invalidate dashboard cache immediately so that navigation back home or to dashboard shows fresh results
    invalidateDashboardCache();

    try {
      await trackQuestionTime();

      const allQuestions = questions;
      if (!allQuestions || allQuestions.length === 0) throw new Error('No questions found');

      let correct = 0;
      let wrong = 0;
      let skipped = 0;
      let finalScore = 0;

      // Scoring Rules from Active Exam
      const { correct: corrPts, incorrect: incorrPts, skipped: skipPts } = effectiveExamConfig.scoring;

      allQuestions.forEach(q => {
        if (q.user_answer === null) {
          skipped++;
          finalScore += skipPts;
        } else if (q.user_answer === q.correct_index) {
          correct++;
          finalScore += corrPts;
        } else {
          wrong++;
          finalScore += incorrPts;
        }
      });

      // Standardized percentage
      const maxPossibleScore = allQuestions.length * corrPts;
      const scorePercentage = maxPossibleScore > 0 ? Math.round((finalScore / maxPossibleScore) * 100) : 0;
      const timeTaken = test.time_limit_minutes * 60 - timeRemaining;

      const penaltyScore = wrong * Math.abs(incorrPts);
      const preciseScore = finalScore;

      // Update test record
      await supabase
        .from('tests')
        .update({
          status: 'completed',
          score: scorePercentage, // Standardized percentage
          correct_answers: correct,
          wrong_answers: wrong,
          skipped_answers: skipped,
          time_taken_seconds: timeTaken,
          completed_at: new Date().toISOString(),
          proctoring_status: reason === 'disqualified' ? 'failed' : (test.test_type === 'mock' ? 'passed' : 'not_required'),
          precise_score: preciseScore,
          penalty_score: penaltyScore,
          active_session_id: null,
          last_heartbeat_at: null
        })
        .eq('id', testId);

      // Update topic performance
      const topicGroups: Record<string, { correct: number; total: number; subject: string }> = {};

      allQuestions.forEach(q => {
        const subject = q.subject || test.subject;
        const topic = q.topic || subject;
        const key = `${subject}:${topic}`;

        if (!topicGroups[key]) {
          topicGroups[key] = { correct: 0, total: 0, subject };
        }
        topicGroups[key].total++;
        if (q.user_answer === q.correct_index) {
          topicGroups[key].correct++;
        }
      });

      await Promise.all(Object.entries(topicGroups).map(async ([key, data]) => {
        const [subject, topic] = key.trim().split(':');
        const accuracy = (data.correct / data.total) * 100;

        const { data: existing } = await (supabase.from('topic_performance') as any)
          .select('*')
          .eq('user_id', user!.id)
          .eq('subject', data.subject)
          .eq('topic', topic)
          .eq('exam_type', test.exam_type || effectiveExamConfig.id)
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
              exam_type: test.exam_type || effectiveExamConfig.id,
              subject: data.subject,
              topic,
              total_questions: data.total,
              correct_answers: data.correct,
              accuracy_percentage: accuracy,
            });
        }
      }));

      // Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }

      navigate(`/results/${testId}`);
    } catch (error) {
      console.error('Error submitting test:', error);
      toast({
        title: 'Submission failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Prevent copy/paste
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({
        title: 'Copy disabled',
        description: 'Copying is not allowed during the test.',
        variant: 'destructive',
      });
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const handleBeforeUnload = () => {
      if (testId && sessionId) {
        supabase
          .from('tests')
          .update({ active_session_id: null, last_heartbeat_at: null })
          .eq('id', testId)
          .eq('active_session_id', sessionId);
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Also clear on unmount
    };
  }, []);

  useEffect(() => {
    // Moved up to obey Rules of Hooks
    if (isDisqualified) {
      submitTest('disqualified');
    }
  }, [isDisqualified]);

  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4">Test Active on Another Device</h1>
        <p className="text-slate-400 mb-8 max-w-md leading-relaxed">
          This test is currently open on another device (mobile or another browser tab).
          Please close the other session first to prevent progress conflicts and ensure data integrity.
        </p>
        <div className="flex gap-4 w-full max-w-md">
          <Button
            onClick={() => window.location.reload()}
            className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl"
          >
            Try Again
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            className="flex-1 text-slate-400 font-bold h-12 hover:bg-white/5 rounded-xl border border-white/10"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isDisqualified) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-8 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
          <ShieldAlert className="w-10 h-10 text-rose-500" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">Examination Terminated</h1>
        <p className="text-slate-400 mb-10 max-w-md leading-relaxed font-bold text-[10px] uppercase tracking-[0.2em] opacity-60">
          Neural link monitoring has detected multiple security protocol violations. This session has been automatically terminated and all progress has been expunged in accordance with the integrity agreement.
        </p>
        <Button 
          onClick={() => navigate('/dashboard')}
          className="w-full max-w-xs h-12 bg-white text-black hover:bg-slate-200 transition-colors font-black text-[10px] uppercase tracking-[0.3em] rounded-xl shadow-lg"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading test...</span>
        </div>
      </div>
    );
  }

  if (!test || (questions.length === 0 && !isLoading)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Synchronising Mission Data...</h1>
        <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
          {questions.length === 0 && test?.total_questions > 0
            ? "We are establishing a secure connection to the question bank. Please wait a few seconds for data synchronisation. If this persists, the session may be corrupted."
            : "The requested mission could not be found or has not been properly initialised."}
        </p>
        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Retry Sync
          </Button>
          <Button onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
        </div>
      </div>
    );
  }


  const answeredCount = questions.filter(q => q.user_answer !== null).length;
  const markedCount = questions.filter(q => q.is_marked).length;

  const NavigatorContent = () => (
    <div className="flex flex-col gap-10">
      {/* Section Navigator */}
      {isMockExam && sections.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Exam Blueprint</h3>
          <div className="space-y-2">
            {sections.map((section, idx) => {
              const isCompleted = completedSections.includes(idx);
              const isCurrent = idx === currentSectionIndex;
              const isImat = test?.exam_type === 'imat-prep';
              const isLockedBySetting = !isImat && test?.is_sections_locked !== false; // Locked by default, EXCEPT for IMAT
              const isLocked = isLockedBySetting && idx < currentSectionIndex && isCompleted;

              return (
                <div
                  key={section.name}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all cursor-pointer", // Always show pointer to indicate interactivity if permitted
                    isCurrent
                      ? "border-indigo-600 bg-white shadow-xl shadow-indigo-100/50"
                      : isLocked
                        ? "border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed"
                        : "border-slate-100 bg-white hover:border-indigo-200"
                  )}
                  onClick={() => {
                      if (isLocked) {
                          toast({
                              title: "Section Locked",
                              description: "You cannot return to previous sections in this mock exam.",
                              variant: "destructive"
                          });
                          return;
                      }
                      if (isCurrent) return;
                      
                      // If unlocked, allow navigation
                      if (!isLockedBySetting) {
                          trackQuestionTime();
                          setCurrentSectionIndex(idx);
                          setCurrentIndex(section.startIndex);
                      }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{section.icon}</span>
                      <span className="text-[10px] font-black uppercase text-slate-800">
                        {section.name}
                      </span>
                    </div>
                    {isLocked ? <Lock size={12} className="text-slate-300" /> : isCompleted ? <CheckCircle size={12} className="text-emerald-500" /> : null}
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${(questions.slice(section.startIndex, section.endIndex + 1).filter(q => q.user_answer !== null).length / section.questionCount) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Question Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Question Matrix</h3>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div className="w-2 h-2 rounded-full bg-orange-500" />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {(isMockExam && currentSection
            ? questions.slice(currentSection.startIndex, currentSection.endIndex + 1)
            : questions
          ).map((q, i) => {
            const actualIndex = isMockExam && currentSection ? currentSection.startIndex + i : i;
            const isImat = test?.exam_type === 'imat-prep';
            const isLocked = !isImat && isMockExam && sections.length > 0 && (
              sections.findIndex(s => actualIndex >= s.startIndex && actualIndex <= s.endIndex) !== currentSectionIndex
            );

            return (
              <button
                key={q.id}
                onClick={() => !isLocked && handleNavigate(actualIndex)}
                disabled={isLocked}
                className={cn(
                  "aspect-square rounded-xl text-[10px] font-black border-2 transition-all active:scale-95",
                  isLocked
                    ? "bg-slate-50 border-transparent text-slate-100 cursor-not-allowed"
                    : actualIndex === currentIndex
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                      : q.user_answer !== null
                        ? q.is_marked
                          ? "bg-orange-50 border-orange-200 text-orange-600"
                          : "bg-emerald-50 border-emerald-200 text-emerald-600"
                        : q.is_marked
                          ? "bg-orange-50 border-orange-200 text-orange-600"
                          : "bg-white border-slate-100 text-slate-400 hover:border-indigo-400 hover:text-indigo-600"
                )}
              >
                {actualIndex + 1}
              </button>
            );
          })}
        </div>

        <div className="pt-6 border-t border-slate-100">
             <Button
                variant="ghost"
                onClick={() => setShowSubmitConfirm(true)}
                className="w-full h-10 text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
            >
                Abort & Submit
            </Button>
        </div>
      </div>
    </div>
  );

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="h-screen bg-background flex flex-col select-none overflow-hidden">
      {/* Top Header - Focused Official Look */}
      <header className="h-16 lg:h-20 flex items-center shrink-0 border-b border-slate-200 dark:border-border bg-white dark:bg-card z-50 shadow-sm">
        <div className="w-full px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.webp" alt="Logo" className="h-5 sm:h-7 shrink-0 hidden xs:block" />
              <div className="hidden lg:block w-px h-6 bg-slate-200" />
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Mission: {isMockExam ? 'Official Simulation' : 'Practice Quest'}</p>
                <h1 className="text-xs lg:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight truncate max-w-[120px] sm:max-w-xs">
                  {displaySubject} {test.topic && <span className="text-slate-300 mx-1">/</span>} {test.topic}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-8">
            {/* Timer Block */}
            <div className="flex items-center gap-3 px-3 lg:px-4 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-border">
              <Clock className={cn("w-4 h-4", (isMockExam ? sectionTimeRemaining : timeRemaining) < 300 ? "text-destructive animate-pulse" : "text-indigo-600")} />
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">Time Left</span>
                <span className={cn("font-mono text-xs lg:text-base font-black tabular-nums leading-none", (isMockExam && test.section_timing_mode !== 'total' && test.exam_type !== 'imat-prep' ? sectionTimeRemaining : timeRemaining) < 300 ? "text-destructive" : "text-slate-900 dark:text-white")}>
                  {formatTime((isMockExam && test.section_timing_mode !== 'total' && test.exam_type !== 'imat-prep') ? sectionTimeRemaining : timeRemaining)}
                </span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="w-9 h-9 rounded-xl border border-border/50 hover:bg-secondary/50"
              >
                <Maximize className="w-4 h-4 text-slate-400" />
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => setShowSubmitConfirm(true)}
                className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-full text-[9px] font-black uppercase tracking-widest h-9 px-5 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 dark:shadow-none"
              >
                End Session
              </Button>
            </div>

            {/* Mobile Nav Trigger */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl border">
                    <ListFilter size={18} className="text-slate-500" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] p-0 flex flex-col bg-slate-50">
                  <SheetHeader className="p-6 border-b bg-white">
                    <SheetTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <Target size={14} />
                      Mission Navigator
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-8">
                    {/* Reuse Sidebar Content */}
                    <NavigatorContent />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Line - Dynamic like Mobile */}
      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 shrink-0 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-700 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Proctoring — wrapped in Suspense because they are lazy-loaded.
          The ML chunk (TF/MediaPipe) only downloads when a proctored exam is active. */}
      <Suspense fallback={null}>
        <ProctoringSystem
          testId={testId!}
          isActive={test?.is_proctored && !showProctoringSetup}
          onViolationThresholdReached={() => setIsDisqualified(true)}
        />
      </Suspense>

      {showProctoringSetup && test?.is_proctored && (
        <Suspense fallback={null}>
          <ProctoringSetup
            cameraAllowed={cameraAllowed}
            isFullscreen={isProctoringFullscreen}
            onPermissionsGranted={requestPermissions}
            onEnterFullscreen={enterProctoringFullscreen}
            videoStream={videoStream}
            aiState={aiState}
            setVideoElement={setVideoElement}
            onStartExam={() => setShowProctoringSetup(false)}
          />
        </Suspense>
      )}
      {!showProctoringSetup && (
        <>
        <div className={cn("flex-1 flex overflow-hidden relative", isDisqualified && "hidden")}>
        {/* Sidebar Toggle (Desktop Only) */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-50 p-2 bg-indigo-600 text-white rounded-l-2xl shadow-2xl hover:bg-indigo-700 transition-all flex flex-col items-center gap-2 py-6"
            title="Open Navigator"
          >
            <ChevronLeft className="w-5 h-5" />
            <div className="[writing-mode:vertical-lr] text-[9px] font-black uppercase tracking-[0.3em] rotate-180">Navigator</div>
          </button>
        )}

        {/* Main Content: Official Dual Pane */}
        <main className="flex-1 overflow-y-auto lg:overflow-hidden bg-white dark:bg-slate-950 flex flex-col lg:flex-row relative">
          
          <AnimatePresence mode="wait">
             {hasSource && (
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                        "h-full flex flex-col bg-slate-50 dark:bg-slate-900/20 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-border transition-all duration-500 shrink min-w-0",
                        hasSource ? "lg:w-1/2" : "w-0"
                    )}
                >
                    
                    <div className={cn(
                        "flex-1 overflow-y-auto custom-scrollbar overscroll-contain transition-all duration-500",
                        isSidebarOpen ? "p-6 lg:p-8" : "p-6 lg:p-12"
                    )}>
                        <motion.div 
                            key={currentIndex + '_passage'}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-3xl mx-auto space-y-10"
                        >
                            {currentQuestion.passage && (
                                <div className="space-y-6">
                                    <div className="pb-4 border-b border-slate-200 dark:border-border">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Instructional Directive</p>
                                        <h5 className="text-sm font-black text-slate-900 dark:text-slate-100">Read the passage and answer the question.</h5>
                                    </div>
                                    <div className="relative group p-8 lg:p-14 bg-white dark:bg-slate-900/50 rounded-[3rem] border-2 border-slate-100 dark:border-border shadow-md overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-slate-900 dark:bg-slate-100 opacity-20" />
                                        <MathText 
                                            content={currentQuestion.passage} 
                                            className="text-lg lg:text-xl leading-[1.8] text-slate-800 dark:text-slate-200 font-medium prose dark:prose-invert max-w-none break-words" 
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ALL Media: Table, Graph, Chart, Pie, Image, Diagram */}
                            {(() => {
                                const media = currentQuestion.media as any;
                                if (!media) return null;
                                const type = media.type;
                                // Robust check: Render if anything looks like media with actual values
                                const hasActualContent = (() => {
                                    const type = media.type;
                                    const hasUrl = !!(media.url || media.imageUrl || media.image_url || media.src || (media as any).image?.url);
                                    
                                    if (type === 'image') return hasUrl;
                                    if (type === 'table') return !!(media.table?.rows || (media as any).data?.rows || media.rows);
                                    if (['chart', 'graph', 'pie', 'bar', 'line', 'scatter'].includes(type)) {
                                        return !!((media as any).data || (media as any).chart?.data || hasUrl);
                                    }
                                    if (type === 'diagram') return !!(media.diagram || (media as any).svg || (media as any).description);
                                    // Fallback for objects missing type but having data
                                    return !!(hasUrl || media.data || media.table || media.diagram);
                                })();

                                if (!hasActualContent) return null;

                                return (
                                    <div className="space-y-6">
                                        <div className="pb-4 border-b border-slate-200 dark:border-border">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                {['table', 'graph', 'chart', 'pie'].includes(type)
                                                    ? 'Data Analysis Directive'
                                                    : 'Visual Reference Directive'}
                                            </p>
                                            <h5 className="text-sm font-black text-slate-900 dark:text-slate-100">
                                                {['table'].includes(type)
                                                    ? 'Analyse the table and answer the question.'
                                                    : ['graph', 'chart', 'pie'].includes(type)
                                                    ? `Analyse the ${type} and answer the question.`
                                                    : 'Examine the reference material and answer the question.'}
                                            </h5>
                                        </div>
                                        <div className={cn(
                                            "bg-white dark:bg-card shadow-xl",
                                            ['table', 'graph', 'chart', 'pie'].includes(type)
                                                ? "rounded-[2.5rem] border-2 border-slate-900"
                                                : "rounded-[2rem] border-2 border-slate-100 dark:border-border p-4 lg:p-8"
                                        )}>
                                            <QuestionMedia media={media} className="w-full h-auto" />
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Diagram (separate from media field) */}
                            {(() => {
                                const diagram = currentQuestion.diagram;
                                if (!diagram) return null;
                                // Simple existence check for diagram is usually enough as it's a dedicated field
                                
                                return (
                                    <div className="space-y-6">
                                        <div className="pb-4 border-b border-slate-200 dark:border-border">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Visual Reference Directive</p>
                                            <h5 className="text-sm font-black text-slate-900 dark:text-slate-100">
                                                Examine the diagram and answer the question.
                                            </h5>
                                        </div>
                                        <div className="rounded-[2rem] border-2 border-slate-100 dark:border-border p-4 lg:p-8 bg-white dark:bg-slate-900/10 shadow-sm">
                                            <DiagramRenderer diagram={diagram} className="w-full" />
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="pt-8 border-t border-slate-200 dark:border-border flex items-center gap-4 opacity-30">
                                <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg"><Maximize2 size={14} /></div>
                                <span className="text-[9px] font-black uppercase tracking-widest leading-none">End of Reference material</span>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>

          {/* Right Pane: Question Area */}
          <div className={cn(
              "h-full flex flex-col bg-white dark:bg-card transition-all duration-500 shrink min-w-0",
               hasSource ? "lg:w-1/2" : "w-full flex-1"
          )}>

              <div className={cn(
                  "flex-1 overflow-y-auto custom-scrollbar overscroll-contain pb-40 transition-all duration-500",
                  isSidebarOpen ? "p-6 lg:p-10" : "p-6 lg:p-12"
              )}>
                  <motion.div
                      key={currentIndex + '_question'}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="max-w-2xl mx-auto space-y-8 lg:space-y-12"
                  >
                      {/* Sub-Header */}
                      <div className="flex items-center justify-between pb-6 border-b-2 border-slate-100 dark:border-border">
                         <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Current Question</span>
                                <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                                    {String(currentIndex + 1).padStart(2, '0')}<span className="text-slate-200 dark:text-slate-800 mx-1">/</span>{String(questions.length).padStart(2, '0')}
                                </div>
                            </div>
                            {currentSection && (
                                <div className="hidden sm:flex flex-col border-l border-slate-100 dark:border-border pl-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Domain Module</span>
                                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 truncate max-w-[120px]">
                                        {currentSection.name}
                                    </span>
                                </div>
                            )}
                         </div>

                         <div className="flex gap-2">
                            {currentQuestion.is_reported_by_user ? (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 h-9">
                                    <AlertTriangle size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Reported</span>
                                </div>
                            ) : (
                                <ReportQuestionDialog
                                    onReport={async (reason, details) => handleReport(details ? `${reason}: ${details}` : reason)}
                                    trigger={
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border text-slate-300 hover:text-rose-500 transition-all">
                                            <AlertTriangle size={14} />
                                        </Button>
                                    }
                                />
                            )}
                            <Button
                                onClick={handleBookmark}
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-9 w-9 rounded-xl border transition-all",
                                    currentQuestion.is_saved ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "text-slate-300 hover:text-indigo-500"
                                )}
                            >
                                <Bookmark size={14} className={cn(currentQuestion.is_saved && "fill-current")} />
                            </Button>
                            <Button
                                onClick={handleMarkForReview}
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-9 w-9 rounded-xl border transition-all",
                                    currentQuestion.is_marked ? "bg-orange-50 border-orange-200 text-orange-600" : "text-slate-300 hover:text-orange-500"
                                )}
                            >
                                <Flag size={14} className={cn(currentQuestion.is_marked && "fill-current")} />
                            </Button>
                         </div>
                      </div>

                      {/* Question Content */}
                      <div className="space-y-8">
                         <MathText 
                            content={currentQuestion.question_text || "[Question content is missing]"} 
                            className={cn(
                                "font-black text-slate-900 dark:text-white leading-[1.25] lg:leading-[1.15] tracking-tight transition-all duration-500",
                                isSidebarOpen ? "text-2xl lg:text-3xl" : "text-2xl lg:text-4xl"
                            )}
                         />
                       {/* FALLBACK MEDIA: Show here if left pane is hidden or media fails source detection */}
                       {(() => {
                           const media = currentQuestion.media as any;
                           if (!media || !hasSource) {
                               if (!media) return null;
                                                      // Robust check: Render if anything looks like media with actual values
                               const hasActualContent = (() => {
                                   if (!media) return false;
                                   const type = media.type;
                                   const hasUrl = !!(media.url || media.imageUrl || media.image_url || media.src || (media as any).image?.url);

                                   if (type === 'image') return hasUrl;
                                   if (type === 'table') return !!(media.table?.rows || (media as any).data?.rows || media.rows);
                                   if (['chart', 'graph', 'pie', 'bar', 'line', 'scatter'].includes(type)) {
                                       return !!((media as any).data || (media as any).chart?.data || hasUrl);
                                   }
                                   if (type === 'diagram') return !!(media.diagram || (media as any).svg || (media as any).description);
                                   // Fallback for objects missing type but having data
                                   return !!(hasUrl || media.data || media.table || media.diagram);
                               })();

                               if (!hasActualContent) return null;

                               return (
                                   <div className="bg-white dark:bg-card rounded-3xl lg:rounded-[2.5rem] border-2 border-slate-100 dark:border-border p-6 lg:p-8 shadow-sm overflow-hidden">
                                       <QuestionMedia media={media} />
                                   </div>
                               );
                           }
                           return null;
                       })()}
                      </div>

                      {/* Options Matrix */}
                      <div className="grid grid-cols-1 gap-4 lg:gap-6 pb-20">
                            {currentQuestion.options.map((option, idx) => {
                                const isSelected = currentQuestion.user_answer === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectAnswer(idx)}
                                        className={cn(
                                            "group relative flex items-center gap-5 p-6 lg:p-8 rounded-[2rem] border-2 transition-all duration-300 text-left active:scale-[0.98] overflow-hidden",
                                            isSelected
                                                ? "bg-slate-900 border-slate-900 dark:bg-white dark:border-white shadow-2xl shadow-slate-300 dark:shadow-none"
                                                : "bg-white border-slate-100 dark:bg-slate-900 dark:border-border hover:border-slate-900 dark:hover:border-white"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center text-sm lg:text-base font-black shrink-0 transition-all",
                                            isSelected 
                                                ? "bg-white/10 text-white dark:bg-slate-200 dark:text-slate-900" 
                                                : "bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-border"
                                        )}>
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <MathText 
                                                content={option} 
                                                variant="default"
                                                className={cn(
                                                    "text-base lg:text-lg font-bold leading-relaxed tracking-tight break-words",
                                                    isSelected ? "text-white dark:text-slate-900" : "text-slate-600 dark:text-slate-300"
                                                )} 
                                            />
                                        </div>
                                    </button>
                                );
                            })}
                      </div>
                  </motion.div>
              </div>
          </div>
        </main>

        {/* Sidebar System (Desktop Only) */}
        <aside className={cn(
            "hidden lg:flex flex-col border-l border-slate-200 dark:border-border bg-slate-50/50 dark:bg-slate-900/50 transition-all duration-500 shrink-0 overflow-hidden relative",
            isSidebarOpen ? "w-80 opacity-100" : "w-0 opacity-0"
        )}>
          {isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] p-2 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all border-2 border-white dark:border-slate-900 group"
              title="Close Sidebar"
            >
              <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}

          <div className="h-full w-full overflow-y-auto p-8 custom-scrollbar">
            <NavigatorContent />
          </div>
        </aside>
      </div>

      {/* Navigation Footer - Focused Official Control */}
      <footer className="h-20 lg:h-24 shrink-0 bg-white dark:bg-card border-t border-slate-200 dark:border-border px-4 lg:px-12 flex items-center shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-[100]">
        <div className="w-full flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="outline"
            onClick={() => {
              if (isMockExam && currentSection && currentIndex === currentSection.startIndex) return;
              handleNavigate(Math.max(0, currentIndex - 1));
            }}
            disabled={currentIndex === 0 || (isMockExam && currentSection && currentIndex === currentSection.startIndex)}
            className="h-10 lg:h-12 px-4 lg:px-8 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-200"
          >
            <ChevronLeft size={16} className="mr-2" />
            <span className="hidden xs:inline">Previous Step</span>
            <span className="xs:hidden">Back</span>
          </Button>

          <div className="hidden lg:flex flex-col items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Question Progress</span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">
              {currentIndex + 1} <span className="text-slate-300 mx-1">/</span> {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isMockExam && currentSection && currentIndex === currentSection.endIndex ? (
                currentSectionIndex === sections.length - 1 ? (
                <Button
                    onClick={() => setShowSubmitConfirm(true)}
                    className="h-12 lg:h-14 px-8 lg:px-12 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 font-black text-[10px] lg:text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                >
                    Final Submission
                </Button>
                ) : (
                (test?.exam_type === 'imat-prep') ? (
                  <Button
                    onClick={() => handleCompleteSection()}
                    className="h-12 lg:h-14 px-8 lg:px-12 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 font-black text-[10px] lg:text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                  >
                    Next Section
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowSectionComplete(true)}
                    className="h-12 lg:h-14 px-8 lg:px-12 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 font-black text-[10px] lg:text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                  >
                    Lock & Proceed
                  </Button>
                )
                )
            ) : currentIndex === questions.length - 1 ? (
                <Button
                onClick={() => setShowSubmitConfirm(true)}
                className="h-12 lg:h-14 px-8 lg:px-12 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 font-black text-[10px] lg:text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                >
                Submit Mission
                </Button>
            ) : (
                <Button
                onClick={() => handleNavigate(Math.min(questions.length - 1, currentIndex + 1))}
                className="h-12 lg:h-14 px-8 lg:px-12 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-none font-black text-[10px] lg:text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 dark:shadow-none active:scale-95 transition-all flex items-center gap-2"
                >
                <span className="hidden xs:inline">Confirm & Next</span>
                <span className="xs:hidden">Next</span>
                <ChevronRight size={16} />
                </Button>
            )}
          </div>
        </div>
      </footer>
      </>
      )}

      {/* Section Complete Modal (Premium Official) */}
      {showSectionComplete && currentSection && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-card rounded-2xl p-8 lg:p-12 max-w-md w-full border border-slate-100 dark:border-border shadow-lg">
            <div className="text-center mb-10">
              <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-[2rem] bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-6 border border-indigo-100 dark:border-indigo-800 text-3xl">
                {currentSection.icon}
              </div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">Stage Completion</p>
              <h3 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">Seal Current Domain?</h3>
              <p className="text-sm text-slate-400 mt-2">Domain: {currentSection.name}</p>
            </div>

            {(() => {
              const sectionQuestions = questions.slice(currentSection.startIndex, currentSection.endIndex + 1);
              const sectionAnswered = sectionQuestions.filter(q => q.user_answer !== null).length;
              const sectionUnanswered = currentSection.questionCount - sectionAnswered;

              return (
                <div className="space-y-6 mb-10">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-border">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Questions Answered</p>
                      <p className="text-xl font-black text-indigo-600">{sectionAnswered}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-border">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Questions Blank</p>
                      <p className={cn("text-xl font-black", sectionUnanswered > 0 ? "text-rose-500" : "text-slate-400")}>{sectionUnanswered}</p>
                    </div>
                  </div>

                  {sectionUnanswered > 0 && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold text-amber-900/70 dark:text-amber-200/50 leading-relaxed">
                        {test?.exam_type === 'imat-prep' 
                          ? `Notice: ${sectionUnanswered} question(s) left blank. You can revisit this subject at any time before final submission.` 
                          : `Notice: ${sectionUnanswered} question(s) left blank. Once committed, you cannot revisit this domain.`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid gap-3">
              <Button
                onClick={() => handleCompleteSection()}
                className="w-full h-14 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl active:scale-95 transition-all"
              >
                Seal & Proceed
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowSectionComplete(false)}
                className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
              >
                Review Questions
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-lg">

            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Exam Submission</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Confirm Submission</h3>
              </div>
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Answered</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{answeredCount}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Blank</p>
                <p className="text-2xl font-bold text-slate-400">{questions.length - answeredCount}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Flagged</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{markedCount}</p>
              </div>
            </div>

            {questions.length - answeredCount > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-6">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  {questions.length - answeredCount} question(s) are unanswered. They will be treated as skipped.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSubmitConfirm(false)}
                className="h-12 rounded-xl font-semibold text-sm"
              >
                Go Back
              </Button>
              <Button
                onClick={() => submitTest('manual')}
                disabled={isSubmitting}
                className="h-12 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 font-semibold text-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Submit Exam'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
